import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import MIMap from '@mapsindoors/react-components/src/components/MIMap/MIMap';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapTypes } from '../../constants/mapTypes';
import useLiveData from '../../hooks/useLivedata';
import mapsIndoorsInstanceState from '../../atoms/mapsIndoorsInstanceState';
import userPositionState from '../../atoms/userPositionState';
import directionsServiceState from '../../atoms/directionsServiceState';
import directionsResponseState from '../../atoms/directionsResponseState';
import mapTypeState from '../../atoms/mapTypeState';
import apiKeyState from '../../atoms/apiKeyState';
import gmApiKeyState from '../../atoms/gmApiKeyState';
import mapboxAccessTokenState from '../../atoms/mapboxAccessTokenState';
import filteredLocationsState from '../../atoms/filteredLocationsState';
import filteredLocationsByExternalIDState from '../../atoms/filteredLocationsByExternalIDState';
import tileStyleState from '../../atoms/tileStyleState';
import positionControlState from '../../atoms/positionControlState';
import bearingState from '../../atoms/bearingState';
import pitchState from '../../atoms/pitchState';
import solutionState from '../../atoms/solutionState';
import notificationMessageState from '../../atoms/notificationMessageState';
import useMapBoundsDeterminer from '../../hooks/useMapBoundsDeterminer';
import hideNonMatchesState from '../../atoms/hideNonMatchesState';
import PropTypes from 'prop-types';
import ViewSelector from '../ViewSelector/ViewSelector';
import LanguageSelector from '../LanguageSelector/LanguageSelector.jsx';
import appConfigState from '../../atoms/appConfigState';
import isNullOrUndefined from '../../helpers/isNullOrUndefined';
import ResetKioskViewButton from '../ResetKioskViewButton/ResetKioskViewButton.jsx';
import { useIsKioskContext } from '../../hooks/useIsKioskContext';
import GeoJsonOverlay from '../GeoJsonOverlay/GeoJsonOverlay.jsx';
import FloorPlansOverlay from '../FloorPlansOverlay/FloorPlansOverlay.jsx';

MapWrapper.propTypes = {
    onLocationClick: PropTypes.func,
    onMapPositionKnown: PropTypes.func.isRequired,
    useMapProviderModule: PropTypes.bool.isRequired,
    onMapPositionInvestigating: PropTypes.func.isRequired,
    onViewModeSwitchKnown: PropTypes.func.isRequired,
    resetCount: PropTypes.number.isRequired,
    mapOptions: PropTypes.object,
    gmMapId: PropTypes.string,
    isWayfindingOrDirections: PropTypes.bool,
    currentLanguage: PropTypes.string,
    setLanguage: PropTypes.func,
    devicePosition: PropTypes.object
};

/**
 * Private variable used for storing the tile style. Implemented due to the impossibility to use the React useState hook.
 */
let _tileStyle;

/**
 * A wrapper component around the MIMap component.
 * Contains logic for determining map provider (Google, Mapbox), map options, device position handling and setting up a directions service to use for showing directions.
 *
 * @param {Object} props
 * @param {function} [props.onLocationClick] - Function that is run when a MapsIndoors Location is clicked. the Location will be sent along as first argument.
 * @param {function} props.onMapPositionKnown - Function that is run when the map bounds was changed due to fitting to a Venue or Location.
 * @param {boolean} props.useMapProviderModule - If you want to use the Map Provider set on your solution in the MapsIndoors CMS, set this to true.
 * @param {function} onMapPositionInvestigating - Function that is run when the map position is being determined.
 * @param {function} onViewModeSwitchKnown - Function that is run when the view mode switch is known (if it is to be shown of not).
 * @param {number} resetCount - A counter that is incremented when the map should be reset.
 * @param {object} props.mapOptions - Options for instantiating and styling the map as well as UI elements.
 * @param {string} props.gmMapId - Google Maps Map ID for custom styling.
 * @param {boolean} props.isWayfindingOrDirections - Whether wayfinding or directions is active or not.
 * @param {string} props.currentLanguage - The currently selected language code.
 * @param {function} props.setLanguage - Function to set the selected language.
 * @param {object} [props.devicePosition] - Device position object with coords and timestamp for custom positioning.
 * @returns
 */
function MapWrapper({ onLocationClick, onMapPositionKnown, useMapProviderModule, onMapPositionInvestigating, onViewModeSwitchKnown, resetCount, mapOptions, gmMapId, isWayfindingOrDirections, currentLanguage, setLanguage, devicePosition }) {
    const apiKey = useRecoilValue(apiKeyState);
    const gmApiKey = useRecoilValue(gmApiKeyState);
    const mapboxAccessToken = useRecoilValue(mapboxAccessTokenState);
    const [mapType, setMapType] = useRecoilState(mapTypeState);
    const [mapsIndoorsInstance, setMapsIndoorsInstance] = useRecoilState(mapsIndoorsInstanceState);
    const [userPosition, setUserPosition] = useRecoilState(userPositionState);
    const [, setDirectionsService] = useRecoilState(directionsServiceState);
    const directionsService = useRecoilValue(directionsServiceState);
    const filteredLocations = useRecoilValue(filteredLocationsState);
    const filteredLocationsByExternalIDs = useRecoilValue(filteredLocationsByExternalIDState);
    const tileStyle = useRecoilValue(tileStyleState);
    const bearing = useRecoilValue(bearingState);
    const pitch = useRecoilValue(pitchState);
    const [, setPositionControl] = useRecoilState(positionControlState);
    const solution = useRecoilValue(solutionState);
    const [, setDirectionsResponse] = useRecoilState(directionsResponseState);
    const [, setErrorMessage] = useRecoilState(notificationMessageState);
    const hideNonMatches = useRecoilValue(hideNonMatchesState);
    const appConfig = useRecoilValue(appConfigState);
    const [isViewSelectorVisible, setIsViewSelectorVisible] = useState(true);
    const [isLanguageSelectorVisible, setIsLanguageSelectorVisible] = useState(true);
    const isKiosk = useIsKioskContext();
    useLiveData(apiKey);

    // Wait for the underlying map provider to be ready before calling operations
    // that require the provider's canvas/context (Mapbox) or google.maps (Google).
    function waitForProviderReady(miInstance, timeout = 5000) {
        const start = Date.now();
        return new Promise((resolve, reject) => {
            function check() {
                try {
                    const mapView = miInstance && miInstance.getMapView && miInstance.getMapView();
                    if (mapView) {
                        const map = mapView.getMap && mapView.getMap();
                        // Mapbox: map.getCanvas && canvas.getContext
                        if (map && typeof map.getCanvas === 'function') {
                            const canvas = map.getCanvas();
                            if (canvas && typeof canvas.getContext === 'function') return resolve();
                        }
                        // Google: global google.maps should be available and map.getDiv exists
                        if (window.google && window.google.maps && map && typeof map.getDiv === 'function') {
                            const div = map.getDiv();
                            if (div) return resolve();
                        }
                    }
                } catch (e) {
                    // ignore and retry
                }

                if (Date.now() - start > timeout) return reject(new Error('map provider readiness timeout'));
                requestAnimationFrame(check);
            }
            check();
        });
    }

    const [mapPositionInvestigating, mapPositionKnown] = useMapBoundsDeterminer();

    useEffect(() => {
        if (!solution || (gmApiKey === null && mapboxAccessToken === null)) return;


        let mapTypeToUse;
        const isMapboxModuleEnabled = solution.modules.map(module => module.toLowerCase()).includes('mapbox');

        if (useMapProviderModule) {
            if (isMapboxModuleEnabled) {
                if (mapboxAccessToken) {
                    mapTypeToUse = mapTypes.Mapbox;
                }
            } else {
                if (gmApiKey) {
                    mapTypeToUse = mapTypes.Google;
                }
            }
        } else {
            if (mapboxAccessToken) {
                mapTypeToUse = mapTypes.Mapbox;
            } else {
                mapTypeToUse = mapTypes.Google;
            }
        }

        if (mapTypeToUse) {
            setMapType(mapTypeToUse);
        } else {
            // A good candidate for map type could not be determined.
            setErrorMessage({ text: 'Please provide a Mapbox Access Token or Google Maps API key to show a map.', type: 'error' });
            setMapType(undefined);
        }
    }, [gmApiKey, mapboxAccessToken, solution]);

    /*
     * When map position is investigating, run callback.
     */
    useEffect(() => {
        if (mapPositionInvestigating) {
            onMapPositionInvestigating();
        }
    }, [mapPositionInvestigating]);

    /*
     * When map position is known, run callback.
     */
    useEffect(() => {
        if (mapPositionKnown) {
            onMapPositionKnown();
        }
    }, [mapPositionKnown]);


    /*
     * Dynamically filter or highlight location based on the "filteredLocations", "filteredLocationsByExternalIDs" and "hideNonMatches" property.
     */
    useEffect(() => {
        if (!mapsIndoorsInstance) return;

        // Determine which set of locations to work with
        // If none of the locations are available, return the function
        const locations = filteredLocations || filteredLocationsByExternalIDs;
        if (!locations) return;

        const locationIds = locations.map(location => location.id);

        // Check if the hideNonMatches prop or highlight method in the SDK exists
        if (hideNonMatches || !mapsIndoorsInstance.highlight) {
            mapsIndoorsInstance.filter(locationIds);
        } else {
            mapsIndoorsInstance.highlight(locationIds);
        }
    }, [filteredLocations, filteredLocationsByExternalIDs, mapsIndoorsInstance, hideNonMatches]);

    /*
     * React to changes in bearing and pitch props and set them on the map if mapsIndoorsInstance exists.
     */
    useEffect(() => {
        if (mapsIndoorsInstance) {
            if (!isNaN(parseInt(pitch))) {
                mapsIndoorsInstance.getMapView().tilt(parseInt(pitch));
            }
            if (!isNaN(parseInt(bearing))) {
                mapsIndoorsInstance.getMapView().rotate(parseInt(bearing));
            }
        }
    }, [bearing, pitch, mapsIndoorsInstance]);

    /**
     * Handle the tile style changes and the locationId property.
     *
     * @param {object} miInstance
     */
    const onBuildingChanged = (miInstance) => {
        onTileStyleChanged(miInstance);
    }

    /**
     * Replace the default tile URL style to the incoming tile style.
     *
     * @param {object} miInstance
     */
    const onTileStyleChanged = (miInstance) => {
        if (miInstance && _tileStyle) {
            let tileURL = miInstance.getTileURL();
            if (tileURL) {
                tileURL = miInstance.getTileURL().replace('default', _tileStyle);

                // Replace the floor placeholder with the actual floor and set the tile URL on the MapView.
                const tileStyleWithFloor = tileURL?.replace('{floor}', miInstance.getFloor());
                miInstance.getMapView().setMapsIndoorsTileURL(tileStyleWithFloor);
            }
        }
    }

    /**
     * React when MapsIndoors instance and position control is ready, and setup necessary objects.
     *
     * @param {object} miInstance
     * @param {object} positionControl
     */
    const onInitialized = (miInstance, positionControl, viewModeSwitchVisible) => {
        // Detect when the mouse hovers over a location and store the hovered location
        // If the location is non-selectable, remove the hovering by calling the unhoverLocation() method.
        miInstance.on('mouseenter', () => {
            const hoveredLocation = miInstance.getHoveredLocation()

            if (hoveredLocation?.properties.locationSettings?.selectable === false) {
                miInstance.unhoverLocation();
            }
        });

        // Ensure building outlines can be visible by default
        // (honors SDK/app config display rules)

        miInstance.on('click', location => {
            try { console.log('MIMap click event, location:', location && location.properties && location.properties.name ? location.properties.name : location); } catch(e) { console.warn('MIMap click log error', e); }
            onLocationClick(location);
        });
        miInstance.once('building_changed', () => {
            waitForProviderReady(miInstance).then(() => onBuildingChanged(miInstance)).catch((err) => {
                console.warn('MapWrapper: provider readiness wait failed, calling onBuildingChanged anyway', err);
                onBuildingChanged(miInstance);
            });
        });
        miInstance.on('floor_changed', () => {
            waitForProviderReady(miInstance).then(() => onTileStyleChanged(miInstance)).catch((err) => {
                console.warn('MapWrapper: provider readiness wait failed for floor_changed', err);
                onTileStyleChanged(miInstance);
            });
        });

        setMapsIndoorsInstance(miInstance);

        // Mark map as ready once initialization succeeds to clear the splash screen.
        onMapPositionKnown();

        // Assign the miInstance to the mapsIndoorsInstance on the window interface.
        window.mapsIndoorsInstance = miInstance;

        // Create a custom event that is dispatched from the window interface.
        const event = new CustomEvent('mapsIndoorsInstanceAvailable');
        window.dispatchEvent(event);

        // Initialize a Directions Service
        let externalDirectionsProvider;
        if (mapType === mapTypes.Google) {
            externalDirectionsProvider = new window.mapsindoors.directions.GoogleMapsProvider();
        } else if (mapType === mapTypes.Mapbox) {
            externalDirectionsProvider = new window.mapsindoors.directions.MapboxProvider(mapboxAccessToken);
        }
        const directionsService = new window.mapsindoors.services.DirectionsService(externalDirectionsProvider);
        setDirectionsService(directionsService);
        // Expose for debugging in browser console
        try { window._njit_directionsService = directionsService; console.log('Exposed directionsService on window._njit_directionsService'); } catch (e) { /* ignore */ }

        setMapsIndoorsInstance(miInstance);

        // Log all position_received events for diagnostics and set user position
        if (positionControl.nodeName === 'MI-MY-POSITION') {
            // The Web Component needs to set up the listener with addEventListener
            positionControl.addEventListener('position_received', positionInfo => {
                try { console.log('position_received (webcomponent):', positionInfo.detail); } catch(e) { console.warn('position_received (webcomponent) log error', e); }
                // Accept the position regardless of the 'accurate' flag for debugging; store it if available
                if (positionInfo.detail) {
                    setUserPosition(positionInfo.detail.position || positionInfo.detail);
                }
            });
        } else {
            positionControl.on('position_received', positionInfo => {
                try { console.log('position_received (sdk):', positionInfo); } catch(e) { console.warn('position_received (sdk) log error', e); }
                if (positionInfo) {
                    setUserPosition(positionInfo.position || positionInfo);
                }
            });
        }
        setPositionControl(positionControl);

        onViewModeSwitchKnown(viewModeSwitchVisible);
    }

    // Fallback: if overlay layers are not present, detect clicks near NJIT features using the loaded GeoJSON.
    useEffect(() => {
        if (!mapsIndoorsInstance) return;
        try {
            const mapView = mapsIndoorsInstance.getMapView && mapsIndoorsInstance.getMapView();
            const map = mapView && mapView.getMap && mapView.getMap();
            if (!map) return;

            const clickHandler = (e) => {
                try {
                    const lng = e.lngLat?.lng ?? (e.latLng && e.latLng.lng && e.latLng.lng());
                    const lat = e.lngLat?.lat ?? (e.latLng && e.latLng.lat && e.latLng.lat());
                    if (typeof lng !== 'number' || typeof lat !== 'number') return;
                    const gj = window._njit_geojson;
                    if (!gj || !Array.isArray(gj.features)) return;

                    // find nearest feature centroid within threshold (meters)
                    const toRad = v => v * Math.PI / 180;
                    const earthRadius = 6371000; // meters
                    const distanceMeters = (lat1, lon1, lat2, lon2) => {
                        const dLat = toRad(lat2 - lat1);
                        const dLon = toRad(lon2 - lon1);
                        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                        return earthRadius * c;
                    };

                    let best = null;
                    for (const feat of gj.features) {
                        const geom = feat.geometry;
                        if (!geom) continue;
                        let cx, cy;
                        if (geom.type === 'Point') {
                            cx = geom.coordinates[1];
                            cy = geom.coordinates[0];
                        } else if (geom.type === 'Polygon') {
                            const coords = geom.coordinates[0] && geom.coordinates[0][0] ? geom.coordinates[0][0] : geom.coordinates[0];
                            if (!coords) continue;
                            // approximate centroid by averaging ring
                            const avg = coords.reduce((acc, c) => [acc[0] + c[1], acc[1] + c[0]], [0,0]);
                            cx = avg[0] / coords.length;
                            cy = avg[1] / coords.length;
                        } else if (geom.type === 'MultiPolygon') {
                            const coords = geom.coordinates.flat(2);
                            if (!coords || coords.length === 0) continue;
                            const avg = coords.reduce((acc, c) => [acc[0] + c[1], acc[1] + c[0]], [0,0]);
                            cx = avg[0] / coords.length;
                            cy = avg[1] / coords.length;
                        } else continue;

                        const d = distanceMeters(lat, lng, cx, cy);
                        if (!best || d < best.d) best = { d, feat, cx, cy };
                    }

                    const threshold = 40; // meters
                    if (best && best.d <= threshold) {
                        const featureProps = best.feat.properties || {};
                            const buildingName = featureProps.building || featureProps.name || featureProps.alt_name;
                            if (buildingName) {
                                window.dispatchEvent(new CustomEvent('njit-route-to', { detail: { name: buildingName, coords: [best.cy, best.cx] } }));
                            }
                        }
                    } catch (err) { void err; }
            };

            // attach handler for mapbox or google
            if (typeof map.on === 'function') {
                map.on('click', clickHandler);
                return () => { try { map.off('click', clickHandler); } catch (e) { void e; } };
            } else if (map && typeof map.addListener === 'function') {
                const listener = map.addListener('click', (e) => clickHandler(e));
                return () => { try { listener.remove(); } catch (e) { void e; } };
            }
        } catch (e) { void e; }
    }, [mapsIndoorsInstance]);

    // Listen for NJIT overlay route requests and compute a route using the existing DirectionsService.
    // For testing we force the origin to the ECE building coordinates.
    // Register listener immediately and queue requests until directionsService is ready.
    useEffect(() => {
        console.log('MapWrapper registering njit-route-to listener');
        const ECE_ORIGIN = { lng: -74.17876435736274, lat: 40.74141297826167 };

        // Keep a mutable reference to the latest directionsService so the handler can use it even if it changes later
        let dsRef = directionsService;
        const updateDsRef = () => { dsRef = directionsService; };
        updateDsRef();

        const handler = async (evt) => {
            console.log('MapWrapper handler invoked for njit-route-to', evt && evt.detail);
            try {
                console.log('njit-route-to received', evt && evt.detail);
                const detail = evt?.detail || {};
                const coords = detail.coords;
                if (!coords || !Array.isArray(coords) || coords.length < 2) return;
                const destLng = coords[0];
                const destLat = coords[1];

                // Prefer live user position when available. Fall back to ECE building (no "test" label).
                let originLocation;
                if (userPosition && userPosition.coords) {
                    originLocation = {
                        id: 'USER_POSITION',
                        geometry: { type: 'Point', coordinates: [userPosition.coords.longitude, userPosition.coords.latitude] },
                        properties: { name: 'My position' }
                    };
                } else {
                    originLocation = { geometry: { type: 'Point', coordinates: [ECE_ORIGIN.lng, ECE_ORIGIN.lat] }, properties: { name: 'ECE Building' } };
                }

                // Prefer an explicit entrance point from our campus GeoJSON if available
                let destinationLocation = { geometry: { type: 'Point', coordinates: [destLng, destLat] }, properties: { name: detail.name || detail.building || 'Destination' } };
                try {
                    const gj = window._njit_geojson;
                    if (gj && Array.isArray(gj.features)) {
                        const findByCodeOrName = (feat) => {
                            const p = feat.properties || {};
                            if (detail.code && p.code && p.code.toLowerCase() === detail.code.toLowerCase()) return true;
                            if (detail.name && p.name && p.name.toLowerCase().includes(detail.name.toLowerCase())) return true;
                            // match by coordinates (feature geometry centroid)
                            if (feat.geometry && feat.geometry.type === 'Point') {
                                const [fx, fy] = feat.geometry.coordinates;
                                if (Math.abs(fx - destLng) < 0.00001 && Math.abs(fy - destLat) < 0.00001) return true;
                            }
                            return false;
                        };

                        const matched = gj.features.find(findByCodeOrName);
                        if (matched && matched.properties && Array.isArray(matched.properties.entrances) && matched.properties.entrances.length > 0) {
                            // Prefer using the directions provider to pick the entrance with the shortest walking route.
                            const entrances = matched.properties.entrances;
                            const originLng = originLocation.geometry.coordinates[0];
                            const originLat = originLocation.geometry.coordinates[1];

                            let chosen = null;
                            // If directions service is ready, compute real walking route to each entrance and pick smallest distance
                            if (dsRef) {
                                try {
                                    const promises = entrances.map(async (entr) => {
                                        if (!entr || !Array.isArray(entr.coordinates) || entr.coordinates.length < 2) return null;
                                        const [eLng, eLat] = entr.coordinates;
                                        try {
                                            const route = await dsRef.getRoute({ origin: { lat: originLat, lng: originLng }, destination: { lat: eLat, lng: eLng }, travelMode: 'WALKING' });
                                            if (route && route.legs) {
                                                const total = route.legs.reduce((acc, cur) => acc + (cur.distance?.value || 0), 0);
                                                return { entr, eLng, eLat, total, route };
                                            }
                                        } catch (e) {
                                            return { entr, eLng, eLat, total: Number.MAX_SAFE_INTEGER };
                                        }
                                        return null;
                                    });
                                    const results = await Promise.all(promises);
                                    const valid = results.filter(r => r && typeof r.total === 'number');
                                    if (valid.length > 0) chosen = valid.reduce((a, b) => a.total <= b.total ? a : b);
                                } catch (err) { console.warn('MapWrapper: route-based entrance selection failed', err); }
                            }

                            // Fallback to straight-line nearest entrance when DS not available or route-based failed
                            if (!chosen) {
                                const toRad = v => v * Math.PI / 180;
                                const haversine = (lat1, lon1, lat2, lon2) => {
                                    const R = 6371000;
                                    const dLat = toRad(lat2 - lat1);
                                    const dLon = toRad(lon2 - lon1);
                                    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
                                    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                                };
                                for (const entr of entrances) {
                                    if (!entr || !Array.isArray(entr.coordinates) || entr.coordinates.length < 2) continue;
                                    const [eLng, eLat] = entr.coordinates;
                                    const d = haversine(originLat, originLng, eLat, eLng);
                                    if (!chosen || d < chosen.d) chosen = { d, entr, eLng, eLat };
                                }
                            }

                            if (chosen) {
                                destinationLocation = { geometry: { type: 'Point', coordinates: [chosen.eLng, chosen.eLat] }, properties: { name: matched.properties.name || destinationLocation.properties.name, code: matched.properties.code, entrance: chosen.entr } };
                                console.log('MapWrapper: routing to chosen entrance for', matched.properties.name, 'at', chosen.entr.coordinates, 'distance_m/route_cost=', chosen.d ?? chosen.total);
                            }
                        }
                    }
                } catch (err) { console.warn('MapWrapper: error matching feature entrances', err); }

                const ds = dsRef;
                console.log('MapWrapper: directionsService present?', !!ds, ds);
                if (!ds) {
                    console.warn('DirectionsService not ready yet — queueing route request');
                    window._njit_pending_route = { originLocation, destinationLocation };
                    return;
                }

                const routeParams = {
                    origin: { lat: originLocation.geometry.coordinates[1], lng: originLocation.geometry.coordinates[0] },
                    destination: { lat: destinationLocation.geometry.coordinates[1], lng: destinationLocation.geometry.coordinates[0] },
                    travelMode: 'WALKING'
                };
                console.log('MapWrapper: calling getRoute with', routeParams);
                try {
                    ds.getRoute(routeParams).then(directionsResult => {
                        console.log('MapWrapper: getRoute resolved', directionsResult);
                        if (!directionsResult || !directionsResult.legs) return;
                        const totalDistance = directionsResult.legs.reduce((acc, cur) => acc + (cur.distance?.value || 0), 0);
                        const totalTime = directionsResult.legs.reduce((acc, cur) => acc + (cur.duration?.value || 0), 0);
                        console.log('MapWrapper: setting directionsResponse');
                        setDirectionsResponse({ originLocation, destinationLocation, totalDistance, totalTime, directionsResult });
                        // Render route on the map even when Directions UI is suppressed
                        try {
                            if (window.mapsindoors && mapsIndoorsInstance) {
                                let mapRenderer = window._njit_map_renderer;
                                if (!mapRenderer) {
                                    mapRenderer = new window.mapsindoors.directions.DirectionsRenderer({ mapsIndoors: mapsIndoorsInstance, fitBounds: true });
                                    window._njit_map_renderer = mapRenderer;
                                    console.log('MapWrapper: created _njit_map_renderer');
                                }
                                mapRenderer.setRoute(directionsResult).then(() => {
                                    console.log('MapWrapper: map renderer setRoute succeeded');
                                }).catch(err => console.error('MapWrapper: map renderer setRoute failed', err));
                            }
                        } catch (err) { console.error('MapWrapper: failed to render route on map', err); }
                    }).catch(err => {
                        console.error('MapWrapper: getRoute rejected', err);
                    });
                } catch (err) {
                    console.error('MapWrapper: getRoute threw', err);
                }
            } catch (err) {
                console.error('njit-route-to handler error', err);
            }
        };

        window.addEventListener('njit-route-to', handler);

        // Poll until directionsService becomes available and process any queued request
        const intervalId = setInterval(() => {
            updateDsRef();
            if (dsRef && window._njit_pending_route) {
                const p = window._njit_pending_route;
                try {
                    // If queued destination corresponds to a campus feature with an entrance, prefer that entrance
                    let destLat = p.destinationLocation.geometry.coordinates[1];
                    let destLng = p.destinationLocation.geometry.coordinates[0];
                    try {
                        const gj = window._njit_geojson;
                        if (gj && Array.isArray(gj.features)) {
                            const pName = p.destinationLocation.properties?.name;
                            const matched = gj.features.find(f => (f.properties && pName && f.properties.name && f.properties.name.toLowerCase().includes(pName.toLowerCase())) || (f.geometry && f.geometry.type === 'Point' && Math.abs(f.geometry.coordinates[0] - p.destinationLocation.geometry.coordinates[0]) < 0.00001 && Math.abs(f.geometry.coordinates[1] - p.destinationLocation.geometry.coordinates[1]) < 0.00001));
                            if (matched && matched.properties && Array.isArray(matched.properties.entrances) && matched.properties.entrances.length > 0) {
                                // If directions service is available, compute real walking route to each entrance and pick shortest
                                try {
                                    const entrances = matched.properties.entrances;
                                    const originLngQ = p.originLocation.geometry.coordinates[0];
                                    const originLatQ = p.originLocation.geometry.coordinates[1];
                                    if (dsRef) {
                                        (async () => {
                                            const promises = entrances.map(async (entr) => {
                                                if (!entr || !Array.isArray(entr.coordinates) || entr.coordinates.length < 2) return null;
                                                const [eLng, eLat] = entr.coordinates;
                                                try {
                                                    const route = await dsRef.getRoute({ origin: { lat: originLatQ, lng: originLngQ }, destination: { lat: eLat, lng: eLng }, travelMode: 'WALKING' });
                                                    if (route && route.legs) {
                                                        const total = route.legs.reduce((acc, cur) => acc + (cur.distance?.value || 0), 0);
                                                        return { entr, eLng, eLat, total, route };
                                                    }
                                                } catch (e) {
                                                    return { entr, eLng, eLat, total: Number.MAX_SAFE_INTEGER };
                                                }
                                                return null;
                                            });
                                            const results = await Promise.all(promises);
                                            const valid = results.filter(r => r && typeof r.total === 'number');
                                            if (valid.length > 0) {
                                                const best = valid.reduce((a, b) => a.total <= b.total ? a : b);
                                                // Use the chosen route directly to render and store response
                                                try {
                                                    const directionsResult = best.route;
                                                    if (directionsResult && directionsResult.legs) {
                                                        const totalDistance = directionsResult.legs.reduce((acc, cur) => acc + (cur.distance?.value || 0), 0);
                                                        const totalTime = directionsResult.legs.reduce((acc, cur) => acc + (cur.duration?.value || 0), 0);
                                                        setDirectionsResponse({ originLocation: p.originLocation, destinationLocation: p.destinationLocation, totalDistance, totalTime, directionsResult });
                                                        if (window.mapsindoors && mapsIndoorsInstance) {
                                                            let mapRenderer = window._njit_map_renderer;
                                                            if (!mapRenderer) {
                                                                mapRenderer = new window.mapsindoors.directions.DirectionsRenderer({ mapsIndoors: mapsIndoorsInstance, fitBounds: true });
                                                                window._njit_map_renderer = mapRenderer;
                                                                console.log('MapWrapper: created _njit_map_renderer (queued)');
                                                            }
                                                            mapRenderer.setRoute(directionsResult).then(() => {
                                                                console.log('MapWrapper: queued map renderer setRoute succeeded (route-based)');
                                                            }).catch(err => console.error('MapWrapper: queued map renderer setRoute failed', err));
                                                        }
                                                        window._njit_pending_route = null;
                                                        // Skip the default queued getRoute flow since we've already processed
                                                        return;
                                                    }
                                                } catch (err) { console.warn('MapWrapper: error using best route for queued processing', err); }
                                            }
                                        })().catch(err => console.warn('MapWrapper: route-based queued selection failed', err));
                                    }
                                } catch (err) { console.warn('MapWrapper: error choosing queued entrance via route-based selection', err); }
                            }
                        }
                    } catch (err) { console.warn('MapWrapper: error matching queued destination to entrance', err); }

                    const queuedParams = {
                        origin: { lat: p.originLocation.geometry.coordinates[1], lng: p.originLocation.geometry.coordinates[0] },
                        destination: { lat: destLat, lng: destLng },
                        travelMode: 'WALKING'
                    };
                    console.log('MapWrapper: processing queued route with', queuedParams);
                    dsRef.getRoute(queuedParams).then(directionsResult => {
                        console.log('MapWrapper: queued getRoute resolved', directionsResult);
                        if (!directionsResult || !directionsResult.legs) return;
                        const totalDistance = directionsResult.legs.reduce((acc, cur) => acc + (cur.distance?.value || 0), 0);
                        const totalTime = directionsResult.legs.reduce((acc, cur) => acc + (cur.duration?.value || 0), 0);
                        setDirectionsResponse({ originLocation: p.originLocation, destinationLocation: p.destinationLocation, totalDistance, totalTime, directionsResult });
                        try {
                            if (window.mapsindoors && mapsIndoorsInstance) {
                                let mapRenderer = window._njit_map_renderer;
                                if (!mapRenderer) {
                                    mapRenderer = new window.mapsindoors.directions.DirectionsRenderer({ mapsIndoors: mapsIndoorsInstance, fitBounds: true });
                                    window._njit_map_renderer = mapRenderer;
                                    console.log('MapWrapper: created _njit_map_renderer (queued)');
                                }
                                mapRenderer.setRoute(directionsResult).then(() => {
                                    console.log('MapWrapper: queued map renderer setRoute succeeded');
                                }).catch(err => console.error('MapWrapper: queued map renderer setRoute failed', err));
                            }
                        } catch (err) { console.error('MapWrapper: failed to render queued route on map', err); }
                        window._njit_pending_route = null;
                    }).catch(err => console.error('Queued njit-route-to failed', err));
                } catch (err) { console.error(err); }
            }
        }, 500);

        return () => {
            window.removeEventListener('njit-route-to', handler);
            clearInterval(intervalId);
        };
    }, [directionsService, setDirectionsResponse]);

    /*
     * React on changes in the tile style prop.
     */
    useEffect(() => {
        _tileStyle = tileStyle || 'default';
        onTileStyleChanged(mapsIndoorsInstance);
    }, [tileStyle]);

    /**
     * React on changes in appConfig and sets visibility of View Selector and visibility of Language Selector.
     */
    useEffect(() => {
        if (appConfig) {
            if (isNullOrUndefined(appConfig?.appSettings?.viewSelector)) {
                setIsViewSelectorVisible(false);
            } else {
                // Boolean from the App Config comes as a string. We need to return clean boolean value based on that.
                setIsViewSelectorVisible(appConfig?.appSettings?.viewSelector.trim().toLowerCase() === 'true');
            }


            if (isNullOrUndefined(appConfig?.appSettings?.languageSelector)) {
                setIsLanguageSelectorVisible(false);
            } else {
                // Boolean from the App Config comes as a string. We need to return clean boolean value based on that.
                setIsLanguageSelectorVisible(appConfig?.appSettings?.languageSelector.trim().toLowerCase() === 'true');
            }
        }
    }, [appConfig])

    // Use Google hybrid (satellite + labels) when Google Maps is selected
    const mergedMapOptions = mapType === mapTypes.Google
        ? { ...mapOptions, mapTypeId: 'hybrid' }
        : mapOptions;

    return (<>
        {apiKey && <MIMap
            apiKey={apiKey}
            mapboxAccessToken={mapType === mapTypes.Mapbox ? mapboxAccessToken : undefined}
            gmApiKey={mapType === mapTypes.Google ? gmApiKey : undefined}
            onInitialized={onInitialized}
            resetUICounter={resetCount}
            mapOptions={mergedMapOptions}
            gmMapId={gmMapId}
            devicePosition={devicePosition}
            isKiosk={isKiosk}
        />}
        {/* Static campus overlay */}
        {apiKey && <GeoJsonOverlay />}
        {/* Floor plans overlay for indoor viewing */}
        {apiKey && <FloorPlansOverlay />}
        {/* Pass isWayfindingOrDirections prop to ViewSelector to disable interactions while wayfinding or directions is active*/}
        {apiKey && <>
            <ViewSelector isViewSelectorVisible={isViewSelectorVisible} isViewSelectorDisabled={isWayfindingOrDirections} />
            <LanguageSelector currentLanguage={currentLanguage} setLanguage={setLanguage} isVisible={isLanguageSelectorVisible} />
            <ResetKioskViewButton />
        </>}
    </>)
}

export default MapWrapper;
