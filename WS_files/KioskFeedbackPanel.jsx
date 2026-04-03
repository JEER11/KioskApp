{/* /home/senior/gesture-ui/KioskApp-main/KioskApp/packages/map-template/src/components */}

import { useEffect, useState } from 'react';
import { useKioskSocket } from '../hooks/useKioskSocket';

function KioskFeedbackPanel() {
    const {
        connected,
        lastMessage,
        lastClick,
        serverStatus,
        cursor
    } = useKioskSocket('ws://localhost:8080');

    const [clickCount, setClickCount] = useState(0);
    const [flashClick, setFlashClick] = useState(false);

    useEffect(() => {
        if (!lastClick) {
            return;
        }

        setClickCount((prev) => prev + 1);
        setFlashClick(true);

        const timer = setTimeout(() => {
            setFlashClick(false);
        }, 150);

        return () => clearTimeout(timer);
    }, [lastClick]);

    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    left: `${cursor.x}px`,
                    top: `${cursor.y}px`,
                    width: flashClick ? '24px' : '16px',
                    height: flashClick ? '24px' : '16px',
                    background: flashClick ? '#ff8800' : 'red',
                    border: '2px solid white',
                    borderRadius: '50%',
                    zIndex: 10000,
                    pointerEvents: 'none',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 8px rgba(0,0,0,0.35)'
                }}
            />

            <div
                style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 9999,
                    width: '340px',
                    maxHeight: '70vh',
                    overflow: 'auto',
                    background: 'rgba(255,255,255,0.96)',
                    color: 'black',
                    border: '2px solid red',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
            >
                <h2 style={{ marginTop: 0 }}>Kiosk Panel</h2>

                <p style={{ margin: '0 0 8px 0' }}>
                    <strong>Status:</strong> {connected ? 'Connected' : 'Disconnected'}
                </p>

                <p style={{ margin: '0 0 8px 0' }}>
                    <strong>Gesture clicks:</strong> {clickCount}
                </p>

                <p style={{ margin: '0 0 12px 0' }}>
                    <strong>Cursor:</strong> {cursor.x}, {cursor.y}
                </p>

                <div style={{ marginTop: '12px' }}>
                    <h4 style={{ margin: '0 0 6px 0' }}>Last Message</h4>
                    <pre
                        style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: '12px'
                        }}
                    >
                        {lastMessage ? JSON.stringify(lastMessage, null, 2) : 'No messages yet'}
                    </pre>
                </div>

                <div style={{ marginTop: '12px' }}>
                    <h4 style={{ margin: '0 0 6px 0' }}>Server Status</h4>
                    <pre
                        style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: '12px'
                        }}
                    >
                        {serverStatus ? JSON.stringify(serverStatus, null, 2) : 'No server status yet'}
                    </pre>
                </div>
            </div>
        </>
    );
}

export default KioskFeedbackPanel;

