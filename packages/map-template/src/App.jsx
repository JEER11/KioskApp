/* eslint-disable react/prop-types */
import './App.css';
import { useCallback, useRef, useState } from 'react';
import MapsIndoorsMap from './components/MapsIndoorsMap/MapsIndoorsMap';
import WeatherHeader from './components/WeatherHeader/WeatherHeader';
import useKioskSocket from './hooks/useKioskSocket';

function KioskFeedbackPanel({ status, lastEvent }) {
    return (
        <div
            style={{
                position: 'fixed',
                top: '12px',
                right: '12px',
                zIndex: 99999,
                background: 'rgba(0, 0, 0, 0.72)',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: '8px',
                minWidth: '220px',
                fontSize: '14px',
                lineHeight: 1.4,
                pointerEvents: 'none',
            }}
        >
            <div>
                <strong>WebSocket:</strong> {status}
            </div>

            {lastEvent ? (
                <>
                    <div style={{ marginTop: '8px' }}>
                        <strong>Source:</strong> {lastEvent.source || 'unknown'}
                    </div>
                    <div>
                        <strong>Type:</strong> {lastEvent.type || 'unknown'}
                    </div>
                    {lastEvent.payload && (
                        <div style={{ marginTop: '6px', fontSize: '12px' }}>
                            {JSON.stringify(lastEvent.payload)}
                        </div>
                    )}
                </>
            ) : (
                <div style={{ marginTop: '8px' }}>No events received yet</div>
            )}
        </div>
    );
}

function GestureCursor({ cursor }) {
    if (!cursor.visible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                left: `${cursor.x}px`,
                top: `${cursor.y}px`,
                width: '20px',
                height: '20px',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: cursor.dragging
                    ? 'rgba(255, 80, 80, 0.95)'
                    : 'rgba(0, 200, 255, 0.95)',
                border: '2px solid #ffffff',
                boxShadow: '0 0 10px rgba(0,0,0,0.45)',
                zIndex: 100000,
                pointerEvents: 'none',
            }}
        />
    );
}

function getPointFromPayload(payload) {
    if (typeof payload?.x === 'number' && typeof payload?.y === 'number') {
        return { x: payload.x, y: payload.y };
    }

    return null;
}

function fireMouseEvent(type, x, y, targetOverride = null) {
    const target = targetOverride || document.elementFromPoint(x, y);
    if (!target) return null;

    const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1,
        view: window,
    });

    target.dispatchEvent(event);
    return target;
}

function fireClickAt(x, y) {
    const target = document.elementFromPoint(x, y);
    if (!target) return;

    fireMouseEvent('pointerdown', x, y, target);
    fireMouseEvent('mousedown', x, y, target);
    fireMouseEvent('pointerup', x, y, target);
    fireMouseEvent('mouseup', x, y, target);
    fireMouseEvent('click', x, y, target);
}

function findSearchInput() {
    return (
        document.querySelector('input[type="search"]') ||
        document.querySelector('input[placeholder*="Search" i]') ||
        document.querySelector('input[placeholder*="search" i]') ||
        document.querySelector('input[type="text"]')
    );
}

function setNativeInputValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
    )?.set;

    valueSetter?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

function submitSearchQuery(query) {
    if (!query) return;

    const input = findSearchInput();

    if (!input) {
        console.log('No search input found for query:', query);
        return;
    }

    console.log('Submitting map search:', query);

    input.focus();
    setNativeInputValue(input, query);

    input.dispatchEvent(
        new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
        })
    );

    input.dispatchEvent(
        new KeyboardEvent('keyup', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
        })
    );
}

function fireWheelZoom(deltaY) {
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    const target = document.elementFromPoint(x, y);

    if (!target) return;

    const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        deltaY,
    });

    target.dispatchEvent(event);
}

function VoiceStatusBar({ state, text }) {
    const getLabel = () => {
        switch (state) {
            case 'listening': return 'Listening...';
            case 'recording': return 'Recording...';
            case 'transcribing': return 'Processing speech...';
            case 'thinking': return 'Thinking...';
            case 'speaking': return 'Speaking...';
            case 'calibrating': return 'Calibrating...';
            case 'awake': return 'Wake word detected';
            case 'idle':
            default:
                return 'Say "Hey Kiosk"';
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 99999,

                background: 'rgba(0, 0, 0, 0.75)',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '10px',

                minWidth: '280px',
                maxWidth: '600px',

                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',

                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(6px)',
                pointerEvents: 'none',
            }}
        >
            <div style={{ fontWeight: 600, fontSize: '16px' }}>
                {getLabel()}
            </div>

            {text && state !== 'idle' && (
                <div
                    style={{
                        marginTop: '6px',
                        fontSize: '13px',
                        opacity: 0.85,
                        textAlign: 'center',
                        maxWidth: '520px',
                        wordWrap: 'break-word',
                    }}
                >
                    {text}
                </div>
            )}
        </div>
    );
}


function App() {
    const [lastEvent, setLastEvent] = useState(null);
    
    const [voiceState, setVoiceState] = useState('idle');
    const [voiceText, setVoiceText] = useState('Say Hey Kiosk');
    
    const [cursor, setCursor] = useState({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        visible: false,
        dragging: false,
    });

    const dragTargetRef = useRef(null);
    const draggingDomRef = useRef(false);

    const handleSpeechResponse = useCallback((msg) => {
        const payload = msg?.payload || {};

        const query =
            payload.target_name ||
            payload.target_key ||
            payload.query ||
            payload.transcript;

        console.log('Speech response payload:', payload);
        console.log('Voice map query:', query);

        if (!query) return;

        if (payload.map_action === 'show_location') {
            submitSearchQuery(query);
        }


// ADD THIS BLOCK ABOVE route_to_location

        if (payload.map_action === 'show_restrooms') {
            console.log('Voice: show restrooms');

            window.dispatchEvent(
                new CustomEvent('voice-show-restrooms')
            );
            return;
        }

        if (payload.map_action === 'show_parking') {
            console.log('Voice: show parking');

            window.dispatchEvent(
                new CustomEvent('voice-show-parking')
            );
            return;
        }

        if (payload.map_action === 'route_to_location') {
            submitSearchQuery(query);

            /*
             * This currently searches/selects the location.
             * To draw an actual route, MapsIndoorsMap.jsx needs to expose
             * or listen for a route command.
             */
        window.dispatchEvent(
            new CustomEvent('voice-route-request', {
                detail: {
                    action: 'route_to_location',
                    query,
                    targetName: payload.target_name,
                    targetKey: payload.target_key,
                    locationText: payload.location_text,
                    transcript: payload.transcript,
                },
            })
        );

        }
    }, []);

    const handleSocketEvent = useCallback(
        (msg) => {
            setLastEvent(msg);

            const payload = msg?.payload || {};
            const point = getPointFromPayload(payload);

            switch (msg.type) {
                case 'cursor':
                case 'move_cursor':
                    if (point) {
                        setCursor((prev) => ({
                            ...prev,
                            x: point.x,
                            y: point.y,
                            visible: true,
                        }));
                    }
                    break;

                case 'click':
                    if (point) {
                        setCursor((prev) => ({
                            ...prev,
                            x: point.x,
                            y: point.y,
                            visible: true,
                            dragging: false,
                        }));

                        fireClickAt(point.x, point.y);
                    }
                    break;

                case 'drag_start':
                    if (point) {
                        setCursor((prev) => ({
                            ...prev,
                            x: point.x,
                            y: point.y,
                            visible: true,
                            dragging: true,
                        }));

                        const target = document.elementFromPoint(point.x, point.y);
                        dragTargetRef.current = target;
                        draggingDomRef.current = true;

                        fireMouseEvent('pointerdown', point.x, point.y, target);
                        fireMouseEvent('mousedown', point.x, point.y, target);
                    }
                    break;

                case 'drag':
                    if (point) {
                        setCursor((prev) => ({
                            ...prev,
                            x: point.x,
                            y: point.y,
                            visible: true,
                            dragging: true,
                        }));

                        if (draggingDomRef.current) {
                            fireMouseEvent(
                                'pointermove',
                                point.x,
                                point.y,
                                dragTargetRef.current
                            );
                            fireMouseEvent(
                                'mousemove',
                                point.x,
                                point.y,
                                dragTargetRef.current
                            );
                        }
                    }
                    break;

                case 'drag_end':
                    if (point) {
                        setCursor((prev) => ({
                            ...prev,
                            x: point.x,
                            y: point.y,
                            visible: true,
                            dragging: false,
                        }));

                        if (draggingDomRef.current) {
                            fireMouseEvent(
                                'pointerup',
                                point.x,
                                point.y,
                                dragTargetRef.current
                            );
                            fireMouseEvent(
                                'mouseup',
                                point.x,
                                point.y,
                                dragTargetRef.current
                            );
                        }
                    } else {
                        setCursor((prev) => ({
                            ...prev,
                            dragging: false,
                        }));
                    }

                    draggingDomRef.current = false;
                    dragTargetRef.current = null;
                    break;

                case 'command':
                    console.log('Speech command:', payload);

                    if (payload.intent === 'search' && payload.query) {
                        submitSearchQuery(payload.query);
                    } else if (payload.intent === 'route_to' && payload.query) {
                        submitSearchQuery(payload.query);
                    } else if (payload.intent === 'zoom_in') {
                        fireWheelZoom(-250);
                    } else if (payload.intent === 'zoom_out') {
                        fireWheelZoom(250);
                    } else if (payload.intent === 'reset_view') {
                        window.location.reload();
                    }
                    break;

                case 'speech.intent':
                    console.log('Speech intent:', payload);

                    if (payload.intent === 'search' && payload.query) {
                        submitSearchQuery(payload.query);
                    } else if (payload.intent === 'route_to' && payload.query) {
                        submitSearchQuery(payload.query);
                    } else if (payload.intent === 'answer_question') {
                        console.log('Answer only:', payload.response);
                    }
                    break;

                case 'response':
                    if (msg.source === 'speech') {
                        handleSpeechResponse(msg);
                    }
                    break;

                case 'transcript':
                    console.log('Speech transcript:', payload.text);
                    break;

                case 'status':
                    console.log('Speech status:', payload);
                    setVoiceState(payload.state || 'idle');
                    setVoiceText(payload.text || '');
                    break;

                case 'wake':
                    console.log('Wake word detected:', payload);
                    break;

                case 'pipeline_metrics':
                    console.log('Pipeline metrics:', payload);
                    break;

                default:
                    break;
            }
        },
        [handleSpeechResponse]
    );

    const { status } = useKioskSocket({ onEvent: handleSocketEvent });

    return (
        <div className="app">
            <WeatherHeader
                location={{ lat: 40.7420, lon: -74.1780 }}
                apiKey={import.meta.env.VITE_OPENWEATHER_API_KEY}
            />

            <MapsIndoorsMap
                supportsUrlParameters={true}
                apiKey={import.meta.env.VITE_MAPSINDOORS_API_KEY}
                venue={import.meta.env.VITE_VENUE || ''}
                gmApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                useMapProviderModule={false}
                logo={'/Loading.png'}
                primaryColor={'#C00000'}
                center={import.meta.env.VITE_CENTER ?? '-74.1780,40.7420'}
                startZoomLevel={18}
                searchExternalLocations={false}
                showRoadNames={true}
                showMapMarkers={true}
                mapboxMapStyle={'mapbox://styles/mapbox/streets-v12'}
            />


            <VoiceStatusBar state={voiceState} text={voiceText} />
            <KioskFeedbackPanel status={status} lastEvent={lastEvent} />
            <GestureCursor cursor={cursor} />
        </div>
    );
}

export default App;
