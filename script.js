const hotels = [
	{
		name: "Taj Hotel",
		price: 2500,
		rating: 4.8,
		image: "paul-kansonkho-nT9fMbsm1NY-unsplash.jpg",
		lat: 28.6139,
		lon: 77.2090
	},
	{
		name: "Royal Inn",
		price: 1800,
		rating: 4.5,
		image: "yann-maignan-YhJkERWHFnU-unsplash.jpg",
		lat: 28.6200,
		lon: 77.2100
	},
	{
		name: "Grand Palace",
		price: 3500,
		rating: 4.9,
		image: "frames-for-your-heart-zSG-kd-L6vw-unsplash (1).jpg",
		lat: 28.6100,
		lon: 77.2000
	},
	{
		name: "Budget Stay",
		price: 1200,
		rating: 4.0,
		image: "antonio-araujo-xQbmc2FnK3Y-unsplash.jpg",
		lat: 28.6050,
		lon: 77.2200
	}
];

let userCoords = null;
let map = null;
let markers = [];
let userMarker = null;

function getUserLocation() {
	return new Promise((resolve, reject) => {
		if (userCoords) return resolve(userCoords);
		if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				userCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
				resolve(userCoords);
			},
			(err) => reject(err),
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	});
}

function toRad(deg) { return deg * Math.PI / 180; }

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
	const R = 6371; // Earth radius km
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
						Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
						Math.sin(dLon/2) * Math.sin(dLon/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return R * c;
}

function renderResults(list, center) {
	const result = document.getElementById('result');
	result.innerHTML = '';
	if (!list.length) {
		result.innerHTML = '<h3>No hotels found for that budget/radius.</h3>';
		return;
	}

	list.forEach(hotel => {
		const dist = haversineDistanceKm(center.lat, center.lon, hotel.lat, hotel.lon).toFixed(2);
		result.innerHTML += `
			<div class="hotel-card">
				<img src="${hotel.image}" alt="${hotel.name}">
				<div class="hotel-info">
					<h3>${hotel.name}</h3>
					<p>💰 ₹${hotel.price} / night</p>
					<p>⭐ ${hotel.rating} — ${dist} km away</p>
					<button class="btn">Book Now</button>
				</div>
			</div>
		`;
	});
}

function clearMarkers() {
	markers.forEach(m => m.setMap(null));
	markers = [];
	if (userMarker) { userMarker.setMap(null); userMarker = null; }
}

function addHotelMarkers(list, center) {
	clearMarkers();
	const bounds = new google.maps.LatLngBounds();

	// add user marker
	if (center) {
		userMarker = new google.maps.Marker({
			position: { lat: center.lat, lng: center.lon },
			map,
			title: 'You are here',
			icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#1976D2', fillOpacity: 1, strokeWeight: 2 }
		});
		bounds.extend(userMarker.getPosition());
	}

	list.forEach(hotel => {
		const pos = { lat: hotel.lat, lng: hotel.lon };
		const marker = new google.maps.Marker({ position: pos, map, title: hotel.name });
		const dist = hotel.distance ? hotel.distance.toFixed(2) : haversineDistanceKm(center.lat, center.lon, hotel.lat, hotel.lon).toFixed(2);
		const info = new google.maps.InfoWindow({ content: `<strong>${hotel.name}</strong><br>₹${hotel.price} — ${dist} km` });
		marker.addListener('click', () => info.open(map, marker));
		markers.push(marker);
		bounds.extend(pos);
	});

	if (!bounds.isEmpty()) map.fitBounds(bounds);
}

// Google Maps callback
window.initMap = function() {
	// default center
	const defaultCenter = { lat: 28.6139, lng: 77.2090 };
	map = new google.maps.Map(document.getElementById('map'), { center: defaultCenter, zoom: 13 });
};

async function findHotels() {
	const min = Number(document.getElementById('minBudget').value || 0);
	const max = Number(document.getElementById('maxBudget').value || Infinity);
	const radius = Number(document.getElementById('radiusKm').value || 10);

	const status = document.getElementById('status');
	if (status) status.textContent = 'Locating...';

	try {
		const coords = await getUserLocation();
		if (status) status.textContent = `Found location: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`;

		const filtered = hotels
			.map(h => ({ ...h, distance: haversineDistanceKm(coords.lat, coords.lon, h.lat, h.lon) }))
			.filter(h => h.price >= min && h.price <= max && h.distance <= radius)
			.sort((a,b) => a.distance - b.distance);

		renderResults(filtered, coords);
		if (window.google && window.google.maps) addHotelMarkers(filtered, coords);
	} catch (err) {
		if (status) status.textContent = 'Could not get location. Allow location or try again.';
		document.getElementById('result').innerHTML = '<h3>Location required to find nearby hotels.</h3>';
	}
}

document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('findBtn').addEventListener('click', findHotels);
	document.getElementById('useLocationBtn').addEventListener('click', async () => {
		try {
			const coords = await getUserLocation();
			let status = document.getElementById('status');
			if (!status) {
				status = document.createElement('div');
				status.id = 'status';
				document.querySelector('.finder-controls').appendChild(status);
			}
			status.textContent = `Using location: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`;
		} catch (err) {
			alert('Unable to get location: ' + (err.message || err.code));
		}
	});

	const navToggle = document.getElementById('navToggle');
	const navLinks = document.getElementById('navLinks');
	if (navToggle && navLinks) {
		navToggle.addEventListener('click', () => {
			navLinks.classList.toggle('open');
		});
		navLinks.querySelectorAll('a').forEach(link => {
			link.addEventListener('click', () => {
				navLinks.classList.remove('open');
			});
		});
	}
});