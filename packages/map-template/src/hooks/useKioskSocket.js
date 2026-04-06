import { useEffect, useRef, useState } from 'react';

const WS_URL = import.meta.env.VITE_KIOSK_WS_URL || 'ws://localhost:8080';

export default function useKioskSocket({ onEvent } = {}) {
    const socketRef = useRef(null);
    const [status, setStatus] = useState('connecting');

    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        socketRef.current = ws;

        ws.onopen = () => {
            setStatus('open');
            ws.send(
                JSON.stringify({
                    source: 'ui',
                    type: 'hello',
                    payload: { client: 'map-template' },
                    ts: Date.now(),
                })
            );
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                onEvent?.(msg);
            } catch (err) {
                console.error('Invalid WebSocket message:', err, event.data);
            }
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            setStatus('error');
        };

        ws.onclose = () => {
            setStatus('closed');
        };

        return () => {
            ws.close();
        };
    }, [onEvent]);

    return { status };
}


