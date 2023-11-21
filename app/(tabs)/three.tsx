import React, { useRef, useCallback } from 'react';
import { StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';

import html_script from '../html_script.js';

import useBikeStationList from '../../hook/bikeData';

import Station from '../../interfaces/Stations.js'

export default function TabThreeScreen() {
  const {bikeStations, isLoading, error} = useBikeStationList();

  const mapRef = useRef<WebView | null>(null);

  const handleStationAddress = useCallback( () => {
      try {
          console.log("starting the loop")
          bikeStations.forEach((station : Station) => {
              goToMyPosition((station.geoCoords.lat), (station.geoCoords.lng)); // Update map with new coordinates
          })
      } catch (error) {
      console.error('Error fetching coordinates:', error);
      }
  }, [bikeStations]);


  const goToMyPosition = (lat: number, lng: number) => {
      if (mapRef.current) {
        const script = `
            if (typeof map !== 'undefined') {
              map.setView([${lat}, ${lng}], 10);
            L.marker([${lat}, ${lng}]).addTo(map);
            }
        `;
        console.log("Station at:" + lat + " " + lng + "\n");
        mapRef.current.injectJavaScript(script);
      }
  };

return (
  <>
    <StatusBar barStyle="dark-content" />
    <SafeAreaView style={styles.container}>
      <WebView ref={mapRef} source={{ html: html_script }} style={styles.webview} onLoad={handleStationAddress}/>
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