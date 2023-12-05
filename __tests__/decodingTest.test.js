const { decode, encode } = require('../algorithms/polyline'); // Update the path accordingly

function getRandomNumberInRange(min, max) {
    return Number((Math.random() * (max - min) + min).toFixed(5));
}

// Example encoded polyline string
const encodedPolyline = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

// Expected decoded coordinates for the example polyline
const expectedCoordinates = [
    [-120.2, 38.5],
    [-120.95, 40.7],
    [-126.453, 43.252],
];

// Jest test to check if decoding is working correctly
test('Decoding and encoding polyline for a hardcoded values returns expected coordinates', () => {
    const decodedCoordinates = decode(encodedPolyline);
    console.log(decodedCoordinates, expectedCoordinates);
    expect(decodedCoordinates).toEqual(expectedCoordinates);

    const encodedString = encode(expectedCoordinates);
    expect(encodedString).toEqual("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
});

const expectedCoordinates_Random = [
    [getRandomNumberInRange(-180, 180), getRandomNumberInRange(-180, 180)],
    [getRandomNumberInRange(-180, 180), getRandomNumberInRange(-180, 180)],
    [getRandomNumberInRange(-180, 180), getRandomNumberInRange(-180, 180)],
    [getRandomNumberInRange(-180, 180), getRandomNumberInRange(-180, 180)],
];

test('Decoding and encoding polyline for a random values returns expected coordinates', () => {
    const decodedCoordinates = decode(encode(expectedCoordinates_Random));
    expect(decodedCoordinates).toEqual(expectedCoordinates_Random);
});