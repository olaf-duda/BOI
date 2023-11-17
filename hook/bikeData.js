import { useState, useEffect, View } from "react";
import axios from 'axios';
import { FlatList } from "react-native-gesture-handler";

const apiKey = 'xEsFhYZR5jpO1Ug1';
const apiUrl = `https://api-gateway.nextbike.pl/api/maps/service/vw/locations`;

const BikeStationList = () => {
    const [bikeStations, setBikeStations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            
            try {
                const response = await axios.get(apiUrl, {
                    headers: {
                        'Api-Key': apiKey,
                    },
                });
                setBikeStations(response.data[0].cities[0].places);
                setIsLoading(false);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
  
        fetchData();
    }, []); 

    return {bikeStations, isLoading, error};
};

export default BikeStationList;
