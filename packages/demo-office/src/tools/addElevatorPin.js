import elevatorIcon from '../assets/searchIcons/elevator.png';

/**
 * Add an elevator pin marker to the Mapbox map at the specified location.
 * 
 * @param {object} mapboxMap - The Mapbox map instance
 * @param {object} location - The MapsIndoors location object for the elevator
 */
export default function addElevatorPin(mapboxMap, location) {
    // Remove existing elevator pin if it exists
    removeElevatorPin(mapboxMap);

    // Get the coordinates from the location
    const coordinates = location.geometry.type.toLowerCase() === 'point'
        ? [location.geometry.coordinates[0], location.geometry.coordinates[1]]
        : [location.properties.anchor.coordinates[0], location.properties.anchor.coordinates[1]];

    // Load the elevator icon image if not already loaded
    if (!mapboxMap.hasImage('elevator-pin')) {
        const img = new Image();
        img.onload = () => {
            if (!mapboxMap.hasImage('elevator-pin')) {
                mapboxMap.addImage('elevator-pin', img);
            }
            addElevatorPinLayer(mapboxMap, coordinates);
        };
        img.src = elevatorIcon;
    } else {
        addElevatorPinLayer(mapboxMap, coordinates);
    }
}

/**
 * Add the elevator pin layer to the map
 * 
 * @param {object} mapboxMap - The Mapbox map instance
 * @param {Array} coordinates - [lng, lat] coordinates
 */
function addElevatorPinLayer(mapboxMap, coordinates) {
    // Add the elevator pin as a source on the Mapbox map
    mapboxMap.addSource('elevator-pin-source', {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates
            }
        }
    });

    // Add a layer to show the elevator pin
    mapboxMap.addLayer({
        id: 'elevator-pin-layer',
        type: 'symbol',
        source: 'elevator-pin-source',
        layout: {
            'icon-image': 'elevator-pin',
            'icon-size': 1.0,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
        }
    });
}

/**
 * Remove the elevator pin from the map if it exists.
 * 
 * @param {object} mapboxMap - The Mapbox map instance
 */
export function removeElevatorPin(mapboxMap) {
    if (mapboxMap.getLayer('elevator-pin-layer')) {
        mapboxMap.removeLayer('elevator-pin-layer');
    }
    if (mapboxMap.getSource('elevator-pin-source')) {
        mapboxMap.removeSource('elevator-pin-source');
    }
}

/**
 * Check if a location is an elevator based on its properties
 * 
 * @param {object} location - The MapsIndoors location object
 * @returns {boolean} - True if the location is an elevator
 */
export function isElevator(location) {
    if (!location) return false;
    
    // Check if the location name contains "Elevator" (case-insensitive)
    const name = location.properties.name?.toLowerCase() || '';
    if (name.includes('elevator')) {
        return true;
    }
    
    // Check if the location type contains "Elevator"
    const type = location.properties.type?.toLowerCase() || '';
    if (type.includes('elevator')) {
        return true;
    }
    
    // Check if the location has an elevator category
    const categories = location.properties.categories || [];
    if (categories.some(cat => cat.toLowerCase().includes('elevator'))) {
        return true;
    }
    
    return false;
}
