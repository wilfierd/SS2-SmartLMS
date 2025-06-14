// Upload Service for handling file uploads
import axios from 'axios';
import config from '../config.js';

const API_URL = config.apiUrl;

class UploadService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  // Upload lesson image
  async uploadLessonImage(file, lessonId) {
    const formData = new FormData();
    formData.append('files', file);

    const response = await this.api.post(`/uploads/lessons/${lessonId}/materials`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  // Upload general image (for new lessons being created)
  async uploadImage(file, courseId) {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('courseId', courseId);
    formData.append('materialType', 'image');

    const response = await this.api.post('/uploads/course-material', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  // Upload video file (max 10MB)
  async uploadVideo(file, courseId) {
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      throw new Error('Video file size must be less than 10MB');
    }

    // Check file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov', 'video/avi'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Unsupported video format. Please use MP4, WebM, OGG, MOV, or AVI');
    }

    const formData = new FormData();
    formData.append('files', file);
    formData.append('courseId', courseId);
    formData.append('materialType', 'video');

    const response = await this.api.post('/uploads/course-material', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  // Upload course thumbnail
  async uploadThumbnail(file, courseId = null) {
    const formData = new FormData();
    formData.append('thumbnail', file);

    const endpoint = courseId
      ? `/uploads/courses/${courseId}/thumbnail`
      : '/uploads/thumbnail';

    const response = await this.api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
  // Generate a temporary URL for preview
  generatePreviewUrl(file) {
    return URL.createObjectURL(file);
  }

  // Clean up preview URL
  revokePreviewUrl(url) {
    URL.revokeObjectURL(url);
  }

  // Convert file path to full URL
  getFileUrl(filePath) {
    if (!filePath) return null;
    
    // If it's already a full URL, return as is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    // Remove leading slash if present to avoid double slashes
    const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    
    // Use base URL (without /api) for static files
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}/${cleanPath}`;
  }
}

export default new UploadService();
