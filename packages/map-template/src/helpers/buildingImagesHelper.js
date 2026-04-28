/**
 * NJIT Building images mapping
 * Maps lowercase building names to their image paths
 */
const buildingImages = {
    'campus bookstore': '/Building/Campusbookstore.jpg',
    'campus center': '/Building/Campuscenter.png',
    'central king building': '/Building/CentralKingBuilding.png',
    'colton hall': '/Building/Coltonhall.png',
    'cullimore hall': '/Building/Cullimore.png',
    'cypress hall': '/Building/Cypress.png',
    'eberhardt hall': '/Building/Eberhardt.png',
    'ece building': '/Building/ECEb.png',
    'fenster hall': '/Building/Fensterhall.png',
    'gitc': '/Building/GITC.png',
    'greek village': '/Building/Greekvillage.png',
    'kupfrian hall': '/Building/Kupfrianhall.png',
    'laurel hall': '/Building/LaurelHall.png',
    'makerspace': '/Building/Makerspace.png',
    'tiernan hall': '/Building/TiernanHall.png',
    'wellness center': '/Building/WellnessCenter.png',
    'weston hall': '/Building/Westonhall.png',
    'york center': '/Building/Yorkcenter.png'
};

/**
 * Get the image URL for a building by name
 * @param {string} buildingName - Name of the building
 * @returns {string|undefined} Image URL or undefined if not found
 */
export function getBuildingImage(buildingName) {
    if (!buildingName) return undefined;
    const key = buildingName.toLowerCase().trim();
    return buildingImages[key];
}

export default buildingImages;
