import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, Switch, Text, StyleSheet, SafeAreaView, StatusBar, TextInput, Image, PermissionsAndroid, Alert, ActivityIndicator } from 'react-native';
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

import '../../global.js'


export default function TabTwoScreen() {
  const [isFreeRouteEnabled, setIsEnabled] = useState(false);
  const [isLoadingSpinner, setIsLoading] = useState(false);
  const [routeCost, setRouteCost] = useState(-1);
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
  const [walk1Time, setWalk1Time] = useState(0);
  const [bikeTime, setBikeTime] = useState(0);
  const [walk2Time, setWalk2Time] = useState(0);
  let isDestinationWalk = false;

  const handleBalancedRoute = async () => {
    setIsLoading(true);
    setSelectedRoute("TRIANGLE");
    await findRoute("TRIANGLE");
    setIsLoading(false);
  }

  const handleFastRoute = async () => {
    setIsLoading(true);
    setSelectedRoute("QUICK");
    await findRoute("QUICK");
    setIsLoading(false);
  }

  const handleSafeRoute = async () => {
    setIsLoading(true);
    setSelectedRoute("SAFE");
    await findRoute("SAFE");
    setIsLoading(false);
  }

  const handleFlatRoute = async () => {
    setIsLoading(true);
    setSelectedRoute("FLAT");
    await findRoute("FLAT");
    setIsLoading(false);
  }

  const SettleCostTime = (minutes: number) => {
    console.log("Setting cost time")
    console.log(bikeTime)
    if (isFreeRouteEnabled) {
      setRouteCost(0);
      return;
    }
    if (minutes <= 20 && minutes > 0) {
      console.log("setting route cost to 0 2.")
      setRouteCost(0);
    }
    else if (minutes >= 21 && minutes <= 60) {
      console.log("setting route cost to 1")
      setRouteCost(1);
    }
    else if (minutes > 60 && minutes <= 120) {
      console.log("setting route cost to 3")
      setRouteCost(3);
    }
    else if (minutes > 120 && minutes <= 180) {
      setRouteCost(5);
    }
    else if (minutes > 180 && minutes <= 720) {
      // probability of happening is extremely low
      let hours = Math.ceil(minutes / 60) - 3;
      setRouteCost(hours * 7);
    }
    else if (minutes > 720) {
      // penalty for overrenting a bike
      setRouteCost(200);
    }
  }

  const ShowPopup = (title: string, message: string) => {
    Alert.alert(
      title,
      message,
      [{ text: "OK", onPress: () => console.log("OK Pressed") }],
      { cancelable: false }
    );
  };

  const handleStartingAddressSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startingAddress)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setStartingCoordinates({ lat: parseFloat(lat), lon: parseFloat(lon) });
        addNewMarker(parseFloat(lat), parseFloat(lon), 2, `${startingAddress}`, 0);
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
    setIsLoading(false);
  }, [startingAddress]);

  const handleDestinationAddressSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationAddress)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setDestinationCoordinates({ lat: parseFloat(lat), lon: parseFloat(lon) });
        addNewMarker(parseFloat(lat), parseFloat(lon), 1, `${destinationAddress}`, 0);
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
    setIsLoading(false);

  }, [destinationAddress]);

  const handleSetStartingLocation = async () => {
    setIsLoading(true);
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
      addNewMarker(latitude, longitude, 2, "Your localization", 0);
    } catch (error) {
      console.error('Error getting location:', error);
    }
    setIsLoading(false);
  };

  function findCorrespondingStation(lat: number, lon: number): Station | null {
    // Function to round a number to a specified number of decimal places
    const roundTo = (num: number, decimalPlaces: number): number => {
      var p = Math.pow(10, decimalPlaces);
      return Math.round(num * p) / p;
    };

    // Determine the number of decimal places in the input coordinates
    const latDecimalPlaces = lat.toString().split('.')[1]?.length || 0;
    const lonDecimalPlaces = lon.toString().split('.')[1]?.length || 0;

    var foundStation: Station | null = null;

    bikeStations.forEach((station: Station) => {
      // Round station coordinates to the same number of decimal places as the input coordinates
      var stationLat = roundTo(station.geoCoords.lat, latDecimalPlaces);
      var stationLon = roundTo(station.geoCoords.lng, lonDecimalPlaces);

      if (stationLat === lat && stationLon === lon) {
        foundStation = station;
      }
    });

    return foundStation;
  }

  const findRoute = async (bicycleRouteType: string) => {
    try {
      clearMap();
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
        let nearestStartingStation = kdTree.findNearestNeighbors([startingCoordinates.lat, startingCoordinates.lon], 20);
        for (let iter = 0; iter < nearestStartingStation.length; iter++) {
          var nearestStartingStationObject = findCorrespondingStation(nearestStartingStation[iter].lat, nearestStartingStation[iter].lon);

          if (nearestStartingStationObject != null && nearestStartingStationObject['bikes']['length'] >= 2) {
            nearestStartingStation[0] = nearestStartingStation[iter];
            break;
          }
          console.log(`Station ${nearestStartingStationObject?.['name']} was rejected due to not enough bikes.`)
        }

        const nearestDestinationStation = kdTree.findNearestNeighbors([destinationCoordinates.lat, destinationCoordinates.lon], 1);

        var result = await otpFindRoute("BICYCLE", bicycleRouteType, nearestStartingStation[0], nearestDestinationStation[0], "blue", kdTree)
        if (result != -1) {
          await otpFindRoute("WALK", bicycleRouteType, startingCoordinates, nearestStartingStation[0], "red", kdTree);
          await otpFindRoute("WALK", bicycleRouteType, nearestDestinationStation[0], destinationCoordinates, "red", kdTree);

          addNewMarker(startingCoordinates.lat, startingCoordinates.lon, 2, `${startingAddress}`, 0);
          let startStationData = findCorrespondingStation(nearestStartingStation[0].lat, nearestStartingStation[0].lon);
          let finalStationData = findCorrespondingStation(nearestDestinationStation[0].lat, nearestDestinationStation[0].lon);
          addNewMarker(nearestStartingStation[0].lat, nearestStartingStation[0].lon, 3, `<i>Rent your bike here!</i> <br /> Station name: <b>${startStationData?.['name']}</b> <br /> Number of bikes in the station: <b>${startStationData?.['bikes']['length']}</b>`, 1);
          addNewMarker(nearestDestinationStation[0].lat, nearestDestinationStation[0].lon, 3, `Station name: <b>${finalStationData?.['name']}</b> <br /> Here, return the bike and reach your destination on foot from now on!`, 3);
          addNewMarker(destinationCoordinates.lat, destinationCoordinates.lon, 1, `${destinationAddress}`, 0);
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

    const requestBody = createRequest(bicycleRouteType, startingCoordinates, destinationCoordinates, travelType);

    const response = await axios.post((global as any).otpApiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const legs = response.data.data.plan.itineraries[0].legs;
    let durationInMinutes = (response.data.data.plan.itineraries[0].endTime - response.data.data.plan.itineraries[0].startTime) / (1000 * 60);
    setRouteTime(prevRouteTime => prevRouteTime + Math.round(durationInMinutes));

    if (travelType == "BICYCLE") {
      console.log("setting bike time 1.")
      setBikeTime(Math.round(durationInMinutes))
      SettleCostTime(Math.round(durationInMinutes));
    }
    else if (isDestinationWalk) {
      setWalk2Time(Math.round(durationInMinutes))
      isDestinationWalk = !isDestinationWalk;
    }
    else {
      setWalk1Time(Math.round(durationInMinutes))
      isDestinationWalk = !isDestinationWalk;
    }

    if (durationInMinutes <= 17 || travelType == "WALK" || !isFreeRouteEnabled) {
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
    else if (isFreeRouteEnabled) {
      const cheapRouteOutput = await CheapRoute(startingCoordinates, destinationCoordinates, durationInMinutes, kdTree, bicycleRouteType);
      const [CRO1, CRO2] = cheapRouteOutput;
      if (CRO2 == -1) {
        const title = "Warning"
        const message = "We're sorry, but the route you tried to find is impossible to traverse without additional payment. If you still want to know the route, unselect the \"Free route\" mode."
        clearMap();
        setWalk1Time(0);
        setWalk2Time(0);
        setBikeTime(0);
        setSelectedRoute("")
        setRouteCost(-1)
        ShowPopup(title, message);
        return -1;
      }
      let points = cheapRouteOutput[0] as number[][][]
      let routeDuration = cheapRouteOutput[1] as number
      console.log("route duration" + routeDuration)
      console.log("setting bike time 2.")
      setBikeTime(Math.round(routeDuration))
      SettleCostTime(Math.round(routeDuration));

      drawLineBetweenPoints(startingCoordinates.lon, startingCoordinates.lat, points[0][0][0], points[0][0][1], color);
      for (let j = 0; j < points.length; j++) {
        for (let i = 0; i < points[j].length - 1; i++) {
          const [lat1, lon1] = points[j][i];
          const [lat2, lon2] = points[j][i + 1];
          drawLineBetweenPoints(lon1, lat1, lon2, lat2, color);
        }
        if (j !== points.length - 1) {
          let stationData = findCorrespondingStation(points[j][points[j].length - 1][1], points[j][points[j].length - 1][0]);
          console.log(`Transition station coordinates from points: (${points[j][points[j].length - 1][1]}, ${points[j][points[j].length - 1][0]})`)
          addNewMarker(points[j][points[j].length - 1][1], points[j][points[j].length - 1][0], 3, `Station name: <b>${stationData?.['name']}</b> <br />Stop here, return the bike and rent it once again!`, 2)
        }
      }
    }
    else {

    }
    return 0;
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

  const addNewMarker = (lat: number, lon: number, markerType: number, addressInfo: string, bikeStationInfo: number) => {
    if (mapRef.current) {
      let script = `setCustomMarker(${lat}, ${lon}, ${markerType}, '${addressInfo}', ${bikeStationInfo});`;
      mapRef.current.injectJavaScript(script);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        {isLoadingSpinner && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
        <View style={styles.addressInputContainer}>
          <TextInput
            style={styles.addressInput}
            onChangeText={setStartingAddress}
            value={startingAddress}
            placeholder="Enter starting address..."
          />
          <TouchableOpacity style={styles.iconButton} onPress={handleSetStartingLocation}>
            <Text style={styles.buttonText}>
              <MaterialIcons name="pin-drop" size={24} color="#36aa12" />
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
            <Text style={styles.durationText}>
              <MaterialIcons name="directions-walk" size={24} color="#36aa12" />
              {walk1Time} min
              {'  '}

              <MaterialIcons name="double-arrow" size={24} color="#36aa12" />
              {'  '}

              <MaterialIcons name="directions-bike" size={24} color="#36aa12" />
              {' '}
              {bikeTime} min
              {'  '}

              <MaterialIcons name="double-arrow" size={24} color="#36aa12" />
              <MaterialIcons name="directions-walk" size={24} color="#36aa12" />

              {walk2Time} min

            </Text>
          )}
        </View>
        <View style={{ flex: 0.5, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
          <View style={{ height: 7 }}></View>
          <View style={styles.splitContainer}>
            <View style={styles.leftContainer}>
              <Text style={styles.label}>Free route mode:</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#77ee44" }}
                thumbColor={isFreeRouteEnabled ? "#339933" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleSwitch}
                value={isFreeRouteEnabled}
              />
            </View>
            <View style={styles.rightContainer}>
              <Text style={styles.label}>Cost of your route:</Text>
              <Text style={[routeCost == 0 ? styles.rightText : styles.label]}>
                {routeCost == -1 ? "" : routeCost == 0 ? "FREE!" : routeCost + " zł"}</Text>
            </View>
          </View>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    zIndex: 1000, // Ensure it covers other elements
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

  splitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  leftContainer: {
    width: '50%',
    alignItems: 'center',
  },
  rightContainer: {
    width: '50%',
    alignItems: 'center',
  },
  rightText: {
    marginRight: 10, // Space between the label and the switch
    fontSize: 16, // Adjust the font size as needed
    color: '#77ee44',
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











