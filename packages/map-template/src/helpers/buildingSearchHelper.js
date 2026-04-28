/**
 * Helper functions for searching and managing buildings with their associated amenities
 */

/**
 * Extract building name from amenity name (e.g., "Campus Center Women's Restroom" -> "Campus Center")
 * @param {string} amenityName - Name of the amenity
 * @returns {string} Building name
 */
export function extractBuildingName(amenityName) {
    if (!amenityName) return '';
    
    // Remove common amenity suffixes
    const suffixes = [
        "Women's Restroom", "Men's Restroom", "All-Gender Restroom",
        "Women's Toilet", "Men's Toilet", "All-Gender Toilet",
        "Restroom", "Toilet",
        "Elevator", "Lift"
    ];
    
    let buildingName = amenityName;
    for (const suffix of suffixes) {
        if (amenityName.endsWith(suffix)) {
            buildingName = amenityName.substring(0, amenityName.length - suffix.length).trim();
            break;
        }
    }
    
    return buildingName;
}

/**
 * Organize GeoJSON features into buildings and their associated amenities
 * @param {Array} features - GeoJSON features array
 * @returns {Object} Object mapping building names to buildings with their amenities
 */
export function organizeBuildingsByAmenities(features) {
    const buildingsMap = {};
    
    features.forEach(feature => {
        const props = feature.properties || {};
        const geometry = feature.geometry || {};
        
        // Extract building features
        if (props.category === 'building') {
                    if (!buildingsMap[props.name]) {
                        buildingsMap[props.name] = {
                            id: feature.id || props.code || props.name,
                            name: props.name,
                            code: props.code,
                            image: props.image,
                            coords: geometry.type === 'Point' ? geometry.coordinates : null,
                            amenity: 'building',
                            restrooms: [],
                            elevators: [],
                            parking: [],
                            foods: [],
                            entrances: props.entrances || []
                        };
                    }
        }
    });
    
    // Assign amenities to buildings
    features.forEach(feature => {
        const props = feature.properties || {};
        const geometry = feature.geometry || {};
        const coords = geometry.type === 'Point' ? geometry.coordinates : null;
        
        if (!coords) return;
        
        // Handle restrooms
        if (props.amenity === 'toilets' || props.amenity === 'restroom') {
            const buildingName = extractBuildingName(props.name);
            if (buildingsMap[buildingName]) {
                buildingsMap[buildingName].restrooms.push({
                    id: feature.id || props.name,
                    name: props.name,
                    gender: props.gender || 'all',
                    coords: coords,
                    amenity: 'restroom',
                    image: props.image
                });
            } else {
                // Fallback: attach to nearest building within threshold
                let closestBuilding = null;
                let closestDistance = Infinity;
                Object.values(buildingsMap).forEach(building => {
                    if (building.coords) {
                        const distance = Math.hypot(
                            building.coords[0] - coords[0],
                            building.coords[1] - coords[1]
                        );
                        if (distance < closestDistance && distance < 0.001) { // ~100m
                            closestDistance = distance;
                            closestBuilding = building.name;
                        }
                    }
                });
                if (closestBuilding) {
                    buildingsMap[closestBuilding].restrooms.push({
                        id: feature.id || props.name,
                        name: props.name,
                        gender: props.gender || 'all',
                        coords: coords,
                        amenity: 'restroom',
                        image: props.image
                    });
                }
            }
        }
        
        // Handle elevators
        if (props.amenity === 'elevator' || props.amenity === 'lift') {
            // Try to match elevator to a building based on proximity
            // For now, we'll add a generic approach - elevators near buildings
            let closestBuilding = null;
            let closestDistance = Infinity;
            
            Object.values(buildingsMap).forEach(building => {
                if (building.coords) {
                    const distance = Math.hypot(
                        building.coords[0] - coords[0],
                        building.coords[1] - coords[1]
                    );
                    if (distance < closestDistance && distance < 0.0005) { // ~50 meters
                        closestDistance = distance;
                        closestBuilding = building.name;
                    }
                }
            });
            
            if (closestBuilding) {
                buildingsMap[closestBuilding].elevators.push({
                    id: feature.id || props.name,
                    name: props.name,
                    coords: coords,
                    amenity: 'elevator',
                    image: props.image
                });
            }
        }

        // Handle food / canteen / dining amenities - attach to nearest building
        if (/food|canteen|dining|restaurant/.test((props.amenity || '').toLowerCase()) || /food|canteen|dining|restaurant/.test((props.category||'').toLowerCase())) {
            let closestBuilding = null;
            let closestDistance = Infinity;
            Object.values(buildingsMap).forEach(building => {
                if (building.coords) {
                    const distance = Math.hypot(
                        building.coords[0] - coords[0],
                        building.coords[1] - coords[1]
                    );
                    if (distance < closestDistance && distance < 0.0015) { // ~150m
                        closestDistance = distance;
                        closestBuilding = building.name;
                    }
                }
            });
            if (closestBuilding) {
                buildingsMap[closestBuilding].foods.push({
                    id: feature.id || props.name,
                    name: props.name,
                    coords: coords,
                    amenity: 'food',
                    image: props.image
                });
            }
        }

        // Handle parking
        if ((props.amenity || '').toLowerCase().includes('parking') || (props.category || '').toLowerCase().includes('parking')) {
            let closestBuilding = null;
            let closestDistance = Infinity;
            Object.values(buildingsMap).forEach(building => {
                if (building.coords) {
                    const distance = Math.hypot(
                        building.coords[0] - coords[0],
                        building.coords[1] - coords[1]
                    );
                    if (distance < closestDistance && distance < 0.002) { // ~200m
                        closestDistance = distance;
                        closestBuilding = building.name;
                    }
                }
            });
            if (closestBuilding) {
                buildingsMap[closestBuilding].parking.push({
                    id: feature.id || props.name,
                    name: props.name,
                    coords: coords,
                    amenity: 'parking',
                    image: props.image
                });
            }
        }
    });
    
    return buildingsMap;
}

/**
 * Search for buildings based on a query string
 * @param {string} query - Search query
 * @param {Object} buildingsMap - Buildings map from organizeBuildingsByAmenities
 * @param {number} minResults - Minimum number of results to return (default 5)
 * @returns {Array} Array of matching buildings
 */
export function searchBuildings(query, buildingsMap, minResults = 5) {
    if (!query || query.trim() === '') {
        // Return all buildings if no query
        return Object.values(buildingsMap)
            .filter(b => b.amenity === 'building')
            .slice(0, minResults);
    }
    
    const lowerQuery = query.toLowerCase().trim();
    
    const matches = Object.values(buildingsMap)
        .filter(b => b.amenity === 'building')
        .map(building => {
            const buildingNameLower = building.name.toLowerCase();
            const codeLower = (building.code || '').toLowerCase();
            
            // Check for exact or partial matches
            if (buildingNameLower.includes(lowerQuery) || codeLower.includes(lowerQuery)) {
                // Score based on match position (earlier matches score higher)
                const nameIndex = buildingNameLower.indexOf(lowerQuery);
                const codeIndex = codeLower.indexOf(lowerQuery);
                
                const score = Math.min(
                    nameIndex !== -1 ? nameIndex : Infinity,
                    codeIndex !== -1 ? codeIndex : Infinity
                );
                
                return { building, score };
            }
            return null;
        })
        .filter(item => item !== null)
        .sort((a, b) => a.score - b.score)
        .map(item => item.building)
        .slice(0, Math.max(minResults, 5));
    
    return matches;
}

/**
 * Get all amenities for a building
 * @param {string} buildingName - Name of the building
 * @param {Object} buildingsMap - Buildings map from organizeBuildingsByAmenities
 * @returns {Object} Building with all its amenities
 */
export function getBuildingWithAmenities(buildingName, buildingsMap) {
    return buildingsMap[buildingName] || null;
}

/**
 * Format building result for display in search results
 * @param {Object} building - Building object from buildingsMap
 * @returns {Object} Formatted building for UI display
 */
export function formatBuildingResult(building) {
    if (!building) return null;
    
    const amenityCount = (building.restrooms?.length || 0) + (building.elevators?.length || 0) + (building.foods?.length || 0) + (building.parking?.length || 0);
    const subtitle = amenityCount > 0
        ? `${amenityCount} amenities`
        : 'No amenities';
    
    return {
        id: building.id,
        name: building.name,
        code: building.code,
        subtitle: subtitle,
        image: building.image,
        coords: building.coords,
        amenity: 'building',
        data: building
    };
}
