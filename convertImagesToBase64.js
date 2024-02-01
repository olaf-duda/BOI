const fs = require('fs');
const path = require('path');

// Function to convert an image to a Base64 string
function convertImageToBase64(filePath) {
    const image = fs.readFileSync(filePath);
    return "data:image/png;base64," + image.toString('base64');
}

// Paths to your image files
const imagePaths = [
    './markers/markerShadow.png',
    './markers/redMarker.png',
    './markers/greenMarker.png',
    './markers/blueMarker.png'
];

// Convert each image to Base64 and store in an array
const base64Images = imagePaths.map((filePath) => {
    return convertImageToBase64(filePath);
});

// Template for the output file
const outputFileContent = `
// base64Images.js

export const shadowBase64 = \`${base64Images[0]}\`;
export const redBase64 = \`${base64Images[1]}\`;
export const greenBase64 = \`${base64Images[2]}\`;
export const blueBase64 = \`${base64Images[3]}\`;
`;

// Write the Base64 strings to a file
fs.writeFileSync('./base64Images.js', outputFileContent);

console.log('Base64 images have been written to base64Images.js');