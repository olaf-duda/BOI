import { useState, useEffect, View } from "react";
import axios from 'axios';
import { FlatList } from "react-native-gesture-handler";
import '../global.js'
//import RNFS from 'react-native-fs';

//const filePath = '../API_data/archiwum.lst'; // Adjust the path accordingly


// We for now read from a local file instead of API
 //const apiKey = 'xEsFhYZR5jpO1Ug1';
 const apiUrl = `https://5c77-79-191-133-36.ngrok-free.app`;

const useBikeStationList =  () => {
    const [bikeStations, setBikeStations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    console.log("downloading data from API");

    const fetchData = async () => {
        try {
            // const fileContent = await RNFS.readfile(filePath, 'utf8');
            // const data = JSON.parse(fileContent);

            // console.log(data[0]);
            // setBikeStations(data[0].cities[0].places);

            // setIsLoading(false);

            //We for now read from a local file instead of API
            // const response = await axios.get(apiUrl, {
            //     headers: {
            //         'Api-Key': apiKey,
            //     },
            // });
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
