// src/components/notifications/NotificationBell.js
import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import NotificationDropdown from './NotificationDropdown';
import './NotificationBell.css';

const NotificationBell = () => {
    const { unreadCount } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const bellRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (bellRef.current && !bellRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="notification-bell" ref={bellRef}>
            <button
                className="notification-bell-button"
                onClick={toggleDropdown}
                aria-label="Notifications"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <NotificationDropdown onClose={() => setIsOpen(false)} />
            )}
        </div>
    );
};

export default NotificationBell;
