// src/components/profile/UserProfile.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import ChangePasswordModal from '../auth/ChangePasswordModal';
import profileService from '../../services/profileService';
import notification from '../../utils/notification';
import config from '../../config';
import './UserProfile.css';

// Base URL without the /api prefix for serving static assets
const baseUrl = config.apiUrl.replace(/\/api$/, '');

const UserProfile = () => {
    const { auth, updateUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('personal');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Form data for editing
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        bio: '',
        profileImage: ''
    });
    // Activity history and session data
    const [activityHistory, setActivityHistory] = useState([]);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [accountStats, setAccountStats] = useState({
        memberSince: null,
        totalActivities: 0,
        totalSessions: 0,
        recentActivities: 0,
        totalLoginTime: 'N/A',
        averageSessionTime: 'N/A'
    });

    // Load user profile data
    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        try {
            setIsLoading(true);

            // Load profile, activities, sessions, and stats in parallel
            const [profile, activities, sessions, stats] = await Promise.all([
                profileService.getCurrentProfile(),
                profileService.getUserActivities(),
                profileService.getUserSessions(),
                profileService.getUserStats()
            ]);

            // Update form data with profile info
            setFormData({
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                email: profile.email || '',
                bio: profile.bio || '',
                profileImage: profile.profileImage || ''
            });

            setActivityHistory(activities);
            setSessionHistory(sessions); setAccountStats(stats);

            if (profile.profileImage) {
                // Backend returns full path like "/uploads/profiles/filename.jpg"
                const imagePath = profile.profileImage.startsWith('/uploads/')
                    ? `${baseUrl}${profile.profileImage}`
                    : `${baseUrl}/uploads/profiles/${profile.profileImage}`;
                setImagePreview(imagePath);
            }

        } catch (error) {
            console.error('Error loading profile data:', error);
            notification.error('Failed to load profile data');
        } finally {
            setIsLoading(false);
        }
    };

    // Initialize form data with user information
    useEffect(() => {
        if (auth.user) {
            setFormData({
                firstName: auth.user.firstName || '',
                lastName: auth.user.lastName || '',
                email: auth.user.email || '',
                bio: auth.user.bio || '',
                profileImage: auth.user.profileImage || ''
            }); if (auth.user.profileImage) {
                // Backend returns full path like "/uploads/profiles/filename.jpg"
                const imagePath = auth.user.profileImage.startsWith('/uploads/')
                    ? `${baseUrl}${auth.user.profileImage}`
                    : `${baseUrl}/uploads/profiles/${auth.user.profileImage}`;
                setImagePreview(imagePath);
            }
        }
    }, [auth.user]);    // Fetch user activity and session history
    useEffect(() => {
        fetchUserActivity();
        fetchAccountStats();
    }, [auth.token]);const fetchUserActivity = async () => {
        try {
            const [activities, sessions] = await Promise.all([
                profileService.getUserActivities(),
                profileService.getUserSessions()
            ]);
            setActivityHistory(activities);
            setSessionHistory(sessions);
        } catch (error) {
            console.error('Error fetching user activity:', error);
        }
    };

    const fetchAccountStats = async () => {
        try {
            const stats = await profileService.getUserStats();
            setAccountStats(stats);
        } catch (error) {
            console.error('Error fetching account stats:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                notification.error('Image size should be less than 5MB');
                return;
            }

            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                notification.error('Please select a valid image file (JPEG, PNG, or GIF)');
                return;
            }

            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    }; const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let updatedProfile;            // Handle image upload first if there's a new image
            if (profileImage) {
                const imageResponse = await profileService.uploadProfileImage(profileImage);

                // Update form data with new image path
                setFormData(prev => ({
                    ...prev,
                    profileImage: imageResponse.profileImage
                }));
            }

            // Prepare update data
            const updateData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                bio: formData.bio
            };

            // If we uploaded an image, include it in the update
            if (profileImage) {
                updateData.profileImage = formData.profileImage;
            }

            updatedProfile = await profileService.updateProfile(updateData);

            // Update the auth context with new user data
            updateUser(updatedProfile);            // Update image preview with the new image
            if (updatedProfile.profileImage) {
                // Backend returns full path like "/uploads/profiles/filename.jpg"
                const imagePath = updatedProfile.profileImage.startsWith('/uploads/')
                    ? `${baseUrl}${updatedProfile.profileImage}`
                    : `${baseUrl}/uploads/profiles/${updatedProfile.profileImage}`;
                setImagePreview(imagePath);
            }

            // Reload profile data to get updated stats
            await loadProfileData();

            notification.success('Profile updated successfully');
            setIsEditing(false);
            setProfileImage(null);
        } catch (error) {
            console.error('Error updating profile:', error);
            notification.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    }; const handleCancelEdit = () => {
        setIsEditing(false);
        setProfileImage(null);

        // Set image preview with consistent path handling
        if (auth.user.profileImage) {
            const imagePath = auth.user.profileImage.startsWith('/uploads/')
                ? `${baseUrl}${auth.user.profileImage}`
                : `${baseUrl}/uploads/profiles/${auth.user.profileImage}`;
            setImagePreview(imagePath);
        } else {
            setImagePreview(null);
        }

        // Reset form data
        setFormData({
            firstName: auth.user.firstName || '',
            lastName: auth.user.lastName || '',
            email: auth.user.email || '',
            bio: auth.user.bio || '',
            profileImage: auth.user.profileImage || ''
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getUserInitials = () => {
        const firstName = auth.user.firstName || '';
        const lastName = auth.user.lastName || '';
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || auth.user.email.charAt(0).toUpperCase();
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'admin': return 'Administrator';
            case 'instructor': return 'Instructor';
            case 'student': return 'Student';
            default: return role;
        }
    };

    const handleDownloadData = async () => {
        try {
            setIsLoading(true);
            await profileService.downloadUserData();
            notification.success('User data downloaded successfully');
        } catch (error) {
            console.error('Error downloading data:', error);
            notification.error('Failed to download user data');
        } finally {
            setIsLoading(false);
        }
    }; const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm(
            'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.'
        );

        if (!confirmDelete) return;

        const doubleConfirm = window.prompt(
            'To confirm deletion, please type "DELETE" in capital letters:'
        );

        if (doubleConfirm !== 'DELETE') {
            notification.error('Account deletion cancelled');
            return;
        }

        try {
            setIsLoading(true);
            await profileService.deleteAccount();
            notification.success('Account deleted successfully');

            // Logout and redirect to home page
            localStorage.removeItem('token');
            navigate('/');
        } catch (error) {
            console.error('Error deleting account:', error);
            notification.error('Failed to delete account');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle forgot password - send reset email
    const handleForgotPassword = async () => {
        if (!window.confirm(`Send a password reset link to ${auth.user.email}?`)) {
            return;
        }        try {
            setIsLoading(true);
            await profileService.forgotPassword(auth.user.email);
            notification.success('Password reset link sent to your email. Please check your inbox.');
        } catch (error) {
            console.error('Error sending reset email:', error);
            notification.error('Failed to send reset email. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="user-profile-container">
            <Sidebar activeItem="profile" />

            <div className="admin-main-content">
                <Header title="User Profile" />

                <div className="profile-content">
                    {/* Profile Header */}
                    <div className="profile-header">
                        <div className="profile-avatar-section">
                            <div className="profile-avatar-container">
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Profile"
                                        className="profile-avatar"
                                    />
                                ) : (
                                    <div className={`profile-avatar-placeholder ${auth.user.role}`}>
                                        {getUserInitials()}
                                    </div>
                                )}
                                {isEditing && (
                                    <div className="avatar-upload-overlay">
                                        <input
                                            type="file"
                                            id="profileImage"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="avatar-upload-input"
                                        />
                                        <label htmlFor="profileImage" className="avatar-upload-label">
                                            📷 Change Photo
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="profile-basic-info">
                            <h1 className="profile-name">
                                {auth.user.firstName && auth.user.lastName
                                    ? `${auth.user.firstName} ${auth.user.lastName}`
                                    : auth.user.email.split('@')[0]
                                }
                            </h1>
                            <div className="profile-role">
                                <span className={`role-badge ${auth.user.role}`}>
                                    {getRoleDisplayName(auth.user.role)}
                                </span>
                            </div>
                            <p className="profile-email">{auth.user.email}</p>
                            {auth.user.bio && (
                                <p className="profile-bio">{auth.user.bio}</p>
                            )}
                        </div>                        <div className="profile-actions">
                            {!isEditing ? (
                                <>
                                    <button
                                        className="edit-profile-btn"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <span className="btn-icon">✏️</span> Edit Profile
                                    </button>
                                    <button
                                        className="change-password-btn"
                                        onClick={() => setShowPasswordModal(true)}
                                    >
                                        <span className="btn-icon">🔒</span> Change Password
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="save-btn"
                                        onClick={handleSaveProfile}
                                        disabled={isLoading}
                                    >
                                        <span className="btn-icon">💾</span>
                                        {isLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        className="cancel-btn"
                                        onClick={handleCancelEdit}
                                        disabled={isLoading}
                                    >
                                        <span className="btn-icon">❌</span> Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Profile Tabs */}
                    <div className="profile-tabs">
                        <button
                            className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
                            onClick={() => setActiveTab('personal')}
                        >
                            Personal Information
                        </button>
                        <button
                            className={`profile-tab ${activeTab === 'activity' ? 'active' : ''}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            Activity History
                        </button>
                        <button
                            className={`profile-tab ${activeTab === 'sessions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('sessions')}
                        >
                            Session History
                        </button>
                        <button
                            className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('settings')}
                        >
                            Account Settings
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="profile-tab-content">
                        {activeTab === 'personal' && (
                            <div className="personal-info-tab">
                                <form onSubmit={handleSaveProfile}>
                                    <div className="form-section">
                                        <h3>Basic Information</h3>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label htmlFor="firstName">First Name</label>
                                                <input
                                                    type="text"
                                                    id="firstName"
                                                    name="firstName"
                                                    value={formData.firstName}
                                                    onChange={handleInputChange}
                                                    disabled={!isEditing}
                                                    placeholder="Enter your first name"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="lastName">Last Name</label>
                                                <input
                                                    type="text"
                                                    id="lastName"
                                                    name="lastName"
                                                    value={formData.lastName}
                                                    onChange={handleInputChange}
                                                    disabled={!isEditing}
                                                    placeholder="Enter your last name"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="email">Email Address</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                disabled={true}
                                                className="disabled-field"
                                            />
                                            <small className="field-note">Email cannot be changed</small>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="bio">Bio</label>
                                            <textarea
                                                id="bio"
                                                name="bio"
                                                value={formData.bio}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                placeholder="Tell us about yourself..."
                                                rows="4"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-section">
                                        <h3>Account Information</h3>

                                        <div className="info-grid">
                                            <div className="info-item">
                                                <span className="info-label">Role:</span>
                                                <span className="info-value">{getRoleDisplayName(auth.user.role)}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Account Created:</span>
                                                <span className="info-value">{formatDate(accountStats.accountCreated)}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Last Login:</span>
                                                <span className="info-value">{formatDate(accountStats.lastLogin)}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Password Changed:</span>
                                                <span className="info-value">
                                                    {auth.user.isPasswordChanged ? 'Yes' : 'No (Default password)'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}            {activeTab === 'activity' && (
                            <div className="activity-tab">
                                <div className="activity-stats">
                                    <div className="stat-card">
                                        <h4>Total Activities</h4>
                                        <div className="stat-number">{accountStats.totalActivities}</div>
                                    </div>
                                    <div className="stat-card">
                                        <h4>Total Sessions</h4>
                                        <div className="stat-number">{accountStats.totalSessions}</div>
                                    </div>
                                    <div className="stat-card">
                                        <h4>Recent Activities</h4>
                                        <div className="stat-number">{accountStats.recentActivities}</div>
                                    </div>
                                    <div className="stat-card">
                                        <h4>Total Login Time</h4>
                                        <div className="stat-number" style={{ fontSize: '1.2rem' }}>{accountStats.totalLoginTime}</div>
                                    </div>
                                </div>

                                <div className="activity-list">
                                    <h3>Recent Activity</h3>
                                    {activityHistory.length > 0 ? (
                                        <div className="activity-items">
                                            {activityHistory.map(activity => (
                                                <div key={activity.id} className="activity-item">
                                                    <div className="activity-content">
                                                        <div className="activity-action">{activity.description}</div>
                                                        <div className="activity-time">{formatDate(activity.createdAt)}</div>
                                                        <div className="activity-type">Type: {activity.type}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="empty-state">No recent activity found.</p>
                                    )}
                                </div>
                            </div>
                        )}            {activeTab === 'sessions' && (
                            <div className="sessions-tab">
                                <h3>Login Session History</h3>
                                {sessionHistory.length > 0 ? (
                                    <div className="sessions-list">
                                        {sessionHistory.map(session => (
                                            <div key={session.id} className="session-item">
                                                <div className="session-info">
                                                    <h4>Login Session</h4>
                                                    <p className="session-course">Status: {session.isActive ? 'Active' : 'Ended'}</p>
                                                    <div className="session-details">
                                                        <span>📅 Login: {formatDate(session.loginTime)}</span>
                                                        {session.logoutTime && <span>📅 Logout: {formatDate(session.logoutTime)}</span>}
                                                        <span>⏱️ Duration: {session.duration}</span>
                                                        {session.ipAddress && <span>🌐 IP: {session.ipAddress}</span>}
                                                        {session.deviceType && <span>💻 Device: {session.deviceType}</span>}
                                                        {session.browserInfo && <span>🌐 Browser: {session.browserInfo}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="empty-state">No session history found.</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="settings-tab">                                <div className="settings-section">
                                <h3>Security Settings</h3>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Password</h4>
                                        <p>Change your account password</p>
                                    </div>
                                    <button
                                        className="setting-action-btn"
                                        onClick={() => setShowPasswordModal(true)}
                                    >
                                        Change Password
                                    </button>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Forgot Password</h4>
                                        <p>Reset your password via email if you don't remember your current password</p>
                                    </div>
                                    <button
                                        className="setting-action-btn secondary"
                                        onClick={handleForgotPassword}
                                        disabled={isLoading}
                                    >
                                        Send Reset Link
                                    </button>
                                </div>
                            </div><div className="settings-section">
                                    <h3>Account Actions</h3>

                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <h4>Download Your Data</h4>
                                            <p>Download a copy of your account data and activity</p>
                                        </div>
                                        <button
                                            className="setting-action-btn secondary"
                                            onClick={handleDownloadData}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'Downloading...' : 'Download Data'}
                                        </button>
                                    </div>
                                </div>

                                {auth.user.role === 'student' && (
                                    <div className="settings-section danger-zone">
                                        <h3>Danger Zone</h3>

                                        <div className="setting-item">
                                            <div className="setting-info">
                                                <h4>Delete Account</h4>
                                                <p>Permanently delete your account and all associated data</p>
                                            </div>
                                            <button
                                                className="setting-action-btn danger"
                                                onClick={handleDeleteAccount}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? 'Deleting...' : 'Delete Account'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <ChangePasswordModal
                    onClose={() => setShowPasswordModal(false)}
                    forceChange={false}
                />
            )}
        </div>
    );
};

export default UserProfile;
