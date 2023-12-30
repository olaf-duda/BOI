import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';

import html_script from '../html_script.js';

import useBikeStationList from '../../hook/bikeData.js';

import Station from '../../interfaces/Stations.js'
import  KDTree  from '../../algorithms/kdtree.js';

export default function TabThreeScreen() {
  const {bikeStations, isLoading, error, fetchData} = useBikeStationList();

  const mapRef = useRef<WebView | null>(null);

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
      // Find nearest neighbors for a specific query point
      const queryPoint = [52.2345, 21.0123]; // Replace this with your query point
      const nearest = kdTree.findNearestNeighbors(queryPoint, 5);
      
      console.log(nearest);
      if (mapRef.current) {
        const script = `
            if (typeof map !== 'undefined') {
              L.circle([${queryPoint[0]}, ${queryPoint[1]}],{
                color: 'red'}).addTo(map)
              .bindPopup('start').openPopup();
              L.circle([${nearest[0].lat}, ${nearest[0].lon}]).addTo(map)
              .bindPopup('neighbour').openPopup();
              L.circle([${nearest[1].lat}, ${nearest[1].lon}]).addTo(map)
              .bindPopup('neighbour').openPopup();
              L.circle([${nearest[2].lat}, ${nearest[2].lon}]).addTo(map)
              .bindPopup('neighbour').openPopup();
              L.circle([${nearest[3].lat}, ${nearest[3].lon}]).addTo(map)
              .bindPopup('neighbour').openPopup();
              L.circle([${nearest[4].lat}, ${nearest[4].lon}]).addTo(map)
              .bindPopup('neighbour').openPopup();
            }
        `;
        //console.log("Station at:" + lat + " " + lng + "\n");
        mapRef.current.injectJavaScript(script);
      }
    }
   addAllStationMarkers();
  }, [bikeStations]);

  const addAllStationMarkers = () => {
    try {
      bikeStations.forEach((station : Station) => {
        addStationMarker((station.geoCoords.lat), (station.geoCoords.lng), station.name,station.bikes.length); // Update map with new coordinates
    })
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
  };

  const addStationMarker = (lat: number, lng: number, name: string,  bikes: number) => {
      if (mapRef.current) {
        const script = `
            if (typeof map !== 'undefined') {
            L.marker([${lat}, ${lng}]).addTo(map).bindPopup('<b>${name}</b><br />Available bikes: ${bikes}');
            }
        `;
        //console.log("Station at:" + lat + " " + lng + "\n");
        mapRef.current.injectJavaScript(script);
      }
  };

  useEffect(() => {
    handleStationAddress();
  }, [bikeStations])

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