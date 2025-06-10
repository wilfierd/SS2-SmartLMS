// src/components/notifications/NotificationsPage.js
import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import NotificationItem from './NotificationItem';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import './NotificationsPage.css';

const NotificationsPage = () => {
    const {
        notifications,
        loading,
        fetchNotifications,
        markAllAsRead,
        deleteAllNotifications
    } = useNotifications();

    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedNotifications, setSelectedNotifications] = useState([]);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        loadNotifications();
    }, [activeFilter, currentPage]);

    const loadNotifications = async () => {
        const filters = {
            page: currentPage,
            limit: 20
        };

        if (activeFilter !== 'all') {
            if (activeFilter === 'unread') {
                filters.isRead = false;
            } else {
                filters.type = activeFilter;
            }
        }

        const result = await fetchNotifications(filters);
        if (result && result.total) {
            setTotalPages(Math.ceil(result.total / 20));
        }
    };

    const filterNotifications = (notifications, filter) => {
        switch (filter) {
            case 'unread':
                return notifications.filter(n => !n.isRead);
            case 'assignment_due':
                return notifications.filter(n => n.type === 'assignment_due');
            case 'test_due':
                return notifications.filter(n => n.type === 'test_due');
            case 'message_received':
                return notifications.filter(n => n.type === 'message_received');
            case 'course_update':
                return notifications.filter(n => n.type === 'course_update');
            case 'grade_posted':
                return notifications.filter(n => n.type === 'grade_posted');
            default:
                return notifications;
        }
    };

    const handleSelectAll = () => {
        if (selectedNotifications.length === filteredNotifications.length) {
            setSelectedNotifications([]);
        } else {
            setSelectedNotifications(filteredNotifications.map(n => n.id));
        }
    };

    const handleSelectNotification = (notificationId) => {
        setSelectedNotifications(prev => {
            if (prev.includes(notificationId)) {
                return prev.filter(id => id !== notificationId);
            } else {
                return [...prev, notificationId];
            }
        });
    };

    const handleBulkMarkAsRead = async () => {
        // Implement bulk mark as read for selected notifications
        for (const id of selectedNotifications) {
            // This would need to be implemented in the service
        }
        setSelectedNotifications([]);
        loadNotifications();
    };

    const handleBulkDelete = async () => {
        // Implement bulk delete for selected notifications
        for (const id of selectedNotifications) {
            // This would need to be implemented in the service
        }
        setSelectedNotifications([]);
        loadNotifications();
    };

    const filteredNotifications = filterNotifications(notifications, activeFilter);

    const filters = [
        { key: 'all', label: 'All Notifications', icon: '📋' },
        { key: 'unread', label: 'Unread', icon: '🔔' },
        { key: 'assignment_due', label: 'Assignments', icon: '📝' },
        { key: 'test_due', label: 'Tests', icon: '✅' },
        { key: 'message_received', label: 'Messages', icon: '💬' },
        { key: 'course_update', label: 'Course Updates', icon: '📚' },
        { key: 'grade_posted', label: 'Grades', icon: '⭐' },
    ];

    return (
        <div className="notifications-page">
            <Sidebar activeItem="notifications" />

            <div className="notifications-content">
                <Header title="Notifications" />

                <div className="notifications-container">
                    <div className="notifications-header">
                        <div className="notifications-title">
                            <h2>All Notifications</h2>
                            <span className="notifications-count">
                                {filteredNotifications.length} notifications
                            </span>
                        </div>

                        <div className="notifications-actions">
                            <button
                                onClick={() => setShowBulkActions(!showBulkActions)}
                                className={`bulk-toggle-btn ${showBulkActions ? 'active' : ''}`}
                            >
                                Select
                            </button>

                            <button
                                onClick={markAllAsRead}
                                className="action-btn secondary"
                                disabled={notifications.filter(n => !n.isRead).length === 0}
                            >
                                Mark All Read
                            </button>

                            <button
                                onClick={deleteAllNotifications}
                                className="action-btn danger"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    {showBulkActions && selectedNotifications.length > 0 && (
                        <div className="bulk-actions-bar">
                            <span>{selectedNotifications.length} selected</span>
                            <div className="bulk-actions">
                                <button onClick={handleBulkMarkAsRead} className="bulk-btn">
                                    Mark as Read
                                </button>
                                <button onClick={handleBulkDelete} className="bulk-btn danger">
                                    Delete
                                </button>
                                <button
                                    onClick={() => setSelectedNotifications([])}
                                    className="bulk-btn secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="notifications-filters">
                        {filters.map(filter => (
                            <button
                                key={filter.key}
                                className={`filter-btn ${activeFilter === filter.key ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveFilter(filter.key);
                                    setCurrentPage(1);
                                }}
                            >
                                <span className="filter-icon">{filter.icon}</span>
                                {filter.label}
                                <span className="filter-count">
                                    ({filterNotifications(notifications, filter.key).length})
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="notifications-list">
                        {showBulkActions && (
                            <div className="select-all-row">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                                        onChange={handleSelectAll}
                                    />
                                    <span className="checkmark"></span>
                                    Select All
                                </label>
                            </div>
                        )}

                        {loading ? (
                            <div className="notifications-loading">
                                <div className="loading-spinner"></div>
                                <p>Loading notifications...</p>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="no-notifications">
                                <div className="no-notifications-icon">🔔</div>
                                <h3>No notifications yet</h3>
                                <p>When you receive notifications, they'll appear here.</p>
                            </div>
                        ) : (
                            filteredNotifications.map(notification => (
                                <div key={notification.id} className="notification-row">
                                    {showBulkActions && (
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedNotifications.includes(notification.id)}
                                                onChange={() => handleSelectNotification(notification.id)}
                                            />
                                            <span className="checkmark"></span>
                                        </label>
                                    )}
                                    <NotificationItem
                                        notification={notification}
                                        isCompact={false}
                                    />
                                </div>
                            ))
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="pagination-btn"
                            >
                                Previous
                            </button>

                            <span className="pagination-info">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="pagination-btn"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
