import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView, StatusBar, TextInput, Image, PermissionsAndroid } from 'react-native';
import { WebView } from 'react-native-webview';
import html_script from '../html_script.js';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import {decode} from '../../algorithms/polyline.js'
import * as Location from 'expo-location';
import  KDTree  from '../../algorithms/kdtree.js';
import Station from '../../interfaces/Stations.js'
import useBikeStationList from '../../hook/bikeData.js';




export default function TabTwoScreen() {
  const [startingAddress, setStartingAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationCoordinates, setDestinationCoordinates] = useState({ lat: 52.2297, lon: 21.0122 });
  const [startingCoordinates, setStartingCoordinates] = useState({ lat: 52.2297, lon: 21.0122 });
  const [selectedRoute, setSelectedRoute] = useState('');
  const mapRef = useRef<WebView | null>(null);
  const otpApiUrl = 'http://192.168.0.101:8080/otp/routers/default/index/graphql';
  const {bikeStations, isLoading, error, fetchData} = useBikeStationList();
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

        otpFindRoute("WALK", bicycleRouteType, startingCoordinates, nearestStartingStation[0], "red");
        otpFindRoute("BICYCLE", bicycleRouteType, nearestStartingStation[0], nearestDestinationStation[0], "blue")
        otpFindRoute("WALK", bicycleRouteType, nearestDestinationStation[0], destinationCoordinates, "red");

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

  const otpFindRoute = async (travelType: string, bicycleRouteType: string, startingCoordinates: {lat: number, lon: number}, 
    destinationCoordinates:  {lat: number, lon: number}, color: string) => {
    const now = new Date();
      const currentDate = `${now.getFullYear()}-${(now.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;

      let triangle = "";
      if (bicycleRouteType == "TRIANGLE") {
        triangle = `triangle : {
          safetyFactor: 0.33, 
          slopeFactor: 0.33, 
          timeFactor: 0.34}`;
      }
      const requestBody = {
        query: `{
        plan(
            optimize: ${bicycleRouteType}
            ${triangle}
            from: { lat: ${startingCoordinates.lat}, lon: ${startingCoordinates.lon} }
            to: { lat: ${destinationCoordinates.lat}, lon: ${destinationCoordinates.lon} }
            date: "${currentDate}",
            time: "${currentTime}",
            transportModes: [
                {
                    mode: ${travelType}
                },
            ]) {
              itineraries {
                  startTime
                  endTime
                  legs {
                      mode
                      startTime
                      endTime
                      from {
                          name
                          lat
                          lon
                          departureTime
                          arrivalTime
                      }
                      to {
                          name
                          lat
                          lon
                          departureTime
                          arrivalTime
                      }
                      route {
                          gtfsId
                          longName
                          shortName
                      }
                      legGeometry {
                          points
                      }
                  }
              }
          }
      }`
      };
      
      const response = await axios.post(otpApiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const legs = response.data.data.plan.itineraries[0].legs;
      let durationInMinutes = (response.data.data.plan.itineraries[0].endTime - response.data.data.plan.itineraries[0].startTime) / (1000 * 60);
      setRouteTime(prevRouteTime => prevRouteTime + Math.round(durationInMinutes));

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
      let script ='';
      if(isStarting == true) {
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
            placeholder="Enter starting address"
          />
          <TouchableOpacity style={styles.iconButton} onPress={handleSetStartingLocation}>
            <Text style={styles.buttonText}>
              <MaterialIcons name="home" size={24} color="white" /> 
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleStartingAddressSubmit}>
            <Text> 
              <MaterialIcons name="search" size={24} color="white" /> 
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.addressInputContainer}>
          <TextInput
            style={styles.addressInput}
            onChangeText={setDestinationAddress}
            value={destinationAddress}
            placeholder="Enter destination address"
          />
          <TouchableOpacity style={styles.iconButton} onPress={handleDestinationAddressSubmit}>
            <Text> { }
              <MaterialIcons name="search" size={24} color="white" /> { }
            </Text>
          </TouchableOpacity>
        </View>
        <WebView ref={mapRef} source={{ html: html_script }} style={styles.webview} />
        <View style={styles.durationContainer}>
          {selectedRoute && (
            <Text style={styles.durationText}>Route time: {routeTime} minutes</Text>
          )}
        </View> 
        <View style={styles.buttonArea}>
          <TouchableOpacity
            style={[styles.button, selectedRoute === 'TRIANGLE' && styles.selectedButton]} 
            onPress={handleBalancedRoute}
          >
            <Text style={styles.buttonText}>Balanced route</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, selectedRoute === 'QUICK' && styles.selectedButton]}
            onPress={handleFastRoute}
          >
            <Text style={styles.buttonText}>Fast route</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, selectedRoute === 'SAFE' && styles.selectedButton]} 
            onPress={handleSafeRoute}
          >
            <Text style={styles.buttonText}>Safe route</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, selectedRoute === 'FLAT' && styles.selectedButton]} 
            onPress={handleFlatRoute}
          >
            <Text style={styles.buttonText}>Flat route</Text>
          </TouchableOpacity>
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
  },
  durationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  container: {
    flex: 1,
    backgroundColor: 'grey',
  },
  webview: {
    flex: 1,
  },
  buttonArea: {
    flex: 0.2,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  button: {
    width: 85,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'black',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: 'blue', // Change the color for the selected route
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