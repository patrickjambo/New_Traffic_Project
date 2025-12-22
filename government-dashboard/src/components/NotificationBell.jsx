import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useWebSocket } from '../context/WebSocketContext';

/**
 * NotificationBell - Real-time notification component
 * Shows unread count badge and dropdown with recent notifications
 */
const NotificationBell = () => {
    const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useData();
    const { isConnected, connectionStatus } = useWebSocket();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format timestamp
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'incident_alert':
            case 'alert':
                return '🚨';
            case 'emergency':
            case 'new_emergency':
                return '🆘';
            case 'status_update':
                return '📋';
            case 'analysis':
                return '🤖';
            case 'system':
                return '⚙️';
            default:
                return '🔔';
        }
    };

    // Connection status indicator
    const ConnectionIndicator = () => (
        <span
            className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}
            title={connectionStatus}
        >
            <span className="connection-dot" style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                display: 'inline-block',
                marginRight: '4px',
                backgroundColor: isConnected ? '#10b981' : '#ef4444',
                animation: connectionStatus === 'connecting' ? 'pulse 1s infinite' : 'none',
            }} />
        </span>
    );

    return (
        <div className="notification-bell" ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
                <ConnectionIndicator />
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'bounce 0.5s ease',
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    marginTop: '8px',
                    width: '360px',
                    maxHeight: '480px',
                    background: 'rgba(30, 41, 59, 0.98)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                    zIndex: 1000,
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>
                            Notifications
                            {unreadCount > 0 && (
                                <span style={{
                                    marginLeft: '8px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                }}>
                                    {unreadCount} new
                                </span>
                            )}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllNotificationsRead}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#60a5fa',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div style={{
                        maxHeight: '380px',
                        overflowY: 'auto',
                    }}>
                        {notifications.length === 0 ? (
                            <div style={{
                                padding: '40px 20px',
                                textAlign: 'center',
                                color: 'rgba(255, 255, 255, 0.5)',
                            }}>
                                <span style={{ fontSize: '40px' }}>🔔</span>
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.slice(0, 10).map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.is_read && markNotificationRead(notification.id)}
                                    style={{
                                        padding: '14px 16px',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                        cursor: notification.is_read ? 'default' : 'pointer',
                                        background: notification.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => !notification.is_read && (e.target.style.background = 'rgba(59, 130, 246, 0.15)')}
                                    onMouseLeave={(e) => e.target.style.background = notification.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.1)'}
                                >
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <span style={{ fontSize: '24px' }}>
                                            {getNotificationIcon(notification.type)}
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                color: 'white',
                                                fontWeight: notification.is_read ? 'normal' : '600',
                                                fontSize: '14px',
                                                marginBottom: '4px',
                                            }}>
                                                {notification.title}
                                            </div>
                                            <div style={{
                                                color: 'rgba(255, 255, 255, 0.6)',
                                                fontSize: '13px',
                                                lineHeight: '1.4',
                                            }}>
                                                {notification.message}
                                            </div>
                                            <div style={{
                                                color: 'rgba(255, 255, 255, 0.4)',
                                                fontSize: '12px',
                                                marginTop: '6px',
                                            }}>
                                                {formatTime(notification.created_at)}
                                            </div>
                                        </div>
                                        {!notification.is_read && (
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#3b82f6',
                                                flexShrink: 0,
                                                marginTop: '6px',
                                            }} />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 10 && (
                        <div style={{
                            padding: '12px',
                            textAlign: 'center',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        }}>
                            <button style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#60a5fa',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}>
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default NotificationBell;
