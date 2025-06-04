// src/components/common/Sidebar.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ activeItem }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useContext(AuthContext);
  const [expanded, setExpanded] = useState(localStorage.getItem('sidebarExpanded') === 'true' || false);
  // Material Design styled SVG Icon components
  const renderIcon = (iconName) => {
    const icons = {
      dashboard: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      users: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ), courses: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
      analytics: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
      ),
      settings: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      messages: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      classroom: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      ),
      assessment: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10,9 9,9 8,9" />
        </svg>
      ),
      collapse: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      ),
      expand: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      ),
      menu: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      ),
      close: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )
    };
    return icons[iconName] || null;
  };  // Role-specific menu items
  const getMenuItems = () => {
    switch (auth.user.role) {
      case 'admin':
        return [
          { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
          { id: 'users', icon: 'users', label: 'Users Management', path: '/users' },
          { id: 'courses', icon: 'courses', label: 'Courses Management', path: '/courses' },
          { id: 'report', icon: 'analytics', label: 'Reports & Analytics', path: '/reports' },
          { id: 'settings', icon: 'settings', label: 'Settings', path: '/settings' },
          { id: 'messages', icon: 'messages', label: 'Messages', path: '/messages' },
        ];
      case 'instructor':
        return [
          { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
          { id: 'courses', icon: 'courses', label: 'Courses', path: '/courses' },
          { id: 'classroom', icon: 'classroom', label: 'Virtual Classroom', path: '/classroom' },
          { id: 'assessment', icon: 'assessment', label: 'Assessment', path: '/assessment' },
          { id: 'messages', icon: 'messages', label: 'Messages', path: '/messages' },
        ];
      case 'student':
        return [
          { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
          { id: 'courses', icon: 'courses', label: 'My Courses', path: '/courses' },
          { id: 'classroom', icon: 'classroom', label: 'Virtual Classroom', path: '/classroom' },
          { id: 'messages', icon: 'messages', label: 'Messages', path: '/messages' },
        ];
      default:
        return [];
    }
  };

  // Apply sidebar state to body class for responsive layout
  useEffect(() => {
    if (expanded) {
      document.body.classList.add('sidebar-expanded');
    } else {
      document.body.classList.remove('sidebar-expanded');
    }

    // Save sidebar state to localStorage
    localStorage.setItem('sidebarExpanded', expanded);
  }, [expanded]);

  // Toggle sidebar expansion
  const toggleSidebar = (e) => {
    // Prevent event from bubbling to parent elements
    e.stopPropagation();
    setExpanded(!expanded);
  };

  // Close sidebar when navigating on mobile
  const handleNavigate = (path) => {
    navigate(path);

    // Only collapse sidebar on navigation if on mobile
    if (window.innerWidth <= 768) {
      setExpanded(false);
    }
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.querySelector('.admin-sidebar');
      const toggleButton = document.querySelector('.sidebar-toggle');

      // Check if click is outside sidebar and toggle button
      if (sidebar &&
        !sidebar.contains(event.target) &&
        toggleButton &&
        !toggleButton.contains(event.target) &&
        expanded &&
        window.innerWidth <= 768) {
        setExpanded(false);
      }
    };

    // Add event listener for clicks anywhere in the document
    document.addEventListener('mousedown', handleClickOutside);

    // When route changes, adjust sidebar on mobile
    if (window.innerWidth <= 768) {
      setExpanded(false);
    }

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expanded, location.pathname]);
  // Get role-specific menu items
  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile toggle button */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {expanded ? renderIcon('close') : renderIcon('menu')}
      </button>

      <div className={`admin-sidebar ${expanded ? 'expanded' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">LMS</span>
          <span className="logo-text">Learning System</span>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((item) => (
              <li
                key={item.id}
                className={activeItem === item.id ? 'active' : ''}
                onClick={() => handleNavigate(item.path)}
              >
                <div className="sidebar-item">
                  <span className="sidebar-icon">
                    {renderIcon(item.icon)}
                  </span>
                  <span className="sidebar-label">{item.label}</span>
                </div>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-item" onClick={toggleSidebar}>
            <span className="sidebar-icon">
              {expanded ? renderIcon('collapse') : renderIcon('expand')}
            </span>
            <span className="sidebar-label">
              {expanded ? 'Collapse Menu' : 'Expand Menu'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;