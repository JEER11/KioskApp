import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import mapsIndoorsInstanceState from '../../atoms/mapsIndoorsInstanceState';
import mapTypeState from '../../atoms/mapTypeState';
import { mapTypes } from '../../constants/mapTypes';

/**
 * Renders a GeoJSON overlay on the underlying base map (Mapbox or Google Maps).
 * Loads data from /data/njit-campus.geojson if present; silently skips if not found.
 */
function GeoJsonOverlay() {
    const mapsIndoorsInstance = useRecoilValue(mapsIndoorsInstanceState);
    const mapType = useRecoilValue(mapTypeState);
    const googleDataLayerRef = useRef(null);
    const [mediaMap, setMediaMap] = useState({});

    useEffect(() => {
        let aborted = false;
        async function loadAndRender() {
            if (!mapsIndoorsInstance || !mapType) return;
            try {
                // Try load media mapping
                try {
                    const mediaRes = await fetch('/data/njit-media.json', { cache: 'no-cache' });
                    if (mediaRes.ok) {
                        const mm = await mediaRes.json();
                        if (!aborted) setMediaMap(mm || {});
                    }
                } catch (e) { void e; }

                const res = await fetch('/data/njit-campus.geojson', { cache: 'no-cache' });
                if (!res.ok) return; // skip if file not present
                const geojson = await res.json();
                if (aborted) return;

                if (mapType === mapTypes.Mapbox) {
                    const map = mapsIndoorsInstance.getMap();
                    if (!map) return;
                    const sourceId = 'njit-geojson';
                    const layers = [
                        {
                            id: 'njit-parking-fill',
                            type: 'fill',
                            filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'amenity'], 'parking']],
                            paint: { 'fill-color': '#FFD54F', 'fill-opacity': 0.35 }
                        },
                        {
                            id: 'njit-building-fill',
                            type: 'fill',
                            filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['has', 'building']],
                            paint: { 'fill-color': '#C00000', 'fill-opacity': 0.25 }
                        },
                        {
                            id: 'njit-outline',
                            type: 'line',
                            filter: ['in', ['geometry-type'], 'Polygon', 'MultiPolygon'],
                            paint: { 'line-color': '#C00000', 'line-width': 1 }
                        },
                        {
                            id: 'njit-points',
                            type: 'circle',
                            filter: ['==', ['geometry-type'], 'Point'],
                            paint: { 'circle-color': ['case', ['==', ['get', 'amenity'], 'toilets'], '#1E88E5', '#C00000'], 'circle-radius': 4, 'circle-opacity': 0.9 }
                        }
                    ];

                    if (map.getSource(sourceId)) {
                        map.getSource(sourceId).setData(geojson);
                    } else {
                        map.addSource(sourceId, { type: 'geojson', data: geojson });
                    }

                    // Add layers if missing
                    layers.forEach(l => {
                        if (!map.getLayer(l.id)) {
                            map.addLayer({ id: l.id, type: l.type, source: sourceId, filter: l.filter, paint: l.paint });
                        }
                    });

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
                            const content = buildPopupContent(feature?.properties || {});
                            new window.mapboxgl.Popup({ closeOnClick: true })
                                .setLngLat(e.lngLat)
                                .setHTML(content)
                                .addTo(map);
                        };
                        map.on('click', layerId, handler);
                    };

                    addClick('njit-building-fill');
                    addClick('njit-points');
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
                        const isParking = amenity === 'parking';
                        const fillColor = isParking ? '#FFD54F' : (hasBuilding ? '#C00000' : '#9E9E9E');
                        const fillOpacity = isParking ? 0.35 : (hasBuilding ? 0.25 : 0.15);
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
        }

        loadAndRender();
        return () => {
            aborted = true;
            if (mapType === mapTypes.Mapbox && mapsIndoorsInstance) {
                const map = mapsIndoorsInstance.getMap();
                if (map) {
                    ['njit-points', 'njit-outline', 'njit-building-fill', 'njit-parking-fill'].forEach(id => {
                        if (map.getLayer(id)) map.removeLayer(id);
                    });
                    if (map.getSource('njit-geojson')) map.removeSource('njit-geojson');
                }
            }
            if (googleDataLayerRef.current) {
                googleDataLayerRef.current.setMap(null);
                googleDataLayerRef.current = null;
            }
        };
    }, [mapsIndoorsInstance, mapType]);

    return null;
}

export default GeoJsonOverlay;
