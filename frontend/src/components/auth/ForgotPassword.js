// src/components/ForgotPassword.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ForgotPassword.css';
import config from '../../config';
import notification from '../../utils/notification'; // Import notification utility

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Get API URL from environment variables
  const API_URL = config.apiUrl;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset states
    setIsLoading(true);
    
    try {
      // Send forgot password request
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      notification.success(response.data.message); // Success toast
      setIsSuccess(true);
      setEmail(''); // Clear the form
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
      notification.error(errorMessage); // Error toast
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <h1>Forgot Password</h1>
        <p className="instruction">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        {!isSuccess && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your registered email"
              />
            </div>
            
            <button
              type="submit"
              className="submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
        
        <div className="links">
          <Link to="/login" className="back-to-login">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;