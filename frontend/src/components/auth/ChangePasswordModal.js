// File: src/components/ChangePasswordModal.js
import React, { useState, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import './ChangePasswordModal.css';
import config from '../../config';
import notification from '../../utils/notification'; // Import notification utility

const API_URL = config.apiUrl;

const ChangePasswordModal = ({ onClose, forceChange }) => {
  const { auth, updateUser } = useContext(AuthContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validation
    if (newPassword !== confirmPassword) {
      notification.error('New passwords do not match.'); // Error toast
      return;
    }
    
    if (newPassword.length < 8) {
      notification.error('New password must be at least 8 characters long.'); // Error toast
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
      notification.success('Password changed successfully!'); // Success toast
      
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
      const errorMessage = error.response?.data?.message || 'Failed to change password. Please try again.';
      notification.error(errorMessage); // Error toast
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