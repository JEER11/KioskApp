import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Venue.scss';
import PropTypes from 'prop-types';

Venue.propTypes = {
    venue: PropTypes.object.isRequired,
    isCurrent: PropTypes.bool,
    onVenueClicked: PropTypes.func.isRequired
};


/**
 * Show a button containing Venue information.
 *
 * @param {object} props
 * @param {object} venue - The Venue to show.
 * @param {function} onVenueClicked - Callback to execute when Venue is clicked.
 * @returns
 */
function Venue({ venue, isCurrent, onVenueClicked }) {
    const { t } = useTranslation();

    const [style, setStyle] = useState({});
    const [placeInfo, setPlaceInfo] = useState();
    const [loadingPlaceInfo, setLoadingPlaceInfo] = useState(false);
    const [overlayVisible, setOverlayVisible] = useState(false);

    useEffect(() => {
        return () => {
            setStyle({});
        }
    }, []);

    useEffect(() => {
        const styleObject = {};

        if (venue.image) {
            styleObject.backgroundImage = `url('${venue.image}')`;
        }

        setStyle(styleObject);
    }, [venue]);

    // Helper: load place information using the Google Maps JS PlacesService if available
    const fetchPlaceInfo = () => {
        if (placeInfo || loadingPlaceInfo) return;
        setLoadingPlaceInfo(true);

        // Use the JavaScript PlacesService when possible (client-side, requires Google Maps JS to be loaded)
        try {
            if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
                const service = new window.google.maps.places.PlacesService(document.createElement('div'));
                const query = `${venue.displayName || venue.venueInfo?.name || ''} NJIT`;

                service.findPlaceFromQuery({ query, fields: ['place_id', 'name', 'formatted_address'] }, (results, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                        const pid = results[0].place_id;
                        service.getDetails({ placeId: pid, fields: ['name', 'formatted_phone_number', 'opening_hours', 'formatted_address', 'website'] }, (place, status2) => {
                            if (status2 === window.google.maps.places.PlacesServiceStatus.OK && place) {
                                setPlaceInfo(place);
                            }
                            setLoadingPlaceInfo(false);
                        });
                    } else {
                        setLoadingPlaceInfo(false);
                    }
                });
                return;
            }

            // If the JS Places lib isn't available, and a Google Maps API key exists, we could fall back to server-side Places Web Service.
            // Note: Google Places Web Service is not CORS-enabled for browser requests in many setups — skip if not available.
            setLoadingPlaceInfo(false);
        } catch (e) {
            console.warn('Failed to fetch place info', e);
            setLoadingPlaceInfo(false);
        }
    };

    const handleMouseEnter = () => {
        setOverlayVisible(true);
        fetchPlaceInfo();
    };

    const handleMouseLeave = () => {
        setOverlayVisible(false);
    };

    return <button className="venue" onClick={() => onVenueClicked()} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <div className="venue__image" style={style}></div>
        <div className="venue__content">
            <div className="venue__title">
                {venue.displayName || venue.venueInfo.name}
                {isCurrent && <div className="venue__current">{t('Current')}</div>}
            </div>
                <div className="venue__right">
                {/* Info panel on the right side showing phone / opening hours when available */}
                {(overlayVisible || placeInfo) && <div className={`venue__info ${overlayVisible ? 'visible' : ''}`}>
                    {loadingPlaceInfo && <div className="venue__info-row">{t('Loading...')}</div>}
                    {placeInfo && placeInfo.formatted_phone_number && <div className="venue__info-row">{placeInfo.formatted_phone_number}</div>}
                    {placeInfo && placeInfo.opening_hours && (
                        <div className="venue__info-row">
                            {placeInfo.opening_hours?.open_now ? <strong>{t('Open now')}</strong> : <strong>{t('Closed')}</strong>}
                            <div className="venue__info-hours">
                                {placeInfo.opening_hours.weekday_text ? (() => {
                                    const weekdayIndex = (new Date().getDay() + 6) % 7;
                                    return placeInfo.opening_hours.weekday_text[weekdayIndex];
                                })() : null}
                            </div>
                        </div>
                    )}
                </div>}
            </div>
        </div>
    </button>
}

export default Venue;
