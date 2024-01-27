import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView, StatusBar, TextInput, Image, PermissionsAndroid } from 'react-native';
import { WebView } from 'react-native-webview';
import html_script from '../app/html_script.js';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';

import { decode } from './polyline.js'
import '../global.js'
import {createRequest, createRequestFromExactVal} from './createRequest.js'

import * as Location from 'expo-location';
import  KDTree  from './kdtree.js';

let routeDuration = 0;
function distance(pointA, pointB) {
    return new Promise(resolve => {
        const dist = 6371e3 * Math.acos(Math.cos(pointA[0] * Math.PI / 180) * Math.cos(pointB[0] * Math.PI / 180) * Math.cos((pointB[1] - pointA[1]) * Math.PI / 180) + Math.sin(pointA[0] * Math.PI / 180) * Math.sin(pointB[0] * Math.PI / 180));

        resolve(dist);
    });
}

export async function CheapRoute(startingCoordinates, destinationCoordinates, routeTime, kdTree, routeType) {
    console.log("tastatasrars");
    routeDuration = 0;
    var currentNeededTime = routeTime;
    const noOfSubstations = Math.ceil(routeTime / 17) - 1;
    let result_points = [startingCoordinates];
    let full_route = [];
    let i = 0;

    

    while(currentNeededTime > 17){

        const new_subroute = await findStations(result_points, i, destinationCoordinates, kdTree, routeType, noOfSubstations);

        if(new_subroute[1] == "")
            return [-1, -1];

        for (const object of result_points) {
            if (object.lat == new_subroute[0].lat && object.lon == new_subroute[0].lon) {
                return [-1, -1];
            }
        }

        i++;
        result_points.push(new_subroute[0]);
        
        full_route.push(decode(new_subroute[1]));


        const requestBody = createRequest(routeType, new_subroute[0], destinationCoordinates, "BICYCLE")
        const response = await axios.post(global.otpApiUrl, requestBody, {
        headers: {
            'Content-Type': 'application/json',
        },
        });

        currentNeededTime = (response.data.data.plan.itineraries[0].endTime - response.data.data.plan.itineraries[0].startTime) / (1000 * 60);
        if (currentNeededTime <= 17){
            routeDuration += currentNeededTime;
            full_route.push(decode(response.data.data.plan.itineraries[0].legs[0].legGeometry.points));
        }
    }

    console.log(routeDuration, "full rut time")
    return [full_route, routeDuration];
}

async function findStations(result_points, previous_stop_index, final_stop, kdTree, routeType, noOfSubstations){

    //New otp route from result_points[previous_stop_index] to final_stop

    const response = await axios.post(global.otpApiUrl, createRequest(routeType, result_points[previous_stop_index], final_stop, "BICYCLE"), {
    headers: {
        'Content-Type': 'application/json',
    },
    });
    const points = decode(response.data.data.plan.itineraries[0].legs[0].legGeometry.points);

    var totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
        totalDistance += await distance(points[i], points[i + 1]);
    }

    var currentDistance = 0;
    var fractionedDistance = (1 / (noOfSubstations + 1)) * totalDistance;
    var found_point;

    for (let i = 0; i < points.length - 1; i++) {
        currentDistance += await distance(points[i], points[i + 1]);
        
        if (currentDistance == fractionedDistance) {
            // we found the exact point i
            found_point = points[i + 1];
            break;
        }
        else if (currentDistance > fractionedDistance) {
            // we skipped the point which we're looking for
            const overflow = currentDistance - fractionedDistance;
            const delta = await distance(points[i], points[i + 1]);
            const sideFraction = (delta - overflow) / delta;
            var dx = points[i + 1][0] - points[i][0];
            var dy = points[i + 1][1] - points[i][1];
            dx *= sideFraction;
            dy *= sideFraction;
            found_point = [points[i][0] + dx, points[i][1] + dy];
            break;
        }
    }

    const numOfStations = 10;
    const nearestStops = kdTree.findNearestNeighbors([found_point[1], found_point[0]], numOfStations);
    const mapRef = useRef<WebView | null>(null);
    if (mapRef.current) {
        const script = `
            if (typeof map !== 'undefined') {
            L.marker([${found_point.lat}, ${found_point.lon}]).addTo(map);
            }
        `;
        mapRef.current.injectJavaScript(script);
      }

    for(var i = 0; i<numOfStations; i++){
        if(result_points.includes(nearestStops[i]) || result_points[previous_stop_index].lat == nearestStops[i].lat && result_points[previous_stop_index].lon == nearestStops[i].lon)
            continue;

        const requestBody2 = createRequest(routeType, result_points[previous_stop_index], nearestStops[i], "BICYCLE");
        const response2 = await axios.post(global.otpApiUrl, requestBody2, {
        headers: {
            'Content-Type': 'application/json',
        },
        });

        const responseDataJson = JSON.stringify(response2.data.data);

        // Parse JSON string to JavaScript object
        const responseDataObject = JSON.parse(responseDataJson);

        // Now you can access properties like plan.itineraries[0]
        let durationInMinutes = (responseDataObject.plan.itineraries[0].endTime - responseDataObject.plan.itineraries[0].startTime) / (1000 * 60);
        if (durationInMinutes <= 17){
            const encodedRouteToNearestStop = responseDataObject.plan.itineraries[0].legs[0].legGeometry.points;
            routeDuration += durationInMinutes;
            console.log("Adding " + durationInMinutes + " minutes");
            return [nearestStops[i], encodedRouteToNearestStop];
        }
    }
    if(noOfSubstations<=15){
        await noOfSubstations++;
        return await findStations(result_points, previous_stop_index, final_stop, kdTree, routeType, noOfSubstations);
    }
    console.log("didnt find station");
    
    return [nearestStops[i], ""];
}