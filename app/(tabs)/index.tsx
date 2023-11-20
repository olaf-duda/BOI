import { StyleSheet, TouchableOpacity, Image, Pressable } from 'react-native';

import EditScreenInfo from '../../components/EditScreenInfo';
import { Text, View } from '../../components/Themed';

import { FlatList } from "react-native-gesture-handler";

import useBikeStationList from '../../hook/bikeData'

import Station from '../../interfaces/Stations.js'

export default function TabOneScreen() {
  const {bikeStations, isLoading, error} = useBikeStationList();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Testuje sobie to</Text>
          <View 
           style={styles.container}
          >
            <Text>Bike Locations</Text>
            <FlatList
            data={bikeStations}
            keyExtractor={(item: Station) => item.uid.toString()}

            renderItem={({ item }) => (
            <View style={{ marginBottom: 15 }}>
              <Text 
              style={{ fontWeight: 'bold' }}
              >{item.name } - Bike number: {item.bikes.length}</Text>

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