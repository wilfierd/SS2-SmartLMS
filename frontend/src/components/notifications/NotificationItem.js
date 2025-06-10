// src/components/notifications/NotificationItem.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../../context/NotificationContext';
import './NotificationItem.css';

const NotificationItem = ({ notification, isCompact = false, onClose }) => {
    const { markAsRead, deleteNotification } = useNotifications();
    const navigate = useNavigate();

    const handleClick = async () => {
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }

        if (notification.actionUrl) {
            navigate(notification.actionUrl);
            if (onClose) onClose();
        }
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        await deleteNotification(notification.id);
    };

    const handleMarkAsRead = async (e) => {
        e.stopPropagation();
        await markAsRead(notification.id);
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'assignment_due':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14,2 14,8 20,8" />
                    </svg>
                );
            case 'test_due':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3l8-8" />
                        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9c1.51 0 2.93.37 4.18 1.03" />
                    </svg>
                );
            case 'message_received':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                );
            case 'course_update':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                );
            case 'grade_posted':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                );
            default:
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                );
        }
    };

    const getPriorityClass = (priority) => {
        switch (priority) {
            case 'urgent':
                return 'priority-urgent';
            case 'high':
                return 'priority-high';
            case 'medium':
                return 'priority-medium';
            case 'low':
                return 'priority-low';
            default:
                return 'priority-medium';
        }
    };

    const formatDate = (date) => {
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true });
        } catch (error) {
            return 'Unknown time';
        }
    };

    return (
        <div
            className={`notification-item ${!notification.isRead ? 'unread' : ''} ${isCompact ? 'compact' : ''} ${getPriorityClass(notification.priority)}`}
            onClick={handleClick}
        >
            <div className="notification-icon">
                {getNotificationIcon(notification.type)}
            </div>

            <div className="notification-content">
                <div className="notification-header">
                    <h4 className="notification-title">{notification.title}</h4>
                    <span className="notification-time">{formatDate(notification.createdAt)}</span>
                </div>

                <p className="notification-message">{notification.message}</p>

                {notification.dueDate && (
                    <div className="notification-due-date">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Due {formatDate(notification.dueDate)}
                    </div>
                )}
            </div>

            <div className="notification-actions">
                {!notification.isRead && !isCompact && (
                    <button
                        className="action-btn mark-read-btn"
                        onClick={handleMarkAsRead}
                        title="Mark as read"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </button>
                )}

                <button
                    className="action-btn delete-btn"
                    onClick={handleDelete}
                    title="Delete notification"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>

            {!notification.isRead && <div className="unread-indicator"></div>}
        </div>
    );
};

export default NotificationItem;
