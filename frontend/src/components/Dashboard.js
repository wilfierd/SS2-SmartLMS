
// File: src/components/Dashboard.js
import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { auth, logout } = useContext(AuthContext);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>LMS Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {auth.user.email}</span>
          <span className="role-badge">{auth.user.role}</span>
          <button onClick={logout} className="logout-button">Logout</button>
        </div>
      </header>
      
      <div className="dashboard-content">
        <div className="welcome-message">
          <h2>Welcome to the Learning Management System</h2>
          <p>You are logged in as {auth.user.role}.</p>
        </div>
        
        {/* Placeholder content based on user role */}
        {auth.user.role === 'student' && (
          <div className="role-specific-content">
            <h3>Student Dashboard</h3>
            <p>Here you can view your enrolled courses and assignments.</p>
            {/* Add student-specific components here */}
          </div>
        )}
        
        {auth.user.role === 'instructor' && (
          <div className="role-specific-content">
            <h3>Instructor Dashboard</h3>
            <p>Here you can manage your courses and students.</p>
            {/* Add instructor-specific components here */}
          </div>
        )}
        
        {auth.user.role === 'admin' && (
          <div className="role-specific-content">
            <h3>Admin Dashboard</h3>
            <p>Here you can manage all users, courses, and system settings.</p>
            {/* Add admin-specific components here */}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;