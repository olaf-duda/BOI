import React, { useRef, useCallback, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView, StatusBar, TextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import html_script from '../html_script.js';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabTwoScreen() {
  const [startingAddress, setStartingAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');

  
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
          <TouchableOpacity style={styles.iconButton} onPress={handleStartingAddressSubmit}>
          <Text> {/* Wrap the MaterialIcons component with Text */}
            <MaterialIcons name="search" size={24} color="white" /> {/* MaterialIcons search icon */}
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
          <Text> {/* Wrap the MaterialIcons component with Text */}
            <MaterialIcons name="search" size={24} color="white" /> {/* MaterialIcons search icon */}
          </Text>
        </TouchableOpacity>
        </View>
        
        <WebView ref={mapRef} source={{ html: html_script }} style={styles.webview} />
        <View style={styles.buttonArea}>
          <TouchableOpacity style={styles.button} onPress={() => goToMyPosition(44.7866, 20.4489)}>
            <Text style={styles.buttonText}>Belgrade</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => goToMyPosition(35.6804, 139.7690)}>
            <Text style={styles.buttonText}>Tokyo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => goToMyPosition(40.4168, -3.7038)}>
            <Text style={styles.buttonText}>Madrid</Text>
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