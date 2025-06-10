// src/App.js - Updated with proper component imports and route handling
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import Login from './components/auth/Login';
import RoleBasedRoute from './components/routing/RoleBasedRoute';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import ChangePasswordModal from './components/auth/ChangePasswordModal';
import UnauthorizedPage from './components/common/UnauthorizedPage';
import CourseDetail from './components/course/CourseDetail';
import QuizDetail from './components/quiz/QuizDetail';
import AuthContext from './context/AuthContext';
import { ChatbotProvider } from './context/ChatbotContext';
import { NotificationProvider } from './context/NotificationContext';
import Chatbot from './components/chatbot/Chatbot';
import axios from 'axios';
import './App.css';
import config from './config';
import SidebarManager from './components/common/SidebarManager';
import AssignmentDetail from './components/assessment/AssignmentDetail';

// Import Virtual Classroom components
import VirtualClassroom from './components/classroom/VirtualClassroom';
import SessionAnalytics from './components/classroom/SessionAnalytics';
import SessionRecordingView from './components/classroom/SessionRecordingView';

import MessagesPage from './components/message/MessagesPage';

const GradeAssignment = React.lazy(() =>
  import('./components/assessment/GradeAssignment').catch(() => ({
    default: () => <div className="error-message">Grade Assignment component not found. Please check the file path.</div>
  }))
);

const StudentProgressView = React.lazy(() =>
  import('./components/course/StudentProgressView').catch(() => ({
    default: () => <div className="error-message">Student Progress component not found. Please check the file path.</div>
  }))
);

function App() {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const API_URL = config.apiUrl;
  const googleClientId = config.googleClientId || '';

  // Initialize sidebar state manager
  useEffect(() => {
    SidebarManager.initialize();
  }, []);

  // Set up axios defaults and check server status
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        axios.defaults.baseURL = API_URL; // hoặc `${API_URL}/api` nếu có prefix
        const response = await axios.get(`${API_URL}/status`);
        console.log('Server status:', response.data);
      } catch (error) {
        console.error('Server check failed:', error);
      }
    };

    checkServerStatus();
  }, [API_URL]);

  // Authentication initialization
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          const user = JSON.parse(storedUser);

          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          try {
            await axios.get(`${API_URL}/users/me`);

            setAuth({
              isAuthenticated: true,
              user,
              token,
              isLoading: false
            });

            if (user.role === 'student' && !user.isPasswordChanged) {
              setShowPasswordModal(true);
            }
          } catch (error) {
            console.error('Token validation failed:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];

            setAuth({
              isAuthenticated: false,
              user: null,
              token: null,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');

          setAuth({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false
          });
        }
      } else {
        setAuth({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false
        });
      }
    };

    initAuth();
  }, [API_URL]);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    setAuth({
      isAuthenticated: true,
      user: userData,
      token,
      isLoading: false
    });

    if (userData.role === 'student' && !userData.isPasswordChanged) {
      setShowPasswordModal(true);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    delete axios.defaults.headers.common['Authorization'];

    setAuth({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false
    });

    SidebarManager.setExpanded(false);
  };

  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setAuth({
      ...auth,
      user: userData
    });

    if (userData.isPasswordChanged) {
      setShowPasswordModal(false);
    }
  };

  if (auth.isLoading) {
    return <div className="loading">Loading...</div>;
  }

  const ProtectedRoute = ({ children }) => {
    return auth.isAuthenticated ? children : <Navigate to="/login" />;
  };

  const LazyWrapper = ({ children }) => (
    <React.Suspense fallback={<div className="loading-spinner">Loading component...</div>}>
      {children}
    </React.Suspense>
  );
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthContext.Provider value={{ auth, login, logout, updateUser }}>
        <NotificationProvider>
          <ChatbotProvider>
            <Toaster />

            <Router>
              <div className="App">
                <Routes>
                  {/* Public routes */}
                  <Route
                    path="/login"
                    element={!auth.isAuthenticated ? <Login /> : <Navigate to="/dashboard" />}
                  />
                  <Route
                    path="/forgot-password"
                    element={!auth.isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />}
                  />
                  <Route
                    path="/reset-password/:token"
                    element={!auth.isAuthenticated ? <ResetPassword /> : <Navigate to="/dashboard" />}
                  />
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />

                  {/* Dashboard routes */}
                  <Route path="/dashboard" element={<RoleBasedRoute component="dashboard" />} />

                  {/* Course management routes */}
                  <Route path="/courses" element={<RoleBasedRoute component="courses" />} />
                  <Route
                    path="/courses/:courseId/detail"
                    element={
                      <ProtectedRoute>
                        <CourseDetail />
                      </ProtectedRoute>
                    }
                  />

                  {/* Assessment routes with lazy loading */}
                  <Route
                    path="/quizzes/:quizId"
                    element={
                      <ProtectedRoute>
                        <QuizDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/assignments/:assignmentId"
                    element={
                      <ProtectedRoute>
                        <LazyWrapper>
                          <AssignmentDetail />
                        </LazyWrapper>
                      </ProtectedRoute>
                    }
                  />

                  {/* Grading routes (instructors/admins only) */}
                  <Route
                    path="/courses/:courseId/assignments/:assignmentId/submissions/:submissionId/grade"
                    element={
                      <ProtectedRoute>
                        <LazyWrapper>
                          <GradeAssignment />
                        </LazyWrapper>
                      </ProtectedRoute>
                    }
                  />

                  {/* Student progress routes (instructors/admins only) */}
                  <Route
                    path="/courses/:courseId/students/:studentId"
                    element={
                      <ProtectedRoute>
                        <LazyWrapper>
                          <StudentProgressView />
                        </LazyWrapper>
                      </ProtectedRoute>
                    }
                  />

                  {/* Virtual Classroom routes */}
                  <Route path="/classroom" element={<RoleBasedRoute component="classroom" />} />
                  <Route path="/virtual-classroom" element={<Navigate to="/classroom" />} />
                  <Route
                    path="/classroom/analytics/:sessionId"
                    element={
                      <ProtectedRoute>
                        <SessionAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/classroom/recording/:sessionId/:recordingId"
                    element={
                      <ProtectedRoute>
                        <SessionRecordingView />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/classroom/recording/:sessionId"
                    element={
                      <ProtectedRoute>
                        <SessionRecordingView />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin routes */}
                  <Route path="/users" element={<RoleBasedRoute component="users" />} />
                  <Route path="/reports" element={<RoleBasedRoute component="reports" />} />
                  <Route path="/settings" element={<RoleBasedRoute component="settings" />} />

                  {/* Profile route - available to all authenticated users */}
                  <Route path="/profile" element={<RoleBasedRoute component="profile" />} />

                  {/* Assessment tools route */}
                  <Route path="/assessment" element={<RoleBasedRoute component="assessment" />} />                {/* Messages route */}
                  <Route path="/messages" element={<RoleBasedRoute component="messages" />} />

                  {/* Notifications route */}
                  <Route path="/notifications" element={<RoleBasedRoute component="notifications" />} />

                  {/* Course export/import routes */}
                  <Route
                    path="/courses/:courseId/export"
                    element={
                      <ProtectedRoute>
                        <RoleBasedRoute component="courseExport" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/course-import"
                    element={
                      <ProtectedRoute>
                        <RoleBasedRoute component="courseImport" />
                      </ProtectedRoute>
                    }
                  />

                  {/* Analytics routes */}
                  <Route
                    path="/analytics"
                    element={<RoleBasedRoute component="analytics" />}
                  />
                  <Route
                    path="/analytics/course/:courseId"
                    element={
                      <ProtectedRoute>
                        <RoleBasedRoute component="courseAnalytics" />
                      </ProtectedRoute>
                    }
                  />

                <Route
                    path="/messages"
                    element={
                        <ProtectedRoute>
                        <MessagesPage />
                        </ProtectedRoute>
                    }
                />


                  {/* API testing route (development only) */}
                  {process.env.NODE_ENV === 'development' && (
                    <Route
                      path="/api-test"
                      element={
                        <ProtectedRoute>
                          <RoleBasedRoute component="apiTest" />
                        </ProtectedRoute>
                      }
                    />
                  )}

                  {/* Default routes */}
                  <Route
                    path="/"
                    element={<Navigate to={auth.isAuthenticated ? "/dashboard" : "/login"} />}
                  />
                  <Route
                    path="*"
                    element={<Navigate to={auth.isAuthenticated ? "/dashboard" : "/login"} />}
                  />
                </Routes>

                {/* Password change modal */}
                {showPasswordModal && (
                  <ChangePasswordModal
                    onClose={() => {
                      if (auth.user.isPasswordChanged) {
                        setShowPasswordModal(false);
                      }
                    }}
                    forceChange={!auth.user.isPasswordChanged}
                  />
                )}

                {/* Chatbot for authenticated users */}
                {auth.isAuthenticated && <Chatbot />}            </div>
            </Router>
          </ChatbotProvider>
        </NotificationProvider>
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

export default App;