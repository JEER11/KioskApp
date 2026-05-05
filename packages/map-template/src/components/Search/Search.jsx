import './Search.scss';
import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import appConfigState from '../../atoms/appConfigState';
import categoriesState from '../../atoms/categoriesState';
import currentVenueNameState from '../../atoms/currentVenueNameState';
import { snapPoints } from '../../constants/snapPoints';
import { usePreventSwipe } from '../../hooks/usePreventSwipe';
import ListItemLocation from '../WebComponentWrappers/ListItemLocation/ListItemLocation';
import SearchField from '../WebComponentWrappers/Search/Search';
import filteredLocationsState from '../../atoms/filteredLocationsState';
import mapsIndoorsInstanceState from '../../atoms/mapsIndoorsInstanceState';
import currentLocationState from '../../atoms/currentLocationState';
import isLocationClickedState from '../../atoms/isLocationClickedState';
import getDesktopPaddingLeft from '../../helpers/GetDesktopPaddingLeft';
import languageState from '../../atoms/languageState';
import { useTranslation } from 'react-i18next';
import kioskLocationState from '../../atoms/kioskLocationState';
import getDesktopPaddingBottom from '../../helpers/GetDesktopPaddingBottom';
import useKeyboardState from '../../atoms/useKeyboardState';
import Keyboard from '../WebComponentWrappers/Keyboard/Keyboard';
import searchInputState from '../../atoms/searchInputState';
import searchResultsState from '../../atoms/searchResultsState';
import selectedCategoryState from '../../atoms/selectedCategoryState';
import Categories from './Categories/Categories';
import { useIsKioskContext } from '../../hooks/useIsKioskContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { ReactComponent as Legend } from '../../assets/legend.svg';
import isLegendDialogVisibleState from '../../atoms/isLegendDialogVisibleState';
import legendSortedFieldsSelector from '../../selectors/legendSortedFieldsSelector';
import searchAllVenuesState from '../../atoms/searchAllVenues';
import isNullOrUndefined from '../../helpers/isNullOrUndefined';
import venuesInSolutionState from '../../atoms/venuesInSolutionState';
import initialVenueNameState from '../../atoms/initialVenueNameState';
import PropTypes from 'prop-types';
import { 
    organizeBuildingsByAmenities, 
    searchBuildings, 
    formatBuildingResult 
} from '../../helpers/buildingSearchHelper';
import { getBuildingImage } from '../../helpers/buildingImagesHelper';

const ELEVATOR_OVERLAY_LOCATIONS = [
    { id: 'tiernan-hall-elevator-1', name: 'Tiernan Hall Elevator 1', coords: [-74.17945587633146, 40.74223919150365], amenity: 'elevator' },
    { id: 'faculty-memorial-hall-elevator-1', name: 'Faculty Memorial Hall Elevator 1', coords: [-74.1790601620329, 40.74199946313459], amenity: 'elevator' },
    { id: 'faculty-memorial-hall-elevator-2', name: 'Faculty Memorial Hall Elevator 2', coords: [-74.17852899273782, 40.74185153773234], amenity: 'elevator' },
    { id: 'ece-building-elevator-1', name: 'ECE Building Elevator 1', coords: [-74.17863492771842, 40.74146803165208], amenity: 'elevator' },
    { id: 'central-king-building-elevator-1', name: 'Central King Building Elevator 1', coords: [-74.17781860056387, 40.74219447483377], amenity: 'elevator' },
    { id: 'central-king-building-elevator-2', name: 'Central King Building Elevator 2', coords: [-74.17748848629157, 40.741992732950884], amenity: 'elevator' },
    { id: 'campus-center-elevator-1', name: 'Campus Center Elevator 1', coords: [-74.17810511483778, 40.7428551457308], amenity: 'elevator' },
    { id: 'wellness-center-elevator-1', name: 'Wellness Center Elevator 1', coords: [-74.18029142919637, 40.74247413729184], amenity: 'elevator' },
    { id: 'mechanical-engineering-elevator-1', name: 'Mechanical Engineering Elevator 1', coords: [-74.17862134987408, 40.7441834885235], amenity: 'elevator' },
    { id: 'makerspace-elevator-1', name: 'Makerspace Elevator 1', coords: [-74.17905980077788, 40.744098355862775], amenity: 'elevator' },
    { id: 'gitc-elevator-1', name: 'GITC Elevator 1', coords: [-74.17960180541355, 40.74443554733849], amenity: 'elevator' },
    { id: 'robert-van-houten-library-elevator-1', name: 'Robert W. Van Houten Library Elevator 1', coords: [-74.17788277638554, 40.743832456345906], amenity: 'elevator' },
    { id: 'cullimore-hall-elevator-1', name: 'Cullimore Hall Elevator 1', coords: [-74.17728196021774, 40.743079770123074], amenity: 'elevator' }
];

const STUDY_SPACE_OVERLAY_LOCATIONS = [
    { id: 'york-center-study-area-1', name: 'York Center for Environmental Engineering and Science', description: 'First Floor', coords: [-74.17864781963625, 40.74075858416627], amenity: 'study-space' },
    { id: 'central-king-building-study-area-1', name: 'Central King Building', description: 'Basement, 1st, and 3rd Floor', coords: [-74.17769164592056, 40.74209852018736], amenity: 'study-space' },
    { id: 'campus-center-study-area-1', name: 'Campus Center', description: 'Basement, 1st, 2nd and 3rd Floor', coords: [-74.17827227389077, 40.74312345824983], amenity: 'study-space' },
    { id: 'robert-van-houten-library-study-area-1', name: 'Robert W. Van Houten Library', description: 'All floors & Reserved rooms', coords: [-74.17802913571659, 40.743844395187885], amenity: 'study-space' },
    { id: 'makerspace-study-area-1', name: 'Makerspace', description: 'First Floor Maker Space', coords: [-74.17884842511302, 40.743959282832066], amenity: 'study-space' },
    { id: 'makerspace-study-area-2', name: 'Makerspace', description: 'First Floor Open Area', coords: [-74.17955606809316, 40.74416753299178], amenity: 'study-space' },
    { id: 'kupfrian-hall-study-area-1', name: 'Kupfrian Hall', description: 'First & Second Floor', coords: [-74.1786174176951, 40.74256133133684], amenity: 'study-space' },
    { id: 'wellness-center-study-area-1', name: 'Wellness Center', description: 'First Floor', coords: [-74.18009195958216, 40.7425547511855], amenity: 'study-space' }
];

const FOOD_OVERLAY_LOCATIONS = [
    { id: 'a1njit-food-truck', name: 'A1NJIT Food Truck', coords: [-74.17956714372212, 40.74150019400026], amenity: 'food' },
    { id: 'taj-mahal-food-truck', name: 'Taj Mahal Food Truck', coords: [-74.177343034262, 40.74038841141362], amenity: 'food' },
    { id: 'gigi-halal-food-truck', name: 'Gigi Halal Food Truck', coords: [-74.18041334492794, 40.74163501004268], amenity: 'food' },
    { id: 'good-morning-newark-halal-food-truck', name: 'Good Morning Newark Halal Food Truck', coords: [-74.17896859066158, 40.74115319839319], amenity: 'food' },
    { id: 'smashburger', name: 'Smashburger', coords: [-74.17977131902967, 40.741379560145106], amenity: 'food' },
    { id: 'forte-pizzeria', name: 'Forte Pizzeria', coords: [-74.17786158621051, 40.74319633198452], amenity: 'food' },
    { id: 'highlander-pub', name: 'Highlander Pub', coords: [-74.17813609802649, 40.743048936391126], amenity: 'food' },
    { id: 'jbj-soul-kitchen', name: 'JBJ Soul Kitchen', coords: [-74.17629992556238, 40.74202173573142], amenity: 'food' },
    { id: 'ramen-gami', name: 'Ramen Gami', coords: [-74.17595494021685, 40.74375498467662], amenity: 'food' }
];

Search.propTypes = {
    categories: PropTypes.array,
    onSetSize: PropTypes.func,
    isOpen: PropTypes.bool
};

/**
 * Show the search results.
 *
 * @param {Object} props
 * @param {[[string, number]]} props.categories - All the unique categories that users can filter through.
 * @param {function} props.onSetSize - Callback that is fired when the search field takes focus and when categories are clicked.
 * @param {boolean} props.isOpen - Boolean that describes if the search page is open or not.
 *
 * @returns
 */
function Search({ onSetSize, isOpen }) {
        // NJIT overlay data for custom category lists (restrooms/parking)
        const [njitFeatures, setNjitFeatures] = useState([]);
        const [njitList, setNjitList] = useState([]);
        const [expandedCategory, setExpandedCategory] = useState(null);
        const [buildingsMap, setBuildingsMap] = useState({});
        const [buildingSearchResults, setBuildingSearchResults] = useState([]);
    const appConfig = useRecoilValue(appConfigState);

    const { t } = useTranslation();

    const searchRef = useRef();
    const scrollButtonsRef = useRef();
    const requestAnimationFrameId = useRef();
    const pendingVoiceRouteRef = useRef(null);

    /** Referencing the search field */
    const searchFieldRef = useRef();

    /** Referencing the keyboard element */
    const keyboardRef = useRef();

    /** Maximum number of search results to show */
    const MAX_RESULTS = 100;
    const [searchResults, setSearchResults] = useRecoilState(searchResultsState);
    const categories = useRecoilValue(categoriesState);
    const useKeyboard = useRecoilValue(useKeyboardState);

    /** Indicate if search results have been found */
    const [showNotFoundMessage, setShowNotFoundMessage] = useState(false);

    const [selectedCategory, setSelectedCategory] = useRecoilState(selectedCategoryState);

    const scrollableContentSwipePrevent = usePreventSwipe();

    const [hoveredLocation, setHoveredLocation] = useState();

    const mapsIndoorsInstance = useRecoilValue(mapsIndoorsInstanceState);

    const [, setFilteredLocations] = useRecoilState(filteredLocationsState);

    const [, setCurrentLocation] = useRecoilState(currentLocationState);

    const [, setIsLocationClicked] = useRecoilState(isLocationClickedState);

    const [currentVenueName, setCurrentVenueName] = useRecoilState(currentVenueNameState);

    const currentLanguage = useRecoilValue(languageState);

    const isDesktop = useIsDesktop();

    const kioskLocation = useRecoilValue(kioskLocationState);

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    const searchInput = useRecoilValue(searchInputState);

    const isKioskContext = useIsKioskContext();

    const [, setShowLegendDialog] = useRecoilState(isLegendDialogVisibleState);

    const [showLegendButton, setShowLegendButton] = useState(false);

    const legendSections = useRecoilValue(legendSortedFieldsSelector);

    const searchAllVenues = useRecoilValue(searchAllVenuesState);

    const venuesInSolution = useRecoilValue(venuesInSolutionState);

    const initialVenueName = useRecoilValue(initialVenueNameState);

    const [isInputFieldInFocus, setIsInputFieldInFocus] = useState(false);

    

    const selectedCategoriesArray = useRef([]);

    const [childKeys, setChildKeys] = useState([]);

    const [areHorizontalCategoriesEnabled, setAreHorizontalCategoriesEnabled] = useState(false);

    /**
     * Handles go back function.
     */
    function handleBack() {
        // If selected categories tree has only parent category, then on back, we need to perform those clear functions.
        // Else, remove child category from selected categories tree array.
        if (selectedCategoriesArray.current.length === 1) {
            setSelectedCategory(null);
            setSearchResults([]);
            setFilteredLocations([]);
            setSize(snapPoints.FIT);
            setIsInputFieldInFocus(true);

            // If there's a search term and it's not just whitespace, re-trigger the search without category filter
            const searchValue = searchFieldRef.current?.getValue()?.trim();
            if (searchValue) {
                searchFieldRef.current.triggerSearch();
            } else {
                // If it's empty or just whitespace, clear the search field
                searchFieldRef.current?.clear();
            }
            selectedCategoriesArray.current.pop();
        } else {
            selectedCategoriesArray.current.pop()
            setSelectedCategory(selectedCategoriesArray.current[0])
        }
    }

    /**
     *
     * Get the locations and filter through them based on categories selected.
     *
     * @param {string} category
     * @param {string} displayName - The display name of the category
     */
    function getFilteredLocations(category, displayName) {
        const categoryText = (category || '').toString().toLowerCase();
        const displayNameText = (displayName || '').toString().toLowerCase();
        console.log('getFilteredLocations called with category:', category, 'displayName:', displayName);
        const dispatchOverlayEvent = (eventName, detail) => {
            // Category changes trigger overlay effect cleanup/re-init. Dispatch after that cycle,
            // and once more shortly after to handle map style/image load timing.
            window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent(eventName, { detail }));
            }, 0);
            window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent(eventName, { detail }));
            }, 200);
        };
        // Be robust to odd keys like "Parking_" or localized labels
        const isOverlayRestroom = /restroom|toilet|bathroom/.test(categoryText) || /restroom|toilet|bathroom/.test(displayNameText);
        const isOverlayParking = /parking|garage|lot/.test(categoryText) || /parking|garage|lot/.test(displayNameText) || categoryText.startsWith('parking');
        const isOverlayElevator = /elevator|lift/.test(categoryText) || /elevator|lift/.test(displayNameText);
        const isOverlayStudySpace = /study\s*space|study|studying|meeting|conference/.test(categoryText) || /study\s*space|study|studying|meeting|conference/.test(displayNameText);
        const isOverlayFood = /canteen|cafeteria|dining|food|restaurant/.test(categoryText) || /canteen|cafeteria|dining|food|restaurant/.test(displayNameText);
        console.log('isOverlayRestroom:', isOverlayRestroom, 'isOverlayParking:', isOverlayParking, 'isOverlayElevator:', isOverlayElevator, 'isOverlayStudySpace:', isOverlayStudySpace, 'isOverlayFood:', isOverlayFood);

        // Creates a selected categoriers tree, where first category in the array is parent and second one is child
        // Ensure category is unique before pushing to selectedCategories.current
        if (!selectedCategoriesArray.current.includes(category)) {
            selectedCategoriesArray.current.push(category);
        }

        // If child category is being selected, we need to clear parent categories results in order to load proper data that belongs to child category.
        if (selectedCategory) {
            setSelectedCategory([]);
            setSearchResults([]);
            setFilteredLocations([]);
        }
        setSelectedCategory(category)

        // For NJIT overlay-only categories OR standard MapsIndoors categories that should show as expandable lists
        if (isOverlayRestroom || isOverlayParking || isOverlayElevator || isOverlayStudySpace || isOverlayFood) {
            // Helper: compute a simple centroid for Polygon/MultiPolygon
            const getCentroid = (geom) => {
                try {
                    if (!geom) return null;
                    if (geom.type === 'Point') return geom.coordinates;
                    const coords = geom.type === 'Polygon' ? geom.coordinates[0] : (geom.coordinates?.[0]?.[0] || []);
                    if (!Array.isArray(coords) || coords.length === 0) return null;
                    let sx = 0, sy = 0; let n = 0;
                    coords.forEach(([x, y]) => { if (typeof x === 'number' && typeof y === 'number') { sx += x; sy += y; n += 1; } });
                    if (!n) return null;
                    return [sx / n, sy / n];
                } catch (e) { return null; }
            };

            // Filter overlay features
            const filtered = njitFeatures.filter(f => {
                const a = (f.properties?.amenity || '').toLowerCase();
                if (isOverlayRestroom) return (a === 'toilets' || a === 'toilet' || a === 'restroom');
                if (isOverlayParking) return (a === 'parking');
                return false;
            });

            console.log('Filtering for', categoryText, '- Found:', filtered.length, 'items');

            let list = [];

            if (isOverlayRestroom) {
                // Group restrooms by building
                const restroomsByBuilding = {};
                filtered.forEach(f => {
                    const center = f.geometry?.type === 'Point' ? f.geometry.coordinates : getCentroid(f.geometry);
                    const name = f.properties?.name || f.properties?.alt_name || f.properties?.building || t('Restroom');
                    
                    // Extract building name and gender from the restroom name
                    let buildingName = name;
                    let gender = 'all'; // 'male', 'female', or 'all'
                    
                    if (name.includes('Women\'s') || name.includes('Female')) {
                        gender = 'female';
                        buildingName = name.replace(/Women's|Female/gi, '').replace(/Restroom/gi, '').trim();
                    } else if (name.includes('Men\'s') || name.includes('Male')) {
                        gender = 'male';
                        buildingName = name.replace(/Men's|Male/gi, '').replace(/Restroom/gi, '').trim();
                    } else if (name.includes('All-Gender')) {
                        gender = 'all';
                        buildingName = name.replace(/All-Gender/gi, '').replace(/Restroom/gi, '').trim();
                    }
                    
                    if (!restroomsByBuilding[buildingName]) {
                        restroomsByBuilding[buildingName] = {
                            building: buildingName,
                            restrooms: []
                        };
                    }
                    
                    restroomsByBuilding[buildingName].restrooms.push({
                        id: f.id || `${name}-${center?.join(',')}`,
                        name,
                        gender,
                        coords: center,
                        amenity: 'restroom'
                    });
                });
                
                // Build flat list of all restrooms as well as grouped-by-building list
                const allRestrooms = [];
                Object.values(restroomsByBuilding).forEach(building => {
                    building.restrooms.forEach(r => allRestrooms.push(r));
                });

                // Convert to list format with building as parent (for optional UI fallback)
                list = Object.values(restroomsByBuilding).map(building => ({
                    id: `building-${building.building}`,
                    name: building.building,
                    restrooms: building.restrooms.filter(r => Array.isArray(r.coords)),
                    amenity: 'restroom-building'
                }));

                // Show all restroom icons on the map (campus-wide) instead of only showing textual list
                window.dispatchEvent(new CustomEvent('njit-show-restrooms', {
                    detail: { building: null, restrooms: allRestrooms }
                }));

                // Hide textual list since we're showing icons across the map
                setNjitList([]);
                setSearchResults([]);
                setFilteredLocations([]);
                setSize(snapPoints.MIN);
                return;
            } else if (isOverlayParking) {
                // Parking: list each parking lot/deck individually
                const parkingList = filtered.map(f => {
                    const center = f.geometry?.type === 'Point' ? f.geometry.coordinates : getCentroid(f.geometry);
                    const name = f.properties?.name || f.properties?.building || t('Parking');
                    return {
                        id: f.id || `${name}-${center?.join(',')}`,
                        name,
                        coords: center,
                        amenity: 'parking'
                    };
                }).filter(item => Array.isArray(item.coords));

                // Show parking icons across the map
                dispatchOverlayEvent('njit-show-parking', { parkings: parkingList });

                // Hide textual list
                setNjitList([]);
                setSearchResults([]);
                setFilteredLocations([]);
                setSize(snapPoints.MIN);
                return;
            } else if (isOverlayElevator) {
                // Elevator: use curated campus elevator coordinates and show pins only
                list = ELEVATOR_OVERLAY_LOCATIONS;
                
                // Show all elevators on the map immediately
                dispatchOverlayEvent('njit-show-all-elevators', { elevators: list });
                
                // Don't show list for elevators, only map pins
                setNjitList([]);
                setSearchResults([]);
                setFilteredLocations([]);
                setSize(snapPoints.MIN);
                return;
            } else if (isOverlayStudySpace) {
                // Study spaces: use curated coordinates and show pins only
                list = STUDY_SPACE_OVERLAY_LOCATIONS;

                dispatchOverlayEvent('njit-show-study-spaces', { studySpaces: list });

                setNjitList([]);
                setSearchResults([]);
                setFilteredLocations([]);
                setSize(snapPoints.MIN);
                return;
            } else if (isOverlayFood) {
                // Food: use curated coordinates and show pins only
                list = FOOD_OVERLAY_LOCATIONS;

                dispatchOverlayEvent('njit-show-food', { foods: list });

                setNjitList([]);
                setSearchResults([]);
                setFilteredLocations([]);
                setSize(snapPoints.MIN);
                return;
            }

            setNjitList(list);
            setSearchResults([]);
            setFilteredLocations([]);
            setSize(snapPoints.MAX);
            return;
        }

        // For other categories (Meeting Rooms, Canteen, Elevator, etc.), fetch from MapsIndoors and show as expandable list
        // Regarding the venue name: The venue parameter in the SDK's getLocations method is case sensitive.
        // So when the currentVenueName is set based on a Locations venue property, the casing may differ.
        // Thus we need to find the venue name from the list of venues.
        window.mapsindoors.services.LocationsService.getLocations({
            categories: category,
            venue: searchAllVenues ? undefined : venuesInSolution.find(venue => venue.name.toLowerCase() === currentVenueName.toLowerCase())?.name,
        }).then(results => {
            // Convert MapsIndoors results to njitList format for expandable display
            const list = results.map(loc => {
                const coords = loc.geometry?.coordinates || [loc.properties?.anchor?.coordinates?.lng, loc.properties?.anchor?.coordinates?.lat];
                return {
                    id: loc.id,
                    name: loc.properties?.name || category,
                    building: loc.properties?.building || null,
                    floor: loc.properties?.floor || null,
                    coords: coords,
                    amenity: categoryText,
                    location: loc // Keep full location object for proper navigation
                };
            }).filter(item => Array.isArray(item.coords) && item.coords.length === 2);
            
            setNjitList(list);
            setSearchResults([]);
            setFilteredLocations([]);
            setSize(snapPoints.MAX);
        });
    }
    // Load NJIT GeoJSON once
    useEffect(() => {
        let aborted = false;
        async function load() {
            try {
                const res = await fetch('/data/njit-campus.geojson', { cache: 'no-cache' });
                if (res.ok) {
                    const gj = await res.json();
                    if (!aborted) {
                        console.log('Loaded NJIT features:', gj.features?.length);
                        setNjitFeatures(Array.isArray(gj.features) ? gj.features : []);
                        
                        // Organize buildings and their amenities
                        const organized = organizeBuildingsByAmenities(Array.isArray(gj.features) ? gj.features : []);
                        setBuildingsMap(organized);
                        console.log('Organized buildings:', Object.keys(organized).length);
                    }
                } else {
                    console.error('Failed to load NJIT GeoJSON:', res.status);
                }
            } catch (e) { 
                console.error('Error loading NJIT GeoJSON:', e);
            }
        }
        load();
        return () => { aborted = true; }
    }, []);

    // Center map on a selected NJIT item or MapsIndoors location
    function onNjitItemClicked(item) {
        // If it's a MapsIndoors location object, use the standard location click handler
        if (item.location) {
            onLocationClicked(item.location);
            return;
        }

        // Handle restroom building - show all restrooms in the building on map
        if (item.amenity === 'restroom-building' && item.restrooms) {
            const map = mapsIndoorsInstance?.getMap?.();
            if (!map) return;
            
            // Calculate center point from all restrooms
            const allCoords = item.restrooms.map(r => r.coords);
            if (allCoords.length === 0) return;
            
            const avgLng = allCoords.reduce((sum, c) => sum + c[0], 0) / allCoords.length;
            const avgLat = allCoords.reduce((sum, c) => sum + c[1], 0) / allCoords.length;
            
            // Mapbox
            if (map?.flyTo) {
                map.flyTo({ center: [avgLng, avgLat], zoom: 19 });
                // Send all restrooms to be shown on the map
                window.dispatchEvent(new CustomEvent('njit-show-restrooms', { 
                    detail: { 
                        building: item.name,
                        restrooms: item.restrooms
                    } 
                }));
                return;
            }
            // Google
            if (typeof window.google !== 'undefined' && window.google.maps && map?.setCenter) {
                map.setCenter({ lat: avgLat, lng: avgLng });
                map.setZoom(19);
                window.dispatchEvent(new CustomEvent('njit-show-restrooms', { 
                    detail: { 
                        building: item.name,
                        restrooms: item.restrooms
                    } 
                }));
            }
            return;
        }

        // Handle elevator - show custom elevator pin
        if (item.amenity === 'elevator') {
            const map = mapsIndoorsInstance?.getMap?.();
            if (!map || !item?.coords) return;
            const [lng, lat] = item.coords;
            
            // Mapbox
            if (map?.flyTo) {
                map.flyTo({ center: [lng, lat], zoom: 19 });
                // Dispatch event to show elevator pin
                window.dispatchEvent(new CustomEvent('njit-show-elevator', { 
                    detail: { 
                        coords: [lng, lat],
                        name: item.name
                    } 
                }));
                return;
            }
            // Google
            if (typeof window.google !== 'undefined' && window.google.maps && map?.setCenter) {
                map.setCenter({ lat, lng });
                map.setZoom(19);
                window.dispatchEvent(new CustomEvent('njit-show-elevator', { 
                    detail: { 
                        coords: [lng, lat],
                        name: item.name
                    } 
                }));
            }
            return;
        }

        // Otherwise handle as NJIT overlay item (restroom/parking)
        const map = mapsIndoorsInstance?.getMap?.();
        if (!map || !item?.coords) return;
        const [lng, lat] = item.coords;

        // Mapbox
        if (map?.flyTo) {
            map.flyTo({ center: [lng, lat], zoom: 18 });
            // Notify overlay to highlight restroom and building area
            window.dispatchEvent(new CustomEvent('njit-focus', { detail: { coords: [lng, lat], building: item.name } }));
            // Also request a route from forced ECE origin to this overlay building
            try {
                window.dispatchEvent(new CustomEvent('njit-route-to', { detail: { name: item.name, coords: [lng, lat] } }));
            } catch (err) { /* ignore */ }
            return;
        }
        // Google
        if (typeof window.google !== 'undefined' && window.google.maps && map?.setCenter) {
            map.setCenter({ lat, lng });
            map.setZoom(18);
            window.dispatchEvent(new CustomEvent('njit-focus', { detail: { coords: [lng, lat], building: item.name } }));
            try {
                window.dispatchEvent(new CustomEvent('njit-route-to', { detail: { name: item.name, coords: [lng, lat] } }));
            } catch (err) { /* ignore */ }
        }
    }


    /**
     * Communicate size change to parent component.
     *
     * @param {number} size
     */
    function setSize(size) {
        if (typeof onSetSize === 'function') {
            onSetSize(size);
        }
    }

    /**
     * Sort search results alphabetically if configured to do so and a category is selected.
     *
     * @param {Array} results - Array of search results
     * @returns {Array} Sorted or original array based on configuration
     */
    function getSortedSearchResults(results) {
        if (selectedCategory) {
            return [...results].sort((a, b) => {
                return (a.properties?.name || '')
                    .localeCompare(b.properties?.name || '', undefined, { numeric: true });
            })
        }

        return results;
    }

    /**
     * Handle search results from the search field.
     *
     * @param {array} locations - An array of MapsIndoors Location objects.
     * @param {boolean} fitMapBounds - If the map bounds should be adjusted to fit the locations.
     */
    function onResults(locations, fitMapBounds = false) {
        // First check if this looks like a building search query
        const searchQuery = searchFieldRef.current?.getValue()?.trim();
        if (searchQuery && searchQuery.length > 1) {
            const buildingMatches = searchBuildings(searchQuery, buildingsMap, 5);
            
            // If we found building matches, show them
            if (buildingMatches.length > 0) {
    console.log('Found building matches:', buildingMatches.length);
    const buildingResults = buildingMatches.map(building => formatBuildingResult(building));
    setBuildingSearchResults(buildingResults);

    setSize(snapPoints.MAX);
    setSearchResults([]);
    setFilteredLocations([]);
    setShowNotFoundMessage(false);

    // 🔥 AUTO SELECT FOR VOICE
    const detail = pendingVoiceRouteRef.current;

    if (detail && detail.action === 'route_to_location') {
        const firstBuilding = buildingResults[0];

        console.log('Voice auto-selecting building immediately:', firstBuilding);

        pendingVoiceRouteRef.current = null;

        window.setTimeout(() => {
            onBuildingClicked(firstBuilding);
        }, 300);
    }

    return;
}


        }
        
        // Otherwise, proceed with normal MapsIndoors search
        setBuildingSearchResults([]);
        const displayResults = locations.slice(0, MAX_RESULTS);

        // Expand the sheet to occupy the entire screen
        setSize(snapPoints.MAX);

        setSearchResults(displayResults);
        setFilteredLocations(displayResults);
        setShowNotFoundMessage(displayResults.length === 0);

        if (locations && fitMapBounds) {
            fitMapBoundsToLocations(locations);
        }

        // Handles updates to scroll buttons when the category changes.
        // When a category changes, the scroll buttons need to have their enabled/disabled states updated.
        // Since some categories might load before the DOM element is fully rendered, we listen for the 'transitionend' event.
        // The 'transitionend' event is triggered when the DOM element changes its size, which can occur as a result of new categories being fetched.
        // Upon completion of the size transition, the 'updateScrollButtons' function is triggered to handle the updated state.
        if (isKioskContext) {
            searchRef.current?.addEventListener('transitionend', () => {
                scrollButtonsRef?.current?.updateScrollButtons();
            }, { once: true });
        }
    }

    /**
     * Handle building search result click - pin building on map and show amenities
     */
    function onBuildingClicked(buildingResult) {
        if (!buildingResult || !buildingResult.coords) return;
        
        const building = buildingResult.data;
        const [lng, lat] = buildingResult.coords;
        const map = mapsIndoorsInstance?.getMap?.();
        
        if (!map) return;
        
        // Center map on building
        if (map?.flyTo) {
            // Mapbox
            map.flyTo({ center: [lng, lat], zoom: 19 });
        } else if (typeof window.google !== 'undefined' && window.google.maps && map?.setCenter) {
            // Google Maps
            map.setCenter({ lat, lng });
            map.setZoom(19);
        }
        
        // Show building and its amenities on map
        const amenities = {
            building: buildingResult.name,
            restrooms: building.restrooms || [],
            elevators: building.elevators || [],
            foods: building.foods || [],
            parking: building.parking || []
        };

        // Dispatch events to show amenities
        if (amenities.restrooms.length > 0) {
            window.dispatchEvent(new CustomEvent('njit-show-restrooms', { 
                detail: { 
                    building: buildingResult.name,
                    restrooms: amenities.restrooms
                } 
            }));
        }

        if (amenities.elevators.length > 0) {
            window.dispatchEvent(new CustomEvent('njit-show-all-elevators', { 
                detail: { 
                    elevators: amenities.elevators
                } 
            }));
        }

        if (amenities.foods.length > 0) {
            window.dispatchEvent(new CustomEvent('njit-show-food', {
                detail: {
                    foods: amenities.foods
                }
            }));
        }

        if (amenities.parking.length > 0) {
            window.dispatchEvent(new CustomEvent('njit-show-parking', {
                detail: {
                    parking: amenities.parking
                }
            }));
        }
        
        // Also dispatch a route event if needed
        try {
            window.dispatchEvent(new CustomEvent('njit-route-to', { 
                detail: { 
                    name: buildingResult.name, 
                    coords: [lng, lat] 
                } 
            }));
        } catch (err) { 
            // ignore 
        }
        
        // Close search
        setSearchResults([]);
        setBuildingSearchResults([]);
        setSize(snapPoints.MIN);
    }


    /**
     * Adjusts the map view to fit the bounds of the provided locations.
     * It will filter out Locations that are not on the current floor or not part of the current venue.
     *
     * @param {Array} locations - An array of Location objects to fit within the map bounds.
     */
    function fitMapBoundsToLocations(locations) {
        if (!mapsIndoorsInstance.goTo) return; // Early exit to prevent crashes if using an older version of the MapsIndoors JS SDK. The goTo method was introduced in version 4.38.0.

        const currentFloorIndex = mapsIndoorsInstance.getFloor();

        // Create a GeoJSON FeatureCollection from the locations that can be used as input to the goTo method.
        const featureCollection = {
            type: 'FeatureCollection',
            features: locations
                // Filter out locations that are not on the current floor. If those were included, it could result in a wrong fit since they are not visible on the map anyway.
                .filter(location => parseInt(location.properties.floor, 10) === parseInt(currentFloorIndex, 10))

                // Filter out locations that are not part of the current venue. Including those when fitting to bounds could cause the map to zoom out too much.
                .filter(location => location.properties.venueId.toLowerCase() === currentVenueName.toLowerCase())

                // Map the locations to GeoJSON features.
                .map(location => ({
                    type: 'Feature',
                    geometry: location.geometry,
                    properties: location.properties
                }))
        };

        if (featureCollection.features.length > 0) {
            Promise.all([getBottomPadding(), getLeftPadding()]).then(([bottomPadding, leftPadding]) => {
                mapsIndoorsInstance.goTo(featureCollection, {
                    maxZoom: 22,
                    padding: { bottom: bottomPadding, left: leftPadding, top: 0, right: 0 }
                });
            });
        }
    }

    /**
     * Clear results list when search field is cleared.
     */
    function cleared() {
        setSearchResults([]);
        setBuildingSearchResults([]);
        setShowNotFoundMessage(false);
        if (selectedCategory) {
            getFilteredLocations(selectedCategory);
        }

        setFilteredLocations([]);

        // If keyboard is not null or undefined, clear the input field
        if (!isNullOrUndefined(keyboardRef.current)) {
            keyboardRef.current.clearInputField();
        }
    }

    /**
     * When search field is clicked, maximize the sheet size and set focus on the from field,
     * and if the useKeyboard prop is present, show the onscreen keyboard.
     * But wait for any bottom sheet transition to end before doing that to avoid content jumping when virtual keyboard appears.
     */
    function searchFieldClicked() {
        searchFieldRef.current.getInputField();

        const sheet = searchRef.current.closest('.sheet');
        if (sheet) {
            sheet.addEventListener('transitionend', () => {
                searchFieldRef.current.focusInput();
                setIsInputFieldInFocus(true);
            }, { once: true });
        } else {
            // On desktop (no sheet), set focus immediately
            setIsInputFieldInFocus(true);
            searchFieldRef.current.focusInput();
        }
    }

    /**
     * Handle hovering over location.
     *
     * @param {object} location
     */
    function onMouseEnter(location) {
        setHoveredLocation(location);
    }

    /**
     * Handle locations clicked on the map.
     *
     * @param {object} location
     */
    function onLocationClicked(location) {
        setCurrentLocation(location);

        // Set the current venue to be the selected location venue.
        if (location.properties.venueId.toLowerCase() !== currentVenueName.toLowerCase()) {
            setCurrentVenueName(location.properties.venueId);
            setIsLocationClicked(true);
        }

        const currentFloor = mapsIndoorsInstance.getFloor();
        const locationFloor = location.properties.floor;

        // Set the floor to the one that the location belongs to.
        if (locationFloor !== currentFloor) {
            mapsIndoorsInstance.setFloor(locationFloor);
        }

        Promise.all([getBottomPadding(), getLeftPadding()]).then(([bottomPadding, leftPadding]) => {
            mapsIndoorsInstance.goTo(location, {
                maxZoom: 22,
                padding: { bottom: bottomPadding, left: leftPadding, top: 0, right: 0 }
            });
        });
    }

useEffect(() => {
    function onVoiceRouteRequest(evt) {
        const detail = evt?.detail || {};
        const query = detail.targetName || detail.query || detail.targetKey;

        console.log('Search received voice-route-request:', detail);

        if (!query) {
            console.warn('Voice route: missing query');
            return;
        }

        pendingVoiceRouteRef.current = detail;
    }

    window.addEventListener('voice-route-request', onVoiceRouteRequest);

    return () => {
        window.removeEventListener('voice-route-request', onVoiceRouteRequest);
    };
}, []);


useEffect(() => {
    function onVoiceShowRestrooms() {
        console.log('Voice triggering restroom overlay');
        getFilteredLocations('restroom', 'Restrooms');
    }

    function onVoiceShowParking() {
        console.log('Voice triggering parking overlay');
        getFilteredLocations('parking', 'Parking');
    }

    window.addEventListener('voice-show-restrooms', onVoiceShowRestrooms);
    window.addEventListener('voice-show-parking', onVoiceShowParking);

    return () => {
        window.removeEventListener('voice-show-restrooms', onVoiceShowRestrooms);
        window.removeEventListener('voice-show-parking', onVoiceShowParking);
    };
}, []);



useEffect(() => {
    const detail = pendingVoiceRouteRef.current;

    if (!detail) return;

    if (searchResults.length > 0) {
        const firstResult = searchResults[0];

        console.log('Voice auto-selecting first search result:', firstResult);

        pendingVoiceRouteRef.current = null;

        onLocationClicked(firstResult);

        if (detail.action === 'route_to_location') {
            window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent('voice-start-location-details'));
            }, 700);
        }

        return;
    }

    if (buildingSearchResults.length > 0) {
        const firstBuilding = buildingSearchResults[0];

        console.log('Voice auto-selecting first building result:', firstBuilding);

        pendingVoiceRouteRef.current = null;

        onBuildingClicked(firstBuilding);

        if (detail.action === 'route_to_location') {
            window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent('voice-start-location-details'));
            }, 700);
        }
    }
}, [searchResults, buildingSearchResults]);





    /**
     * Get bottom padding when selecting a location.
     * Calculate all cases depending on the kioskLocation id prop as well.
     */
    function getBottomPadding() {
        return new Promise((resolve) => {
            if (isDesktop) {
                if (kioskLocation) {
                    getDesktopPaddingBottom().then(padding => resolve(padding));
                } else {
                    resolve(0);
                }
            } else {
                resolve(200);
            }
        });
    }

    /**
     * Get left padding when selecting a location.
     * Calculate all cases depending on the kioskLocation id prop as well.
     */
    function getLeftPadding() {
        return new Promise((resolve) => {
            if (isDesktop) {
                if (kioskLocation) {
                    resolve(0);
                } else {
                    getDesktopPaddingLeft().then(padding => resolve(padding));
                }
            } else {
                resolve(0);
            }
        });
    }

    /**
     * Calculate the CSS for the container based on context.
     */
    function calculateContainerStyle() {
        if (searchResults.length > 0) {
            let maxHeight;
            if (isDesktop) {
                // On desktop-sized viewports, we want the container to have a max height of 60% of the Map Template.
                maxHeight = document.querySelector('.mapsindoors-map').clientHeight * 0.6 + 'px';
            } else {
                // On mobile-sized viewports, take up all available space if needed.
                maxHeight = '100%';
            }

            return { display: 'flex', flexDirection: 'column', maxHeight, overflow: 'hidden' };
        }
    }

    /**
     * Determines if categories should be shown under the search field in kiosk mode.
     *
     * @returns {boolean} True if in kiosk context and showCategoriesUnderSearch is enabled, otherwise false.
     */
    function shouldShowCategoriesUnderSearch() {
        // We determine wether to show categories horizontally or vertically based on the areHorizontalCategoriesEnabled setting.
        // Each layout has different styling and thus needs to be treated as separate options.
        return isKioskContext && areHorizontalCategoriesEnabled;
    }

    /*
     * Monitors clicks to manage sheet size and input focus state
     */
    useEffect(() => {
        const SEARCH_FOCUS_ELEMENTS = ['.search__info', '.search__back-button', '.categories', '.sheet__content'];

        // We want to ignore: Floor Selector, View Mode Switch, My Position, View Selector, Mapbox zoom controls and Google Maps zoom controls
        const IGNORE_CLOSE_ELEMENTS = ['.mi-floor-selector', '.view-mode-switch', '.mi-my-position', '.view-selector__toggle-button', '.building-list', '.mapboxgl-ctrl-bottom-right', '.gmnoprint', '.language-selector-portal'];

        const handleSearchFieldFocus = (event) => {
            const clickedInsideSearchArea = SEARCH_FOCUS_ELEMENTS.some(selector =>
                event.target.closest(selector)
            );

            const clickedInsideIgnoreArea = IGNORE_CLOSE_ELEMENTS.some(selector =>
                event.target.closest(selector)
            );

            const clickedInsideResults = event.target.closest('.search__results');

            if (clickedInsideSearchArea) {
                setSize(snapPoints.MAX);
                requestAnimationFrameId.current = requestAnimationFrame(() => { // we use a requestAnimationFrame to ensure that the size change is applied before the focus (meaning that categories are rendered)
                    setIsInputFieldInFocus(true);
                });
            } else if (!clickedInsideResults && !clickedInsideIgnoreArea) {
                setIsInputFieldInFocus(false);
                setSize(snapPoints.MIN);
                setSelectedCategory(null);
                setSearchResults([]);
                setFilteredLocations([]);
                selectedCategoriesArray.current = [];
            }
        };

        if (isOpen) {
            requestAnimationFrameId.current = requestAnimationFrame(() => { // we use a requestAnimationFrame to ensure that the click is not registered too early (while other sheets are still "active")
                document.addEventListener('click', handleSearchFieldFocus);
            });
        } else {
            document.removeEventListener('click', handleSearchFieldFocus);
        }

        return () => {
            document.removeEventListener('click', handleSearchFieldFocus);
            if (requestAnimationFrameId.current) {
                cancelAnimationFrame(requestAnimationFrameId.current);
            }
        }
    }, [isOpen]);

    /*
     * Sets currently hovered location.
     */
    useEffect(() => {
        return () => {
            setHoveredLocation();
        }
    }, []);

    /*
     * Reset search state when Search component opens to ensure it starts in default state.
     * This is particularly important when returning from directions/wayfinding.
     * Only reset if there's stale state (results or category tree) without a selected category
     */
    useEffect(() => {
        // Only reset if Search is open, no category selected, but stale data exists
        if (isOpen && !selectedCategory) {
            // Reset search results and filtered locations
            setSearchResults([]);
            setFilteredLocations([]);
            setShowNotFoundMessage(false);
            
            // Clear the category selection tree
            selectedCategoriesArray.current = [];
        }
    }, [isOpen, selectedCategory]);

    /*
     * React on changes in the venue prop.
     * Deselect category and clear results list.
     */
    useEffect(() => {
        if (selectedCategory && currentVenueName !== initialVenueName) {
            setSearchResults([]);
            setSelectedCategory(null);
        }
    }, [currentVenueName]);

    /*
     * React on changes in the app language. Any existing category search needs to update with translated Locations.
     */
    useEffect(() => {
        if (selectedCategory) {
            window.mapsindoors.services.LocationsService.once('update_completed', () => {
                searchFieldRef.current.triggerSearch();
            });
        }
    }, [currentLanguage]);

    /*
     * Handle location hover.
     */
    useEffect(() => {
        mapsIndoorsInstance?.on('mouseenter', onMouseEnter);
        return () => {
            mapsIndoorsInstance?.off('mouseenter', onMouseEnter);
        }
    }, [mapsIndoorsInstance]);

    /*
     * Setup scroll buttons to scroll in search results list when in kiosk mode.
     */
    useEffect(() => {
        if (isOpen && isKioskContext && searchResults.length > 0) {
            const searchResultsElement = document.querySelector('.mapsindoors-map .search__results');
            scrollButtonsRef.current.scrollContainerElementRef = searchResultsElement;
        }
    }, [searchResults, isOpen]);

    /*
     * When useKeyboard parameter is present, add click event listener which determines when the keyboard should be shown or not.
     */
    useEffect(() => {
        if (useKeyboard) {
            const onClick = (event) => {
                // Use the closest() method to check if the element that has been clicked traverses the element and its parents
                // until it finds a node that matches the 'mi-keyboard' selector.
                // If the user clicks on the keyboard or the search fields, the keyboard should stay visible.
                if (event.target.closest('mi-keyboard') ||
                    event.target.tagName.toUpperCase() === 'MI-SEARCH' ||
                    event.target.tagName.toUpperCase() === 'INPUT') {
                    setIsKeyboardVisible(true)
                } else {
                    setIsKeyboardVisible(false);
                }
            };

            window.addEventListener('click', onClick, false);
            return () => {
                window.removeEventListener('click', onClick, false);
            };
        }
    }, [useKeyboard]);

    /*
     * React on changes in the selected category state.
     * If the selected category is present, get the filtered locations based on the selected category.
     */
    useEffect(() => {
        if (selectedCategory) {
            getFilteredLocations(selectedCategory);
        }
    }, [selectedCategory]);

    /*
     * Get the legend sections and determine
     * If the legend button should be shown.
     */
    useEffect(() => {
        if (kioskLocation) {
            setShowLegendButton(legendSections.length > 0);
        }
    }, [kioskLocation]);

    /**
     *
     */
    useEffect(() => {
        const childKeys = categories.find(([key]) => key === selectedCategory)?.[1]?.childKeys || [];
        setChildKeys(childKeys)
    }, [categories, selectedCategory]);

    /*
     * Get app config and determine if categories should be shown under the search field in kiosk mode.
     */
    useEffect(() => {
        setAreHorizontalCategoriesEnabled(appConfig?.appSettings?.areHorizontalCategoriesEnabled === true || appConfig?.appSettings?.areHorizontalCategoriesEnabled === 'true');
    }, [appConfig]);

    // Compute which categories should be visible in the vertical list.
    // If a category is expanded, only show that category (accordion behaviour).
    const filteredCategories = categories.filter(([, categoryInfo]) => {
        const displayName = categoryInfo.displayName?.toLowerCase() || '';
        return !(displayName.includes('men\'s') || displayName.includes('women\'s'));
    });
    const visibleCategories = expandedCategory
        ? filteredCategories.filter(([cat]) => cat === expandedCategory)
        : filteredCategories;


    return (
        <div className="search"
            ref={searchRef}
            style={calculateContainerStyle()}>

            { /* Search input field rendered in weather header via portal */ }
            {document.getElementById('weather-header-search-portal') && createPortal(
                <div className="search__info" style={{ gridTemplateColumns: isKioskContext && showLegendButton ? 'min-content 1fr' : 'auto' }}>
                    {isKioskContext && showLegendButton && <button className="search__legend" onClick={() => setShowLegendDialog(true)} aria-label={t('Show legend')}><Legend /></button>}

                    <label className="search__label">
                        <span>{t('Search by name, category, building...')}</span>
                        <SearchField
                            ref={searchFieldRef}
                            mapsindoors={!(/restroom|toilet|bathroom|parking|garage|lot|elevator|lift|study\s*space|study|studying|canteen|cafeteria|dining|food|restaurant/.test((selectedCategory || '').toString().toLowerCase()))}
                            placeholder={t('Search by name, category, building...')}
                            results={locations => onResults(locations)}
                            clicked={() => searchFieldClicked()}
                            cleared={() => cleared()}
                            category={selectedCategory}
                            disabled={!isOpen}
                        />
                    </label>
                </div>,
                document.getElementById('weather-header-search-portal')
            )}

            {/* Vertical list of Categories */}
            {/* Show full category list if (kiosk mode and showCategoriesUnderSearch is true) OR input is in focus, and only when searchResults are empty */}
            {(shouldShowCategoriesUnderSearch() || isInputFieldInFocus) && !showNotFoundMessage && categories.length > 0 && searchResults.length === 0 && buildingSearchResults.length === 0 && (
                <div>
                    {visibleCategories.map(([category, categoryInfo]) => {
                        const categoryLower = (category || '').toString().toLowerCase();
                        const displayNameLower = (categoryInfo.displayName || '').toString().toLowerCase();
                        const isRestroom = /restroom|toilet|bathroom/.test(categoryLower) || /restroom|toilet|bathroom/.test(displayNameLower);
                        const isParking = /parking|garage|lot/.test(categoryLower) || /parking|garage|lot/.test(displayNameLower);
                        const isMeetingRoom = /meeting|conference|study|studying/.test(categoryLower) || /meeting|conference|study|studying/.test(displayNameLower);
                        const isCanteen = /canteen|cafeteria|dining|food/.test(categoryLower) || /canteen|cafeteria|dining|food/.test(displayNameLower);
                        const isElevator = /elevator|lift/.test(categoryLower) || /elevator|lift/.test(displayNameLower);
                        const isExpanded = expandedCategory === category;
                        const hasSubcategories = isRestroom || isParking || isMeetingRoom || isCanteen || isElevator;
                        
                        return (
                            <div key={category} style={{ marginTop: 'var(--spacing-x-small)' }}>
                                <div className="categories__category" style={{ 
                                    animation: 'dropIn 0.3s ease-out',
                                    animationFillMode: 'both'
                                }}>
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('Clicked category:', category, 'displayName:', categoryInfo.displayName);
                                        if (hasSubcategories) {
                                            const willExpand = !isExpanded;
                                            setExpandedCategory(willExpand ? category : null);
                                            if (willExpand) {
                                                // Keep input focused when expanding to show subcategories
                                                setIsInputFieldInFocus(true);
                                                getFilteredLocations(category, categoryInfo.displayName);
                                            }
                                        } else {
                                            setExpandedCategory(null);
                                            getFilteredLocations(category, categoryInfo.displayName);
                                        }
                                    }}>
                                        <img src={categoryInfo.iconUrl} alt="" />
                                        {isMeetingRoom ? 'Study Spaces' : isCanteen ? 'Food' : categoryInfo.displayName}
                                    </button>
                                </div>
                                
                                {/* Show subcategories inline if expanded */}
                                {isExpanded && njitList.length > 0 && (
                                    <div className="categories__subcategories">
                                        {njitList.map((item) => {
                                            const itemIsParking = item.amenity === 'parking';
                                            const itemIsRestroomBuilding = item.amenity === 'restroom-building';
                                            const itemIsMeetingRoom = /meeting|conference|study|studying/.test(item.amenity);
                                            const itemIsCanteen = /canteen|cafeteria|dining|food/.test(item.amenity);
                                            const itemIsElevator = /elevator|lift/.test(item.amenity);
                                            
                                            // Handle restroom building - show just building name
                                            if (itemIsRestroomBuilding && item.restrooms) {
                                                return (
                                                    <div key={item.id} className="categories__subcategory">
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Show all restrooms in this building on the map
                                                            onNjitItemClicked(item);
                                                        }}>
                                                            <div className="overlay-item__icon" data-amenity="restroom" style={{
                                                                width: '28px',
                                                                height: '28px',
                                                                fontSize: '12px'
                                                            }}>WC</div>
                                                            <div className="overlay-item__content">
                                                                <div style={{ fontSize: '13px', fontWeight: '500' }}>{item.name}</div>
                                                            </div>
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            
                                            // Determine icon label for other items
                                            let iconLabel = 'WC';
                                            if (itemIsParking) iconLabel = 'P';
                                            else if (itemIsMeetingRoom) iconLabel = 'S';
                                            else if (itemIsCanteen) iconLabel = 'F';
                                            else if (itemIsElevator) iconLabel = 'E';
                                            else if (item.location) iconLabel = '📍'; // Default for other MapsIndoors locations
                                            
                                            // Determine subtitle
                                            let subtitle = '';
                                            if (itemIsParking) {
                                                subtitle = t('Parking');
                                            } else if (item.floor !== null && item.floor !== undefined) {
                                                subtitle = `${t('Floor')} ${item.floor}${item.building ? ` · ${item.building}` : ''}`;
                                            } else if (item.building) {
                                                subtitle = item.building;
                                            }
                                            
                                            return (
                                                <div key={item.id} className="categories__subcategory">
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        onNjitItemClicked(item);
                                                    }}>
                                                        <div className="overlay-item__icon" data-amenity={item.amenity} style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            fontSize: '12px'
                                                        }}>{iconLabel}</div>
                                                        <div className="overlay-item__content">
                                                            <div style={{ fontSize: '13px', fontWeight: '500' }}>{item.name}</div>
                                                            {subtitle && (
                                                                <div style={{ fontSize: '11px', opacity: 0.8 }}>
                                                                    {subtitle}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Message shown if no search results were found */}
            {showNotFoundMessage && <p className="search__error"> {t('Nothing was found')}</p>}

            {/* Building search results */}
            {buildingSearchResults.length > 0 && (
                <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginTop: '8px'
                }}>
                    {buildingSearchResults.map((building) => (
                        <div key={building.id} style={{ 
                            marginTop: '0px', 
                            marginLeft: '16px', 
                            marginRight: '16px',
                            animation: 'dropIn 0.3s ease-out',
                            animationFillMode: 'both'
                        }}>
                            <button
                                onClick={() => onBuildingClicked(building)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.6)',
                                    cursor: 'pointer',
                                    transition: 'border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease',
                                    color: '#ffffff',
                                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.7)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.98)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                                    e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.6)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
                                }}
                            >
                                <div className="overlay-item__icon" data-amenity="building" style={{
                                    width: '36px',
                                    height: '36px',
                                    fontSize: '14px',
                                    marginRight: '12px',
                                    flexShrink: 0,
                                    backgroundImage: `url('${getBuildingImage(building.name) || '/Building/placeholder.png'}')`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    position: 'relative'
                                }}>
                                </div>
                                <div className="overlay-item__content" style={{ textAlign: 'left', flex: 1 }}>
                                    <div style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        marginBottom: '2px',
                                        color: '#ffffff'
                                    }}>
                                        {building.name}
                                    </div>
                                    <div style={{ 
                                        fontSize: '12px', 
                                        opacity: 0.8,
                                        color: '#ffffff'
                                    }}>
                                        {building.subtitle}
                                    </div>
                                </div>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* When search results are found (category is selected or search term is used) */}
            {searchResults.length > 0 && (
                <div className="search__results prevent-scroll" {...scrollableContentSwipePrevent}>

                    {/* Subcategories should only show if a top level category is selected and if that top level category has any childKeys */}
                    {selectedCategory && (
                        <Categories
                            handleBack={handleBack}
                            getFilteredLocations={(category) => getFilteredLocations(category)}
                            onLocationClicked={onLocationClicked}
                            childKeys={childKeys}
                            topLevelCategory={false}
                            selectedCategoriesArray={selectedCategoriesArray}
                            categoryOrientation={areHorizontalCategoriesEnabled ? 'horizontal' : 'vertical'}
                        />
                    )}

                    {/* Show locations when there are any searchResults */}
                    {getSortedSearchResults(searchResults).map(location =>
                        <ListItemLocation
                            key={location.id}
                            location={location}
                            locationClicked={() => onLocationClicked(location)}
                            isHovered={location?.id === hoveredLocation?.id}
                        />
                    )}
                </div>
            )}



            { /* Keyboard */}

            {isKeyboardVisible && isDesktop && <Keyboard ref={keyboardRef} searchInputElement={searchInput}></Keyboard>}

            { /* Buttons to scroll in the list of search results if in kiosk context */}

            {isOpen && isKioskContext && searchResults.length > 0 && createPortal(
                <div className="search__scroll-buttons">
                    <mi-scroll-buttons ref={scrollButtonsRef}></mi-scroll-buttons>
                </div>,
                document.querySelector('.mapsindoors-map')
            )}
        </div>
    )
}

export default Search;