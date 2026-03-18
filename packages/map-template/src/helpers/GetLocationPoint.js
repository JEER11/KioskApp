/**
 * Get a point with a floor from a Location to use as origin or destination point.
 *
 * @param {object} location
 * @returns {object}
 */
export default function getLocationPoint(location) {
    // Support different location shapes:
    // - MapsIndoors Location: has `geometry` (Point) or `properties.anchor`
    // - Venue/Building object: has `anchor` at top-level
    let coordinates;
    let floor;

    if (location.geometry && location.geometry.type === 'Point') {
        coordinates = location.geometry.coordinates;
        floor = location.properties && location.properties.floor;
    } else if (location.properties && location.properties.anchor) {
        coordinates = location.properties.anchor.coordinates;
        floor = location.properties.floor;
    } else if (location.anchor && location.anchor.coordinates) {
        // Building object (VenueBuilding) with top-level anchor
        coordinates = location.anchor.coordinates;
        // Buildings usually don't have a floor; preserve if present
        floor = location.floor || (location.properties && location.properties.floor);
    } else {
        // Fallback: return undefined coordinates to let caller handle missing geometry
        return { lat: undefined, lng: undefined, floor: undefined };
    }

    return { lat: coordinates[1], lng: coordinates[0], floor };
}
