import { shadowBase64, redBase64, greenBase64, blueBase64 } from '../base64Images.js'


const html_script = `

<!DOCTYPE html>
<html lang="en">
<head>
	<base target="_top">
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	
	<title>Map</title>
	
	<link rel="shortcut icon" type="image/x-icon" href="docs/images/favicon.ico" />

    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

	<style>
		html, body {
			height: 100%;
			margin: 0;
		}
		.leaflet-container {
			height: 600px;
			width: 600px;
			max-width: 100%;
			max-height: 100%;
		}
		.leaflet-control-attribution {
            display: none !important;
        }
	</style>

	
</head>
<body>



<div id="map" style="width: 600px; height: 600px;"></div>
<script>

	const map = L.map('map').setView([52.2297, 21.0122], 13);

	const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: null
	}).addTo(map);

	const marker = L.marker([51.5, -0.09]).addTo(map)
		.bindPopup('<b>Hello world!</b><br />I am a popup.').openPopup();

	var LeafIcon = L.Icon.extend({
		options: {
			shadowUrl: '` + shadowBase64 + `',
			iconSize:     [44, 44],
			shadowSize:   [44, 44],
			iconAnchor:   [22, 44],
			shadowAnchor: [22, 44],
			popupAnchor:  [-3, -76]
		}
		});
		
	var greenIcon = new LeafIcon({iconUrl: '` + greenBase64 + `'}),
		redIcon = new LeafIcon({iconUrl: '` + redBase64 + `'}),
		blueIcon = new LeafIcon({iconUrl: '` + blueBase64 + `'});
			
	function setCustomMarker(latitude, longitude, iconType, addressInfo, bikeStationInfo) {
		if (typeof map !== 'undefined') {
			map.setView([latitude, longitude], 13);
		
			var v_icon;
			var v_popup;
			if (iconType === 1) {
				v_icon = redIcon;
				v_popup = '<b>Destination point</b> <br/> '
			} else if (iconType === 2) {
				v_icon = greenIcon;
			v_popup = '<b>Starting point</b> <br/> '
			} else if (iconType === 3) {
				v_icon = blueIcon;
				if (bikeStationInfo === 1)
				{
					v_popup = '<b>Starting bike station</b> <br/> '
				}
				else if (bikeStationInfo === 2)
				{
					v_popup = '<b>Transition station</b> <br/> '
				}
				else if (bikeStationInfo === 3)
				{
					v_popup = '<b>Final bike station</b> <br/> '
				}
			}
	
			v_popup = v_popup + addressInfo;
			L.marker([latitude, longitude], {icon: v_icon}).addTo(map).bindPopup(v_popup);
			
	}
}

	const circle = L.circle([51.2297, 21.0122], {
		color: 'red',
		fillColor: '#f03',
		fillOpacity: 0.5,
		radius: 500
	}).addTo(map).bindPopup('I am a circle.');

	const polygon = L.polygon([
		[51.509, -0.08],
		[51.503, -0.06],
		[51.51, -0.047]
	]).addTo(map).bindPopup('I am a polygon.');


	const popup = L.popup()
		.setLatLng([52.2297, 21.0122])
		.setContent('I am a standalone popup.')
		.openOn(map);

	function onMapClick(e) {
		popup
			.setLatLng(e.latlng)
			.setContent("You clicked the map at " + e.latlng.toString())
			.openOn(map);
	}

	map.on('click', onMapClick);

</script>



</body>
</html>

`

export default html_script