export function createRequest (bicycleRouteType, startingCoordinates, destinationCoordinates, travelType){
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    let triangle = "";
    if (bicycleRouteType == "TRIANGLE") {
    triangle = `triangle : {
        safetyFactor: 0.33, 
        slopeFactor: 0.33, 
        timeFactor: 0.34}`;
    }
    const requestBody = {
    query: `{
    plan(
        optimize: ${bicycleRouteType}
        ${triangle}
        from: { lat: ${startingCoordinates.lat}, lon: ${startingCoordinates.lon} }
        to: { lat: ${destinationCoordinates.lat}, lon: ${destinationCoordinates.lon} }
        date: "${currentDate}",
        time: "${currentTime}",
        transportModes: [
            {
                mode: ${travelType}
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
    return requestBody;
}

export function createRequestFromExactVal (bicycleRouteType, startingCoordinatesLat, startingCoordinatesLon, destinationCoordinatesLat, destinationCoordinatesLon, travelType){
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    let triangle = "";
    if (bicycleRouteType == "TRIANGLE") {
    triangle = `triangle : {
        safetyFactor: 0.33, 
        slopeFactor: 0.33, 
        timeFactor: 0.34}`;
    }
    const requestBody = {
    query: `{
    plan(
        optimize: ${bicycleRouteType}
        ${triangle}
        from: { lat: ${startingCoordinatesLat}, lon: ${startingCoordinatesLon} }
        to: { lat: ${destinationCoordinatesLat}, lon: ${destinationCoordinatesLon} }
        date: "${currentDate}",
        time: "${currentTime}",
        transportModes: [
            {
                mode: ${travelType}
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
    console.log(requestBody);
    return requestBody;
}