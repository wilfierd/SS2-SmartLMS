// src/components/routing/RoleBasedRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import AdminDashboard from '../1.admin/AdminDashboard';
import InstructorDashboard from '../2.instructor/InstructorDashboard';
import StudentDashboard from '../3.student/StudentDashboard';
import CourseManagement from '../course/CourseManagement';
import CourseDetail from '../course/CourseDetail';
import VirtualClassroom from '../classroom/VirtualClassroom';
import AdminUsers from '../users/AdminUsers';
import UnauthorizedPage from '../common/UnauthorizedPage';
import QuizDetail from '../quiz/QuizDetail';
import UserProfile from '../profile/UserProfile';
import NotificationsPage from '../notifications/NotificationsPage';

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
      courses: <CourseManagement />,
      courseDetail: <CourseDetail />,
      quizDetail: <QuizDetail />,
      users: <AdminUsers />,
      profile: <UserProfile />,
      notifications: <NotificationsPage />,
      reports: <div>Reports & Analytics (Coming Soon)</div>,
      settings: <div>Settings (Coming Soon)</div>,
      messages: <div>Messages (Coming Soon)</div>,
      classroom: <VirtualClassroom />
    },
    instructor: {
      dashboard: <InstructorDashboard />,
      courses: <CourseManagement />,
      courseDetail: <CourseDetail />,
      quizDetail: <QuizDetail />,
      profile: <UserProfile />,
      notifications: <NotificationsPage />,
      classroom: <VirtualClassroom />,
      assessment: <div>Assessment Tools (Coming Soon)</div>,
      messages: <div>Messages (Coming Soon)</div>,
    },
    student: {
      dashboard: <StudentDashboard />,
      courses: <CourseManagement />,
      courseDetail: <CourseDetail />,
      quizDetail: <QuizDetail />,
      profile: <UserProfile />,
      notifications: <NotificationsPage />,
      classroom: <VirtualClassroom />,
      messages: <div>Messages (Coming Soon)</div>,
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