import { useState, useEffect, View } from "react";
import axios from 'axios';
import { FlatList } from "react-native-gesture-handler";

const apiKey = 'xEsFhYZR5jpO1Ug1';
const apiUrl = `https://api-gateway.nextbike.pl/api/maps/service/vw/locations`;

const BikeStationList = () => {
    const [bikeStations, setBikeStations] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(apiUrl, {
                    headers: {
                        'Api-Key': apiKey,
                    },
                });
                setBikeStations(response.data);
            } catch (error) {
                console.error('Error:', error);
            }
        };

        fetchData();
    }, []); // Empty dependency array ensures the effect runs only once

    return (
        <View>
            <Text>Bike Locations</Text>
            <FlatList
            data={bikeStations}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
                <View style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                <Text>Domain: {item.domain}</Text>
                <Text>Latitude: {item.geoCoords.lat}</Text>
                <Text>Longitude: {item.geoCoords.lng}</Text>
                </View>
            )}
            />
        </View>
    );
};

export default BikeStationList;

// const useFetch = (query) => {
//     const[data, setData] = useState(false);
//     const [isLoading, setIsLoading] = useState(false);
//     const[error, setError] = useState(null);

//     const options ={
//         method: 'GET',
//         headers: {
//             'X-RapidAPI-Key':
//             apiKey,
//             'X-RapidAPI-Host' : apiUrl
//         },
//         url: apiUrl,
//         params: {...query},
//     };

//     const fetchData = async () =>{
//         setIsLoading(true);

//         try{
//             const response = await axios.request
//             (options);

//             setData(response.data.data);
//             setIsLoading(false);
//         }catch(error){
//             setError(error)
//             alert('There is and error');
//         }finally{
//             setIsLoading(false);
//         }
//     }

//     useEffect(() => {
//         fetchData();
//     }, []);

//     const refetch = () => {
//         setIsLoading(true);
//         fetchData();
//     }

//     return {data, isLoading, error, refetch};
// }

// export default useFetch;