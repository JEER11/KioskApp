import { useCallback } from 'react';
import { useSetRecoilState } from 'recoil';
import directionsServiceState from '../../atoms/directionsServiceState';
import directionsResponseState from '../../atoms/directionsResponseState';
import hasFoundRouteState from '../../atoms/hasFoundRouteState';

function DevInitDirections() {
    const setDirectionsService = useSetRecoilState(directionsServiceState);
    const setDirectionsResponse = useSetRecoilState(directionsResponseState);
    const setHasFoundRoute = useSetRecoilState(hasFoundRouteState);

    const init = useCallback(() => {
        const maps = window.mapsindoors;
        if (!maps || !maps.services || !maps.directions) {
            console.warn('mapsindoors or directions services missing');
            return;
        }

        try {
            const D = maps.directions;
            let provider = null;
            if (D.GoogleMapsProvider) {
                provider = new D.GoogleMapsProvider();
            } else if (D.MapboxProvider) {
                // Attempt to use configured token if present
                const token = window.__MAPBOX_DEV_TOKEN__ || '';
                provider = new D.MapboxProvider(token);
            }

            if (!provider) {
                console.warn('No external directions provider available');
                return;
            }

            const ds = new maps.services.DirectionsService(provider);
            setDirectionsService(ds);
            console.log('Dev: directionsService initialized and set in Recoil');

            // Trigger a demo route (ECE -> Central King) and set directions response into Recoil
            (async () => {
                try {
                    const originLocation = {
                        id: 'ECE_BUILDING',
                        geometry: { type: 'Point', coordinates: [-74.1760, 40.7395] },
                        properties: { name: 'ECE Building', type: 'building', floor: 0 }
                    };
                    const destinationLocation = {
                        id: 'CENTRAL_KING',
                        geometry: { type: 'Point', coordinates: [-74.1720, 40.7379] },
                        properties: { name: 'Central King Building' }
                    };

                    const origin = { lat: originLocation.geometry.coordinates[1], lng: originLocation.geometry.coordinates[0], floor: originLocation.properties.floor };
                    const destination = { lat: destinationLocation.geometry.coordinates[1], lng: destinationLocation.geometry.coordinates[0] };
                    const travelMode = maps.directions?.TravelMode?.WALKING || 'WALKING';

                    const directionsResult = await ds.getRoute({ origin, destination, travelMode });

                    if (directionsResult && directionsResult.legs) {
                        const totalDistance = directionsResult.legs.reduce((acc, cur) => acc + (cur.distance?.value || 0), 0);
                        const totalTime = directionsResult.legs.reduce((acc, cur) => acc + (cur.duration?.value || 0), 0);

                        // Set the directions response so UI will render
                        setDirectionsResponse({ originLocation, destinationLocation, totalDistance, totalTime, directionsResult });
                        setHasFoundRoute(true);
                        console.log('Dev: directions response set in Recoil');
                    }
                } catch (err) {
                    console.warn('Dev: failed to fetch demo route', err);
                }
            })();
        } catch (err) {
            console.warn('DevInitDirections failed', err);
        }
    }, [setDirectionsService]);

    if (!import.meta.env.DEV) return null;

    return (
        <button
            onClick={init}
            style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999, padding: '8px 12px', background: '#222', color: '#fff', borderRadius: 6 }}
            title="Init directions service (dev only)">
            Init Directions
        </button>
    );
}

export default DevInitDirections;
