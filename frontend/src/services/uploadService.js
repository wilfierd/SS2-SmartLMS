// Upload Service for handling file uploads
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
}

export default new UploadService();
