import React, { useRef, useCallback, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView, StatusBar, TextInput, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import html_script from '../html_script.js';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import decode from '../../algorithms/polyline.js'



export default function TabTwoScreen() {
  const [startingAddress, setStartingAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationCoordinates, setDestinationCoordinates] = useState({ lat: 52.2297, lon: 21.0122 }); 
  const [startingCoordinates, setStartingCoordinates] = useState({ lat: 52.2297, lon: 21.0122 });

  const mapRef = useRef<WebView | null>(null);

  const handleGraphQLQuery = async () => {
    try {
      const apiUrl = 'http://192.168.230.83:8080/otp/routers/default/index/graphql'; 
  
      const requestBody = {
        query: `{
          plan(
              # these coordinate are in Portland, change this to YOUR origin
              from: { lat: ${startingCoordinates.lat}, lon: ${startingCoordinates.lon} }
              # these coordinate are in Portland, change this to YOUR destination
              to: { lat: ${destinationCoordinates.lat}, lon: ${destinationCoordinates.lon} }
              # use the correct date and time of your request
              date: "2023-02-15",
              time: "11:37",
              # choose the transport modes you need
              transportModes: [
                  {
                      mode: BICYCLE
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
  
      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const legs = response.data.data.plan.itineraries[0].legs;
      legs.forEach((leg: { legGeometry: any; }) => {
        const legGeometry = leg.legGeometry;
        const points = decode(legGeometry.points);
        for (let i = 0; i < points.length - 1; i++) {
          const [lat1, lon1] = points[i];
          const [lat2, lon2] = points[i + 1];
          drawLineBetweenPoints( lon1, lat1, lon2, lat2 );
        }
      });
      
    return response.data; 
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
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
        goToMyPosition(parseFloat(lat), parseFloat(lon));
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
        goToMyPosition(parseFloat(lat), parseFloat(lon));
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
  }, [destinationAddress]);


  const drawLineBetweenPoints = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (mapRef.current) {
      const script = `
        if (typeof map !== 'undefined') {
          const polyline = L.polyline([[${lat1}, ${lon1}],[${lat2}, ${lon2}]], {
            color: 'blue'
          }).addTo(map);
        }
      `;
      mapRef.current.injectJavaScript(script);
    }
  }

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
            <Text> {}
              <MaterialIcons name="search" size={24} color="white" /> {}
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
            <Text> {}
              <MaterialIcons name="search" size={24} color="white" /> {}
            </Text>
          </TouchableOpacity>
        </View>

        <WebView ref={mapRef} source={{ html: html_script }} style={styles.webview} />
        <View style={styles.buttonArea}>
          <TouchableOpacity style={styles.button} onPress={handleGraphQLQuery}>
          <Text style={styles.buttonText}>szukaj trase</Text>
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