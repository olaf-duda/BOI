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
let remainingTime = 0;

export async function CheapRoute(startingCoordinates, destinationCoordinates, routeTime, kdTree, routeType) {
    routeDuration = 0;
    result_points = [startingCoordinates];
    full_route = [];
    remainingTime = routeTime;

    // if (await findRoute(startingCoordinates, destinationCoordinates, routeTime, kdTree, routeType, [])) {
    //     //console.log("Found the route:");
    //     console.log(" ", result_points, "full rut")
    //     return [full_route, routeDuration];
    // }
    // else {
    console.log("Didn't find a free route; attempting to find a 1h route:")
    return await CheapRouteNoBacktracking(startingCoordinates, destinationCoordinates, routeTime, kdTree, routeType);
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

    let findStationsOutput = await findStations(result_points, result_points.length - 1, destinationCoordinates, kdTree, routeType, noOfSubstations, visitedStations, true);

    // if(findStationsOutput[1] == "") {
    //     findStationsOutput = await findStations(result_points, result_points.length-1, destinationCoordinates, kdTree, routeType, noOfSubstations+1, visitedStations);
    // } 

    //console.log("find Stations " + findStationsOutput[0].lat + " " + findStationsOutput[0].lon)

    if (findStationsOutput[1] != "") {
        const new_stop = findStationsOutput[0];
        const new_subroute = decode(findStationsOutput[1]);

        result_points.push(new_stop);
        if (result_points.length > 21)
            return false
        full_route.push(new_subroute);

        console.log(full_route.length + "full route elements")

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
        console.log("route duration before " + routeDuration)
        routeDuration -= currentNeededTime - newCurrentNeededTime;
        console.log("route duration after " + routeDuration)

        result_points.pop();
        full_route.pop();

        return await findRoute(startingCoordinates, destinationCoordinates, currentNeededTime, kdTree, routeType, visitedStations);
    }
    else {
        return false;
    }
}

async function findStations(result_points, previous_stop_index, final_stop, kdTree, routeType, noOfSubstations, visitedStations, isFree) {

    console.log("no tutaj juz na pewno")
    console.log(result_points[previous_stop_index])
    console.log(previous_stop_index)

    console.log(final_stop)
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
        //console.log(visitedStations, "\n", nearestStops[i])
        console.log(result_points.length + " result points")
        //console.log(visitedStations.length + " visited stations")
        if (result_points.length > 20)
            console.log(nearestStops[i], " ", result_points[result_points.length - 1], " ", result_points[result_points.length - 2])
        let cont = false;
        for (let iter = 0; iter < result_points.length; iter++) {
            cont = false;
            if (result_points.length > 18) {
                //console.log("point " + result_points[iter])
                //console.log("nearest point " + nearestStops[i])
            }

            console.log("Accessing latitude in 161")
            console.log("result pointssss:")
            console.log(result_points)
            console.log("nearest stopssss:")
            console.log(nearestStops)
            if (result_points[iter].lat == nearestStops[i].lat && result_points[iter].lon == nearestStops[i].lon) {
                console.log("Successfully accessed latitude in 161")
                console.log("takie same som gowno elo\n")
                cont = true;
                break;
            }
        }
        if (cont)
            continue;

        console.log("result pointy: ")
        console.log(result_points)
        console.log("Accessing latitude in 173")
        if (result_points.includes(nearestStops[i]) || visitedStations.includes(JSON.stringify(nearestStops[i])) ||
            (result_points[previous_stop_index].lat == nearestStops[i].lat &&
                result_points[previous_stop_index].lon == nearestStops[i].lon)) {
            console.log("Succesfully accesed latitude in 173")
            console.log("takie same som gowno elo 22222222222222222\n")
            continue;

        }
        console.log("nearest stop " + nearestStops[i])
        console.log("gowno dupa")
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
        const minutesLimit = isFree ? 17 : 57;


        if (durationInMinutes <= minutesLimit) {
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
    console.log("didnt find station");

    return [nearestStops[i], ""];
}

function distance(pointA, pointB) {
    return new Promise(resolve => {
        const dist = Math.sqrt((pointA[0] - pointB[0]) ** 2 + (pointA[1] - pointB[1]) ** 2);
        resolve(dist);
    });
}

async function CheapRouteNoBacktracking(startingCoordinates, destinationCoordinates, routeTime, kdTree, routeType) {
    let visitedStations = []
    routeDuration = 0;
    let currentNeededTime = routeTime;
    let noOfSubstations = Math.ceil(routeTime / 17) - 1;
    result_points = [startingCoordinates];
    full_route = [];
    let i = 0;

    while (currentNeededTime > 17) {
        remainingTime = currentNeededTime;
        noOfSubstations = Math.ceil(currentNeededTime / 17) - 1;
        let new_subroute = await findStations(result_points, i, destinationCoordinates, kdTree, routeType, noOfSubstations, visitedStations, true);

        if (new_subroute[1] == "") {
            console.log("SZUKA DUZEJ TRASYY" + currentNeededTime)

            if (currentNeededTime < 57) {

                const requestBody2 = createRequest(routeType, result_points[result_points.length - 1], destinationCoordinates, "BICYCLE")
                const response2 = await axios.post(global.otpApiUrl, requestBody2, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                routeDuration += currentNeededTime;
                full_route.push(decode(response2.data.data.plan.itineraries[0].legs[0].legGeometry.points));
                return [full_route, routeDuration];

            }
            noOfSubstations = Math.ceil(currentNeededTime / 57) - 1;
            console.log("number substations " + noOfSubstations)
            new_subroute = await findStations(result_points, i, destinationCoordinates, kdTree, routeType, noOfSubstations, visitedStations, false);
        }

        console.log(new_subroute[0], " ", destinationCoordinates)
        console.log("Accessing latitude in 253")

        if (new_subroute[0].lat == destinationCoordinates.lat && new_subroute[0].lon == destinationCoordinates.lon) {
            routeDuration += currentNeededTime;
            full_route.push(decode(new_subroute[1]));

            console.log("Successfully accesed latitude in 253")
            return [full_route, routeDuration];
        }

        // for (const object of result_points) {
        //     if (object.lat == new_subroute[0].lat && object.lon == new_subroute[0].lon) {
        //         return [-1, -1];
        //     }
        // }


        const requestBody = createRequest(routeType, new_subroute[0], destinationCoordinates, "BICYCLE")
        const response = await axios.post(global.otpApiUrl, requestBody, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        let oldCurrentNeededTime = currentNeededTime
        currentNeededTime = (response.data.data.plan.itineraries[0].endTime - response.data.data.plan.itineraries[0].startTime) / (1000 * 60);

        if (currentNeededTime > oldCurrentNeededTime) {
            console.log("kontiniu")
            visitedStations.push(new_subroute[0])
            currentNeededTime = oldCurrentNeededTime;

            continue;
        }

        i++;
        result_points.push(new_subroute[0]);
        full_route.push(decode(new_subroute[1]));

        if (currentNeededTime <= 17) {
            routeDuration += currentNeededTime;
            full_route.push(decode(response.data.data.plan.itineraries[0].legs[0].legGeometry.points));
        }
    }

    return [full_route, routeDuration];
}