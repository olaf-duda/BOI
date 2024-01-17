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

function distance(pointA, pointB) {
    return new Promise(resolve => {
        const dist = Math.sqrt((pointA[0] - pointB[0]) ** 2 + (pointA[1] - pointB[1]) ** 2);
        resolve(dist);
    });
}

export async function CheapRoute(startingCoordinates, destinationCoordinates, routeTime, kdTree, routeType) {
    var currentNeededTime = routeTime;
    const noOfSubstations = Math.ceil(routeTime / 17) - 1;

    let result_points = [startingCoordinates];
    let full_route = [];
    let i = 0;

    while(currentNeededTime > 17){

        const new_subroute = await findStations(result_points[i], destinationCoordinates, kdTree, routeType, noOfSubstations);

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
            console.log("czas traski" + currentNeededTime)
            full_route.push(decode(response.data.data.plan.itineraries[0].legs[0].legGeometry.points));
        }
    }

    console.log("Found the route:");
    console.log(full_route.length, "full rut")
    return full_route;
}

async function findStations(previous_stop, final_stop, kdTree, routeType, noOfSubstations){

    //New otp route from previous_stop to final_stop

    const response = await axios.post(global.otpApiUrl, createRequest(routeType, previous_stop, final_stop, "BICYCLE"), {
    headers: {
        'Content-Type': 'application/json',
    },
    });
    //console.log("rispons", response.data.data)
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

    console.log('found point is: ' + [found_point[1], found_point[0]]);
    const numOfStations = 6;
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
        if(previous_stop.lat == nearestStops[i].lat && previous_stop.lon == nearestStops[i].lon)
            continue;

        const requestBody2 = createRequest(routeType, previous_stop, nearestStops[i], "BICYCLE");
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
            return [nearestStops[i], encodedRouteToNearestStop];
        }
    }
    if(noOfSubstations<10)
        await findStations(previous_stop, final_stop, kdTree, routeType, noOfSubstations+1);
    console.log("didnt find station");
    
    return [nearestStops[i], encodedRouteToNearestStop];
}