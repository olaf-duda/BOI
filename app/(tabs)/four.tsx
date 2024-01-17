import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, Switch, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import axios from 'axios';

import html_script from '../html_script.js';

import useBikeStationList from '../../hook/bikeData.js';

import Station from '../../interfaces/Stations.js'
import  KDTree  from '../../algorithms/kdtree.js';
import { createRequest } from '../../algorithms/createRequest.js'
import { CheapRouteTime } from '../../algorithms/cheapRouteDuration.js'
import { decode } from '../../algorithms/polyline.js'
import * as FileSystem from 'expo-file-system'
const { StorageAccessFramework } = FileSystem;
export default function TabFourScreen() {
  const [isFreeRouteEnabled, setIsEnabled] = useState(true);
  const {bikeStations, isLoading, error, fetchData} = useBikeStationList();
  const [routeTime, setRouteTime] = useState(0);
  const [walk1Time, setWalk1Time] = useState(0);
  const [bikeTime, setBikeTime] = useState(0);
  const [walk2Time, setWalk2Time] = useState(0);

  const [destinationCoordinates, setDestinationCoordinates] = useState({ lat: 52.2397, lon: 21.0122 });
  const [startingCoordinates, setStartingCoordinates] = useState({ lat: 52.2297, lon: 21.0122 });

  let isDestinationWalk = false;

  const handleDataCollection = () => {
    findRoute();
  }

  const mapRef = useRef<WebView | null>(null);


  const findRoute = async () => {

    try {
      // tabelka z duration tras miedzy stacjami
      // 2x wykresy po 4 linie (odleglosc miedzy stacjami) / (duration miedzy stacjami)
      // mapa ciepła duration punktów do pałacu kultury
      // mapa ciepła punktów do nabliższej stacji veturilo
      
      setRouteTime(0);
      setWalk1Time(0);
      setBikeTime(0);
      setWalk2Time(0);
      isDestinationWalk = false;

      if (bikeStations && bikeStations.length > 0) {
        const stationCoordinates = bikeStations.map((station: Station) => [
          station.geoCoords.lat,
          station.geoCoords.lng,
        ]);
        const kdTree = new KDTree(stationCoordinates);

        let contentNormal = ""
        let contentCheap = ""
        for(let i = 0; i < 100; i++){
            const firstIndex = Math.floor(Math.random()*stationCoordinates.length);
            let secondIndex = Math.floor(Math.random()*stationCoordinates.length);
            
            while(secondIndex == firstIndex) 
              secondIndex = Math.floor(Math.random()*stationCoordinates.length);

            setIsEnabled(false);
            
            console.log('iteration number: ' + i + ': ' + stationCoordinates[firstIndex] + ' and ' + stationCoordinates[secondIndex] );
            contentNormal += await otpFindRoute("BICYCLE", "TRIANGLE", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree);

            console.log('(BALANCED) size of Content Normal is: ' + contentNormal.length);
            contentNormal += await otpFindRoute("BICYCLE", "QUICK", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree);

            console.log('(QUICK) size of Content Normal is: ' + contentNormal.length);
            contentNormal += await otpFindRoute("BICYCLE", "FLAT", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree);

            console.log('(FLAT) size of Content Normal is: ' + contentNormal.length);
            contentNormal += await otpFindRoute("BICYCLE", "SAFE", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree);

            console.log('(SAFE) size of Content Normal is: ' + contentNormal.length);
            

            setIsEnabled(true);
            
            contentCheap += await otpFindRoute("BICYCLE", "TRIANGLE", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree);
            contentCheap += await otpFindRoute("BICYCLE", "QUICK", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree);
            contentCheap += await otpFindRoute("BICYCLE", "FLAT", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree);
            contentCheap += await otpFindRoute("BICYCLE", "SAFE", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree);
            
            console.log('(SAFE) size of Content Cheap is: ' + contentCheap.length);
        }

        const permissionsNormal = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        // Check if permission granted
        if (permissionsNormal.granted) {
          let directoryUri = permissionsNormal.directoryUri;
          let fileName = "NormalData";
          await StorageAccessFramework.createFileAsync(directoryUri, fileName, "text/plain").then(async(fileUri) => {
                await FileSystem.writeAsStringAsync(fileUri, contentNormal, { encoding: FileSystem.EncodingType.UTF8 });
          })
          .catch((e) => {
            console.log(e);
          });

        }
        else {
          alert("You must allow permission to save.")
        }
      
        const permissionsCheap = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        // Check if permission granted
        if (permissionsCheap.granted) {
          let directoryUri = permissionsCheap.directoryUri;
          let fileName = "CheapData";
          await StorageAccessFramework.createFileAsync(directoryUri, fileName, "text/plain").then(async(fileUri) => {
                await FileSystem.writeAsStringAsync(fileUri, contentCheap, { encoding: FileSystem.EncodingType.UTF8 });
          })
          .catch((e) => {
            console.log(e);
          });

        }
        else {
          alert("You must allow permission to save.")
        }

      }
      return 1;
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  }

  const otpFindRoute = async (travelType: string, bicycleRouteType: string, startingCoordinates: { lat: number, lon: number },
    destinationCoordinates: { lat: number, lon: number }, color: string, kdTree: KDTree) => {
    let returnContent = "";
    console.log("begin collecting data");
    const requestBody = createRequest(bicycleRouteType, startingCoordinates, destinationCoordinates, travelType);

    const response = await axios.post((global as any).otpApiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let durationInMinutes = await Math.round((response.data.data.plan.itineraries[0].endTime - response.data.data.plan.itineraries[0].startTime) / (1000 * 60));
    setRouteTime(prevRouteTime => prevRouteTime + Math.round(durationInMinutes));

    setBikeTime(Math.round(durationInMinutes))
    let distance = Math.round(calculateHaversineDistance(startingCoordinates, destinationCoordinates));

    if(durationInMinutes <=17 || !isFreeRouteEnabled ){
      returnContent = await bicycleRouteType + ' ' + durationInMinutes + ' ' + distance + '\n'; 
    }
    else if (isFreeRouteEnabled){
        let time = await CheapRouteTime(startingCoordinates, destinationCoordinates, durationInMinutes, kdTree, bicycleRouteType);
        if(time == -1){
            console.log("Found non-existent route");
            return "";
        }
        let distance = Math.sqrt((startingCoordinates.lat - destinationCoordinates.lat) ** 2 + (startingCoordinates.lon - destinationCoordinates.lon) ** 2);

        returnContent = await bicycleRouteType + ' ' + time + ' ' + distance + '\n'; 
    }

    console.log("finished writing in the data");
    return returnContent;
  }
  
  const handleStationAddress = useCallback( () => {
    console.log("starting the loop")
    if (bikeStations && bikeStations.length > 0) {
      // Preprocess stations to extract only coordinates
      const stationCoordinates = bikeStations.map((station: Station) => [
        station.geoCoords.lat,
        station.geoCoords.lng,
      ]);
      // Create KD-tree with station coordinates
      const kdTree = new KDTree(stationCoordinates);
      


    }
  }, [bikeStations]);

  
  useEffect(() => {
    handleStationAddress();
  }, [bikeStations])

  function degreesToRadians(degrees: number) {
    return degrees * Math.PI / 180;
}

function calculateHaversineDistance(startingCoordinates: { lat: number; lon: number; }, destinationCoordinates: { lat: number; lon: number; }) {
    const earthRadius = 6371000; // Earth's radius in meters

    const dLat = degreesToRadians(destinationCoordinates.lat - startingCoordinates.lat);
    const dLon = degreesToRadians(destinationCoordinates.lon - startingCoordinates.lon);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(degreesToRadians(startingCoordinates.lat)) * Math.cos(degreesToRadians(destinationCoordinates.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = earthRadius * c;

    return distance;
}

return (
  <>
    <StatusBar barStyle="dark-content" />
    <SafeAreaView style={styles.container}>
      <WebView ref={mapRef} source={{ html: html_script }} style={styles.webview} onLoad={handleStationAddress}/>
      <View style={styles.buttonArea}>
            <TouchableOpacity
              style={[styles.button]}
              onPress={handleDataCollection}
            >
              <Text style={[styles.buttonText]}>Balanced route</Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
  </>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'grey',
  },
  webview: {
    flex: 1,
  },
  buttonArea: {
    flex: 0.3,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  button: {
    width: 80,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'black',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 5,
    margin: 10,
  },
  addressInput: {
    flex: 1,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: 'blue',
    borderRadius: 20, // To make it circular
    justifyContent: 'center',
    alignItems: 'center',
  },
});