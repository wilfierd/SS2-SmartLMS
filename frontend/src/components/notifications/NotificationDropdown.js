// src/components/notifications/NotificationDropdown.js
import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import NotificationItem from './NotificationItem';
import './NotificationDropdown.css';

const NotificationDropdown = ({ onClose }) => {
    const { notifications, loading, fetchNotifications, markAllAsRead } = useNotifications();
    const [activeFilter, setActiveFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications({ limit: 10 });
    }, []);

    const filterNotifications = (notifications, filter) => {
        switch (filter) {
            case 'unread':
                return notifications.filter(n => !n.isRead);
            case 'assignments':
                return notifications.filter(n => n.type === 'assignment_due');
            case 'tests':
                return notifications.filter(n => n.type === 'test_due');
            case 'messages':
                return notifications.filter(n => n.type === 'message_received');
            default:
                return notifications;
        }
    };

    const filteredNotifications = filterNotifications(notifications, activeFilter);

    const handleViewAll = () => {
        navigate('/notifications');
        onClose();
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    const filters = [
        { key: 'all', label: 'All', count: notifications.length },
        { key: 'unread', label: 'Unread', count: notifications.filter(n => !n.isRead).length },
        { key: 'assignments', label: 'Assignments', count: notifications.filter(n => n.type === 'assignment_due').length },
        { key: 'tests', label: 'Tests', count: notifications.filter(n => n.type === 'test_due').length },
        { key: 'messages', label: 'Messages', count: notifications.filter(n => n.type === 'message_received').length },
    ];

    return (
        <div className="notification-dropdown">
            <div className="notification-dropdown-header">
                <h3>Notifications</h3>
                <div className="notification-dropdown-actions">
                    <button
                        onClick={handleMarkAllAsRead}
                        className="mark-all-read-btn"
                        disabled={notifications.filter(n => !n.isRead).length === 0}
                    >
                        Mark all read
                    </button>
                </div>
            </div>

            <div className="notification-filters">
                {filters.map(filter => (
                    <button
                        key={filter.key}
                        className={`filter-btn ${activeFilter === filter.key ? 'active' : ''}`}
                        onClick={() => setActiveFilter(filter.key)}
                    >
                        {filter.label} {filter.count > 0 && <span className="filter-count">({filter.count})</span>}
                    </button>
                ))}
            </div>

            <div className="notification-list">
                {loading ? (
                    <div className="notification-loading">
                        <div className="loading-spinner"></div>
                        Loading notifications...
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="no-notifications">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <p>No notifications to display</p>
                    </div>
                ) : (
                    filteredNotifications.slice(0, 8).map(notification => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            isCompact={true}
                            onClose={onClose}
                        />
                    ))
                )}
            </div>

            <div className="notification-dropdown-footer">
                <button onClick={handleViewAll} className="view-all-btn">
                    View all notifications
                </button>
            </div>
        </div>
    );
};

export default NotificationDropdown;
