import { StyleSheet, TouchableOpacity, Image, Pressable } from 'react-native';

import EditScreenInfo from '../../components/EditScreenInfo';
import { Text, View } from '../../components/Themed';

import { useState, useEffect } from "react";
import axios from 'axios';
import { FlatList } from "react-native-gesture-handler";

const apiKey = 'xEsFhYZR5jpO1Ug1';
const apiUrl = `https://api-gateway.nextbike.pl/api/maps/service/vw/locations`;


export default function TabOneScreen() {
  const [bikeStations, setBikeStations] = useState([]);

  useEffect(() => {
      const fetchData = async () => {
          try {
              const response = await axios.get(apiUrl, {
                  headers: {
                      'Api-Key': apiKey,
                  },
              });
              setBikeStations(response.data[0].cities[0].places);
          } catch (error) {
              console.error('Error:', error);
          }
      };

      fetchData();
  }, []); 

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Testuje sobie to</Text>
      <View>
            <Text>Bike Locations</Text>
            <FlatList
            data={bikeStations}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold' }}>{item.name} - Bike number: {item.bikes.length}</Text>
                </View>
            )}
            />
        </View>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
