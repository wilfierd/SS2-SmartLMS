// src/services/courseService.js - Centralized API service for course operations
import axios from 'axios';
import config from '../config';

const API_URL = config.apiUrl;

class CourseService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Course Operations
  async getCourse(courseId) {
    const response = await this.api.get(`/courses/${courseId}/detail`);
    return response.data;
  }

  async updateCourse(courseId, courseData) {
    const response = await this.api.put(`/courses/${courseId}`, courseData);
    return response.data;
  }

  async deleteCourse(courseId) {
    const response = await this.api.delete(`/courses/${courseId}`);
    return response.data;
  }

  async getCourseStatistics(courseId) {
    const response = await this.api.get(`/courses/${courseId}/statistics`);
    return response.data;
  }

  // Module Operations
  async getModules(courseId) {
    const response = await this.api.get(`/courses/${courseId}/modules`);
    return response.data;
  }

  async createModule(courseId, moduleData) {
    const response = await this.api.post(`/courses/${courseId}/modules`, moduleData);
    return response.data;
  }

  async updateModule(courseId, moduleId, moduleData) {
    const response = await this.api.put(`/courses/${courseId}/modules/${moduleId}`, moduleData);
    return response.data;
  }

  async deleteModule(courseId, moduleId) {
    const response = await this.api.delete(`/courses/${courseId}/modules/${moduleId}`);
    return response.data;
  }  // Lesson Operations
  async createLesson(courseId, lessonData) {
    const formData = new FormData();

    // Add text fields
    Object.keys(lessonData).forEach(key => {
      if (key !== 'materials' && key !== 'images' && key !== 'contentBlocks' && lessonData[key] !== undefined) {
        formData.append(key, lessonData[key]);
      }
    });

    // Add material files
    if (lessonData.materials && lessonData.materials.length > 0) {
      Array.from(lessonData.materials).forEach(file => {
        formData.append('materials', file);
      });
    }

    // Add image files
    if (lessonData.images && lessonData.images.length > 0) {
      Array.from(lessonData.images).forEach(image => {
        formData.append('images', image);
      });
    }

    const response = await this.api.post(`/courses/${courseId}/lessons`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async updateLesson(courseId, lessonId, lessonData) {
    const response = await this.api.put(`/courses/${courseId}/lessons/${lessonId}`, lessonData);
    return response.data;
  }

  async deleteLesson(courseId, lessonId) {
    const response = await this.api.delete(`/courses/${courseId}/lessons/${lessonId}`);
    return response.data;
  }

  // Assignment Operations
  async getAssignments(courseId) {
    const response = await this.api.get(`/courses/${courseId}/assignments`);
    return response.data;
  }

  async getAssignment(assignmentId) {
    const response = await this.api.get(`/assignments/${assignmentId}`);
    return response.data;
  }

  async createAssignment(courseId, assignmentData) {
    const response = await this.api.post(`/courses/${courseId}/assignments`, assignmentData);
    return response.data;
  }

  async updateAssignment(assignmentId, assignmentData) {
    const response = await this.api.put(`/assignments/${assignmentId}`, assignmentData);
    return response.data;
  }

  async deleteAssignment(assignmentId) {
    const response = await this.api.delete(`/assignments/${assignmentId}`);
    return response.data;
  }

  async submitAssignment(assignmentId, submissionData) {
    const formData = new FormData();

    if (submissionData.file) {
      formData.append('file', submissionData.file);
    }

    if (submissionData.comments) {
      formData.append('comments', submissionData.comments);
    }

    const response = await this.api.post(`/assignments/${assignmentId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async gradeSubmission(submissionId, gradeData) {
    const response = await this.api.post(`/assignments/submissions/${submissionId}/grade`, gradeData);
    return response.data;
  }

  // Quiz Operations
  async getQuizzes(courseId) {
    const response = await this.api.get(`/courses/${courseId}/quizzes`);
    return response.data;
  }

  async getQuiz(courseId, quizId) {
    const response = await this.api.get(`/courses/${courseId}/quizzes/${quizId}`);
    return response.data;
  }

  async createQuiz(courseId, quizData) {
    const response = await this.api.post(`/courses/${courseId}/quizzes`, quizData);
    return response.data;
  }

  async updateQuiz(courseId, quizId, quizData) {
    const response = await this.api.patch(`/courses/${courseId}/quizzes/${quizId}`, quizData);
    return response.data;
  }

  async deleteQuiz(courseId, quizId) {
    const response = await this.api.delete(`/courses/${courseId}/quizzes/${quizId}`);
    return response.data;
  }

  async startQuiz(courseId, quizId) {
    const response = await this.api.post(`/courses/${courseId}/quizzes/${quizId}/start`);
    return response.data;
  }

  async submitQuizAttempt(courseId, attemptId, responses) {
    const response = await this.api.post(`/courses/${courseId}/quizzes/attempts/${attemptId}/submit`, { responses });
    return response.data;
  }

  // Student Operations
  async getEnrolledStudents(courseId) {
    const response = await this.api.get(`/courses/${courseId}/students`);
    return response.data;
  }

  async getStudentProgress(courseId, studentId) {
    const response = await this.api.get(`/courses/${courseId}/students/${studentId}`);
    return response.data;
  }

  async updateStudentProgress(courseId, studentId, progressData) {
    const response = await this.api.put(`/courses/${courseId}/students/${studentId}`, progressData);
    return response.data;
  }

  async submitStudentFeedback(courseId, feedbackData) {
    const response = await this.api.post(`/courses/${courseId}/student-feedback`, feedbackData);
    return response.data;
  }

  // Enrollment Operations
  async enrollInCourse(courseId, enrollmentKey = null) {
    const response = await this.api.post('/enrollments/enroll', {
      courseId,
      enrollmentKey
    });
    return response.data;
  }

  async leaveCourse(courseId) {
    const response = await this.api.delete(`/enrollments/leave/${courseId}`);
    return response.data;
  }

  async getMyEnrolledCourses() {
    const response = await this.api.get('/enrollments/my-courses');
    return response.data;
  }

  // Discussion Operations
  async getDiscussions(courseId) {
    const response = await this.api.get(`/courses/${courseId}/discussions`);
    return response.data;
  }

  async getDiscussion(courseId, discussionId) {
    const response = await this.api.get(`/courses/${courseId}/discussions/${discussionId}`);
    return response.data;
  }

  async createDiscussion(courseId, discussionData) {
    const response = await this.api.post(`/courses/${courseId}/discussions`, discussionData);
    return response.data;
  }

  async updateDiscussion(courseId, discussionId, discussionData) {
    const response = await this.api.put(`/courses/${courseId}/discussions/${discussionId}`, discussionData);
    return response.data;
  }

  async deleteDiscussion(courseId, discussionId) {
    const response = await this.api.delete(`/courses/${courseId}/discussions/${discussionId}`);
    return response.data;
  }

  async createDiscussionPost(courseId, discussionId, postData) {
    const response = await this.api.post(`/courses/${courseId}/discussions/${discussionId}/posts`, postData);
    return response.data;
  }

  async updateDiscussionPost(courseId, discussionId, postId, postData) {
    const response = await this.api.put(`/courses/${courseId}/discussions/${discussionId}/posts/${postId}`, postData);
    return response.data;
  }

  async deleteDiscussionPost(courseId, discussionId, postId) {
    const response = await this.api.delete(`/courses/${courseId}/discussions/${discussionId}/posts/${postId}`);
    return response.data;
  }

  // Virtual Session Operations
  async getVirtualSessions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await this.api.get(`/virtual-sessions${queryString ? '?' + queryString : ''}`);
    return response.data;
  }

  async getVirtualSession(sessionId) {
    const response = await this.api.get(`/virtual-sessions/${sessionId}`);
    return response.data;
  }

  async createVirtualSession(sessionData) {
    const response = await this.api.post('/virtual-sessions', sessionData);
    return response.data;
  }

  async updateVirtualSession(sessionId, sessionData) {
    const response = await this.api.put(`/virtual-sessions/${sessionId}`, sessionData);
    return response.data;
  }

  async deleteVirtualSession(sessionId) {
    const response = await this.api.delete(`/virtual-sessions/${sessionId}`);
    return response.data;
  }

  async endVirtualSession(sessionId) {
    const response = await this.api.post(`/virtual-sessions/${sessionId}/end`);
    return response.data;
  }

  // File Operations
  async uploadThumbnail(file, courseId = null) {
    const formData = new FormData();
    formData.append('thumbnail', file);

    // Use course-specific endpoint if courseId is provided, otherwise use general endpoint
    const endpoint = courseId
      ? `/uploads/courses/${courseId}/thumbnail`
      : '/uploads/thumbnail';

    const response = await this.api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  // Utility Methods
  async checkEnrollmentStatus(courseId) {
    try {
      const enrolledCourses = await this.getMyEnrolledCourses();
      return enrolledCourses.some(course => course.id === parseInt(courseId));
    } catch (error) {
      console.error('Error checking enrollment status:', error);
      return false;
    }
  }

  // Error handler
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data.message || 'Server error occurred');
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error - please check your connection');
    } else {
      // Something else happened
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
}

// Create and export a singleton instance
const courseService = new CourseService();
export default courseService;