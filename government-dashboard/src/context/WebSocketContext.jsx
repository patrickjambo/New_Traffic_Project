import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const WebSocketContext = createContext(null);

// Configuration - Hardened for persistent real-time connections
const SOCKET_URL = 'http://localhost:3000';
const RECONNECT_ATTEMPTS = Infinity; // NEVER give up reconnecting
const INITIAL_RECONNECT_DELAY = 500; // Faster initial reconnect
const MAX_RECONNECT_DELAY = 5000; // Cap at 5 seconds (more aggressive)

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    // Return safe defaults if context is not available (prevents crashes)
    if (!context) {
        return {
            socket: null,
            isConnected: false,
            connectionStatus: 'disconnected',
            subscribe: () => () => { },
            emit: () => { },
            joinRoom: () => { },
            onReconnect: () => () => { },
        };
    }
    return context;
};

export const WebSocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
    const reconnectAttempts = useRef(0);
    const reconnectTimeout = useRef(null);
    const eventSubscribers = useRef(new Map());
    const pendingJoins = useRef([]); // [{roomType, data}]
    const joinedRooms = useRef(new Set());
    const pendingEmits = useRef([]); // [{eventName, data}]
    const socketRef = useRef(null); // Keep socket ref for visibility change handler
    const reconnectCallbacks = useRef(new Set()); // Callbacks to run after reconnect

    // Subscribe to socket events
    const subscribe = useCallback((eventName, callback) => {
        if (!eventSubscribers.current.has(eventName)) {
            eventSubscribers.current.set(eventName, new Set());
        }
        eventSubscribers.current.get(eventName).add(callback);

        // Return unsubscribe function
        return () => {
            const subscribers = eventSubscribers.current.get(eventName);
            if (subscribers) {
                subscribers.delete(callback);
            }
        };
    }, []);

    // Emit event wrapper
    const emit = useCallback((eventName, data) => {
        if (socket && isConnected) {
            socket.emit(eventName, data);
        } else {
            console.warn('⚠️ Cannot emit event: Socket not connected');
        }
    }, [socket, isConnected]);

    // Enhanced emit: queue events when offline and flush on next connect
    const enhancedEmit = useCallback((eventName, data) => {
        if (socket && isConnected) {
            socket.emit(eventName, data);
        } else {
            console.warn('⚠️ Socket offline — queuing emit:', eventName);
            pendingEmits.current.push({ eventName, data });
        }
    }, [socket, isConnected]);

    // Register a callback to run when connection is restored (for data refresh)
    const onReconnect = useCallback((callback) => {
        reconnectCallbacks.current.add(callback);
        return () => reconnectCallbacks.current.delete(callback);
    }, []);

    // Join room helper
    const joinRoom = useCallback((roomType, data) => {
        const key = `${roomType}:${data && data.userId ? data.userId : JSON.stringify(data || {})}`;
        // Record requested join so we can re-join after reconnects
        if (!joinedRooms.current.has(key)) joinedRooms.current.add(key);

        if (socket && isConnected) {
            socket.emit(`join:${roomType}`, data);
        } else {
            // Queue join for when socket connects
            pendingJoins.current.push({ roomType, data, key });
        }
    }, [socket, isConnected]);

    // Initialize socket connection
    useEffect(() => {
        const connectSocket = () => {
            setConnectionStatus('connecting');

            const newSocket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: RECONNECT_ATTEMPTS,
                reconnectionDelay: INITIAL_RECONNECT_DELAY,
                reconnectionDelayMax: MAX_RECONNECT_DELAY,
                timeout: 15000,
                forceNew: false,
                autoConnect: true,
            });

            socketRef.current = newSocket;

            // Connection established
            newSocket.on('connect', () => {
                console.log('✅ WebSocket connected:', newSocket.id);
                setIsConnected(true);
                setConnectionStatus('connected');
                const wasReconnect = reconnectAttempts.current > 0;
                reconnectAttempts.current = 0;

                // Join role-based room based on user (and flush any pending joins/emits)
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        const joinData = { role: user.role || 'public', userId: user.id, districtId: user.districtId || null };
                        // Use joinRoom helper so it records the join key
                        joinRoom('role', joinData);
                    } catch (e) {
                        console.error('Error parsing user for socket room:', e);
                    }
                }

                // Flush any queued joins
                if (pendingJoins.current.length > 0) {
                    pendingJoins.current.forEach(({ roomType, data }) => {
                        try { newSocket.emit(`join:${roomType}`, data); } catch (e) { /* ignore */ }
                    });
                    pendingJoins.current = [];
                }

                // Flush any queued emits
                if (pendingEmits.current.length > 0) {
                    pendingEmits.current.forEach(({ eventName, data }) => {
                        try { newSocket.emit(eventName, data); } catch (e) { /* ignore */ }
                    });
                    pendingEmits.current = [];
                }

                // Re-join all previously joined rooms (survives reconnects)
                joinedRooms.current.forEach(key => {
                    const [roomType, ...rest] = key.split(':');
                    try {
                        const data = JSON.parse(rest.join(':'));
                        newSocket.emit(`join:${roomType}`, data);
                    } catch (e) {
                        // Fallback: re-join role room from user
                        const userStr2 = localStorage.getItem('user');
                        if (userStr2) {
                            try {
                                const u = JSON.parse(userStr2);
                                newSocket.emit(`join:${roomType}`, { role: u.role, userId: u.id, districtId: u.districtId || null });
                            } catch (e2) { /* ignore */ }
                        }
                    }
                });

                // Fire reconnect callbacks so pages can refresh their data
                if (wasReconnect) {
                    console.log('🔄 Reconnected — firing data refresh callbacks...');
                    reconnectCallbacks.current.forEach(cb => {
                        try { cb(); } catch (e) { console.error('Reconnect callback error:', e); }
                    });
                }
            });

            // Connection lost
            newSocket.on('disconnect', (reason) => {
                console.log('❌ WebSocket disconnected:', reason);
                setIsConnected(false);
                setConnectionStatus('disconnected');

                // Always try to reconnect regardless of reason
                if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
                    setTimeout(() => {
                        if (!newSocket.connected) {
                            console.log('🔄 Force reconnecting after disconnect...');
                            newSocket.connect();
                        }
                    }, 1000);
                }
            });

            // Connection error
            newSocket.on('connect_error', (error) => {
                console.log('⚠️ WebSocket connection error:', error.message);
                setConnectionStatus('error');
                reconnectAttempts.current++;
            });

            // Reconnection attempt
            newSocket.on('reconnect_attempt', (attempt) => {
                console.log(`🔄 Reconnection attempt ${attempt}/${RECONNECT_ATTEMPTS}`);
                setConnectionStatus('connecting');
            });

            // Reconnection successful
            newSocket.on('reconnect', (attempt) => {
                console.log(`✅ Reconnected on attempt ${attempt}`);
                toast.success('Connection restored', { icon: '🔌' });
            });

            // Reconnection failed — but we NEVER give up, schedule manual retry
            newSocket.on('reconnect_failed', () => {
                console.log('⚠️ Auto-reconnection exhausted, scheduling manual retry...');
                setConnectionStatus('error');
                // Manual retry after 5 seconds — never stop trying
                setTimeout(() => {
                    if (!newSocket.connected) {
                        console.log('🔄 Manual reconnection attempt...');
                        newSocket.connect();
                    }
                }, 5000);
            });

            // Setup event forwarding to subscribers
            const forwardEvent = (eventName) => {
                newSocket.on(eventName, (data) => {
                    const subscribers = eventSubscribers.current.get(eventName);
                    if (subscribers) {
                        subscribers.forEach(callback => callback(data));
                    }
                });
            };

            // Forward all standardized events
            const events = [
                'incident:new',
                'incident:update',
                'incident:alert',
                'incident:resolved',
                'emergency:new',
                'emergency:update',
                'emergency:alert',
                'emergency:alarm',
                'emergency:nearby',
                'emergency:accepted',
                'emergency:officer_response',
                'emergency:status_change',
                'emergency:status_changed',
                'emergency:resolved',
                'analysis:complete',
                'notification:new',
                'deployment:new',
                'deployment:update',
                'deployment:assigned',
                'deployment:acknowledged',
                'deployment:officer_status',
                'officer:assigned',
                'officer:location',
                'officer:online',
                'officer:offline',
                'officer:duty_status',
                'officer:status_changed',
                'ai:incident_detected',
                'incident_update',
                'pong',
            ];
            events.forEach(forwardEvent);

            setSocket(newSocket);
        };

        connectSocket();

        // Reconnect when tab becomes visible again (user switches back to dashboard)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const currentSocket = socketRef.current;
                if (currentSocket && !currentSocket.connected) {
                    console.log('👁️ Tab visible again — reconnecting WebSocket...');
                    currentSocket.connect();
                } else if (currentSocket && currentSocket.connected) {
                    // Tab is back — fire reconnect callbacks to refresh stale data
                    console.log('👁️ Tab visible — refreshing data...');
                    reconnectCallbacks.current.forEach(cb => {
                        try { cb(); } catch (e) { console.error('Visibility refresh error:', e); }
                    });
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Also reconnect on network recovery
        const handleOnline = () => {
            const currentSocket = socketRef.current;
            if (currentSocket && !currentSocket.connected) {
                console.log('🌐 Network online — reconnecting WebSocket...');
                setTimeout(() => currentSocket.connect(), 1000);
            }
        };
        window.addEventListener('online', handleOnline);

        // Cleanup on unmount
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Heartbeat to keep connection alive + detect zombie connections
    useEffect(() => {
        if (!socket || !isConnected) return;

        let missedPongs = 0;
        const pongHandler = () => { missedPongs = 0; };
        socket.on('pong', pongHandler);

        const heartbeat = setInterval(() => {
            if (socket.connected) {
                socket.emit('ping');
                missedPongs++;
                // If we missed 3 consecutive pongs, connection is probably dead
                if (missedPongs >= 3) {
                    console.log('💀 Missed 3 pongs — forcing reconnect...');
                    missedPongs = 0;
                    socket.disconnect();
                    setTimeout(() => socket.connect(), 500);
                }
            } else {
                // Socket thinks it's connected but isn't — force reconnect
                console.log('⚠️ Heartbeat: socket not connected, forcing reconnect...');
                socket.connect();
            }
        }, 10000); // Every 10 seconds (tighter heartbeat)

        return () => {
            clearInterval(heartbeat);
            socket.off('pong', pongHandler);
        };
    }, [socket, isConnected]);

    const value = {
        socket,
        isConnected,
        connectionStatus,
        subscribe,
        emit: enhancedEmit,
        joinRoom,
        onReconnect,
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};

export default WebSocketContext;
