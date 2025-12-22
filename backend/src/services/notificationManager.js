/**
 * Notification Manager - Unified Notification System
 * Handles creating notifications in DB and pushing via WebSocket
 */

const { query } = require('../config/database');
const socketManager = require('./socketManager');

class NotificationManager {
    /**
     * Create a notification for a specific user
     * Saves to database and emits via WebSocket
     */
    async createNotification(userId, { title, message, type = 'general', incidentId = null, emergencyId = null }) {
        try {
            // Insert into database
            const result = await query(
                `INSERT INTO notifications (user_id, title, message, type, incident_id)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, user_id, title, message, type, is_read, created_at`,
                [userId, title, message, type, incidentId]
            );

            const notification = result.rows[0];

            // Emit via WebSocket for instant delivery
            socketManager.emitNotificationToUser(userId, notification);

            return notification;
        } catch (error) {
            console.error('❌ Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Create notifications for all users with a specific role
     */
    async createNotificationForRole(role, { title, message, type = 'general', incidentId = null }) {
        try {
            // Get all users with the specified role
            const usersResult = await query(
                'SELECT id FROM users WHERE role = $1 AND is_active = true',
                [role]
            );

            const notifications = [];

            for (const user of usersResult.rows) {
                const notification = await this.createNotification(user.id, {
                    title,
                    message,
                    type,
                    incidentId,
                });
                notifications.push(notification);
            }

            // Also emit to role room for clients that may not have user-specific rooms
            socketManager.emitNotificationToRole(role, {
                id: Date.now(), // Temporary ID for role-broadcast
                title,
                message,
                type,
                created_at: new Date().toISOString(),
            });

            console.log(`📨 Created ${notifications.length} notifications for role: ${role}`);
            return notifications;
        } catch (error) {
            console.error(`❌ Error creating notifications for role ${role}:`, error);
            throw error;
        }
    }

    /**
     * Create notifications for police and admin users (common pattern)
     */
    async notifyPoliceAndAdmin({ title, message, type = 'alert', incidentId = null }) {
        const policeNotifications = await this.createNotificationForRole('police', { title, message, type, incidentId });
        const adminNotifications = await this.createNotificationForRole('admin', { title, message, type, incidentId });

        return [...policeNotifications, ...adminNotifications];
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId = null) {
        try {
            let queryText = 'UPDATE notifications SET is_read = true WHERE id = $1';
            const params = [notificationId];

            // If userId provided, ensure user owns the notification
            if (userId) {
                queryText += ' AND user_id = $2';
                params.push(userId);
            }

            queryText += ' RETURNING *';

            const result = await query(queryText, params);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
            throw error;
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        try {
            await query(
                'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
                [userId]
            );
            return { success: true };
        } catch (error) {
            console.error('❌ Error marking all notifications as read:', error);
            throw error;
        }
    }

    /**
     * Get unread notification count for a user
     */
    async getUnreadCount(userId) {
        try {
            const result = await query(
                'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
                [userId]
            );
            return parseInt(result.rows[0].count, 10);
        } catch (error) {
            console.error('❌ Error getting unread count:', error);
            return 0;
        }
    }

    /**
     * Broadcast a system-wide notification (no database, just WebSocket)
     */
    broadcastSystemAlert({ title, message, type = 'system' }) {
        socketManager.emitNotificationBroadcast({
            id: `system-${Date.now()}`,
            title,
            message,
            type,
            created_at: new Date().toISOString(),
        });
    }
}

// Export singleton instance
const notificationManager = new NotificationManager();
module.exports = notificationManager;
