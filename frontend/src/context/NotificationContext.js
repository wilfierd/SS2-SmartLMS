// src/context/NotificationContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import notificationService from '../services/notificationService';
import AuthContext from './AuthContext';
import config from '../config';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { auth } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [socket, setSocket] = useState(null);

    // Initialize socket connection
    useEffect(() => {
        if (auth.isAuthenticated && auth.token) {
            const socketInstance = io(`${config.apiUrl}/notifications`, {
                auth: {
                    token: auth.token
                },
                autoConnect: true
            });

            socketInstance.on('connect', () => {
                console.log('Connected to notifications socket');
            });

            socketInstance.on('newNotification', (notification) => {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);

                // Show browser notification if permission granted
                if (Notification.permission === 'granted') {
                    new Notification(notification.title, {
                        body: notification.message,
                        icon: '/favicon.ico'
                    });
                }
            });

            socketInstance.on('unreadCount', (count) => {
                setUnreadCount(count);
            });

            socketInstance.on('notificationUpdated', (updatedNotification) => {
                setNotifications(prev =>
                    prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
                );
            });

            socketInstance.on('notificationDeleted', (notificationId) => {
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
            });

            socketInstance.on('allNotificationsRead', () => {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
            });

            socketInstance.on('allNotificationsDeleted', () => {
                setNotifications([]);
                setUnreadCount(0);
            });

            setSocket(socketInstance);

            return () => {
                socketInstance.disconnect();
            };
        }
    }, [auth.isAuthenticated, auth.token]);

    // Request browser notification permission
    useEffect(() => {
        if (auth.isAuthenticated && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, [auth.isAuthenticated]);

    // Fetch initial notifications
    useEffect(() => {
        if (auth.isAuthenticated) {
            fetchNotifications();
            fetchUnreadCount();
        }
    }, [auth.isAuthenticated]);

    const fetchNotifications = async (filters = {}) => {
        try {
            setLoading(true);
            const data = await notificationService.getNotifications(filters);
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const count = await notificationService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await notificationService.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            await notificationService.deleteNotification(notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));

            // Update unread count if the deleted notification was unread
            const deletedNotification = notifications.find(n => n.id === notificationId);
            if (deletedNotification && !deletedNotification.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const deleteAllNotifications = async () => {
        try {
            await notificationService.deleteAllNotifications();
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Error deleting all notifications:', error);
        }
    };

    const value = {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        socket
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
