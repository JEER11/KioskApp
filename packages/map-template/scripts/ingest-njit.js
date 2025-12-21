#!/usr/bin/env node
/**
 * Ingest NJIT data from CSV into GeoJSON and media mapping.
 * Input: packages/map-template/public/data/njit-input.csv
 * Output: packages/map-template/public/data/njit-campus.geojson, njit-media.json
 *
 * CSV headers:
 * name,category,building,lon,lat,image,polygon
 * - category: restroom|parking|building|area
 * - polygon: optional JSON array of [lng,lat] ring coords (single ring)
 */
const fs = require('fs');
const path = require('path');

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  const header = lines.shift().split(',').map(h => h.trim());
  const rows = lines.map(line => {
    // naive CSV split (no quoted commas)
    const cols = line.split(',').map(c => c.trim());
    const obj = {};
    header.forEach((h, i) => { obj[h] = cols[i] || ''; });
    return obj;
  });
  return rows;
}

function toFeature(row) {
  const name = row.name?.trim();
  if (!name) return null;
  const props = { name };
  const amenity = row.category?.trim().toLowerCase();
  if (amenity === 'restroom' || amenity === 'parking') props.amenity = amenity;
  if (row.building) props.building = row.building.trim();
  if (row.image) props.image = row.image.trim();

  // polygon takes precedence if provided
  if (row.polygon) {
    try {
      const ring = JSON.parse(row.polygon);
      if (Array.isArray(ring) && ring.length >= 4) {
        return { type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring] } };
      }
    } catch {}
  }

  const lon = Number(row.lon);
  const lat = Number(row.lat);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [lon, lat] } };
}

function main() {
  const force = process.argv.includes('--force');
  const root = path.resolve(__dirname, '..');
  const publicDir = path.join(root, 'public', 'data');
  const inputFile = path.join(publicDir, 'njit-input.csv');
  const outGeoJson = path.join(publicDir, 'njit-campus.geojson');
  const outMedia = path.join(publicDir, 'njit-media.json');

  if (!fs.existsSync(inputFile)) {
    console.error('Input CSV not found:', inputFile);
    process.exit(1);
  }

  const csvText = fs.readFileSync(inputFile, 'utf8');
  const rows = parseCSV(csvText);
  const features = [];
  const media = {};
  for (const r of rows) {
    const f = toFeature(r);
    if (!f) continue;
    features.push(f);
    const key = (r.name || '').toLowerCase();
    if (r.image) media[key] = r.image;
  }

  const fc = { type: 'FeatureCollection', features };
  const writeFile = (file, content) => {
    if (fs.existsSync(file) && !force) {
      console.log('Exists (use --force to overwrite):', file);
      return;
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log('Wrote', file);
  };

  writeFile(outGeoJson, JSON.stringify(fc, null, 2));
  writeFile(outMedia, JSON.stringify(media, null, 2));
}

if (require.main === module) {
  main();
}
