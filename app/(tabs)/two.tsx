import React, { useRef, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import html_script from '../html_script.js';

export default function TabTwoScreen() {
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
    padding: 10,
    backgroundColor: 'grey',
  },
  webview: {
    flex: 2,
  },
  buttonArea: {
    flex: 1,
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
});
