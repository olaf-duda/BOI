import React, { useRef, useCallback, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView, Button, StatusBar, TextInput, Image, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation hook
import html_script from '../html_script.js';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import EditScreenInfo from '../../components/EditScreenInfo';


import { FlatList } from "react-native-gesture-handler";

import useBikeStationList from '../../hook/bikeData'

import Station from '../../interfaces/Stations.js'

export default function TabOneScreen() {
  const [startingAddress, setStartingAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const [coordinates, setCoordinates] = useState({ lat: 52.2297, lon: 21.0122 }); // Default coordinates

  const handleStartingAddressSubmit = useCallback(async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startingAddress)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0]; // Get latitude and longitude
        setCoordinates({ lat: parseFloat(lat), lon: parseFloat(lon) });
        goToMyPosition(parseFloat(lat), parseFloat(lon)); // Update map with new coordinates
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
        const { lat, lon } = data[0]; // Get latitude and longitude
        setCoordinates({ lat: parseFloat(lat), lon: parseFloat(lon) });
        goToMyPosition(parseFloat(lat), parseFloat(lon)); // Update map with new coordinates
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
  }, [destinationAddress]);

  const mapRef = useRef<WebView | null>(null);

  const goToMyPosition = (lat: number, lon: number) => {
    if (mapRef.current) {
      const script = `
        if (typeof map !== 'undefined') {
          map.setView([${lat}, ${lon}], 10);
          L.marker([${lat}, ${lon}]).addTo(map);
        }
      `;
      mapRef.current.injectJavaScript(script);
    }
  };

  type RootTabParamList = {
    index: undefined;
    two: undefined; // Make sure this name matches your route name
  };


  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <WebView ref={mapRef} source={{ html: html_script }} style={styles.webview} />
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('two')}
        >
          <Text style={styles.buttonText}>Find a route!</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

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
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#000000', // Background color set to black
  },
  button: {
    width: '100%',
    height: '10%', // 10% of screen height
    borderRadius: 20, // Adjust for desired corner roundness
    backgroundColor: '#44AA44',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#006600', // Border color changed for visibility
  },
  buttonText: {
    color: 'white',
    fontSize: 24,
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