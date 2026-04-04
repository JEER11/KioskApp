import { useEffect, useState, useRef } from 'react';
import './Directions.scss';
import { useTranslation } from 'react-i18next';
import { useRecoilState, useRecoilValue } from 'recoil';
import mapsIndoorsInstanceState from '../../atoms/mapsIndoorsInstanceState';
import travelModeState from '../../atoms/travelModeState';
import { ReactComponent as QRCode } from '../../assets/qrcode.svg';
import RouteInstructions from '../RouteInstructions/RouteInstructions';
import directionsResponseState from '../../atoms/directionsResponseState';
import activeStepState from '../../atoms/activeStep';
import { snapPoints } from '../../constants/snapPoints';
import substepsToggledState from '../../atoms/substepsToggledState';
import currentLocationState from '../../atoms/currentLocationState';
import getDesktopPaddingLeft from '../../helpers/GetDesktopPaddingLeft';
import getMobilePaddingBottom from '../../helpers/GetMobilePaddingBottom';
import getDesktopPaddingBottom from '../../helpers/GetDesktopPaddingBottom';
import kioskLocationState from '../../atoms/kioskLocationState';
import qrCodeLinkState from '../../atoms/qrCodeLinkState';
import Accessibility from '../Accessibility/Accessibility';
import isDestinationStepState from '../../atoms/isDestinationStepState';
import primaryColorState from '../../atoms/primaryColorState';
import { useIsKioskContext } from '../../hooks/useIsKioskContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import showExternalIDsState from '../../atoms/showExternalIDsState';
import PropTypes from 'prop-types';
import baseLinkSelector from '../../selectors/baseLink';
import mapTypeState from '../../atoms/mapTypeState';
import { ZoomLevelValues } from '../../constants/zoomLevelValues';
import ShuttleBus from '../ShuttleBus/ShuttleBus';
import shuttleBusOnState from '../../atoms/shuttleBusOnState';
import appConfigState from '../../atoms/appConfigState';

let directionsRenderer;
let directionsBackdropRenderer;

const ROUTE_BACKDROP_STYLE = {
    strokeColor: '#8f001a',
    strokeOpacity: 0.38,
    strokeWeight: 14
};

const ROUTE_LINE_STYLE = {
    strokeColor: '#ff3b52',
    strokeOpacity: 0.98,
    strokeWeight: 8
};

// Prefer a single renderer instance to avoid creating multiple SDK listeners.
// Reuse the `directionsRenderer` variable declared above for a single shared instance.


Directions.propTypes = {
    isOpen: PropTypes.bool,
    onBack: PropTypes.func,
    onSetSize: PropTypes.func,
    onRouteFinished: PropTypes.func,
    snapPointSwipedByUser: PropTypes.string
};

/**
 * Show the directions view.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Indicates if the directions view is open.
 * @param {function} props.onBack - Callback that fires when the directions view is closed by the user.
 * @param {function} props.onSetSize - Callback that is fired when the component has loaded.
 * @param {function} props.onRouteFinished - Callback that fires when the route has finished.
 * @param {string} props.snapPointSwipedByUser - Changes value when user has swiped a Bottom sheet to a new snap point.
 *
 */
function Directions({ isOpen, onBack, onSetSize, onRouteFinished, snapPointSwipedByUser }) {
    const { t } = useTranslation();
    const requestAnimationFrameId = useRef();

    // Holds the MapsIndoors DisplayRule for the destination
    const [destinationDisplayRule, setDestinationDisplayRule] = useState(null);

    const destinationInfoElement = useRef(null);

    const [totalTime, setTotalTime] = useState();

    const mapsIndoorsInstance = useRecoilValue(mapsIndoorsInstanceState);

    const travelMode = useRecoilValue(travelModeState);

    const directions = useRecoilValue(directionsResponseState);

    const [, setActiveStep] = useRecoilState(activeStepState);

    const [substepsOpen, setSubstepsOpen] = useRecoilState(substepsToggledState);

    const kioskLocation = useRecoilValue(kioskLocationState);

    const isDesktop = useIsDesktop();

    const [, setQRCodeLink] = useRecoilState(qrCodeLinkState)

    const isDestinationStep = useRecoilValue(isDestinationStepState);

    const primaryColor = useRecoilValue(primaryColorState);

    const isKioskContext = useIsKioskContext();

    const showExternalIDs = useRecoilValue(showExternalIDsState);

    const baseShareLink = useRecoilValue(baseLinkSelector);

    const currentLocation = useRecoilValue(currentLocationState);

    const mapType = useRecoilValue(mapTypeState);

    const shuttleBusOn = useRecoilValue(shuttleBusOnState);

    const appConfig = useRecoilValue(appConfigState);

    useEffect(() => {
        return () => {
            setDestinationDisplayRule(null);
        }
    }, []);

    useEffect(() => {
        setDestinationDisplayRule(null);

        if (isOpen && directions) {
            setTotalTime(directions.totalTime);

            // 6 percent of smallest of viewport height or width
            const padding = Math.min(window.innerHeight, window.innerWidth) * 0.06;

            // Create or reuse a single DirectionsRenderer instance and set the route.
            try {
                Promise.all([getBottomPadding(padding), getLeftPadding(padding)])
                    .then(([bottomPadding, leftPadding]) => {
                        if (!mapsIndoorsInstance || !window.mapsindoors) {
                            console.warn('Directions: mapsIndoorsInstance or window.mapsindoors missing; aborting renderer creation');
                            return;
                        }

                        const createRendererIfNeeded = async () => {
                            if (!directionsRenderer) {
                                // wait for underlying provider readiness (canvas/div)
                                const start = Date.now();
                                const timeout = 3000;
                                const wait = () => new Promise((resolve, reject) => {
                                    function check() {
                                        try {
                                            const mapView = mapsIndoorsInstance.getMapView && mapsIndoorsInstance.getMapView();
                                            const map = mapView && mapView.getMap && mapView.getMap();
                                            if (map) {
                                                if (typeof map.getCanvas === 'function') {
                                                    const canvas = map.getCanvas();
                                                    if (canvas && typeof canvas.getContext === 'function') return resolve();
                                                }
                                                if (window.google && window.google.maps && typeof map.getDiv === 'function') {
                                                    const div = map.getDiv();
                                                    if (div) return resolve();
                                                }
                                            }
                                        } catch (e) { /* retry */ }
                                        if (Date.now() - start > timeout) return reject(new Error('provider readiness timeout'));
                                        requestAnimationFrame(check);
                                    }
                                    check();
                                });

                                wait().catch((err) => { console.warn('Directions: provider readiness wait failed', err); });

                                console.log('Directions: creating DirectionsRenderer with padding', { top: padding, bottom: bottomPadding, left: leftPadding, right: padding });
                                directionsRenderer = new window.mapsindoors.directions.DirectionsRenderer({
                                    mapsIndoors: mapsIndoorsInstance,
                                    fitBounds: isKioskContext ? false : true,
                                    ...ROUTE_LINE_STYLE,
                                    fitBoundsPadding: isKioskContext ? undefined : {
                                        top: padding,
                                        bottom: bottomPadding,
                                        left: leftPadding,
                                        right: padding
                                    }
                                });
                            }

                            if (!directionsBackdropRenderer) {
                                directionsBackdropRenderer = new window.mapsindoors.directions.DirectionsRenderer({
                                    mapsIndoors: mapsIndoorsInstance,
                                    fitBounds: false,
                                    ...ROUTE_BACKDROP_STYLE
                                });
                            }

                            try {
                                console.log('Directions: calling directionsRenderer.setRoute');
                                directionsBackdropRenderer.setRoute(directions.directionsResult)
                                    .catch((err) => console.error('Directions: backdrop setRoute rejected', err));
                                directionsRenderer.setRoute(directions.directionsResult)
                                    .then(() => {
                                        console.log('Directions: setRoute resolved, setting step index to 0');
                                        directionsRenderer.setStepIndex(0);
                                    })
                                    .catch((err) => console.error('Directions: setRoute rejected', err));
                            } catch (err) {
                                console.error('Directions: exception while calling setRoute', err);
                            }

                            destinationInfoElement.current.location = directions.destinationLocation;

                            if (directions.destinationLocation.id === 'USER_POSITION') {
                                setDestinationDisplayRule(null)
                            } else {
                                setDestinationDisplayRule(mapsIndoorsInstance.getDisplayRule(directions.destinationLocation));
                            }

                            setMinZoom(null);
                        };

                        createRendererIfNeeded();
                    });
            } catch (err) {
                console.error('Directions: unexpected error creating renderer', err);
            }
        }
    }, [isOpen, directions, mapsIndoorsInstance, travelMode, shuttleBusOn]);


    /**
     * Get bottom padding when getting directions.
     * Calculate all cases depending on the kioskLocation id prop as well.
     */
    function getBottomPadding(padding) {
        return new Promise((resolve) => {
            if (isDesktop) {
                if (kioskLocation) {
                    getDesktopPaddingBottom().then(result => resolve(result));
                } else {
                    resolve(padding);
                }
            } else {
                return getMobilePaddingBottom().then(result => resolve(result));
            }

        });
    }

    /**
     * Get left padding when getting directions.
     * Calculate all cases depending on the kioskLocation id prop as well.
     */
    function getLeftPadding(padding) {
        return new Promise((resolve) => {
            if (isDesktop) {
                if (kioskLocation) {
                    resolve(padding);
                } else {
                    getDesktopPaddingLeft().then(result => resolve(result));
                }
            } else {
                resolve(padding);
            }
        });
    }

    /*
     * Make sure directions stop rendering on the map when the Directions view is not active anymore.
     */
    useEffect(() => {
        if (!isOpen && directionsRenderer) {
            stopRendering();
            setMinZoom(ZoomLevelValues.minZoom);
        }
    }, [isOpen]);


    /**
     * Transform the steps in legs to a flat array of steps.
     */
    function getRouteSteps() {
        if (!directions) {
            return [];
        }

        return directions.directionsResult.legs.reduce((accummulator, leg) => {
            for (const stepIndex in leg.steps) {
                const step = leg.steps[stepIndex];

                accummulator.push(step);
            }
            return accummulator;
        }, []);
    }

    /**
     * Render the next navigation step on the map.
     */
    function onNext() {
        if (directionsRenderer) {
            directionsRenderer.nextStep();
        }
    }

    /**
     * Render the previous navigation step on the map.
     */
    function onPrevious() {
        if (directionsRenderer) {
            directionsRenderer.previousStep();
        }
    }

    /**
     * Stop rendering directions on the map.
     */
    function stopRendering() {
        try {
            directionsRenderer?.setRoute(null);
            directionsBackdropRenderer?.setRoute(null);
        } catch (e) { void e; }
    }

    // Cleanup on unmount: remove route and free renderer
    useEffect(() => {
        return () => {
            try {
                if (directionsRenderer) {
                    directionsRenderer.setRoute(null);
                    directionsRenderer = null;
                }
                if (directionsBackdropRenderer) {
                    directionsBackdropRenderer.setRoute(null);
                    directionsBackdropRenderer = null;
                }
            } catch (e) { void e; }
        };
    }, []);

    /**
     * Reset the substeps to 0 and close the substeps.
     * Set the size of the bottom sheet to fit the content.
     */
    function resetSubsteps() {
        setActiveStep(0);
        setSubstepsOpen(false);
        setSize(snapPoints.FIT);
    }

    /**
     * Sets minZoom for a specific map provider.
     *
     * @param {number} zoomLevel
     */
    function setMinZoom(zoomLevel) {
        if (mapType === 'mapbox') {
            mapsIndoorsInstance.getMapView().getMap().setMinZoom(zoomLevel);
        } else if (mapType === 'google') {
            mapsIndoorsInstance.getMapView().getMap().setOptions({ minZoom: zoomLevel })
        }
    }

    /**
     * Close the directions.
     * Reset the active steps and stop rendering directions.
     */
    function onDirectionsClosed() {
        resetSubsteps();
        stopRendering();
        onBack();

    }

    /**
     * Communicate size change to parent component.
     * @param {number} size
     */
    function setSize(size) {
        if (typeof onSetSize === 'function') {
            onSetSize(size);
        }
    }

    /**
     * Build the QR code link and set the state in order to show the QR code dialog.
     */
    function showQRCode() {
        const qrCodeLink = `${baseShareLink}&directionsFrom=${kioskLocation.id}&directionsTo=${currentLocation.id}`;
        setQRCodeLink(qrCodeLink);
    }

    /**
     * Set the size of the bottom sheet depending on the substepsOpen state.
     */
    useEffect(() => {
        requestAnimationFrameId.current = requestAnimationFrame(() => {// we use a requestAnimationFrame to ensure that the component has been re-rendered with the collapsed or expanded sub steps before we set the size
            substepsOpen ? setSize(snapPoints.MAX) : setSize(snapPoints.FIT);
        });

        return () => {
            if (requestAnimationFrameId.current) {
                cancelAnimationFrame(requestAnimationFrameId.current);
            }
        }
    }, [substepsOpen]);

    /**
     * When user swipes the bottom sheet to a new snap point.
     */
    useEffect(() => {
        if (isOpen && snapPointSwipedByUser) {
            setSubstepsOpen(snapPointSwipedByUser === snapPoints.MAX);
        }
    }, [isOpen, snapPointSwipedByUser]);

    return (
        <div className="directions" style={{ display: !isKioskContext ? 'grid' : 'block' }}>
            <div className="directions__steps">
                <div className="directions__minutes">{totalTime && <mi-time translations={JSON.stringify({ days: t('d'), hours: t('h'), minutes: t('min') })} seconds={totalTime} />}</div>
                <RouteInstructions
                    steps={getRouteSteps()}
                    originLocation={directions?.originLocation}
                    onNextStep={() => onNext()}
                    isOpen={isOpen}
                    onPreviousStep={() => onPrevious()} >
                </RouteInstructions>
            </div>
            {isKioskContext &&
                <>
                    <hr />
                    <div className="directions__kiosk">
                        <Accessibility onAccessibilityChanged={() => resetSubsteps()} />
                        {appConfig?.appSettings?.includeTransitSelection === 'true' && <ShuttleBus/>}
                        <button className="directions__qr-code" onClick={() => showQRCode()} aria-label={t('Scan QR code to view route on phone')}><QRCode />{t('Scan QR code')}</button>
                    </div>
                </>
            }
            <div className="directions__actions">
                <div className="directions__details">
                    {directions?.destinationLocation &&
                        <div className="directions__info">
                            {destinationDisplayRule && directions.destinationLocation.id !== 'USER_POSITION' &&
                                <div className="directions__icon">
                                    <img alt="" src={destinationDisplayRule.icon.src ? destinationDisplayRule.icon.src : destinationDisplayRule.icon} />
                                </div>}
                            <div className="directions__content">
                                <div className="directions__name">
                                    {directions?.destinationLocation.properties.name}
                                </div>
                                <mi-location-info ref={destinationInfoElement} show-external-id={showExternalIDs} />
                            </div>
                        </div>
                    }
                </div>
                {!isDestinationStep ?
                    <button className="directions__cancel" onClick={() => onDirectionsClosed()}>
                        {t('Cancel route')}
                    </button>
                    :
                    <button className="directions__finish" onClick={() => onRouteFinished()} style={{ background: primaryColor }}>
                        {t('Finish route')}
                    </button>
                }
            </div>

        </div>
    )
}

export default Directions;