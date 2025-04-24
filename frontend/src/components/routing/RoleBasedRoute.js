// src/components/routing/RoleBasedRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import AdminDashboard from '../1.admin/AdminDashboard';
import InstructorDashboard from '../2.instructor/InstructorDashboard';
import StudentDashboard from '../3.student/StudentDashboard';
import CourseManagement from '../course/CourseManagement'; // Import the new shared component
import AdminUsers from '../users/AdminUsers';
import UnauthorizedPage from '../common/UnauthorizedPage';

/**
 * A component that routes users to different dashboards based on their role
 * If not authenticated, redirects to login page
 */
const RoleBasedRoute = ({ component }) => {
  const { auth } = useContext(AuthContext);
  
  // If not authenticated, redirect to login
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  const componentMap = {
    admin: {
      dashboard: <AdminDashboard />,
      courses: <CourseManagement />, // Use the shared component for admin
      users: <AdminUsers />,
      // Add other admin components...
    },
    instructor: {
      dashboard: <InstructorDashboard />,
      courses: <CourseManagement />, // Use the shared component for instructor
      // Add other instructor components...
    },
    student: {
      dashboard: <StudentDashboard />,
      courses: <CourseManagement />, // Use the shared component for student
      // Add other student components...
    }
  };
  
  // If component exists for this role, render it
  if (componentMap[auth.user.role]?.[component]) {
    return componentMap[auth.user.role][component];
  }

  // Otherwise redirect to unauthorized
  return <Navigate to="/unauthorized" />;
};

export default RoleBasedRoute;