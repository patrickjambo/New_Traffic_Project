import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const WebSocketContext = createContext(null);

// Configuration - Optimized for real-time performance
const SOCKET_URL = 'http://localhost:3000';
const RECONNECT_ATTEMPTS = 20;
const INITIAL_RECONNECT_DELAY = 500; // Faster initial reconnect
const MAX_RECONNECT_DELAY = 10000; // Cap at 10 seconds

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
                timeout: 10000,
            });

            // Connection established
            newSocket.on('connect', () => {
                console.log('✅ WebSocket connected:', newSocket.id);
                setIsConnected(true);
                setConnectionStatus('connected');
                reconnectAttempts.current = 0;

                // Join role-based room based on user (and flush any pending joins/emits)
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        const joinData = { role: user.role || 'public', userId: user.id };
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
            });

            // Connection lost
            newSocket.on('disconnect', (reason) => {
                console.log('❌ WebSocket disconnected:', reason);
                setIsConnected(false);
                setConnectionStatus('disconnected');

                if (reason === 'io server disconnect') {
                    // Server initiated disconnect, try to reconnect
                    newSocket.connect();
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

            // Reconnection failed
            newSocket.on('reconnect_failed', () => {
                console.log('❌ Reconnection failed');
                setConnectionStatus('error');
                toast.error('Unable to connect to server. Please refresh the page.');
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
                'pong',
            ];
            events.forEach(forwardEvent);

            setSocket(newSocket);
        };

        connectSocket();

        // Cleanup on unmount
        return () => {
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    // Heartbeat to keep connection alive
    useEffect(() => {
        if (!socket || !isConnected) return;

        const heartbeat = setInterval(() => {
            socket.emit('ping');
        }, 15000); // Every 15 seconds (faster heartbeat to improve liveness)

        return () => clearInterval(heartbeat);
    }, [socket, isConnected]);

    const value = {
        socket,
        isConnected,
        connectionStatus,
        subscribe,
        emit: enhancedEmit,
        joinRoom,
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};

export default WebSocketContext;
