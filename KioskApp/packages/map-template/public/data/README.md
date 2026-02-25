# NJIT Campus Data

This folder holds NJIT-specific data used by the Map Template overlay.

Files:
- `njit-campus.geojson`: GeoJSON FeatureCollection for campus features.
- `njit-media.json`: Mapping of lowercase feature names to image URLs for popups.

## GeoJSON schema
- Each entry in `features` is a standard GeoJSON `Feature`.
- Supported properties:
  - `name` (string): Display name. Used as the key for media lookup (lowercased).
  - `amenity` (string): Use `toilets`/`toilet`/`restroom` for bathrooms to get blue markers; use `parking` for parking areas.
  - `building` (string, optional): If provided on Polygon features, the building polygon will be shaded.
  - `image` (string, optional): Direct image URL to show in popup. If also present in `njit-media.json`, the mapping takes precedence.

## Examples
- Bathroom point:
```json
{
  "type": "Feature",
  "properties": { "name": "Campus Center Restroom", "amenity": "toilets" },
  "geometry": { "type": "Point", "coordinates": [-74.1786, 40.7430] }
}
```
- Parking point:
```json
{
  "type": "Feature",
  "properties": { "name": "Lot 7", "amenity": "parking" },
  "geometry": { "type": "Point", "coordinates": [-74.1792, 40.7424] }
}
```
- Building polygon (optional):
```json
{
  "type": "Feature",
  "properties": { "name": "Fenster Hall", "building": "yes" },
  "geometry": { "type": "Polygon", "coordinates": [[[lng,lat], ...]] }
}
```

## Media mapping
- Keys in `njit-media.json` must be lowercase versions of `properties.name` or the building name.
- Values should be full URLs (https://...). You can also use local files placed under `packages/map-template/public/assets/...` and reference them with `/assets/...` URLs.

## Centering the map
- The app reads `center` from the `VITE_CENTER` env var if set, otherwise it defaults to `-74.1780,40.7420` (NJIT).
- To override via dev, create `.env` in `packages/map-template`:
```env
VITE_CENTER=-74.1780,40.7420
```

## Notes
- The overlay auto-loads `njit-campus.geojson` and `njit-media.json`. If either is missing, it simply skips.
- Click a point or polygon to see a popup with the name and optional image.
