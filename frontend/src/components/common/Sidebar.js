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
  
  // Role-specific menu items
  const getMenuItems = () => {
    switch (auth.user.role) {
      case 'admin':
        return [
          { id: 'dashboard', icon: '⬜', label: 'Dashboard', path: '/dashboard' },
          { id: 'users', icon: '👤', label: 'Users Management', path: '/users' },
          { id: 'courses', icon: '📚', label: 'Courses Management', path: '/courses' },
          { id: 'report', icon: '📊', label: 'Reports & Analytics', path: '/reports' },
          { id: 'settings', icon: '⚙️', label: 'Settings', path: '/settings' },
          { id: 'messages', icon: '✉️', label: 'Messages', path: '/messages' },
        ];
      case 'instructor':
        return [
          { id: 'dashboard', icon: '⬜', label: 'Dashboard', path: '/dashboard' },
          { id: 'courses', icon: '📚', label: 'Courses', path: '/courses' },
          { id: 'classroom', icon: '🎦', label: 'Virtual Classroom', path: '/classroom' },
          { id: 'assessment', icon: '📝', label: 'Assessment', path: '/assessment' },
          { id: 'messages', icon: '✉️', label: 'Messages', path: '/messages' },
        ];
      case 'student':
        return [
          { id: 'dashboard', icon: '⬜', label: 'Dashboard', path: '/dashboard' },
          { id: 'courses', icon: '📚', label: 'My Courses', path: '/courses' },
          { id: 'classroom', icon: '🎦', label: 'Virtual Classroom', path: '/classroom' },
          { id: 'messages', icon: '✉️', label: 'Messages', path: '/messages' },
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

  // Determine appropriate label based on user role
  let roleLabel = 'Admin';
  if (auth.user.role === 'instructor') roleLabel = 'Instructor';
  if (auth.user.role === 'student') roleLabel = 'Student';

  return (
    <>
      {/* Mobile toggle button */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {expanded ? '✕' : '☰'}
      </button>
      
      <div className={`admin-sidebar ${expanded ? 'expanded' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">LMS</span>
          <span className="logo-text">Learning System</span>
        </div>
        
        <div className="sidebar-user-info">
          <div className="user-role">{roleLabel}</div>
          <div className="user-name">{auth.user.firstName || auth.user.email.split('@')[0]}</div>
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
                    {item.id === 'report' ? 
                      <img src="https://cdn-icons-png.flaticon.com/512/8956/8956264.png" alt="Report" className="icon-image" /> : 
                      item.icon
                    }
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
              {expanded ? '◀' : '▶'}
            </span>
            <span className="sidebar-label">Collapse Menu</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;