// src/components/ResetPassword.js
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';
import config from '../../config';
import notification from '../../utils/notification'; // Import notification utility

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Get API URL from environment variables
  const API_URL = config.apiUrl;

  // Verify token when component mounts
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/verify-reset-token/${token}`);
        
        if (response.data.valid) {
          setIsTokenValid(true);
          setUserEmail(response.data.user.email);
        } else {
          notification.error('Invalid or expired reset link. Please request a new one.'); // Error toast
        }
      } catch (error) {
        console.error('Token verification error:', error);
        notification.error('Invalid or expired reset link. Please request a new one.'); // Error toast
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      notification.error('Reset token is missing.'); // Error toast
      setIsLoading(false);
    }
  }, [token, API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (newPassword.length < 8) {
      notification.error('Password must be at least 8 characters long.'); // Error toast
      return;
    }
    
    if (newPassword !== confirmPassword) {
      notification.error('Passwords do not match.'); // Error toast
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Send reset password request
      const response = await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        newPassword
      });
      
      notification.success(response.data.message); // Success toast
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
      notification.error(errorMessage); // Error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <h1>Reset Password</h1>
          <div className="loading">Verifying your reset link...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <h1>Reset Password</h1>
        
        {isTokenValid && !isSubmitting && (
          <>
            <p className="instruction">
              Create a new password for <strong>{userEmail}</strong>
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                />
              </div>
              
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
        
        {(!isTokenValid || isSubmitting) && (
          <div className="links">
            <Link to="/forgot-password" className="request-new-link">
              Request a new reset link
            </Link>
            <Link to="/login" className="back-to-login">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;