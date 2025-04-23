// src/components/UnauthorizedPage.js
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import './UnauthorizedPage.css';

const UnauthorizedPage = () => {
  const { auth, logout } = useContext(AuthContext);
  
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <h1>Access Denied</h1>
        <div className="unauthorized-icon">🔒</div>
        <p>You don't have permission to access this page.</p>
        
        {auth.isAuthenticated ? (
          <div className="unauthorized-actions">
            <p>You are logged in as: <strong>{auth.user.email}</strong> ({auth.user.role})</p>
            <div className="unauthorized-buttons">
              <Link to="/dashboard" className="return-btn">Return to Dashboard</Link>
              <button onClick={logout} className="logout-btn">Logout</button>
            </div>
          </div>
        ) : (
          <div className="unauthorized-actions">
            <p>Please log in to access the system.</p>
            <Link to="/login" className="login-btn">Go to Login</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnauthorizedPage;