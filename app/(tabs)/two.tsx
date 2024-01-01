import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, Switch, Text, StyleSheet, SafeAreaView, StatusBar, TextInput, Image, PermissionsAndroid } from 'react-native';
import { WebView } from 'react-native-webview';
import html_script from '../html_script.js';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';

import { decode } from '../../algorithms/polyline.js'
import { createRequest } from '../../algorithms/createRequest.js'
import { CheapRoute } from '../../algorithms/cheapRoute.js'

import * as Location from 'expo-location';
import KDTree from '../../algorithms/kdtree.js';
import Station from '../../interfaces/Stations.js'
import useBikeStationList from '../../hook/bikeData.js';

import '../../BOI/global.js'


export default function TabTwoScreen() {
  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => setIsEnabled(previousState => !previousState);
  const [startingAddress, setStartingAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationCoordinates, setDestinationCoordinates] = useState({ lat: 52.2297, lon: 21.0122 });
  const [startingCoordinates, setStartingCoordinates] = useState({ lat: 52.2297, lon: 21.0122 });
  const [selectedRoute, setSelectedRoute] = useState('');
  const mapRef = useRef<WebView | null>(null);
  const otpApiUrl = 'https://8976-2a02-a310-823d-9980-4c71-9824-7fdc-69bb.ngrok-free.app/otp/routers/default/index/graphql';
  const { bikeStations, isLoading, error, fetchData } = useBikeStationList();
  const [routeTime, setRouteTime] = useState(0);

  const handleBalancedRoute = () => {
    findRoute("TRIANGLE");
    setSelectedRoute("TRIANGLE");
  }

  const handleFastRoute = () => {
    findRoute("QUICK");
    setSelectedRoute("QUICK");
  }

  const handleSafeRoute = () => {
    findRoute("SAFE");
    setSelectedRoute("SAFE");
  }

  const handleFlatRoute = () => {
    findRoute("FLAT");
    setSelectedRoute("FLAT");

  }

  const handleStartingAddressSubmit = useCallback(async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startingAddress)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setStartingCoordinates({ lat: parseFloat(lat), lon: parseFloat(lon) });
        addNewMarker(parseFloat(lat), parseFloat(lon), true);
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
  }, [startingAddress]);

  const handleDestinationAddressSubmit = useCallback(async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationAddress)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setDestinationCoordinates({ lat: parseFloat(lat), lon: parseFloat(lon) });
        addNewMarker(parseFloat(lat), parseFloat(lon), false);
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
  }, [destinationAddress]);

  const handleSetStartingLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setStartingCoordinates({ lat: latitude, lon: longitude });
      setStartingAddress("Your localization")
      addNewMarker(latitude, longitude, true);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const findRoute = async (bicycleRouteType: string) => {
    try {
      clearMap();
      setRouteTime(0);

      if (bikeStations && bikeStations.length > 0) {
        const stationCoordinates = bikeStations.map((station: Station) => [
          station.geoCoords.lat,
          station.geoCoords.lng,
        ]);
        const kdTree = new KDTree(stationCoordinates);
        const nearestStartingStation = kdTree.findNearestNeighbors([startingCoordinates.lat, startingCoordinates.lon], 1);
        const nearestDestinationStation = kdTree.findNearestNeighbors([destinationCoordinates.lat, destinationCoordinates.lon], 1);

        otpFindRoute("WALK", bicycleRouteType, startingCoordinates, nearestStartingStation[0], "red", kdTree);
        otpFindRoute("BICYCLE", bicycleRouteType, nearestStartingStation[0], nearestDestinationStation[0], "blue", kdTree)
        otpFindRoute("WALK", bicycleRouteType, nearestDestinationStation[0], destinationCoordinates, "red", kdTree);

        addNewMarker(startingCoordinates.lat, startingCoordinates.lon, true);
        addNewMarker(nearestStartingStation[0].lat, nearestStartingStation[0].lon, false);
        addNewMarker(nearestDestinationStation[0].lat, nearestDestinationStation[0].lon, false);
        addNewMarker(destinationCoordinates.lat, destinationCoordinates.lon, false);
      }
      return 1;
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  }

  const otpFindRoute = async (travelType: string, bicycleRouteType: string, startingCoordinates: { lat: number, lon: number },
    destinationCoordinates: { lat: number, lon: number }, color: string, kdTree: KDTree) => {

    const requestBody = createRequest(bicycleRouteType, startingCoordinates, destinationCoordinates, travelType);

    const response = await axios.post((global as any).otpApiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const legs = response.data.data.plan.itineraries[0].legs;
    let durationInMinutes = (response.data.data.plan.itineraries[0].endTime - response.data.data.plan.itineraries[0].startTime) / (1000 * 60);
    setRouteTime(prevRouteTime => prevRouteTime + Math.round(durationInMinutes));
    if(durationInMinutes <=17 || travelType == "WALK"){
      legs.forEach((leg: { legGeometry: any; }) => {
        const legGeometry = leg.legGeometry;
        const points = decode(legGeometry.points);
        for (let i = 0; i < points.length - 1; i++) {
          const [lat1, lon1] = points[i];
          const [lat2, lon2] = points[i + 1];
          drawLineBetweenPoints(lon1, lat1, lon2, lat2, color);
        }
      });
    }
    else {
      let points = await CheapRoute(startingCoordinates, destinationCoordinates, durationInMinutes, kdTree, bicycleRouteType);
      drawLineBetweenPoints(startingCoordinates.lon, startingCoordinates.lat, points[0][0][0], points[0][0][1], color);
      for(let j = 0; j<points.length; j++) { 
        for (let i = 0; i < points[j].length-1; i++) {
          const [lat1, lon1] = points[j][i];
          const [lat2, lon2] = points[j][i + 1];
          drawLineBetweenPoints(lon1, lat1, lon2, lat2, color);
        }
        if(j !== points.length-1)
          addNewMarker(points[j][points[j].length-1][1], points[j][points[j].length-1][0], false)
      }   
    }
  }

  const clearMap = () => {
    // Clear the map - Remove all overlays (polylines and markers)
    if (mapRef.current) {
      const clearMapScript = `
        if (typeof map !== 'undefined') {
          map.eachLayer((layer) => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
              map.removeLayer(layer);
            }
          });
        }
      `;
      mapRef.current.injectJavaScript(clearMapScript);
    }
  }

  const drawLineBetweenPoints = (lat1: number, lon1: number, lat2: number, lon2: number, color: string) => {
    if (mapRef.current) {
      const script = `
        if (typeof map !== 'undefined') {
          const polyline = L.polyline([[${lat1}, ${lon1}],[${lat2}, ${lon2}]], {
            color: '${color}',
          }).addTo(map);
        }
      `;
      mapRef.current.injectJavaScript(script);
    }
  }

  const addNewMarker = (lat: number, lon: number, isStarting: boolean) => {
    if (mapRef.current) {
      let script = '';
      if (isStarting == true) {
        script = `
        if (typeof map !== 'undefined') {
          map.setView([${lat}, ${lon}], 13);
          L.marker([${lat}, ${lon}]).addTo(map).bindPopup('<b>Starting point</b> <br/> ${startingAddress}');
          
        }
      `;
      }
      else {
        script = `
        if (typeof map !== 'undefined') {
          map.setView([${lat}, ${lon}], 13);
          L.marker([${lat}, ${lon}]).addTo(map).bindPopup('<b>Destination point</b> <br/> ${destinationAddress}');
          
        }
      `;
      }
      mapRef.current.injectJavaScript(script);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.addressInputContainer}>
          <TextInput
            style={styles.addressInput}
            onChangeText={setStartingAddress}
            value={startingAddress}
            placeholder="Enter starting address..."
          />
          <TouchableOpacity style={styles.iconButton} onPress={handleSetStartingLocation}>
            <Text style={styles.buttonText}>
              <MaterialIcons name="home" size={24} color="#36aa12" />
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleStartingAddressSubmit}>
            <Text>
              <MaterialIcons name="search" size={24} color="#36aa12" />
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.addressInputContainer}>
          <TextInput
            style={styles.addressInput}
            onChangeText={setDestinationAddress}
            value={destinationAddress}
            placeholder="Enter destination address..."
          />
          <TouchableOpacity style={styles.iconButton} onPress={handleDestinationAddressSubmit}>
            <Text> { }
              <MaterialIcons name="search" size={24} color="#36aa12" /> { }
            </Text>
          </TouchableOpacity>
        </View>
        <WebView ref={mapRef} source={{ html: html_script }} style={styles.webview} />
        <View style={{ height: 7 }}></View>
        <View style={styles.durationContainer}>
          {selectedRoute && (
            <Text style={styles.durationText}>Route time: {routeTime} minutes</Text>
          )}
        </View>
        <View style={{ flex: 0.5, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
          <View style={{ height: 7 }}></View>
          <Text style={styles.label}>Free route mode:</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#77ee44" }}
            thumbColor={isEnabled ? "#339933" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleSwitch}
            value={isEnabled}
          />
          <Text style={styles.label}>Choose a route type:</Text>
          <View style={styles.buttonArea}>
            <TouchableOpacity
              style={[styles.button, selectedRoute === 'TRIANGLE' && styles.selectedButton]}
              onPress={handleBalancedRoute}
            >
              <Text style={[styles.buttonText, selectedRoute === 'TRIANGLE' && styles.selectedText]}>Balanced route</Text>
            </TouchableOpacity>
            <View style={{ width: 6 }} />
            <TouchableOpacity
              style={[styles.button, selectedRoute === 'QUICK' && styles.selectedButton]}
              onPress={handleFastRoute}
            >
              <Text style={[styles.buttonText, selectedRoute === 'QUICK' && styles.selectedText]}>Fastest route</Text>
            </TouchableOpacity>
            <View style={{ width: 6 }} />
            <TouchableOpacity
              style={[styles.button, selectedRoute === 'SAFE' && styles.selectedButton]}
              onPress={handleSafeRoute}
            >
              <Text style={[styles.buttonText, selectedRoute === 'SAFE' && styles.selectedText]}>Safest route</Text>
            </TouchableOpacity>
            <View style={{ width: 6 }} />
            <TouchableOpacity
              style={[styles.button, selectedRoute === 'FLAT' && styles.selectedButton]}
              onPress={handleFlatRoute}
            >
              <Text style={[styles.buttonText, selectedRoute === 'FLAT' && styles.selectedText]}>Flattest route</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};


const styles = StyleSheet.create({
  durationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    backgroundColor: 'black',
    borderColor: '#77ee44',
    borderRadius: 20,
    borderWidth: 1
  },
  selectedText: {
    color: 'black'
  },
  label: {
    marginRight: 10, // Space between the label and the switch
    fontSize: 16, // Adjust the font size as needed
    color: 'white'
  },
  durationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  webview: {
    flex: 1,
  },
  switchContainer: {
    // Adjust this style as needed
    marginBottom: 20, // Spacing between the switch and the buttons
    alignItems: 'center', // Center the switch horizontally
  },
  buttonArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  button: {
    width: 85,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#333333',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#77ee44', // Change the color for the selected route
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center'
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 15,
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
    backgroundColor: 'white',
    borderRadius: 20, // To make it circular
    justifyContent: 'center',
    alignItems: 'center',
  },
});