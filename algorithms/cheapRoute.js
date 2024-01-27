import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView, StatusBar, TextInput, Image, PermissionsAndroid } from 'react-native';
import { WebView } from 'react-native-webview';
import html_script from '../app/html_script.js';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';

import { decode } from './polyline.js'
import '../global.js'
import { createRequest, createRequestFromExactVal } from './createRequest.js'

import * as Location from 'expo-location';
import KDTree from './kdtree.js';

let routeDuration = 0;
let result_points = [];
let full_route = [];

export async function CheapRoute(startingCoordinates, destinationCoordinates, routeTime, kdTree, routeType) {
    routeDuration = 0;
    result_points = [startingCoordinates];
    full_route = [];

    if (await findRoute(startingCoordinates, destinationCoordinates, routeTime, kdTree, routeType, [])) {
        //console.log("Found the route:");
        //console.log(" ", result_points, "full rut")
        return [full_route, routeDuration];
    }
    else {
        console.log("wywalilo sie")
        return [full_route, routeDuration];

        return [-1, -1];
    }
}

async function findRoute(startingCoordinates, destinationCoordinates, currentNeededTime, kdTree, routeType, visitedStations) {
    const noOfSubstations = Math.ceil(currentNeededTime / 17) - 1;
    
    console.log("visited dlugosc" + visitedStations.length)
    
    const coordinatesString = JSON.stringify(startingCoordinates);

    if (!visitedStations.some(elem => elem[0] === coordinatesString)) {
        visitedStations.push([coordinatesString, result_points.length]);
        //console.log(visitedStations[visitedStations.length-1])
    }
    
    let findStationsOutput = await findStations(result_points, result_points.length - 1, destinationCoordinates, kdTree, routeType, noOfSubstations, visitedStations);

    if (findStationsOutput[1] != "") {
        const new_stop = findStationsOutput[0];
        const new_subroute = decode(findStationsOutput[1]);

        result_points.push(new_stop);
        full_route.push(new_subroute);

        if (result_points.length > 21)
            return false

        const requestBody = createRequest(routeType, new_stop, destinationCoordinates, "BICYCLE")
        const response = await axios.post(global.otpApiUrl, requestBody, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        let newCurrentNeededTime = (response.data.data.plan.itineraries[0].endTime - response.data.data.plan.itineraries[0].startTime) / (1000 * 60);
       
        if (newCurrentNeededTime <= 17) {
            routeDuration += newCurrentNeededTime;
            full_route.push(decode(response.data.data.plan.itineraries[0].legs[0].legGeometry.points));
            return true;
        }

        const findRouteResult = await findRoute(new_stop, destinationCoordinates, newCurrentNeededTime, kdTree, routeType, visitedStations);

        if (findRouteResult) {
            return true;
        }
        //console.log("route duration before " + routeDuration)
        routeDuration -= currentNeededTime - newCurrentNeededTime;
        //console.log("route duration after " + routeDuration)

        result_points.pop();
        full_route.pop();

        return await findRoute(startingCoordinates, destinationCoordinates, currentNeededTime, kdTree, routeType, visitedStations);
    }
    else {
        return false;
    }
}

async function findStations(result_points, previous_stop_index, final_stop, kdTree, routeType, noOfSubstations, visitedStations) {

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

    console.log("division point " + found_point[1] + " " + found_point[0])
    const numOfStations = 20;
    let nearestStops = kdTree.findNearestNeighbors([found_point[1], found_point[0]], numOfStations);
    if(visitedStations.length<2) {
        for(let i=0; i<nearestStops.length; i++) {
            console.log(nearestStops[i].lat + " " + nearestStops[i].lon)
            if(nearestStops[i].lat == 52.19984361219132 && nearestStops[i].lon == 21.05095046328656) {
                console.log("COOOOOOOOOOOOOOOOOOSss")
            }
        }
        
    }
    
    for (var i = 0; i < numOfStations; i++) {
        //console.log(visitedStations, "\n", nearestStops[i])
        //console.log(result_points.length + " result points")
        //console.log(visitedStations.length + " visited stations")
        if (result_points.includes(nearestStops[i]) || visitedStations.some( elem => elem[0] === JSON.stringify(nearestStops[i]) && elem[1] <= result_points.length) ||
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
        //console.log("duration minutes " + durationInMinutes)
        if (durationInMinutes <= 17) {
            const encodedRouteToNearestStop = responseDataObject.plan.itineraries[0].legs[0].legGeometry.points;
            routeDuration += durationInMinutes;
            //console.log("Adding " + durationInMinutes + " minutes");
            return [nearestStops[i], encodedRouteToNearestStop];
        }
    }

    if (noOfSubstations <= 15) {
        await noOfSubstations++;
        return await findStations(result_points, previous_stop_index, final_stop, kdTree, routeType, noOfSubstations, visitedStations);
    }
    //("didnt find station");

    return [nearestStops[i], ""];
}

function distance(pointA, pointB) {
    return new Promise(resolve => {
        const dist = 6371e3 * Math.acos(Math.cos(pointA[0] * Math.PI / 180) * Math.cos(pointB[0] * Math.PI / 180) * Math.cos((pointB[1] - pointA[1]) * Math.PI / 180) + Math.sin(pointA[0] * Math.PI / 180) * Math.sin(pointB[0] * Math.PI / 180));

        resolve(dist);
    });
}