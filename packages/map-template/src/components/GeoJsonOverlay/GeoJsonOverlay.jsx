import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import mapsIndoorsInstanceState from '../../atoms/mapsIndoorsInstanceState';
import mapTypeState from '../../atoms/mapTypeState';
import { mapTypes } from '../../constants/mapTypes';
import selectedCategoryState from '../../atoms/selectedCategoryState';

/**
 * Renders a GeoJSON overlay on the underlying base map (Mapbox or Google Maps).
 * Loads data from /data/njit-campus.geojson if present; silently skips if not found.
 */
function GeoJsonOverlay() {
    const mapsIndoorsInstance = useRecoilValue(mapsIndoorsInstanceState);
    const mapType = useRecoilValue(mapTypeState);
    const selectedCategory = useRecoilValue(selectedCategoryState);
    const googleDataLayerRef = useRef(null);
    const googleHighlightCircleRef = useRef(null);
    const [mediaMap, setMediaMap] = useState({});

    useEffect(() => {
        if (!mapsIndoorsInstance) return;

        let aborted = false;
        const lower = (selectedCategory || '').toLowerCase();
        const isRestroom = lower.includes('restroom');
        const isParking = lower.includes('parking');

        const loadAndRender = async () => {
            try {
                // Load media map if present
                try {
                    const mediaRes = await fetch('/data/njit-media.json');
                    if (mediaRes.ok) {
                        const mediaJson = await mediaRes.json();
                        if (!aborted) setMediaMap(mediaJson || {});
                    }
                } catch (e) { void e; }

                // Load campus GeoJSON
                const res = await fetch('/data/njit-campus.geojson');
                if (!res.ok) return;
                const geojson = await res.json();

                if (mapType === mapTypes.Mapbox) {
                    const map = mapsIndoorsInstance.getMap();
                    if (!map) return;
                    const sourceId = 'njit-geojson';
                    const highlightSourceId = 'njit-highlight-point';

                    // Build filters
                    const basePointFilter = ['==', ['geometry-type'], 'Point'];
                    let amenityFilter = true;
                    if (isRestroom) {
                        amenityFilter = ['in', ['get', 'amenity'], ['literal', ['toilets', 'toilet', 'restroom']]];
                    } else if (isParking) {
                        amenityFilter = ['==', ['get', 'amenity'], 'parking'];
                    }

                    const layers = [
                        {
                            id: 'njit-parking-fill',
                            type: 'fill',
                            filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'amenity'], 'parking']],
                            paint: { 'fill-color': '#FFD54F', 'fill-opacity': 0.18 }
                        },
                        {
                            id: 'njit-building-fill',
                            type: 'fill',
                            filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['has', 'building']],
                            paint: { 'fill-color': '#C00000', 'fill-opacity': 0.12 }
                        },
                        {
                            id: 'njit-outline',
                            type: 'line',
                            filter: ['in', ['geometry-type'], 'Polygon', 'MultiPolygon'],
                            paint: { 'line-color': '#C00000', 'line-width': 0.6, 'line-opacity': 0.5 }
                        },
                        {
                            id: 'njit-points',
                            type: 'circle',
                            filter: ['all', basePointFilter, amenityFilter],
                            paint: { 'circle-color': ['case', ['in', ['get', 'amenity'], ['literal', ['toilets', 'toilet', 'restroom']]], '#1E88E5', '#C00000'], 'circle-radius': 4, 'circle-opacity': 0.95 }
                        }
                    ];

                    if (map.getSource(sourceId)) {
                        map.getSource(sourceId).setData(geojson);
                    } else {
                        map.addSource(sourceId, { type: 'geojson', data: geojson });
                    }

                    // Highlight point source for glowing restroom marker
                    if (!map.getSource(highlightSourceId)) {
                        map.addSource(highlightSourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                    }

                    // Add layers if missing
                    layers.forEach(l => {
                        if (!map.getLayer(l.id)) {
                            map.addLayer({ id: l.id, type: l.type, source: sourceId, filter: l.filter, paint: l.paint });
                        }
                    });

                    // Add label layer for feature names (Mapbox)
                    const labelFilter = ['all', basePointFilter, amenityFilter];
                    if (!map.getLayer('njit-labels')) {
                        map.addLayer({
                            id: 'njit-labels',
                            type: 'symbol',
                            source: sourceId,
                            filter: labelFilter,
                            layout: {
                                'text-field': ['get', 'name'],
                                'text-size': 12,
                                'text-offset': [0, 1.2],
                                'text-anchor': 'top',
                                'text-allow-overlap': false
                            },
                            paint: {
                                'text-color': '#1b1b1b',
                                'text-halo-color': '#ffffff',
                                'text-halo-width': 1.2,
                                'text-halo-blur': 0.5
                            }
                        });
                    } else {
                        map.setFilter('njit-labels', labelFilter);
                    }

                    // Enhance building visibility using Mapbox composite source
                    try {
                        const style = map.getStyle();
                        const hasComposite = !!style?.sources?.composite;
                        if (hasComposite) {
                            // Building highlight fill layer (updated via filter when focusing)
                            if (!map.getLayer('njit-building-highlight')) {
                                map.addLayer({
                                    id: 'njit-building-highlight',
                                    type: 'fill',
                                    source: 'composite',
                                    'source-layer': 'building',
                                    paint: {
                                        'fill-color': '#C00000',
                                        'fill-opacity': 0.2
                                    }
                                });
                            }
                            if (!map.getLayer('njit-building-outline-composite')) {
                                map.addLayer({
                                    id: 'njit-building-outline-composite',
                                    type: 'line',
                                    source: 'composite',
                                    'source-layer': 'building',
                                    paint: {
                                        'line-color': '#6b6b6b',
                                        'line-width': 0.8,
                                        'line-opacity': 0.6
                                    }
                                });
                            }
                            if (!map.getLayer('njit-building-extrusion')) {
                                map.addLayer({
                                    id: 'njit-building-extrusion',
                                    type: 'fill-extrusion',
                                    source: 'composite',
                                    'source-layer': 'building',
                                    minzoom: 15,
                                    paint: {
                                        'fill-extrusion-color': '#bdbdbd',
                                        'fill-extrusion-height': ['coalesce', ['get', 'height'], 3],
                                        'fill-extrusion-opacity': 0.25
                                    }
                                });
                            }
                        }
                    } catch (e) { /* no-op */ }

                    // Restroom glow highlight around focused point
                    if (!map.getLayer('njit-restroom-highlight')) {
                        map.addLayer({
                            id: 'njit-restroom-highlight',
                            type: 'circle',
                            source: highlightSourceId,
                            paint: {
                                'circle-color': '#1E88E5',
                                'circle-opacity': 0.25,
                                'circle-radius': 18,
                                'circle-stroke-color': '#1E88E5',
                                'circle-stroke-width': 2,
                                'circle-stroke-opacity': 0.9
                            }
                        });
                    }

                    // Add click popups (Mapbox)
                    const buildPopupContent = (properties) => {
                        const name = properties?.name || properties?.alt_name || 'Feature';
                        const amenity = properties?.amenity;
                        const key = name.toLowerCase();
                        const img = mediaMap[key] || properties?.image;
                        const title = amenity ? `${name} · ${amenity}` : name;
                        const imgHtml = img ? `<div style="margin-top:6px"><img src="${img}" alt="${name}" style="max-width:240px;border-radius:6px"/></div>` : '';
                        return `<div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#222">${title}${imgHtml}</div>`;
                    };

                    const addClick = (layerId) => {
                        if (typeof window.mapboxgl === 'undefined') return;
                        const handler = (e) => {
                            const feature = e.features && e.features[0];
                            const properties = feature?.properties || {};
                            const content = buildPopupContent(properties);
                            new window.mapboxgl.Popup({ closeOnClick: true })
                                .setLngLat(e.lngLat)
                                .setHTML(content)
                                .addTo(map);

                            // Dispatch focus event to enable floorplans overlay
                            try {
                                const buildingName = properties.building || properties.name || properties.alt_name;
                                const lng = e.lngLat?.lng;
                                const lat = e.lngLat?.lat;
                                if (buildingName && typeof lng === 'number' && typeof lat === 'number') {
                                    window.dispatchEvent(new CustomEvent('njit-focus', {
                                        detail: { building: buildingName, coords: [lng, lat] }
                                    }));
                                }
                            } catch (err) { void err; }
                        };
                        map.on('click', layerId, handler);
                    };
                    addClick('njit-building-fill');
                    addClick('njit-points');
                    // Also listen on the base map 'building' layer for clicks
                    try {
                        if (map.getLayer('building')) {
                            addClick('building');
                        }
                    } catch (err) { /* no-op */ }
                }

                if (mapType === mapTypes.Google && typeof window.google !== 'undefined' && window.google.maps) {
                    const map = mapsIndoorsInstance.getMap();
                    if (!map) return;

                    // Clean up any existing layer
                    if (googleDataLayerRef.current) {
                        googleDataLayerRef.current.setMap(null);
                        googleDataLayerRef.current = null;
                    }

                    const dataLayer = new window.google.maps.Data({ map });
                    dataLayer.addGeoJson(geojson);
                    dataLayer.setStyle(feature => {
                        const geomType = feature.getGeometry()?.getType();
                        const amenity = feature.getProperty('amenity');
                        const hasBuilding = feature.getProperty('building') != null;

                        // Apply category filters: hide non-matching features
                        if (isRestroom) {
                            const match = amenity === 'toilets' || amenity === 'toilet' || amenity === 'restroom';
                            if (!match) return { visible: false };
                        } else if (isParking) {
                            if (amenity !== 'parking') return { visible: false };
                        }

                        if (geomType === 'Point') {
                            const isToilet = amenity === 'toilets' || amenity === 'toilet' || amenity === 'restroom';
                            return {
                                icon: {
                                    path: window.google.maps.SymbolPath.CIRCLE,
                                    scale: 4,
                                    fillColor: isToilet ? '#1E88E5' : '#C00000',
                                    fillOpacity: 0.9,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 1
                                }
                            };
                        }

                        // Polygons
                        const isParkingPoly = amenity === 'parking';
                        const fillColor = isParkingPoly ? '#FFD54F' : (hasBuilding ? '#C00000' : '#9E9E9E');
                        const fillOpacity = isParkingPoly ? 0.35 : (hasBuilding ? 0.25 : 0.15);
                        return {
                            fillColor,
                            fillOpacity,
                            strokeColor: '#C00000',
                            strokeOpacity: 0.8,
                            strokeWeight: 1
                        };
                    });
                    googleDataLayerRef.current = dataLayer;

                    // Click info window (Google)
                    const infoWindow = new window.google.maps.InfoWindow();
                    dataLayer.addListener('click', (e) => {
                        const properties = {
                            name: e.feature.getProperty('name') || e.feature.getProperty('alt_name'),
                            amenity: e.feature.getProperty('amenity'),
                            image: e.feature.getProperty('image')
                        };
                        const key = (properties.name || '').toLowerCase();
                        const img = mediaMap[key] || properties.image;
                        const title = properties.amenity ? `${properties.name} · ${properties.amenity}` : (properties.name || 'Feature');
                        const imgHtml = img ? `<div style="margin-top:6px"><img src="${img}" alt="${properties.name}" style="max-width:240px;border-radius:6px"/></div>` : '';
                        const content = `<div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#222">${title}${imgHtml}</div>`;
                        infoWindow.setContent(content);
                        infoWindow.setPosition(e.latLng);
                        infoWindow.open({ map });
                    });
                }
            } catch (e) {
                // Silently ignore fetch/parse failures
            }
        };

        loadAndRender();

        // Handle NJIT focus events to highlight restroom and building
        const onFocus = (evt) => {
            const coords = evt?.detail?.coords;
            if (!coords) return;
            if (mapType === mapTypes.Mapbox) {
                const map = mapsIndoorsInstance?.getMap?.();
                if (!map) return;
                const [lng, lat] = coords;
                const hs = map.getSource('njit-highlight-point');
                if (hs) {
                    hs.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] } }] });
                }
                try {
                    const pt = map.project([lng, lat]);
                    const features = map.queryRenderedFeatures(pt, { layers: ['building'] });
                    const buildingId = features?.[0]?.id;
                    if (typeof buildingId !== 'undefined' && map.getLayer('njit-building-highlight')) {
                        map.setFilter('njit-building-highlight', ['==', ['id'], buildingId]);
                    }
                } catch (e) { /* ignore */ }
            } else if (mapType === mapTypes.Google && typeof window.google !== 'undefined' && window.google.maps) {
                const map = mapsIndoorsInstance?.getMap?.();
                if (!map) return;
                const [lng, lat] = coords;
                if (googleHighlightCircleRef.current) {
                    googleHighlightCircleRef.current.setMap(null);
                    googleHighlightCircleRef.current = null;
                }
                googleHighlightCircleRef.current = new window.google.maps.Circle({
                    map,
                    center: { lat, lng },
                    radius: 12,
                    strokeColor: '#1E88E5',
                    strokeOpacity: 0.9,
                    strokeWeight: 2,
                    fillColor: '#1E88E5',
                    fillOpacity: 0.25
                });
            }
        };
        window.addEventListener('njit-focus', onFocus);

        return () => {
            aborted = true;
            if (mapType === mapTypes.Mapbox && mapsIndoorsInstance) {
                const map = mapsIndoorsInstance.getMap();
                if (map) {
                    ['njit-points', 'njit-outline', 'njit-building-fill', 'njit-parking-fill', 'njit-labels'].forEach(id => {
                        if (map.getLayer(id)) map.removeLayer(id);
                    });
                    if (map.getSource('njit-geojson')) map.removeSource('njit-geojson');
                    if (map.getSource('njit-highlight-point')) map.removeSource('njit-highlight-point');
                    if (map.getLayer('njit-restroom-highlight')) map.removeLayer('njit-restroom-highlight');
                    if (map.getLayer('njit-building-highlight')) map.removeLayer('njit-building-highlight');
                }
            }
            if (googleDataLayerRef.current) {
                googleDataLayerRef.current.setMap(null);
                googleDataLayerRef.current = null;
            }
            if (googleHighlightCircleRef.current) {
                googleHighlightCircleRef.current.setMap(null);
                googleHighlightCircleRef.current = null;
            }
            window.removeEventListener('njit-focus', onFocus);
        };
    }, [mapsIndoorsInstance, mapType, selectedCategory]);

    return null;
}

export default GeoJsonOverlay;
