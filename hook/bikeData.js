import { useState, useEffect, View } from "react";
import axios from 'axios';
import { FlatList } from "react-native-gesture-handler";
import '../global.js'
//import RNFS from 'react-native-fs';

//const filePath = '../API_data/archiwum.lst'; // Adjust the path accordingly


// We for now read from a local file instead of API

const useBikeStationList =  () => {
    const [bikeStations, setBikeStations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            const response = await axios.get(global.ngrokUrl);
            setBikeStations(response.data[0].cities[0].places);
            console.log("number of bikes", bikeStations.length)
            setIsLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setIsLoading(false);
            setError(error);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    return {bikeStations, isLoading, error, fetchData};
};

export default useBikeStationList;
