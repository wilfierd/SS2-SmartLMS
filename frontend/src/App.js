// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ChangePasswordModal from './components/ChangePasswordModal';
import AuthContext from './context/AuthContext';
import axios from 'axios';
import './App.css';
import config from './config';

function App() {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Get API URL and Google Client ID from environment variables
  const API_URL = config.apiUrl;
  const googleClientId = config.googleClientId;

  // Set up axios defaults
  useEffect(() => {
    // Check server status
    const checkServerStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/status`);
        console.log('Server status:', response.data);
      } catch (error) {
        console.error('Server check failed:', error);
      }
    };

    checkServerStatus();
  }, [API_URL]);

  // Set up authentication from local storage
  useEffect(() => {
    const initAuth = async () => {
      // Check if user is authenticated (from localStorage)
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          
          // Configure axios to use the token for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token is still valid with the server
          try {
            await axios.get(`${API_URL}/users/me`);
            
            setAuth({
              isAuthenticated: true,
              user,
              token,
              isLoading: false
            });
            
            // Check if password needs to be changed
            if (user.role === 'student' && !user.isPasswordChanged) {
              setShowPasswordModal(true);
            }
          } catch (error) {
            console.error('Token validation failed:', error);
            // Token is invalid, clear localStorage
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
    
    // Set authorization header for future requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    setAuth({
      isAuthenticated: true,
      user: userData,
      token,
      isLoading: false
    });

    // Show password change modal for students on first login
    if (userData.role === 'student' && !userData.isPasswordChanged) {
      setShowPasswordModal(true);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Remove authorization header
    delete axios.defaults.headers.common['Authorization'];
    
    setAuth({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false
    });
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

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthContext.Provider value={{ auth, login, logout, updateUser }}>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={!auth.isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
              <Route path="/forgot-password" element={!auth.isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
              <Route path="/reset-password/:token" element={!auth.isAuthenticated ? <ResetPassword /> : <Navigate to="/dashboard" />} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={auth.isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/" element={<Navigate to={auth.isAuthenticated ? "/dashboard" : "/login"} />} />
              <Route path="*" element={<Navigate to={auth.isAuthenticated ? "/dashboard" : "/login"} />} />
            </Routes>

            {showPasswordModal && (
              <ChangePasswordModal
                onClose={() => {
                  // Prevent closing if password hasn't been changed
                  if (auth.user.isPasswordChanged) {
                    setShowPasswordModal(false);
                  }
                }}
                forceChange={!auth.user.isPasswordChanged}
              />
            )}
          </div>
        </Router>
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

export default App;