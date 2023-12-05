export function decode(point_str) {

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

    return points;
}
export function encode(coords) {
    let encoded_str = "";
    let prev_x = 0;
    let prev_y = 0;

    for (let i = 0; i < coords.length; i++) {
        let x = coords[i][0];
        let y = coords[i][1];

        let delta_x = x - prev_x;
        let delta_y = y - prev_y;

        delta_x = parseFloat(delta_x.toFixed(6));
        delta_y = parseFloat(delta_y.toFixed(6));

        prev_x = x;
        prev_y = y;

        let value_x = Math.round(delta_x * 100000);
        let value_y = Math.round(delta_y * 100000);

        encoded_str += encodeSingleValue(value_y);
        encoded_str += encodeSingleValue(value_x);
    }

    return encoded_str;
}

// Function to encode a single value
function encodeSingleValue(value) {
    value = value < 0 ? ~(value << 1) : value << 1;
    let encoded = "";

    while (value >= 0x20) {
        encoded += String.fromCharCode((0x20 | (value & 0x1F)) + 63);
        value >>= 5;
    }

    encoded += String.fromCharCode(value + 63);
    return encoded;
}