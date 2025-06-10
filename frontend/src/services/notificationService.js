// src/services/notificationService.js
import axios from 'axios';
import config from '../config';

const API_URL = config.apiUrl;

class NotificationService {
    // Fetch notifications for the current user
    async getNotifications(filters = {}) {
        try {
            const response = await axios.get(`${API_URL}/notifications`, {
                params: filters,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }

    // Get unread notifications count
    async getUnreadCount() {
        try {
            const response = await axios.get(`${API_URL}/notifications/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.data.unreadCount;
        } catch (error) {
            console.error('Error fetching unread count:', error);
            throw error;
        }
    }    // Mark notification as read
    async markAsRead(notificationId) {
        try {
            const response = await axios.patch(`${API_URL}/notifications/${notificationId}/read`, {}, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    // Mark all notifications as read
    async markAllAsRead() {
        try {
            const response = await axios.patch(`${API_URL}/notifications/mark-all-read`, {}, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }    // Delete notification
    async deleteNotification(notificationId) {
        try {
            const response = await axios.delete(`${API_URL}/notifications/${notificationId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    // Delete all notifications
    async deleteAllNotifications() {
        try {
            const response = await axios.delete(`${API_URL}/notifications`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error deleting all notifications:', error);
            throw error;
        }
    }    // Create a notification (for admins/instructors)
    async createNotification(notificationData) {
        try {
            const response = await axios.post(`${API_URL}/notifications`, notificationData, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }
}

export default new NotificationService();
