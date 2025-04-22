// src/components/routing/RoleBasedRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import AdminDashboard from '../admin/AdminDashboard';
import InstructorDashboard from '../instructor/InstructorDashboard';
import StudentDashboard from '../student/StudentDashboard';

/**
 * A component that routes users to different dashboards based on their role
 * If not authenticated, redirects to login page
 */
const RoleBasedRoute = () => {
  const { auth } = useContext(AuthContext);
  
  // If not authenticated, redirect to login
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Route based on user role
  switch (auth.user.role) {
    case 'admin':
      return <AdminDashboard />;
      
    case 'instructor':
      return <InstructorDashboard />;
      
    case 'student':
      return <StudentDashboard />;
      
    default:
      // Handle unknown roles - could redirect to a default page
      console.error(`Unknown user role: ${auth.user.role}`);
      return <Navigate to="/unauthorized" />;
  }
};

export default RoleBasedRoute;