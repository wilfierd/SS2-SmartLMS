// File: src/components/Login.js
import React, { useState, useContext } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import './Login.css';
import config from '../../config';

const Login = () => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get API URL and Google Client ID from environment variables
  const API_URL = config.apiUrl;
  const googleClientId = config.googleClientId;;

  // Regular login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log(`Attempting login for: ${email}`);
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      setIsLoading(false);
      console.log('Login successful');
      login(response.data.user, response.data.token);
    } catch (error) {
      setIsLoading(false);
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', error.response.data);
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        errorMessage = 'Server did not respond. Please check your connection.';
      }
      
      setError(errorMessage);
    }
  };

  // Google OAuth login/registration
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);

    try {
      console.log('Google auth successful, sending token to backend');
      const response = await axios.post(`${API_URL}/auth/google`, {
        token: credentialResponse.credential
      });

      setIsLoading(false);
      console.log('Google login processed by backend');
      login(response.data.user, response.data.token);
    } catch (error) {
      setIsLoading(false);
      console.error('Google auth error:', error);
      
      let errorMessage = 'Google authentication failed. Please try again.';
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        console.error('Error request:', error.request);
        errorMessage = 'Server did not respond. Please check your connection.';
      }
      
      setError(errorMessage);
    }
  };

  const handleGoogleFailure = (error) => {
    console.error('Google sign-in error:', error);
    setError('Google sign-in was unsuccessful. Please try again.');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>LMS Login</h1>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="forgot-password-link">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
          </div>
          
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="divider">
          <span>OR</span>
        </div>
        
        <div className="google-login">
          <p>Students, register/login with Google:</p>
          {googleClientId ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleFailure}
              theme="filled_blue"
              text="signin_with"
              shape="rectangular"
              useOneTap
            />
          ) : (
            <div className="error-message">
              Google Client ID not configured. Please check your environment variables.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;