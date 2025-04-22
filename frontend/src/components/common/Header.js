// src/components/admin/Header.js
import React, { useContext } from 'react';
import './Header.css';
import AuthContext from '../../context/AuthContext';

const Header = ({ title }) => {
  const { auth, logout } = useContext(AuthContext);
  
  // Get current month and year for the header
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();

  return (
    <div className="admin-header">
      <div className="header-title">
        <h1>{title}</h1>
      </div>
      
      <div className="header-search">
        <input 
          type="text" 
          placeholder="Search for courses" 
        />
        <button type="button">
          <span>🔍</span>
        </button>
      </div>
      
      <div className="header-right">
        <div className="header-date">
          <span>{currentMonth} {currentYear}</span>
        </div>
        
        <div className="header-notifications">
          <span className="notification-icon">🔔</span>
          <div className="notification-badge">2</div>
        </div>
        
        <div className="header-profile">
          <span className="profile-name">{auth.user.email}</span>
          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;