// src/components/routing/RoleBasedRoute.js
import React, { useContext } from 'react';
import { Routes, Route,Navigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import AdminDashboard from '../1.admin/AdminDashboard';
import InstructorDashboard from '../2.instructor/InstructorDashboard';
import StudentDashboard from '../3.student/StudentDashboard';
import AdminCourse from '../course/AdminCourse';

/**
 * A component that routes users to different dashboards based on their role
 * If not authenticated, redirects to login page
 */
const RoleBasedRoutes = () => {
  const { auth } = useContext(AuthContext);
  
  // If not authenticated, redirect to login
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Admin routes
  if (auth.user.role === 'admin') {
    return (
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/courses" element={<AdminCourse />} /> {/* Update to use AdminCourse */}
        <Route path="*" element={<Navigate to="/" />} /> {/* Add fallback route for admin */}
      </Routes>
    );
  }
  
  // Instructor routes
  if (auth.user.role === 'instructor') {
    return (
      <Routes>
        <Route path="/" element={<InstructorDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }
  
  // Student routes
  if (auth.user.role === 'student') {
    return (
      <Routes>
        <Route path="/" element={<StudentDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }
  
  // Fallback for unknown roles
  return <Navigate to="/unauthorized" />;
};

export default RoleBasedRoutes;