import elevatorIcon from '../assets/searchIcons/elevator.png';

/**
 * Add an elevator pin marker to the Mapbox map at the specified location.
 * 
 * @param {object} mapboxMap - The Mapbox map instance
 * @param {object} location - The MapsIndoors location object for the elevator
 */
export function addElevatorPin(mapboxMap, location) {
    if (!mapboxMap || !location) return;
    // This helper is Mapbox-only. If we're on Google Maps, just no-op.
    if (typeof mapboxMap.getLayer !== 'function' || typeof mapboxMap.getSource !== 'function') return;
    if (typeof mapboxMap.addSource !== 'function' || typeof mapboxMap.addLayer !== 'function') return;
    if (typeof mapboxMap.hasImage !== 'function' || typeof mapboxMap.addImage !== 'function') return;
    
    // Remove existing elevator pin if it exists
    removeElevatorPin(mapboxMap);

    // Get the coordinates from the location
    const geometryType = location?.geometry?.type?.toLowerCase?.();
    const coordinates = geometryType === 'point'
        ? [location.geometry.coordinates[0], location.geometry.coordinates[1]]
        : [location?.properties?.anchor?.coordinates?.[0], location?.properties?.anchor?.coordinates?.[1]];
    if (typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') return;

    // Load the elevator icon image if not already loaded
    if (!mapboxMap.hasImage('elevator-pin-marker')) {
        const img = new Image();
        img.onload = () => {
            if (!mapboxMap.hasImage('elevator-pin-marker')) {
                mapboxMap.addImage('elevator-pin-marker', img);
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
    if (typeof mapboxMap.addSource !== 'function' || typeof mapboxMap.addLayer !== 'function') return;
    // Add the elevator pin as a source on the Mapbox map
    mapboxMap.addSource('elevator-pin-marker-source', {
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
        id: 'elevator-pin-marker-layer',
        type: 'symbol',
        source: 'elevator-pin-marker-source',
        layout: {
            'icon-image': 'elevator-pin-marker',
                'icon-size': 1.4,
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
    if (!mapboxMap) return;
    if (typeof mapboxMap.getLayer !== 'function' || typeof mapboxMap.getSource !== 'function') return;
    if (typeof mapboxMap.removeLayer !== 'function' || typeof mapboxMap.removeSource !== 'function') return;
    
    if (mapboxMap.getLayer('elevator-pin-marker-layer')) {
        mapboxMap.removeLayer('elevator-pin-marker-layer');
    }
    if (mapboxMap.getSource('elevator-pin-marker-source')) {
        mapboxMap.removeSource('elevator-pin-marker-source');
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
    const name = location.properties?.name?.toLowerCase() || '';
    if (name.includes('elevator')) {
        return true;
    }
    
    // Check if the location type contains "Elevator"
    const type = location.properties?.type?.toLowerCase() || '';
    if (type.includes('elevator')) {
        return true;
    }
    
    // Check if the location has an elevator category
    const categories = Array.isArray(location.properties?.categories) ? location.properties.categories : [];
    if (categories.some(cat => typeof cat === 'string' && cat.toLowerCase().includes('elevator'))) {
        return true;
    }
    
    return false;
}
