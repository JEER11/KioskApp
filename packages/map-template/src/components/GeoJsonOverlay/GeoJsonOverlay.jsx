import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import mapsIndoorsInstanceState from '../../atoms/mapsIndoorsInstanceState';
import mapTypeState from '../../atoms/mapTypeState';
import { mapTypes } from '../../constants/mapTypes';
import selectedCategoryState from '../../atoms/selectedCategoryState';
import femaleSvg from '../../assets/restroomrestroom/Tfemale.svg';
import maleSvg from '../../assets/restroomrestroom/Tmale.svg';
import bothGenderSvg from '../../assets/restroomrestroom/Tbothgender.svg';
import elevatorIcon from '../../assets/searchIcons/elevator.png';

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
        const isRestroom = /restroom|toilet|bathroom/.test(lower);
        const isParking = /parking|garage|lot/.test(lower);
        const isElevator = /elevator|lift/.test(lower);

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

                    // Points layer (restrooms/parking only) - elevators use icon layer
                    const shouldShowPoints = isRestroom || isParking;
                    if (shouldShowPoints) {
                        // Create filter that explicitly excludes elevators
                        const circleFilter = ['all', 
                            basePointFilter, 
                            amenityFilter,
                            ['!=', ['get', 'amenity'], 'elevator']
                        ];
                        
                        if (!map.getLayer('njit-points')) {
                            map.addLayer({
                                id: 'njit-points',
                                type: 'circle',
                                source: sourceId,
                                filter: circleFilter,
                                paint: { 'circle-color': ['case', ['in', ['get', 'amenity'], ['literal', ['toilets', 'toilet', 'restroom']]], '#1E88E5', '#C00000'], 'circle-radius': 4, 'circle-opacity': 0.95 }
                            });
                        } else {
                            map.setFilter('njit-points', circleFilter);
                        }
                    } else {
                        if (map.getLayer('njit-points')) map.removeLayer('njit-points');
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
                                        'icon-size': 0.8,
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
                            img.src = elevatorIcon;
                        } else {
                            addElevatorLayer();
                        }
                    } else {
                        if (map.getLayer('njit-elevator-icons')) map.removeLayer('njit-elevator-icons');
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
                        // Reduce clutter: hide default POI labels to avoid random lots/restrooms
                        ['poi-label'].forEach(layerId => {
                            if (map.getLayer(layerId)) {
                                map.setLayoutProperty(layerId, 'visibility', 'none');
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
                                console.log('Elevator icon path:', elevatorIcon);
                                
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
                                                'icon-size': 1.0,
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
                                    img.src = elevatorIcon;
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
                                            'icon-size': 1.0,
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

        // Handle showing elevator pin when clicked from search
        const onShowElevator = (event) => {
            const { coords, name } = event.detail || {};
            if (!coords || !Array.isArray(coords) || coords.length !== 2) return;

            if (mapType === mapTypes.Mapbox) {
                const map = mapsIndoorsInstance.getMap();
                if (!map) return;

                // Load elevator icon
                const elevatorIconPath = elevatorIcon;
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
                        url: elevatorIcon,
                        scaledSize: new window.google.maps.Size(48, 63),
                        anchor: new window.google.maps.Point(24, 63)
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
                
                // Load elevator icon
                const loadIcon = (name, iconPath) => {
                    if (!map.hasImage(name)) {
                        const img = new Image();
                        img.onload = () => map.addImage(name, img);
                        img.src = iconPath;
                    }
                };
                
                loadIcon('elevator-all', elevatorIcon);
                
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
                
                // Add elevator icon layer
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
                            url: elevatorIcon,
                            scaledSize: new window.google.maps.Size(48, 63),
                            anchor: new window.google.maps.Point(24, 63)
                        },
                        title: e.name
                    });
                    
                    window.njitAllElevatorMarkers.push(marker);
                });
            }
        };
        window.addEventListener('njit-show-all-elevators', onShowAllElevators);

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
                            'icon-size': 1,
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
                            scaledSize: new window.google.maps.Size(32, 42),
                            anchor: new window.google.maps.Point(16, 42)
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
                    ['njit-points', 'njit-outline', 'njit-building-fill', 'njit-parking-fill', 'njit-labels', 'njit-restroom-markers', 'njit-restroom-icons', 'njit-elevator-icons', 'clicked-elevator-pin-layer', 'elevator-search-pin-layer', 'njit-all-elevators-markers'].forEach(id => {
                        if (map.getLayer(id)) map.removeLayer(id);
                    });
                    if (map.getSource('njit-geojson')) map.removeSource('njit-geojson');
                    if (map.getSource('njit-highlight-point')) map.removeSource('njit-highlight-point');
                    if (map.getSource('njit-restroom-markers')) map.removeSource('njit-restroom-markers');
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
            window.removeEventListener('njit-focus', onFocus);
            window.removeEventListener('njit-show-restrooms', onShowRestrooms);
            window.removeEventListener('njit-show-elevator', onShowElevator);
            window.removeEventListener('njit-show-all-elevators', onShowAllElevators);
        };
    }, [mapsIndoorsInstance, mapType, selectedCategory]);

    return null;
}

export default GeoJsonOverlay;
