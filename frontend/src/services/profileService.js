// src/services/profileService.js
import axios from 'axios';
import config from '../config';

const API_URL = config.apiUrl;

class ProfileService {
    // Get authentication headers
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    }

    // Get current user profile
    async getCurrentProfile() {
        try {
            const response = await axios.get(`${API_URL}/users/me`, this.getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }

    // Update user profile
    async updateProfile(profileData) {
        try {
            const response = await axios.put(
                `${API_URL}/users/profile`,
                profileData,
                this.getAuthHeaders()
            );
            return response.data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    // Get user activities
    async getUserActivities() {
        try {
            const response = await axios.get(`${API_URL}/users/activities`, this.getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error('Error fetching user activities:', error);
            throw error;
        }
    }

    // Get user sessions
    async getUserSessions() {
        try {
            const response = await axios.get(`${API_URL}/users/sessions`, this.getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error('Error fetching user sessions:', error);
            throw error;
        }
    }

    // Get user statistics
    async getUserStats() {
        try {
            const response = await axios.get(`${API_URL}/users/stats`, this.getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error('Error fetching user stats:', error);
            throw error;
        }
    }

    // Upload profile image (placeholder for future implementation)
    async uploadProfileImage(imageFile) {
        try {
            const formData = new FormData();
            formData.append('profileImage', imageFile);

            const response = await axios.post(
                `${API_URL}/users/profile-image`,
                formData,
                {
                    ...this.getAuthHeaders(),
                    headers: {
                        ...this.getAuthHeaders().headers,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error uploading profile image:', error);
            throw error;
        }
    }

    // Delete user account (for students only)
    async deleteAccount() {
        try {
            const response = await axios.delete(`${API_URL}/users/account`, this.getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    }

    // Download user data
    async downloadUserData() {
        try {
            const response = await axios.get(`${API_URL}/users/data-export`, {
                ...this.getAuthHeaders(),
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'user-data.json');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Error downloading user data:', error); throw error;
        }
    }    // Logout user
    async logout() {
        try {
            const response = await axios.post(
                `${API_URL}/auth/logout`,
                {},
                this.getAuthHeaders()
            );

            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            return response.data;
        } catch (error) {
            console.error('Error during logout:', error);
            // Still clear local storage even if API call fails
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            throw error;
        }
    }

    // Request password reset
    async forgotPassword(email) {
        try {
            const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
            return response.data;
        } catch (error) {
            console.error('Error requesting password reset:', error);
            throw error;
        }
    }
}

export default new ProfileService();
