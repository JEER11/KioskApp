import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import mapsIndoorsInstanceState from '../../atoms/mapsIndoorsInstanceState';
import mapTypeState from '../../atoms/mapTypeState';
import { mapTypes } from '../../constants/mapTypes';

function FloorPlansOverlay() {
  const mapsIndoorsInstance = useRecoilValue(mapsIndoorsInstanceState);
  const mapType = useRecoilValue(mapTypeState);
  const [buildingKey, setBuildingKey] = useState(null);
  const [levels, setLevels] = useState([]);
  const [selectedLevelIdx, setSelectedLevelIdx] = useState(0);
  const [geojson, setGeojson] = useState(null);
  const googleDataLayerRef = useRef(null);

  // Map building names to canonical folder keys
  const canonicalizeBuildingKey = (name) => {
    const n = (name || '').toLowerCase().trim();
    if (!n) return null;
    const aliases = {
      'kupfrian hall': 'kupfrian',
      'campus center': 'campus-center',
      'fenster hall': 'fenster-hall',
      'laurel hall': 'laurel'
    };
    return aliases[n] || n.replace(/\s+/g, '-');
  };

  // Listen for building focus set via NJIT overlay (uses properties.building)
  useEffect(() => {
    const handler = (evt) => {
      const raw = evt?.detail?.buildingKey || evt?.detail?.building || null;
      const key = canonicalizeBuildingKey(raw);
      if (!key) return;
      setBuildingKey(key);
    };
    window.addEventListener('njit-focus', handler);
    return () => window.removeEventListener('njit-focus', handler);
  }, []);

  // Load levels.json for the building
  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!buildingKey) return;
      try {
        const res = await fetch(`/data/floorplans/${buildingKey}/levels.json`);
        if (!res.ok) return;
        const json = await res.json();
        const lvls = Array.isArray(json?.levels) ? json.levels : [];
        if (!aborted) {
          setLevels(lvls);
          setSelectedLevelIdx(0);
        }
      } catch (e) { void e; }
    })();
    return () => { aborted = true; };
  }, [buildingKey]);

  // Load selected level GeoJSON
  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!levels.length) return;
      const file = levels[selectedLevelIdx]?.file;
      if (!file) return;
      try {
        const res = await fetch(file);
        if (!res.ok) return;
        const json = await res.json();
        if (!aborted) setGeojson(json);
      } catch (e) { void e; }
    })();
    return () => { aborted = true; };
  }, [levels, selectedLevelIdx]);

  // Render overlay on the base map
  useEffect(() => {
    if (!geojson || !mapsIndoorsInstance) return;

    if (mapType === mapTypes.Mapbox) {
      const map = mapsIndoorsInstance.getMap();
      if (!map) return;
      const sourceId = 'njit-floorplans';
      const layerFillId = 'njit-floorplan-fill';
      const layerOutlineId = 'njit-floorplan-outline';
      const layerLabelsId = 'njit-floorplan-labels';

      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(geojson);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geojson });
      }

      if (!map.getLayer(layerFillId)) {
        map.addLayer({
          id: layerFillId,
          type: 'fill',
          source: sourceId,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': ['match', ['get', 'type'], 'room', '#BBDEFB', 'area', '#E0E0E0', '#CFD8DC'],
            'fill-opacity': 0.5
          }
        });
      }
      if (!map.getLayer(layerOutlineId)) {
        map.addLayer({
          id: layerOutlineId,
          type: 'line',
          source: sourceId,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'line-color': '#455A64',
            'line-width': 1
          }
        });
      }
      if (!map.getLayer(layerLabelsId)) {
        map.addLayer({
          id: layerLabelsId,
          type: 'symbol',
          source: sourceId,
          filter: ['==', ['geometry-type'], 'Polygon'],
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11
          },
          paint: {
            'text-color': '#263238',
            'text-halo-color': '#ffffff',
            'text-halo-width': 0.8
          }
        });
      }
    } else if (mapType === mapTypes.Google && typeof window.google !== 'undefined' && window.google.maps) {
      const map = mapsIndoorsInstance.getMap();
      if (!map) return;

      if (googleDataLayerRef.current) {
        googleDataLayerRef.current.setMap(null);
        googleDataLayerRef.current = null;
      }

      const dataLayer = new window.google.maps.Data({ map });
      dataLayer.addGeoJson(geojson);
      dataLayer.setStyle(feature => {
        const geomType = feature.getGeometry()?.getType();
        const type = feature.getProperty('type');
        if (geomType === 'Polygon') {
          return {
            fillColor: type === 'room' ? '#BBDEFB' : '#E0E0E0',
            fillOpacity: 0.5,
            strokeColor: '#455A64',
            strokeWeight: 1
          };
        }
        return null;
      });
      googleDataLayerRef.current = dataLayer;
    }
  }, [geojson, mapsIndoorsInstance, mapType]);

  // Cleanup when building/level changes or component unmounts
  useEffect(() => {
    return () => {
      if (mapsIndoorsInstance && mapType === mapTypes.Mapbox) {
        const map = mapsIndoorsInstance.getMap();
        if (map) {
          ['njit-floorplan-labels', 'njit-floorplan-outline', 'njit-floorplan-fill'].forEach(id => {
            if (map.getLayer(id)) map.removeLayer(id);
          });
          if (map.getSource('njit-floorplans')) map.removeSource('njit-floorplans');
        }
      }
      if (googleDataLayerRef.current) {
        googleDataLayerRef.current.setMap(null);
        googleDataLayerRef.current = null;
      }
    };
  }, [mapsIndoorsInstance, mapType]);

  const hasLevels = levels.length > 0;
  const stylePanel = {
    position: 'absolute', bottom: 12, right: 12, zIndex: 5,
    background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '8px 10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontFamily: 'system-ui, Segoe UI, Roboto, Arial'
  };
  const btn = {
    border: '1px solid #ccc', borderRadius: 6, padding: '6px 10px', background: '#fff', cursor: 'pointer', marginLeft: 6
  };

  return (
    <>
      {hasLevels && (
        <div style={stylePanel}>
          <span style={{ fontWeight: 600 }}>Floor:</span>
          {levels.map((lvl, idx) => (
            <button key={lvl.id} style={{ ...btn, background: idx === selectedLevelIdx ? '#e3f2fd' : '#fff' }} onClick={() => setSelectedLevelIdx(idx)}>
              {lvl.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default FloorPlansOverlay;
