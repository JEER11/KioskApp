import { useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import directionsServiceState from '../../atoms/directionsServiceState';
import mapTypeState from '../../atoms/mapTypeState';
import mapboxAccessTokenState from '../../atoms/mapboxAccessTokenState';
import { mapTypes } from '../../constants/mapTypes';

function EnsureDirectionsService() {
    const [directionsService, setDirectionsService] = useRecoilState(directionsServiceState);
    const selectedMapType = useRecoilValue(mapTypeState);
    const mapboxAccessToken = useRecoilValue(mapboxAccessTokenState);

    useEffect(() => {
        if (directionsService) return; // already initialized
        if (typeof window === 'undefined' || !window.mapsindoors) return;

        try {
            const services = window.mapsindoors.services;
            const directions = window.mapsindoors.directions;
            if (!services || !directions || !services.DirectionsService) return;

            let externalProvider;
            // Only instantiate Google provider if the Google Maps API is loaded
            const googleAvailable = typeof window.google !== 'undefined' && window.google.maps;
            if (selectedMapType === mapTypes.Google && directions.GoogleMapsProvider && googleAvailable) {
                externalProvider = new directions.GoogleMapsProvider();
            } else if (selectedMapType === mapTypes.Mapbox && directions.MapboxProvider) {
                externalProvider = new directions.MapboxProvider(mapboxAccessToken);
            } else if (!selectedMapType && directions.MapboxProvider && mapboxAccessToken) {
                // If map type is unknown, prefer Mapbox provider when token is available
                externalProvider = new directions.MapboxProvider(mapboxAccessToken);
            } else if (directions.GoogleMapsProvider && googleAvailable) {
                // Last resort: Google provider only if API is present
                externalProvider = new directions.GoogleMapsProvider();
            }

            if (!externalProvider) return;

            const ds = new services.DirectionsService(externalProvider);
            setDirectionsService(ds);
        } catch (err) {
            // Silent catch — this component is a best-effort initializer
            console.warn('EnsureDirectionsService failed to initialize directions service', err);
        }
    }, [directionsService, selectedMapType, mapboxAccessToken, setDirectionsService]);

    return null;
}

export default EnsureDirectionsService;
