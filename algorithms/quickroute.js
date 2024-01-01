import { decode } from './polyline.js'

function distance(pointA, pointB) {
    return Math.sqrt((pointA[0] - pointB[0]) ** 2 + (pointA[1] - pointB[1]) ** 2); // Euclidean distance for 2D points
}

export function QuickRoute(startingCoordinates, destinationCoordinates, encodedRoute, routeTime, kdTree, routeType) {
    const noOfSubstations = Math.ceil(routeTime / 17) - 1;

    var totalDistance = 0;
    const points = decode(encodedRoute);
    for (let i = 0; i < points.length - 1; i++) {
        totalDistance += distance(points[i], points[i + 1]);
    }

    for (let p = 1; p <= n; p++) {
        var currentDistance = 0;
        var fractionedDistance = (p / (n + 1)) * totalDistance;
        var found_point;
        for (let i = 0; i < points.length - 1; i++) {
            currentDistance += distance(points[i], points[i + 1]);
            if (currentDistance = fractionedDistance) {
                // we found the exact point i
                found_point = points[i + 1];
                break;
            }
            else if (currentDistance > fractionedDistance) {
                // we skipped the point which we're looking for
                const overflow = currentDistance - fractionedDistance;
                const delta = distance(points[i], points[i + 1]);
                const sideFraction = (delta - overflow) / delta;
                var dx = points[i + 1][0] - points[i][0];
                var dy = points[i + 1][1] - points[i][1];
                dx *= sideFraction;
                dy *= sideFraction;
                found_point = [points[i][0] + dx, points[i][1] + dy];
                break;
            }
        }


    }
}