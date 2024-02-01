class KDNode {
  constructor(point, left, right) {
    this.point = point;
    this.left = left;
    this.right = right;
  }
}

class KDTree {
  constructor(points) {
    this.root = this.buildTree(points, 0);
  }

  buildTree(points, depth) {
    if (points.length === 0) {
      return null;
    }

    const axis = depth % 2; // Assuming 2D points, change for different dimensions
    points.sort((a, b) => a[axis] - b[axis]);

    const median = Math.floor(points.length / 2);
    const left = this.buildTree(points.slice(0, median), depth + 1);
    const right = this.buildTree(points.slice(median + 1), depth + 1);

    return new KDNode(points[median], left, right);
  }

  findNearestNeighbors(queryPoint, k) {
    const neighbors = [];
    this.findNearest(this.root, queryPoint, k, 0, neighbors);
    return this.convertToCoordsObjects(neighbors);
  }

  findNearest(node, queryPoint, k, depth, neighbors) {
    if (!node) {
      return;
    }

    const axis = depth % 2; // Assuming 2D points, change for different dimensions

    let nextBranch = null;
    let oppositeBranch = null;

    if (queryPoint[axis] < node.point[axis]) {
      nextBranch = node.left;
      oppositeBranch = node.right;
    } else {
      nextBranch = node.right;
      oppositeBranch = node.left;
    }

    this.findNearest(nextBranch, queryPoint, k, depth + 1, neighbors);

    if (neighbors.length < k || this.distance(queryPoint, node.point) < this.distance(queryPoint, neighbors[neighbors.length - 1])) {
      if (neighbors.length === k) {
        neighbors.pop();
      }
      neighbors.push(node.point);
      neighbors.sort((a, b) => this.distance(queryPoint, a) - this.distance(queryPoint, b));
    }

    if (Math.abs(queryPoint[axis] - node.point[axis]) < this.distance(queryPoint, neighbors[neighbors.length - 1])) {
      this.findNearest(oppositeBranch, queryPoint, k, depth + 1, neighbors);
    }
  }

  distance(pointA, pointB) {
    return 6371e3 * Math.acos(Math.cos(pointA[0] * Math.PI / 180) * Math.cos(pointB[0] * Math.PI / 180) * Math.cos((pointB[1] - pointA[1]) * Math.PI / 180) + Math.sin(pointA[0] * Math.PI / 180) * Math.sin(pointB[0] * Math.PI / 180));
  }
  convertToCoordsObjects(points) {
    return points.map(point => ({
      lat: point[0],
      lon: point[1],
    }));
  }
}

export default KDTree;
