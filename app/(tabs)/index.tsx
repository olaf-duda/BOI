import React, { useRef, useCallback, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView, Button, StatusBar, TextInput, Image, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation hook
import html_script from '../html_script.js';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import EditScreenInfo from '../../components/EditScreenInfo.js';


import { FlatList } from "react-native-gesture-handler";

import useBikeStationList from '../../hook/bikeData.js'

import Station from '../../interfaces/Stations.js'

export default function TabOneScreen() {
 
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const mapRef = useRef<WebView | null>(null);

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