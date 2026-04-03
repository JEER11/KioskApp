// "/home/senior/gesture-ui/KioskApp-main/KioskApp/packages/map-template/src/hooks"

import { useEffect, useRef, useState } from 'react';


export function useKioskSocket(url = 'ws://localhost:8080') {
    const wsRef = useRef(null);

    const [connected, setConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [lastClick, setLastClick] = useState(null);
    const [serverStatus, setServerStatus] = useState(null);
    const [cursor, setCursor] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);

            ws.send(JSON.stringify({
                type: 'register',
                source: 'ui',
                timestamp: Date.now(),
                payload: {
                    role: 'ui',
                    id: 'ui-1'
                }
            }));
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                setLastMessage(msg);

                if (msg.type === 'server.status') {
                    setServerStatus(msg.payload);
                }

                if (msg.type === 'gesture.event' && msg.payload) {
                    if (msg.payload.name === 'move') {
                        setCursor({
                            x: msg.payload.x,
                            y: msg.payload.y
                        });
                    }

                    if (msg.payload.name === 'click') {
                        setLastClick({
                            timestamp: Date.now(),
                            payload: msg.payload
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            setConnected(false);
        };

        return () => {
            ws.close();
        };
    }, [url]);

    return {
        connected,
        lastMessage,
        lastClick,
        serverStatus,
        cursor
    };
}

