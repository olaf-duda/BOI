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
let result_points = [];
let full_route = [];

export async function CheapRoute(startingCoordinates, destinationCoordinates, routeTime, kdTree, routeType) {
    routeDuration = 0;
    result_points = [startingCoordinates];
    full_route = [];

    if(await findRoute(startingCoordinates, destinationCoordinates, routeTime, kdTree, routeType, [])) {
        //console.log("Found the route:");
       // console.log( " ",result_points, "full rut")
        return [full_route, routeDuration];

    }
    else {
        console.log("gowno nie znalazlo nic")
        return [-1, -1];
    }

    // while(currentNeededTime > 17){
    //     noOfSubstations = Math.ceil(currentNeededTime / 17) - 1;

    //     const new_subroute = await findStations(result_points, i, destinationCoordinates, kdTree, routeType, noOfSubstations);

    //     if(new_subroute[1] == "")
    //         return [-1,-1];

    //     for (const object of result_points) {
    //         if (object.lat == new_subroute[0].lat && object.lon == new_subroute[0].lon) {
    //             return [-1,-1];
    //         }
    //     }
    //     i++;
    //     result_points.push(new_subroute[0]);
    //     full_route.push(decode(new_subroute[1]));
        
    //     //[i][j][k]
    //     //i = ktory subroute np masz 2 przystanki pomiedzy wiec 3 traski wiec i (1-3), nr subrouta buta fiuta

    //     const requestBody = createRequest(routeType, new_subroute[0], destinationCoordinates, "BICYCLE")
    //     const response = await axios.post(global.otpApiUrl, requestBody, {
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     });

    //     currentNeededTime = (response.data.data.plan.itineraries[0].endTime - response.data.data.plan.itineraries[0].startTime) / (1000 * 60);
    //     if (currentNeededTime <= 17){
    //         console.log("czas traski" + currentNeededTime)
    //         routeDuration += currentNeededTime;
    //         full_route.push(decode(response.data.data.plan.itineraries[0].legs[0].legGeometry.points));
    //     }
    // }

    
}

async function findRoute(startingCoordinates, destinationCoordinates, currentNeededTime, kdTree, routeType, visitedStations) {
    const noOfSubstations = Math.ceil(currentNeededTime / 17) - 1;

    const coordinatesString = JSON.stringify(startingCoordinates);

    // Check if the coordinates are already visited
    if (!visitedStations.includes(coordinatesString)) {
        visitedStations.push(coordinatesString);
    }
    //console.log(visitedStations[0], " " , startingCoordinates)
    //console.log("visited stations" + visitedStations.length)

    const findStationsOutput = await findStations(result_points, result_points.length-1, destinationCoordinates, kdTree, routeType, noOfSubstations, visitedStations);

    //console.log("find Stations " + findStationsOutput[0].lat + " " + findStationsOutput[0].lon)

    if(findStationsOutput[1] != "") {
        const new_stop = findStationsOutput[0];
        const new_subroute = decode(findStationsOutput[1]);

        result_points.push(new_stop);
        full_route.push(new_subroute);
        //console.log(full_route.length + "full route elements")
        const requestBody = createRequest(routeType, new_stop, destinationCoordinates, "BICYCLE")
        const response = await axios.post(global.otpApiUrl, requestBody, {
        headers: {
            'Content-Type': 'application/json',
        },
        });

        let newCurrentNeededTime = (response.data.data.plan.itineraries[0].endTime - response.data.data.plan.itineraries[0].startTime) / (1000 * 60);
        if (newCurrentNeededTime <= 17){
            routeDuration += newCurrentNeededTime;
            full_route.push(decode(response.data.data.plan.itineraries[0].legs[0].legGeometry.points));
            return true;
        }

        const findRouteResult = await findRoute(new_stop, destinationCoordinates, newCurrentNeededTime, kdTree, routeType, visitedStations);
        
        if(findRouteResult) {
            return true;
        }

        routeDuration = currentNeededTime - newCurrentNeededTime;
        result_points.pop();
        full_route.pop();

        return await findRoute(startingCoordinates, destinationCoordinates, currentNeededTime, kdTree, routeType, visitedStations);
    }
    else {
       //console.log("false gowno siema")
        return false;
    }
}

async function findStations(result_points, previous_stop_index, final_stop, kdTree, routeType, noOfSubstations, visitedStations){

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
        //console.log(visitedStations, "\n", nearestStops[i])
        if(result_points.includes(nearestStops[i]) || visitedStations.includes(JSON.stringify(nearestStops[i])) || 
        (result_points[previous_stop_index].lat == nearestStops[i].lat && 
        result_points[previous_stop_index].lon == nearestStops[i].lon))
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
            //console.log("Adding " + durationInMinutes + " minutes");
            return [nearestStops[i], encodedRouteToNearestStop];
        }
    }

    // if(noOfSubstations<=10){
    //     await noOfSubstations++;
    //     return await findStations(result_points, previous_stop_index, final_stop, kdTree, routeType, noOfSubstations);
    // }
    //console.log("didnt find station");
    
    return [nearestStops[i], ""];
}

function distance(pointA, pointB) {
    return new Promise(resolve => {
        const dist = Math.sqrt((pointA[0] - pointB[0]) ** 2 + (pointA[1] - pointB[1]) ** 2);
        resolve(dist);
    });
}