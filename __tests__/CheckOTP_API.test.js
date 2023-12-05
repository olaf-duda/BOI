import axios from "axios";
import { decode } from '../algorithms/polyline';

const apiUrl = 'http://localhost:8081/otp/routers/default/index/graphql';


test.each([
    [52.221988444476644, 21.007192377311448, 52.222200963300956, 21.01857617730131, true, true],
    [52.23164381265507, 21.005949574489613, 52.222200963300956, 21.01857617730131, false, true], //inside PKiN
    [52.222200963300956, 21.01857617730131, 52.233813665837694, 21.04203360591614, true, false] //inside Vistula River
])('Checking whether the destination and starting point of the route are changed throughout the process of creating a route',
    async (a_lat, a_lon, b_lat, b_lon, a_bool, b_bool) => {


        const startingCoordinates = { lon: a_lon, lat: a_lat };
        const destinationCoordinates = { lon: b_lon, lat: b_lat };

        const requestBody = {
            query: `{
        plan(
            # these coordinate are in Portland, change this to YOUR origin
            from: { lat: ${startingCoordinates.lat}, lon: ${startingCoordinates.lon} }
            # these coordinate are in Portland, change this to YOUR destination
            to: { lat: ${destinationCoordinates.lat}, lon: ${destinationCoordinates.lon} }
            # use the correct date and time of your request
            date: "2023-02-15",
            time: "11:37",
            # choose the transport modes you need
            transportModes: [
                {
                    mode: BICYCLE
                },
                
            ]) {
            itineraries {
                startTime
                endTime
                legs {
                    mode
                    startTime
                    endTime
                    from {
                        name
                        lat
                        lon
                        departureTime
                        arrivalTime
                    }
                    to {
                        name
                        lat
                        lon
                        departureTime
                        arrivalTime
                    }
                    route {
                        gtfsId
                        longName
                        shortName
                    }
                    legGeometry {
                        points
                    }
                }
            }
        }
    }`
        };

        const response = await axios.post(apiUrl, requestBody, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const legs = response.data.data.plan.itineraries[0].legs;
        legs.forEach((leg) => {
            const legGeometry = leg.legGeometry;
            const points = decode(legGeometry.points);

            if (a_bool) {
                expect(points[0][0]).toBeCloseTo(startingCoordinates.lon, 4);
                expect(points[0][1]).toBeCloseTo(startingCoordinates.lat, 4);
            } else {
                expect(points[0][0]).not.toBeCloseTo(startingCoordinates.lon, 4);
                expect(points[0][1]).not.toBeCloseTo(startingCoordinates.lat, 4);
            }

            if (b_bool) {
                expect(points[points.length - 1][0]).toBeCloseTo(destinationCoordinates.lon, 4);
                expect(points[points.length - 1][1]).toBeCloseTo(destinationCoordinates.lat, 4);
            } else {
                expect(points[points.length - 1][0]).not.toBeCloseTo(destinationCoordinates.lon, 4);
                expect(points[points.length - 1][1]).not.toBeCloseTo(destinationCoordinates.lat, 4);
            }
        });
    });