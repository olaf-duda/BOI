function decode(point_str) {

    let coord_chunks = [[]];
    for (let i = 0; i < point_str.length; i++) {
        let value = point_str.charCodeAt(i) - 63;
        let split_after = !(value & 0x20);
        value &= 0x1F;
        coord_chunks[coord_chunks.length - 1].push(value);
        if (split_after) {
            coord_chunks.push([]);
        }
    }
    coord_chunks.pop();

    let coords = [];

    for (let coord_chunk of coord_chunks) {
        let coord = 0;

        for (let i = 0; i < coord_chunk.length; i++) {
            coord |= coord_chunk[i] << (i * 5);
        }

        if (coord & 0x1) {
            coord = ~coord;
        }
        coord >>= 1;
        coord /= 100000.0;

        coords.push(coord);
    }

    let points = [];
    let prev_x = 0;
    let prev_y = 0;
    for (let i = 0; i < coords.length - 1; i += 2) {
        if (coords[i] === 0 && coords[i + 1] === 0) {
            continue;
        }

        prev_x += coords[i + 1];
        prev_y += coords[i];
        points.push([parseFloat(prev_x.toFixed(6)), parseFloat(prev_y.toFixed(6))]);
    }

    //console.log(points);
    return points;
}

export default decode;