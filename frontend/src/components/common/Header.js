// src/components/admin/Header.js
import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';
import AuthContext from '../../context/AuthContext';
import profileService from '../../services/profileService';
import notification from '../../utils/notification';
import config from '../../config';
import SearchBar from './SearchBar';

// Base URL without the /api prefix for serving static assets
const baseUrl = config.apiUrl.replace(/\/api$/, '');

const Header = ({ title }) => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Get current month and year for the header
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();
  // Material Design SVG Icon components - Google-style with refined stroke-based design
  const renderIcon = (iconName) => {
    const icons = {
      search: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      ),
      notification: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      profile: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      logout: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16,17 21,12 16,7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ),
      chevronDown: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6,9 12,15 18,9" />
        </svg>
      ),
      calendar: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    };
    return icons[iconName] || null;
  };
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!auth?.user) return 'U';

    const firstName = auth.user.firstName || '';
    const lastName = auth.user.lastName || '';

    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }

    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }

    if (auth.user.email) {
      return auth.user.email.charAt(0).toUpperCase();
    }

    return 'U';
  };
  // Handle profile navigation
  const handleViewProfile = () => {
    setShowDropdown(false);
    navigate('/profile');
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await profileService.logout();
      notification.success('Logged out successfully');
      logout(); // Call the logout from AuthContext
    } catch (error) {
      console.error('Error during logout:', error);
      notification.error('Failed to logout properly, but you have been logged out');
      logout(); // Still logout even if server call fails
    }
  };

  // Handle profile dropdown toggle
  const handleProfileClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Profile clicked, current showDropdown:', showDropdown); // Debug log
    setShowDropdown(prev => !prev);
  };

  // Handle search result selection
  const handleSearchResult = (result) => {
    // Navigate based on result type
    switch (result.type) {
      case 'course':
        const courseId = result.id.replace('course_', '');
        navigate(`/courses/${courseId}/detail`);
        break;
      case 'discussion':
        const discussionId = result.id.replace('discussion_', '');
        // You'll need to extract course ID from the result or make another API call
        // For now, navigate to discussions (you might need to adjust this)
        notification.info(`Opening discussion: ${result.title}`);
        // navigate(`/courses/${courseId}/discussions/${discussionId}`);
        break;
      case 'announcement':
        notification.info(`Opening announcement: ${result.title}`);
        break;
      default:
        notification.info(`Selected: ${result.title}`);
    }
  };

  return (
    <div className="admin-header">
      <div className="header-title">
        <h1>{title}</h1>
      </div>

      <div className="header-search">
        <SearchBar onResultSelect={handleSearchResult} />
      </div>

      <div className="header-right">        <div className="header-date">
        <span className="date-icon">
          {renderIcon('calendar')}
        </span>
        <span>{currentMonth} {currentYear}</span>
      </div>

        <div className="header-notifications">
          <span className="notification-icon">
            {renderIcon('notification')}
          </span>
          <div className="notification-badge">2</div>
        </div>        <div className="header-profile" ref={dropdownRef}>
          <div
            className="profile-section"
            onClick={handleProfileClick}
            data-show-dropdown={showDropdown}
          >            {auth.user.profileImage ? (
            <img
              src={
                auth.user.profileImage.startsWith('/uploads/')
                  ? `${baseUrl}${auth.user.profileImage}`
                  : `${baseUrl}/uploads/profiles/${auth.user.profileImage}`
              }
              alt="Profile"
              className="header-profile-avatar"
            />
          ) : (
            <div className={`header-profile-avatar-placeholder ${auth.user.role}`}>
              {getUserInitials()}
            </div>
          )}
            <span className="dropdown-arrow">
              {renderIcon('chevronDown')}
            </span>
          </div>          {showDropdown && (
            <div className="profile-dropdown" style={{ display: 'block' }}>
              <div className="dropdown-header">
                <div className="dropdown-user-info">
                  <div className="dropdown-name">
                    {auth.user.firstName && auth.user.lastName
                      ? `${auth.user.firstName} ${auth.user.lastName}`
                      : auth.user.email?.split('@')[0] || 'User'
                    }
                  </div>
                  <div className="dropdown-email">{auth.user.email}</div>
                  <div className="dropdown-role">
                    <span className={`role-badge ${auth.user.role}`}>
                      {auth.user.role.charAt(0).toUpperCase() + auth.user.role.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={handleViewProfile}>
                  <span className="dropdown-icon">
                    {renderIcon('profile')}
                  </span>
                  <span>View Profile</span>
                </button>
                <button className="dropdown-item" onClick={handleLogout}>
                  <span className="dropdown-icon">
                    {renderIcon('logout')}
                  </span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;