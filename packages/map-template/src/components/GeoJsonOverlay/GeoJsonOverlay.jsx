import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import mapsIndoorsInstanceState from '../../atoms/mapsIndoorsInstanceState';
import mapTypeState from '../../atoms/mapTypeState';
import { mapTypes } from '../../constants/mapTypes';
import selectedCategoryState from '../../atoms/selectedCategoryState';
import categoriesState from '../../atoms/categoriesState';
import femaleSvg from '../../assets/restroomrestroom/Tfemale.svg';
import maleSvg from '../../assets/restroomrestroom/Tmale.svg';
import bothGenderSvg from '../../assets/restroomrestroom/Tbothgender.svg';

const ELEVATOR_ICON = '/Elevator.png';
const PARKING_ICON = '/Parking.png';
const STUDY_SPACE_ICON = '/Study.png';
const FOOD_ICON = '/Food.png';

const STUDY_SPACE_OVERLAY_LOCATIONS = [
    { id: 'york-center-study-area-1', name: 'York Center for Environmental Engineering and Science', description: 'First Floor', coords: [-74.17864781963625, 40.74075858416627] },
    { id: 'central-king-building-study-area-1', name: 'Central King Building', description: 'Basement, 1st, and 3rd Floor', coords: [-74.17769164592056, 40.74209852018736] },
    { id: 'campus-center-study-area-1', name: 'Campus Center', description: 'Basement, 1st, 2nd and 3rd Floor', coords: [-74.17827227389077, 40.74312345824983] },
    { id: 'robert-van-houten-library-study-area-1', name: 'Robert W. Van Houten Library', description: 'All floors & Reserved rooms', coords: [-74.17802913571659, 40.743844395187885] },
    { id: 'makerspace-study-area-1', name: 'Makerspace', description: 'First Floor Maker Space', coords: [-74.17884842511302, 40.743959282832066] },
    { id: 'makerspace-study-area-2', name: 'Makerspace', description: 'First Floor Open Area', coords: [-74.17955606809316, 40.74416753299178] },
    { id: 'kupfrian-hall-study-area-1', name: 'Kupfrian Hall', description: 'First & Second Floor', coords: [-74.1786174176951, 40.74256133133684] },
    { id: 'wellness-center-study-area-1', name: 'Wellness Center', description: 'First Floor', coords: [-74.18009195958216, 40.7425547511855] }
];

/**
 * Renders a GeoJSON overlay on the underlying base map (Mapbox or Google Maps).
 * Loads data from /data/njit-campus.geojson if present; silently skips if not found.
 */
function GeoJsonOverlay() {
    const mapsIndoorsInstance = useRecoilValue(mapsIndoorsInstanceState);
    const mapType = useRecoilValue(mapTypeState);
    const selectedCategory = useRecoilValue(selectedCategoryState);
    const categories = useRecoilValue(categoriesState);
    const googleDataLayerRef = useRef(null);
    const googleHighlightCircleRef = useRef(null);
    const [mediaMap, setMediaMap] = useState({});

    useEffect(() => {
        if (!mapsIndoorsInstance) return;

        let aborted = false;
        const selectedCategoryDisplayName = categories.find(([key]) => key === selectedCategory)?.[1]?.displayName || '';
        const lower = `${selectedCategory || ''} ${selectedCategoryDisplayName}`.toLowerCase();
        const isRestroom = /restroom|toilet|bathroom/.test(lower);
        const isParking = /parking|garage|lot/.test(lower);
        const isElevator = /elevator|lift/.test(lower);
        const isStudySpace = /study\s*space|study|studying|meeting|conference/.test(lower);

        const ensureMapImage = (map, imageId, path, onReady, maxSize = 256) => {
            if (!map) return;
            if (map.hasImage(imageId)) {
                if (typeof onReady === 'function') onReady();
                return;
            }

            const img = new Image();
            img.onload = () => {
                try {
                    if (!map.hasImage(imageId)) {
                        const width = img.naturalWidth || img.width;
                        const height = img.naturalHeight || img.height;
                        const biggestSide = Math.max(width, height);

                        if (biggestSide > maxSize) {
                            const scale = maxSize / biggestSide;
                            const targetWidth = Math.max(1, Math.round(width * scale));
                            const targetHeight = Math.max(1, Math.round(height * scale));
                            const canvas = document.createElement('canvas');
                            canvas.width = targetWidth;
                            canvas.height = targetHeight;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                                map.addImage(imageId, ctx.getImageData(0, 0, targetWidth, targetHeight));
                            } else {
                                map.addImage(imageId, img);
                            }
                        } else {
                            map.addImage(imageId, img);
                        }
                    }
                } catch (e) {
                    console.error('Failed adding map image', imageId, e);
                }

                if (typeof onReady === 'function') onReady();
            };
            img.onerror = () => {
                console.error('Failed loading map image', imageId, path);
            };
            img.src = path;
        };

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
                let geojson = await res.json();
                // Filter to NJIT campus bounds to avoid stray features
                const NJIT_BOUNDS = { minLng: -74.1832, maxLng: -74.1732, minLat: 40.7415, maxLat: 40.7449 };
                const withinBounds = (coords) => {
                    if (!Array.isArray(coords)) return false;
                    const [lng, lat] = coords;
                    return lng >= NJIT_BOUNDS.minLng && lng <= NJIT_BOUNDS.maxLng && lat >= NJIT_BOUNDS.minLat && lat <= NJIT_BOUNDS.maxLat;
                };
                const featureInBounds = (f) => {
                    try {
                        const g = f?.geometry;
                        if (!g) return false;
                        if (g.type === 'Point') return withinBounds(g.coordinates);
                        if (g.type === 'Polygon') return g.coordinates?.[0]?.some(withinBounds);
                        if (g.type === 'MultiPolygon') return g.coordinates?.flat(2)?.some(([lng, lat]) => withinBounds([lng, lat]));
                        return false;
                    } catch { return false; }
                };
                if (Array.isArray(geojson?.features)) {
                    geojson = { ...geojson, features: geojson.features.filter(featureInBounds) };
                    try { window._njit_geojson = geojson; console.log('GeoJsonOverlay: stored njit geojson on window._njit_geojson with', geojson.features.length, 'features'); } catch (e) { /* ignore */ }
                }

                if (mapType === mapTypes.Mapbox) {
                    const map = mapsIndoorsInstance.getMap();
                    if (!map) return;
                    // Wait for style so sources/layers can be added safely
                    if (!map.isStyleLoaded()) {
                        await new Promise(resolve => map.once('styledata', resolve));
                    }
                    const sourceId = 'njit-geojson';
                    const highlightSourceId = 'njit-highlight-point';

                    // Build filters
                    const basePointFilter = ['==', ['geometry-type'], 'Point'];
                    let amenityFilter = true;
                    if (isRestroom) {
                        amenityFilter = ['in', ['get', 'amenity'], ['literal', ['toilets', 'toilet', 'restroom']]];
                    } else if (isParking) {
                        amenityFilter = ['==', ['get', 'amenity'], 'parking'];
                    } else if (isElevator) {
                        amenityFilter = ['==', ['get', 'amenity'], 'elevator'];
                    }

                    // Base polygon filters
                    const basePolygonFilter = ['==', ['geometry-type'], 'Polygon'];
                    const outlineFilter = isParking
                        ? ['in', ['geometry-type'], 'Polygon', 'MultiPolygon']
                        : ['all', basePolygonFilter, ['has', 'building']];

                    // Ensure sources exist before layers
                    if (map.getSource(sourceId)) {
                        map.getSource(sourceId).setData(geojson);
                    } else {
                        map.addSource(sourceId, { type: 'geojson', data: geojson });
                    }

                    if (!map.getSource(highlightSourceId)) {
                        map.addSource(highlightSourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                    }

                    // Add/update building fill
                    if (!map.getLayer('njit-building-fill')) {
                        map.addLayer({
                            id: 'njit-building-fill',
                            type: 'fill',
                            source: sourceId,
                            filter: ['all', basePolygonFilter, ['has', 'building']],
                            paint: { 'fill-color': '#C00000', 'fill-opacity': 0.12 }
                        });
                    }

                    // Parking polygons only when parking is selected
                    if (isParking) {
                        if (!map.getLayer('njit-parking-fill')) {
                            map.addLayer({
                                id: 'njit-parking-fill',
                                type: 'fill',
                                source: sourceId,
                                filter: ['all', basePolygonFilter, ['==', ['get', 'amenity'], 'parking']],
                                paint: { 'fill-color': '#FFD54F', 'fill-opacity': 0.18 }
                            });
                        } else {
                            map.setFilter('njit-parking-fill', ['all', basePolygonFilter, ['==', ['get', 'amenity'], 'parking']]);
                        }
                    } else {
                        if (map.getLayer('njit-parking-fill')) map.removeLayer('njit-parking-fill');
                    }

                    // Outline polygons: limit to buildings unless parking category is active
                    if (!map.getLayer('njit-outline')) {
                        map.addLayer({ id: 'njit-outline', type: 'line', source: sourceId, filter: outlineFilter, paint: { 'line-color': '#C00000', 'line-width': 0.6, 'line-opacity': 0.5 } });
                    } else {
                        map.setFilter('njit-outline', outlineFilter);
                    }

                    // Points/icons layer: keep restroom and parking handling separate to avoid double-rendering.
                    const ensureImage = (name, path) => {
                        if (!map.hasImage(name)) {
                            const img = new Image();
                            img.onload = () => { if (!map.hasImage(name)) map.addImage(name, img); };
                            img.onerror = () => { /* ignore */ };
                            img.src = path;
                        }
                    };

                    if (isRestroom) {
                        const restroomIconFilter = ['all', basePointFilter, ['in', ['get', 'amenity'], ['literal', ['toilets', 'toilet', 'restroom']]], ['!=', ['get', 'amenity'], 'elevator']];

                        ensureImage('restroom-female', femaleSvg);
                        ensureImage('restroom-male', maleSvg);
                        ensureImage('restroom-all', bothGenderSvg);

                        // Map restroom gender values to matching restroom icon assets.
                        if (!map.getLayer('njit-point-icons')) {
                            map.addLayer({
                                id: 'njit-point-icons',
                                type: 'symbol',
                                source: sourceId,
                                filter: restroomIconFilter,
                                layout: {
                                    'icon-image': [
                                        'match',
                                        ['get', 'gender'],
                                        'female', 'restroom-female',
                                        'male', 'restroom-male',
                                        /* default */ 'restroom-all'
                                    ],
                                    'icon-size': 1.8,
                                    'icon-anchor': 'bottom',
                                    'icon-allow-overlap': true
                                }
                            });
                        } else {
                            map.setFilter('njit-point-icons', restroomIconFilter);
                        }
                    } else if (map.getLayer('njit-point-icons')) {
                        map.removeLayer('njit-point-icons');
                    }

                    if (isParking) {
                        ensureImage('parking-icon', PARKING_ICON);
                        if (!map.getLayer('njit-parking-icons')) {
                            map.addLayer({
                                id: 'njit-parking-icons',
                                type: 'symbol',
                                source: sourceId,
                                filter: ['all', basePointFilter, ['==', ['get', 'amenity'], 'parking']],
                                layout: {
                                    'icon-image': 'parking-icon',
                                    'icon-size': 2.8,
                                    'icon-anchor': 'bottom',
                                    'icon-allow-overlap': true
                                }
                            });
                        } else {
                            map.setFilter('njit-parking-icons', ['all', basePointFilter, ['==', ['get', 'amenity'], 'parking']]);
                        }
                    } else if (map.getLayer('njit-parking-icons')) {
                        map.removeLayer('njit-parking-icons');
                    }

                    // Add label layer for feature names (Mapbox)
                    const labelFilter = ['all', basePointFilter, amenityFilter];
                    const shouldShowLabels = isRestroom || isParking || isElevator;
                    if (shouldShowLabels) {
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
                    } else {
                        if (map.getLayer('njit-labels')) map.removeLayer('njit-labels');
                    }

                    // Add elevator icon layer
                    if (isElevator) {
                        // Load elevator icon if not already loaded
                        const addElevatorLayer = () => {
                            if (!map.getLayer('njit-elevator-icons')) {
                                map.addLayer({
                                    id: 'njit-elevator-icons',
                                    type: 'symbol',
                                    source: sourceId,
                                    filter: ['all', basePointFilter, ['==', ['get', 'amenity'], 'elevator']],
                                    layout: {
                                        'icon-image': 'elevator-icon',
                                        'icon-size': 1.2,
                                        'icon-anchor': 'center',
                                        'icon-allow-overlap': true
                                    }
                                });
                            } else {
                                map.setFilter('njit-elevator-icons', ['all', basePointFilter, ['==', ['get', 'amenity'], 'elevator']]);
                            }
                        };

                        if (!map.hasImage('elevator-icon')) {
                            const img = new Image();
                            img.onload = () => {
                                if (!map.hasImage('elevator-icon')) {
                                    map.addImage('elevator-icon', img);
                                    addElevatorLayer();
                                }
                            };
                            img.src = ELEVATOR_ICON;
                        } else {
                            addElevatorLayer();
                        }
                    } else {
                        if (map.getLayer('njit-elevator-icons')) map.removeLayer('njit-elevator-icons');
                    }

                    // Add study-space icon layer from curated coordinates when study category is active
                    if (isStudySpace) {
                        const sourceId = 'njit-study-space-markers';
                        const featureCollection = {
                            type: 'FeatureCollection',
                            features: STUDY_SPACE_OVERLAY_LOCATIONS.map((space) => ({
                                type: 'Feature',
                                geometry: { type: 'Point', coordinates: space.coords },
                                properties: { id: space.id, name: space.name, description: space.description }
                            }))
                        };

                        if (map.getSource(sourceId)) {
                            map.getSource(sourceId).setData(featureCollection);
                        } else {
                            map.addSource(sourceId, { type: 'geojson', data: featureCollection });
                        }

                        const addOrUpdateStudyLayer = () => {
                            if (!map.getLayer('njit-study-space-markers')) {
                                map.addLayer({
                                    id: 'njit-study-space-markers',
                                    type: 'symbol',
                                    source: sourceId,
                                    layout: {
                                        'icon-image': 'study-space-icon',
                                        'icon-size': 1.8,
                                        'icon-anchor': 'bottom',
                                        'icon-allow-overlap': true
                                    }
                                });
                            }
                        };

                        ensureMapImage(map, 'study-space-icon', STUDY_SPACE_ICON, addOrUpdateStudyLayer);
                    } else {
                        if (map.getLayer('njit-study-space-markers')) map.removeLayer('njit-study-space-markers');
                        if (map.getSource('njit-study-space-markers')) map.removeSource('njit-study-space-markers');
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
                        // Reduce clutter: hide underlying POI/parking symbol layers so only custom icons are visible.
                        ['poi-label'].forEach(layerId => {
                            if (map.getLayer(layerId)) {
                                map.setLayoutProperty(layerId, 'visibility', 'none');
                            }
                        });
                        const styleLayers = map.getStyle()?.layers || [];
                        styleLayers.forEach((layer) => {
                            const id = (layer?.id || '').toLowerCase();
                            if (!id || id.startsWith('njit-')) return;
                            if (layer?.type !== 'symbol') return;
                            const sourceLayer = (layer?.['source-layer'] || '').toLowerCase();
                            const isPoiOrParkingLayer =
                                id.includes('poi') ||
                                id.includes('parking') ||
                                sourceLayer.includes('poi') ||
                                sourceLayer.includes('parking');
                            const hasIconImage = !!layer?.layout?.['icon-image'];
                            if ((isPoiOrParkingLayer || hasIconImage) && map.getLayer(layer.id)) {
                                map.setLayoutProperty(layer.id, 'visibility', 'none');
                            }
                        });
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
                            
                            console.log('GeoJSON feature clicked:', layerId, 'amenity:', properties.amenity, 'name:', properties.name);
                            
                            // For elevators, show custom pin instead of popup
                            if (properties.amenity === 'elevator') {
                                console.log('Elevator clicked! Adding pin at:', e.lngLat);
                                console.log('Elevator icon path:', ELEVATOR_ICON);
                                
                                // Remove any existing elevator pin
                                if (map.getLayer('clicked-elevator-pin-layer')) {
                                    map.removeLayer('clicked-elevator-pin-layer');
                                }
                                if (map.getSource('clicked-elevator-pin-source')) {
                                    map.removeSource('clicked-elevator-pin-source');
                                }
                                
                                // Add elevator pin marker
                                if (!map.hasImage('elevator-click-pin')) {
                                    console.log('Loading elevator icon image...');
                                    const img = new Image();
                                    img.onload = () => {
                                        console.log('Elevator icon loaded successfully');
                                        if (!map.hasImage('elevator-click-pin')) {
                                            map.addImage('elevator-click-pin', img);
                                        }
                                        // Add source and layer
                                        map.addSource('clicked-elevator-pin-source', {
                                            type: 'geojson',
                                            data: {
                                                type: 'Feature',
                                                geometry: {
                                                    type: 'Point',
                                                    coordinates: [e.lngLat.lng, e.lngLat.lat]
                                                }
                                            }
                                        });
                                        map.addLayer({
                                            id: 'clicked-elevator-pin-layer',
                                            type: 'symbol',
                                            source: 'clicked-elevator-pin-source',
                                            layout: {
                                                'icon-image': 'elevator-click-pin',
                                                'icon-size': 1.4,
                                                'icon-anchor': 'bottom',
                                                'icon-allow-overlap': true,
                                                'icon-ignore-placement': true
                                            }
                                        });
                                        console.log('Elevator pin layer added');
                                    };
                                    img.onerror = (err) => {
                                        console.error('Failed to load elevator icon:', err);
                                    };
                                    img.src = ELEVATOR_ICON;
                                } else {
                                    console.log('Elevator icon already loaded, adding layer...');
                                    // Image already loaded, just add source and layer
                                    map.addSource('clicked-elevator-pin-source', {
                                        type: 'geojson',
                                        data: {
                                            type: 'Feature',
                                            geometry: {
                                                type: 'Point',
                                                coordinates: [e.lngLat.lng, e.lngLat.lat]
                                            }
                                        }
                                    });
                                    map.addLayer({
                                        id: 'clicked-elevator-pin-layer',
                                        type: 'symbol',
                                        source: 'clicked-elevator-pin-source',
                                        layout: {
                                            'icon-image': 'elevator-click-pin',
                                            'icon-size': 1.4,
                                            'icon-anchor': 'bottom',
                                            'icon-allow-overlap': true,
                                            'icon-ignore-placement': true
                                        }
                                    });
                                    console.log('Elevator pin layer added');
                                }
                                return; // Skip showing popup for elevators
                            }
                            
                            const content = buildPopupContent(properties);
                            try {
                                const popup = new window.mapboxgl.Popup({ closeOnClick: true, className: 'njit-popup-top' })
                                    .setLngLat(e.lngLat)
                                    .setHTML(content)
                                    .addTo(map);
                                const el = popup && typeof popup.getElement === 'function' ? popup.getElement() : null;
                                if (el) {
                                    try {
                                        if (el.style) el.style.zIndex = String(999999);
                                        if (el.parentNode && el.parentNode !== document.body) {
                                            document.body.appendChild(el);
                                        }
                                    } catch (e) { void e; }
                                }
                            } catch (err) {
                                // Fallback: create popup without zIndex if something goes wrong
                                try { new window.mapboxgl.Popup({ closeOnClick: true }).setLngLat(e.lngLat).setHTML(content).addTo(map); } catch (e) { void e; }
                            }

                            // Dispatch focus event to enable floorplans overlay and always zoom/center to the clicked point
                            try {
                                const buildingName = properties.building || properties.name || properties.alt_name;
                                const lng = e.lngLat?.lng;
                                const lat = e.lngLat?.lat;

                                // Dispatch focus event when we have a building name
                                if (buildingName && typeof lng === 'number' && typeof lat === 'number') {
                                    window.dispatchEvent(new CustomEvent('njit-focus', {
                                        detail: { building: buildingName, coords: [lng, lat] }
                                    }));

                                    // Also dispatch a route request event for click-to-route testing (ECE origin)
                                    try {
                                        window.dispatchEvent(new CustomEvent('njit-route-to', {
                                            detail: { name: buildingName, coords: [lng, lat] }
                                        }));
                                    } catch (err) { /* ignore */ }
                                }

                                // Always attempt to center/zoom the map to the clicked location
                                try {
                                    if (typeof lng === 'number' && typeof lat === 'number' && map && typeof map.easeTo === 'function') {
                                        const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : 15;
                                        const targetZoom = Math.max(currentZoom, 17);
                                        map.easeTo({ center: [lng, lat], zoom: targetZoom, duration: 700 });
                                    }
                                } catch (err) { void err; }
                            } catch (err) { void err; }
                        };
                        map.on('click', layerId, handler);
                    };
                    addClick('njit-building-fill');
                    addClick('njit-points');
                    addClick('njit-elevator-icons'); // Add click handler for elevator icons
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

                        // Apply category filters: by default, hide points and parking unless selected
                        if (isRestroom) {
                            const match = amenity === 'toilets' || amenity === 'toilet' || amenity === 'restroom';
                            if (!match) return { visible: false };
                        } else if (isParking) {
                            if (amenity !== 'parking') return { visible: false };
                        } else {
                            // No overlay category chosen: hide points entirely; hide parking polygons
                            if (geomType === 'Point') return { visible: false };
                            if (amenity === 'parking') return { visible: false };
                        }

                        if (geomType === 'Point') {
                            const isToilet = amenity === 'toilets' || amenity === 'toilet' || amenity === 'restroom';
                            if (isToilet) {
                                const gender = feature.getProperty('gender');
                                let svgPath = bothGenderSvg;
                                if (gender === 'female') svgPath = femaleSvg;
                                else if (gender === 'male') svgPath = maleSvg;
                                return { icon: { url: svgPath, scaledSize: new window.google.maps.Size(40, 40) } };
                            }
                            if (amenity === 'parking') {
                                return { icon: { url: PARKING_ICON, scaledSize: new window.google.maps.Size(64, 64) } };
                            }
                            // fallback to simple circle for other points
                            return {
                                icon: {
                                    path: window.google.maps.SymbolPath.CIRCLE,
                                    scale: 8,
                                    fillColor: '#C00000',
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

                        // Pan/zoom the Google map to the clicked feature for clearer view
                        try {
                            if (map && typeof map.panTo === 'function') {
                                map.panTo(e.latLng);
                                if (typeof map.getZoom === 'function' && map.getZoom() < 17) {
                                    map.setZoom(17);
                                }
                            }
                            // Also dispatch route request event when feature clicked (Google data layer)
                            try {
                                const buildingName = e.feature.getProperty('building') || e.feature.getProperty('name') || e.feature.getProperty('alt_name');
                                const lng = e.latLng.lng();
                                const lat = e.latLng.lat();
                                if (buildingName && typeof lng === 'number' && typeof lat === 'number') {
                                    window.dispatchEvent(new CustomEvent('njit-route-to', { detail: { name: buildingName, coords: [lng, lat] } }));
                                }
                            } catch (err) { /* ignore */ }
                        } catch (err) { void err; }
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

        // Handle showing elevator pin when clicked from search
        const onShowElevator = (event) => {
            const { coords, name } = event.detail || {};
            if (!coords || !Array.isArray(coords) || coords.length !== 2) return;

            if (mapType === mapTypes.Mapbox) {
                const map = mapsIndoorsInstance.getMap();
                if (!map) return;

                // Load elevator icon
                const elevatorIconPath = ELEVATOR_ICON;
                console.log('Loading elevator icon for search selection:', elevatorIconPath);
                
                const img = new Image();
                img.onload = () => {
                    console.log('Elevator icon loaded successfully');
                    
                    // Add image to map if not already present
                    if (!map.hasImage('elevator-search-pin')) {
                        map.addImage('elevator-search-pin', img);
                    }

                    // Remove previous elevator pin if it exists
                    if (map.getLayer('elevator-search-pin-layer')) {
                        map.removeLayer('elevator-search-pin-layer');
                    }
                    if (map.getSource('elevator-search-pin-source')) {
                        map.removeSource('elevator-search-pin-source');
                    }

                    // Add new elevator pin at clicked location
                    map.addSource('elevator-search-pin-source', {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: coords },
                            properties: { name: name }
                        }
                    });

                    map.addLayer({
                        id: 'elevator-search-pin-layer',
                        type: 'symbol',
                        source: 'elevator-search-pin-source',
                        layout: {
                            'icon-image': 'elevator-search-pin',
                            'icon-size': 1.8,
                            'icon-anchor': 'bottom',
                            'icon-allow-overlap': true
                        }
                    });
                    
                    console.log('Elevator pin added to map at:', coords);
                };
                
                img.onerror = () => {
                    console.error('Failed to load elevator icon image:', elevatorIconPath);
                };
                
                img.src = elevatorIconPath;
                
            } else if (mapType === mapTypes.Google && typeof window.google !== 'undefined' && window.google.maps) {
                const map = mapsIndoorsInstance?.getMap?.();
                if (!map) return;
                
                // Clear existing elevator marker
                if (window.njitElevatorMarker) {
                    window.njitElevatorMarker.setMap(null);
                }

                // Create new elevator marker
                const [lng, lat] = coords;
                window.njitElevatorMarker = new window.google.maps.Marker({
                    map,
                    position: { lat, lng },
                    icon: {
                        url: ELEVATOR_ICON,
                        scaledSize: new window.google.maps.Size(64, 84),
                        anchor: new window.google.maps.Point(32, 84)
                    },
                    title: name
                });
            }
        };
        window.addEventListener('njit-show-elevator', onShowElevator);

        // Handle showing all elevators when category is clicked
        const onShowAllElevators = (event) => {
            const { elevators } = event.detail || {};
            if (!elevators || !Array.isArray(elevators)) return;

            if (mapType === mapTypes.Mapbox) {
                const map = mapsIndoorsInstance.getMap();
                if (!map) return;
                
                // Create a marker source for all elevators
                const sourceId = 'njit-all-elevators-markers';
                const features = elevators.map(e => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: e.coords },
                    properties: {
                        name: e.name
                    }
                }));
                
                const featureCollection = { type: 'FeatureCollection', features };
                
                if (map.getSource(sourceId)) {
                    map.getSource(sourceId).setData(featureCollection);
                } else {
                    map.addSource(sourceId, { type: 'geojson', data: featureCollection });
                }

                const addOrUpdateLayer = () => {
                    if (!map.getLayer('njit-all-elevators-markers')) {
                        map.addLayer({
                            id: 'njit-all-elevators-markers',
                            type: 'symbol',
                            source: sourceId,
                            layout: {
                                'icon-image': 'elevator-all',
                                'icon-size': 1.8,
                                'icon-anchor': 'bottom',
                                'icon-allow-overlap': true
                            }
                        });
                    }
                };

                ensureMapImage(map, 'elevator-all', ELEVATOR_ICON, addOrUpdateLayer);
                
            } else if (mapType === mapTypes.Google && typeof window.google !== 'undefined' && window.google.maps) {
                const map = mapsIndoorsInstance?.getMap?.();
                if (!map) return;
                
                // Clear existing markers
                if (window.njitAllElevatorMarkers) {
                    window.njitAllElevatorMarkers.forEach(m => m.setMap(null));
                }
                window.njitAllElevatorMarkers = [];
                
                // Create markers for all elevators
                elevators.forEach(e => {
                    const [lng, lat] = e.coords;
                    const marker = new window.google.maps.Marker({
                        map,
                        position: { lat, lng },
                        icon: {
                            url: ELEVATOR_ICON,
                            scaledSize: new window.google.maps.Size(64, 84),
                            anchor: new window.google.maps.Point(32, 84)
                        },
                        title: e.name
                    });
                    
                    window.njitAllElevatorMarkers.push(marker);
                });
            }
        };
        window.addEventListener('njit-show-all-elevators', onShowAllElevators);

        // Handle showing all parking markers when category is clicked
        const onShowParking = (event) => {
            const { parkings } = event.detail || {};
            if (!parkings || !Array.isArray(parkings)) return;

            if (mapType === mapTypes.Mapbox) {
                const map = mapsIndoorsInstance.getMap();
                if (!map) return;

                // Parking icons are rendered from GeoJSON via `njit-parking-icons`.
                // Remove legacy event-driven parking marker layer to avoid double icons.
                if (map.getLayer('njit-parking-markers')) {
                    map.removeLayer('njit-parking-markers');
                }
                if (map.getSource('njit-parking-markers')) {
                    map.removeSource('njit-parking-markers');
                }
            } else if (mapType === mapTypes.Google && typeof window.google !== 'undefined' && window.google.maps) {
                // Google parking icons are already rendered by the GeoJSON Data layer style.
                // Keep this handler as cleanup-only so we don't draw duplicate markers.
                if (window.njitParkingMarkers) {
                    window.njitParkingMarkers.forEach(m => m.setMap(null));
                }
                window.njitParkingMarkers = [];
            }
        };
        window.addEventListener('njit-show-parking', onShowParking);

        const onShowStudySpaces = (event) => {
            const { studySpaces } = event.detail || {};
            if (!studySpaces || !Array.isArray(studySpaces)) return;

            if (mapType === mapTypes.Mapbox) {
                const map = mapsIndoorsInstance.getMap();
                if (!map) return;

                const sourceId = 'njit-study-space-markers';
                const features = studySpaces.map((space) => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: space.coords },
                    properties: { name: space.name, description: space.description }
                }));
                const featureCollection = { type: 'FeatureCollection', features };

                if (map.getSource(sourceId)) {
                    map.getSource(sourceId).setData(featureCollection);
                } else {
                    map.addSource(sourceId, { type: 'geojson', data: featureCollection });
                }

                const addOrUpdateLayer = () => {
                    if (!map.getLayer('njit-study-space-markers')) {
                        map.addLayer({
                            id: 'njit-study-space-markers',
                            type: 'symbol',
                            source: sourceId,
                            layout: {
                                'icon-image': 'study-space-icon',
                                'icon-size': 1.8,
                                'icon-anchor': 'bottom',
                                'icon-allow-overlap': true
                            }
                        });
                    }
                };

                ensureMapImage(map, 'study-space-icon', STUDY_SPACE_ICON, addOrUpdateLayer);
            } else if (mapType === mapTypes.Google && typeof window.google !== 'undefined' && window.google.maps) {
                const map = mapsIndoorsInstance?.getMap?.();
                if (!map) return;

                if (window.njitStudySpaceMarkers) {
                    window.njitStudySpaceMarkers.forEach(m => m.setMap(null));
                }
                window.njitStudySpaceMarkers = [];

                studySpaces.forEach((space) => {
                    const [lng, lat] = space.coords;
                    const marker = new window.google.maps.Marker({
                        map,
                        position: { lat, lng },
                        icon: {
                            url: STUDY_SPACE_ICON,
                            scaledSize: new window.google.maps.Size(40, 52),
                            anchor: new window.google.maps.Point(20, 52)
                        },
                        title: space.description ? `${space.name} - ${space.description}` : space.name
                    });
                    window.njitStudySpaceMarkers.push(marker);
                });
            }
        };
        window.addEventListener('njit-show-study-spaces', onShowStudySpaces);

        const onShowFood = (event) => {
            const { foods } = event.detail || {};
            if (!foods || !Array.isArray(foods)) return;

            if (mapType === mapTypes.Mapbox) {
                const map = mapsIndoorsInstance.getMap();
                if (!map) return;

                const sourceId = 'njit-food-markers';
                const features = foods.map((food) => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: food.coords },
                    properties: { name: food.name }
                }));
                const featureCollection = { type: 'FeatureCollection', features };

                if (map.getSource(sourceId)) {
                    map.getSource(sourceId).setData(featureCollection);
                } else {
                    map.addSource(sourceId, { type: 'geojson', data: featureCollection });
                }

                const addOrUpdateLayer = () => {
                    if (!map.getLayer('njit-food-markers')) {
                        map.addLayer({
                            id: 'njit-food-markers',
                            type: 'symbol',
                            source: sourceId,
                            layout: {
                                'icon-image': 'food-icon',
                                'icon-size': 1.8,
                                'icon-anchor': 'bottom',
                                'icon-allow-overlap': true
                            }
                        });
                    }
                };

                ensureMapImage(map, 'food-icon', FOOD_ICON, addOrUpdateLayer);
            } else if (mapType === mapTypes.Google && typeof window.google !== 'undefined' && window.google.maps) {
                const map = mapsIndoorsInstance?.getMap?.();
                if (!map) return;

                if (window.njitFoodMarkers) {
                    window.njitFoodMarkers.forEach(m => m.setMap(null));
                }
                window.njitFoodMarkers = [];

                foods.forEach((food) => {
                    const [lng, lat] = food.coords;
                    const marker = new window.google.maps.Marker({
                        map,
                        position: { lat, lng },
                        icon: {
                            url: FOOD_ICON,
                            scaledSize: new window.google.maps.Size(40, 52),
                            anchor: new window.google.maps.Point(20, 52)
                        },
                        title: food.name
                    });
                    window.njitFoodMarkers.push(marker);
                });
            }
        };
        window.addEventListener('njit-show-food', onShowFood);

        // Handle showing multiple restrooms for a building
        const onShowRestrooms = (event) => {
            const { building, restrooms } = event.detail || {};
            if (!restrooms || !Array.isArray(restrooms)) return;

            if (mapType === mapTypes.Mapbox) {
                const map = mapsIndoorsInstance.getMap();
                if (!map) return;
                
                // Load gender-specific icons from imported SVG files
                const loadIcon = (name, svgPath) => {
                    if (!map.hasImage(name)) {
                        const img = new Image();
                        img.onload = () => map.addImage(name, img);
                        img.src = svgPath;
                    }
                };
                
                loadIcon('restroom-female', femaleSvg);
                loadIcon('restroom-male', maleSvg);
                loadIcon('restroom-all', bothGenderSvg);
                
                // Create a marker source for gender-specific restrooms
                const sourceId = 'njit-restroom-markers';
                const features = restrooms.map(r => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: r.coords },
                    properties: {
                        name: r.name,
                        gender: r.gender,
                        building: building
                    }
                }));
                
                const featureCollection = { type: 'FeatureCollection', features };
                
                if (map.getSource(sourceId)) {
                    map.getSource(sourceId).setData(featureCollection);
                } else {
                    map.addSource(sourceId, { type: 'geojson', data: featureCollection });
                }
                
                // Add gender-specific icon layer
                if (!map.getLayer('njit-restroom-markers')) {
                    map.addLayer({
                        id: 'njit-restroom-markers',
                        type: 'symbol',
                        source: sourceId,
                        layout: {
                            'icon-image': [
                                'match',
                                ['get', 'gender'],
                                'female', 'restroom-female',
                                'male', 'restroom-male',
                                'all', 'restroom-all',
                                'restroom-all'
                            ],
                            'icon-size': 1.8,
                            'icon-anchor': 'bottom',
                            'icon-allow-overlap': true
                        }
                    });
                }
                
            } else if (mapType === mapTypes.Google && typeof window.google !== 'undefined' && window.google.maps) {
                const map = mapsIndoorsInstance?.getMap?.();
                if (!map) return;
                
                // Clear existing markers
                if (window.njitRestroomMarkers) {
                    window.njitRestroomMarkers.forEach(m => m.setMap(null));
                }
                window.njitRestroomMarkers = [];
                
                // Create gender-specific markers using imported SVG files
                restrooms.forEach(r => {
                    const [lng, lat] = r.coords;
                    let svgPath;
                    
                    if (r.gender === 'female') {
                        svgPath = femaleSvg;
                    } else if (r.gender === 'male') {
                        svgPath = maleSvg;
                    } else {
                        svgPath = bothGenderSvg;
                    }
                    
                    const marker = new window.google.maps.Marker({
                        map,
                        position: { lat, lng },
                        icon: {
                            url: svgPath,
                            scaledSize: new window.google.maps.Size(64, 84),
                            anchor: new window.google.maps.Point(32, 84)
                        },
                        title: r.name
                    });
                    
                    window.njitRestroomMarkers.push(marker);
                });
            }
        };
        window.addEventListener('njit-show-restrooms', onShowRestrooms);

        return () => {
            aborted = true;
            if (mapType === mapTypes.Mapbox && mapsIndoorsInstance) {
                const map = mapsIndoorsInstance.getMap();
                if (map) {
                    ['njit-point-icons','njit-parking-icons','njit-parking-markers','njit-study-space-markers','njit-food-markers','njit-points', 'njit-outline', 'njit-building-fill', 'njit-parking-fill', 'njit-labels', 'njit-restroom-markers', 'njit-restroom-icons', 'njit-elevator-icons', 'clicked-elevator-pin-layer', 'elevator-search-pin-layer', 'njit-all-elevators-markers'].forEach(id => {
                        if (map.getLayer(id)) map.removeLayer(id);
                    });
                    if (map.getSource('njit-geojson')) map.removeSource('njit-geojson');
                    if (map.getSource('njit-highlight-point')) map.removeSource('njit-highlight-point');
                    if (map.getSource('njit-restroom-markers')) map.removeSource('njit-restroom-markers');
                    if (map.getSource('njit-parking-markers')) map.removeSource('njit-parking-markers');
                    if (map.getSource('njit-study-space-markers')) map.removeSource('njit-study-space-markers');
                    if (map.getSource('njit-food-markers')) map.removeSource('njit-food-markers');
                    if (map.getSource('clicked-elevator-pin-source')) map.removeSource('clicked-elevator-pin-source');
                    if (map.getSource('elevator-search-pin-source')) map.removeSource('elevator-search-pin-source');
                    if (map.getSource('njit-all-elevators-markers')) map.removeSource('njit-all-elevators-markers');
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
            if (window.njitRestroomMarkers) {
                window.njitRestroomMarkers.forEach(m => m.setMap(null));
                window.njitRestroomMarkers = [];
            }
            if (window.njitElevatorMarker) {
                window.njitElevatorMarker.setMap(null);
                window.njitElevatorMarker = null;
            }
            if (window.njitAllElevatorMarkers) {
                window.njitAllElevatorMarkers.forEach(m => m.setMap(null));
                window.njitAllElevatorMarkers = [];
            }
            if (window.njitParkingMarkers) {
                window.njitParkingMarkers.forEach(m => m.setMap(null));
                window.njitParkingMarkers = [];
            }
            if (window.njitStudySpaceMarkers) {
                window.njitStudySpaceMarkers.forEach(m => m.setMap(null));
                window.njitStudySpaceMarkers = [];
            }
            if (window.njitFoodMarkers) {
                window.njitFoodMarkers.forEach(m => m.setMap(null));
                window.njitFoodMarkers = [];
            }
            window.removeEventListener('njit-focus', onFocus);
            window.removeEventListener('njit-show-restrooms', onShowRestrooms);
            window.removeEventListener('njit-show-elevator', onShowElevator);
            window.removeEventListener('njit-show-all-elevators', onShowAllElevators);
            window.removeEventListener('njit-show-parking', onShowParking);
            window.removeEventListener('njit-show-study-spaces', onShowStudySpaces);
            window.removeEventListener('njit-show-food', onShowFood);
        };
    }, [mapsIndoorsInstance, mapType, selectedCategory, categories]);

    return null;
}

export default GeoJsonOverlay;
