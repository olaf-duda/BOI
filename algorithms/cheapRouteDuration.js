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
function distance(pointA, pointB) {
    return new Promise(resolve => {
        const dist = Math.sqrt((pointA[0] - pointB[0]) ** 2 + (pointA[1] - pointB[1]) ** 2);
        resolve(dist);
    });
}

async function findStationsNoBacktracking(result_points, previous_stop_index, final_stop, kdTree, routeType, noOfSubstations) {

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

    for (var i = 0; i < numOfStations; i++) {
        if (result_points.includes(nearestStops[i]) ||
            result_points[previous_stop_index].lat == nearestStops[i].lat &&
            result_points[previous_stop_index].lon == nearestStops[i].lon)
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
        if (durationInMinutes <= 17) {
            const encodedRouteToNearestStop = responseDataObject.plan.itineraries[0].legs[0].legGeometry.points;
            routeDuration += durationInMinutes;
            console.log("Adding " + durationInMinutes + " minutes");
            return [nearestStops[i], encodedRouteToNearestStop];
        }
    }
    if (noOfSubstations <= 15) {
        await noOfSubstations++;
        return await findStationsNoBacktracking(result_points, previous_stop_index, final_stop, kdTree, routeType, noOfSubstations);
    }
    console.log("didnt find station");

    return [nearestStops[i], ""];
}