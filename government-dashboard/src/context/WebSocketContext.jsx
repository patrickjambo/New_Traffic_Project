import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const WebSocketContext = createContext(null);

// Configuration
const SOCKET_URL = 'http://localhost:3000';
const RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

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

    // Join room helper
    const joinRoom = useCallback((roomType, data) => {
        if (socket && isConnected) {
            socket.emit(`join:${roomType}`, data);
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

                // Join role-based room based on user
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        newSocket.emit('join:role', {
                            role: user.role || 'public',
                            userId: user.id
                        });
                    } catch (e) {
                        console.error('Error parsing user for socket room:', e);
                    }
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
                'emergency:new',
                'emergency:update',
                'emergency:alert',
                'emergency:nearby',
                'analysis:complete',
                'notification:new',
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
        }, 25000); // Every 25 seconds

        return () => clearInterval(heartbeat);
    }, [socket, isConnected]);

    const value = {
        socket,
        isConnected,
        connectionStatus,
        subscribe,
        emit,
        joinRoom,
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};

export default WebSocketContext;
