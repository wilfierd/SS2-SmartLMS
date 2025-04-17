
// File: src/components/ChangePasswordModal.js
import React, { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import './ChangePasswordModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ChangePasswordModal = ({ onClose, forceChange }) => {
  const { auth, updateUser } = useContext(AuthContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(
        `${API_URL}/users/change-password`,
        {
          currentPassword,
          newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );
      
      setIsLoading(false);
      setSuccess('Password changed successfully!');
      
      // Update user in context
      const updatedUser = {
        ...auth.user,
        isPasswordChanged: true
      };
      
      updateUser(updatedUser);
      
      // Close modal after 2 seconds if not forced
      if (!forceChange) {
        setTimeout(() => onClose(), 2000);
      }
    } catch (error) {
      setIsLoading(false);
      setError(error.response?.data?.message || 'Failed to change password. Please try again.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{forceChange ? 'Change Default Password' : 'Change Password'}</h2>
        
        {forceChange && (
          <p className="modal-notice">
            For security reasons, you must change your default password before continuing.
          </p>
        )}
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            {forceChange && (
              <small>If you registered with Google, the default password is 123456789</small>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="modal-actions">
            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? 'Changing...' : 'Change Password'}
            </button>
            
            {!forceChange && (
              <button type="button" className="cancel-button" onClick={onClose}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;