import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, Switch, Text, StyleSheet, SafeAreaView, StatusBar, TextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import axios from 'axios';

import html_script from '../html_script.js';

import useBikeStationList from '../../hook/bikeData.js';

import Station from '../../interfaces/Stations.js'
import  KDTree  from '../../algorithms/kdtree.js';
import { createRequest } from '../../algorithms/createRequest.js'
import { CheapRoute } from '../../algorithms/cheapRoute.js'
import { decode } from '../../algorithms/polyline.js'
import * as FileSystem from 'expo-file-system'
import { MaterialIcons } from '@expo/vector-icons';

const { StorageAccessFramework } = FileSystem;
export default function TabFourScreen() {
  const {bikeStations, isLoading, error, fetchData} = useBikeStationList();
  const [anchorAddress, setAnchorAddress] = useState('');
  const [anchorCoordinates, setAnchorCoordinates] = useState({ lat: 52.2297, lon: 21.0122 });

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

  const handleCentreHeatMap = () => {
    findRoutesToCentre();
  }

  const mapRef = useRef<WebView | null>(null);

  const findRoutesToCentre = async () => {
    try {
      if (bikeStations && bikeStations.length > 0) {
        const stationCoordinates = bikeStations.map((station: Station) => [
          station.geoCoords.lat,
          station.geoCoords.lng,
        ]);

        let centreStationCoordinates: [number, number] = [0, 0];
        bikeStations.find((station: Station) => {
            if (station.name === 'Metro Centrum') {
                centreStationCoordinates = [station.geoCoords.lat, station.geoCoords.lng];
              console.log("znalazlo centrum " + centreStationCoordinates)

                return true;
            }
            return false;
        });

        

        const kdTree = new KDTree(stationCoordinates);
        if(anchorCoordinates) {
          const nearestAnchorStation = kdTree.findNearestNeighbors([anchorCoordinates.lat, anchorCoordinates.lon], 1);
          centreStationCoordinates = [nearestAnchorStation[0].lat, nearestAnchorStation[0].lon]
        }
        let previous_stations: number[] = [];
        let contentNormal = ""
        for(let i = 0; i < stationCoordinates.length-1; i++){
            
            let secondIndex = Math.floor(Math.random()*stationCoordinates.length);
            
            while(previous_stations.includes(secondIndex) || (centreStationCoordinates[0] == stationCoordinates[secondIndex][0] && centreStationCoordinates[1] == stationCoordinates[secondIndex][1])) 
              secondIndex = Math.floor(Math.random()*stationCoordinates.length);

            previous_stations.push(secondIndex);
            
            console.log('iteration number: ' + i + " " + stationCoordinates[secondIndex] );
            console.log(centreStationCoordinates , stationCoordinates[secondIndex])
            contentNormal = await otpFindRoute("BICYCLE", "QUICK", {lat: centreStationCoordinates[0], lon: centreStationCoordinates[1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree, false);


            const numberRegex = /\b\d+\b/;

            const match = contentNormal.match(numberRegex);

            // Check if a match is found
            let value = 0;

            if (match) {
                value = parseInt(match[0], 10); // Convert the matched string to an integer
                console.log("Extracted value:", value);
            } else {
                console.log("No number found in the string.");
            }
            
            let color = valueToHeatmapColor(value);
            console.log(color)
            if (mapRef.current) {
              const script = `
                  if (typeof map !== 'undefined') {
                  L.circle([${stationCoordinates[secondIndex][0]}, ${stationCoordinates[secondIndex][1]}], {
                    color: '${color.toString()}',
                    fillColor: '${color.toString()}',
                    radius: 150
                  }).addTo(map);
                  }
              `;
              //console.log("Station at:" + lat + " " + lng + "\n");
              mapRef.current.injectJavaScript(script);
            }
           
        }
      }
      return 1;
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  }

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

        let previous_pairs: number[][] = [[]];
        let contentNormal = ""
        let contentCheap = ""
        for(let i = 0; i < stationCoordinates.length; i++){
            const firstIndex = i;
            let secondIndex = Math.floor(Math.random()*stationCoordinates.length);
            
            while(secondIndex == firstIndex || previous_pairs.includes([Math.min(firstIndex, secondIndex), Math.max(firstIndex, secondIndex)])) 
              secondIndex = Math.floor(Math.random()*stationCoordinates.length);

            previous_pairs.push([Math.min(firstIndex, secondIndex), Math.max(firstIndex, secondIndex)]);
            
            console.log('iteration number: ' + i + ': ' + stationCoordinates[firstIndex] + ' and ' + stationCoordinates[secondIndex] );
            contentNormal += await otpFindRoute("BICYCLE", "TRIANGLE", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree, false);

            console.log('(BALANCED) size of Content Normal is: ' + contentNormal.length);
            contentNormal += await otpFindRoute("BICYCLE", "QUICK", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree, false);

            console.log('(QUICK) size of Content Normal is: ' + contentNormal.length);
            contentNormal += await otpFindRoute("BICYCLE", "FLAT", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree, false);

            console.log('(FLAT) size of Content Normal is: ' + contentNormal.length);
            contentNormal += await otpFindRoute("BICYCLE", "SAFE", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree, false);

            console.log('(SAFE) size of Content Normal is: ' + contentNormal.length);
            
            contentCheap += await otpFindRoute("BICYCLE", "TRIANGLE", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree, true);
            contentCheap += await otpFindRoute("BICYCLE", "QUICK", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree, true);
            contentCheap += await otpFindRoute("BICYCLE", "FLAT", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree, true);
            contentCheap += await otpFindRoute("BICYCLE", "SAFE", {lat: stationCoordinates[firstIndex][0], lon: stationCoordinates[firstIndex][1]},
                    {lat: stationCoordinates[secondIndex][0], lon: stationCoordinates[secondIndex][1]}, "blue", kdTree, true);
            
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
    destinationCoordinates: { lat: number, lon: number }, color: string, kdTree: KDTree, isFreeRouteEnabled: boolean) => {
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
      returnContent = await bicycleRouteType + isFreeRouteEnabled + ' ' + durationInMinutes + ' ' + distance + '\n'; 
    }
    else if (isFreeRouteEnabled){
      const cheapRouteOutput = await CheapRoute(startingCoordinates, destinationCoordinates, durationInMinutes, kdTree, bicycleRouteType);
      let time = cheapRouteOutput[1] as number
        if(time == -1){
            console.log("Found non-existent route");
            return bicycleRouteType + ' ' + 'NaN' + ' ' + distance + '\n'; 
        }

        returnContent = await bicycleRouteType + isFreeRouteEnabled + ' ' + Math.round(time) + ' ' + distance + '\n'; 
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
function valueToHeatmapColor(value: number) {
  // Normalize the value to the range [0, 1]
  const normalizedValue = Math.min(Math.max(value / 80, 0), 1);

  // Set the hue based on the normalized value
  const hue = (normalizedValue - 1) * 240; // 0 (blue) to 240 (red)

  // Set saturation value
  const saturation = 90; // 0 to 100

  // Adjust lightness dynamically for a gradient effect
  const lightness = 40; // Adjust the range for desired darkness

  // Convert HSL to RGB
  const rgbColor = hslToRgb(hue, saturation, lightness);

  // Convert RGB to hexadecimal color
  const hexColor = rgbToHex(rgbColor);

  return hexColor;
}

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number) {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
      r = g = b = l; // achromatic
  } else {
      const hue2rgb = function hue2rgb(p: number, q: number, t: number) {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

  // Helper function to convert RGB to hexadecimal
  function rgbToHex(rgb: any[]) {
    return '#' + rgb.map((value: { toString: (arg0: number) => string; }) => value.toString(16).padStart(2, '0')).join('');
  }
  const clearMap = () => {
    // Clear the map - Remove all overlays (polylines and markers)
    if (mapRef.current) {
      const clearMapScript = `
        if (typeof map !== 'undefined') {
          map.eachLayer((layer) => {
            if (layer instanceof L.Circle || layer instanceof L.Marker) {
              map.removeLayer(layer);
            }
          });
        }
      `;
      mapRef.current.injectJavaScript(clearMapScript);
    }
  }
  const handleAnchorAddressSubmit = useCallback(async () => {
    clearMap();
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(anchorAddress)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setAnchorCoordinates({ lat: parseFloat(lat), lon: parseFloat(lon) });
        if (mapRef.current) {
          const script = `
              if (typeof map !== 'undefined') {
              L.marker([${lat}, ${lon}]).addTo(map).bindPopup('Anchor point');
              }
          `;
          //console.log("Station at:" + lat + " " + lng + "\n");
          mapRef.current.injectJavaScript(script);
        }
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
  }, [anchorAddress]);

return (
  <>
    <StatusBar barStyle="dark-content" />
    <SafeAreaView style={styles.container}>
      <WebView ref={mapRef} source={{ html: html_script }} style={styles.webview} onLoad={handleStationAddress}/>
      <View style={styles.addressInputContainer}>
          <TextInput
            style={styles.addressInput}
            onChangeText={setAnchorAddress}
            value={anchorAddress}
            placeholder="Enter destination address..."
          />
          <TouchableOpacity style={styles.iconButton} onPress={handleAnchorAddressSubmit}>
            <Text> { }
              <MaterialIcons name="search" size={24} color="#36aa12" /> { }
            </Text>
          </TouchableOpacity>
        </View>
      <View style={styles.buttonArea}>
            <TouchableOpacity
              style={[styles.button]}
              onPress={handleDataCollection}
            >
              <Text style={[styles.buttonText]}>Save statistics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button]}
              onPress={handleCentreHeatMap}
            >
              <Text style={[styles.buttonText]}>Heat map to centre</Text>
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