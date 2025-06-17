// CourseRecommendations.js - Sử dụng endpoint NestJS cho current user
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './CourseRecommendations.css';

const CourseRecommendations = ({ limit = 3, refresh = false }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (!token) {
          setError('Authentication required. Please log in.');
          setIsLoading(false);
          return;
        }

        // Gọi endpoint GET /recommendations cho current user
        const response = await axios.get(
          `http://localhost:5000/api/recommendations?limit=${limit}&refresh=${refresh}`,
          {
            timeout: 15000, // Tăng timeout vì ML service có thể chậm
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          }
        );

        console.log('Recommendations response:', response.data);

        // Xử lý response từ NestJS
        if (response.data) {
          // Kiểm tra structure của response
          const recommendationsData = response.data.recommendations || response.data;
          setRecommendations(Array.isArray(recommendationsData) ? recommendationsData : []);
        } else {
          setRecommendations([]);
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        
        if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
          setError('Unable to connect to the server. Please check your connection.');
        } else if (err.response?.status === 401) {
          setError('Authentication required. Please log in again.');
          // Có thể redirect về login page
          // window.location.href = '/login';
        } else if (err.response?.status === 404) {
          setError('User not found or no recommendations available.');
        } else if (err.response?.status === 503) {
          setError('Recommendation service is temporarily unavailable. The system is learning from your interactions.');
        } else if (err.response?.status >= 500) {
          setError('Server error. Please try again later.');
        } else {
          setError(err.response?.data?.message || `Failed to load recommendations: ${err.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [limit, refresh]);

  if (isLoading) {
    return (
      <div className="recommendations-loading">
        <div className="loading-spinner"></div>
        <p>Loading personalized recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recommendations-error">
        <h3>Recommended Courses</h3>
        <div className="error-message">
          <p>{error}</p>
          <div className="error-actions">
            <button 
              onClick={() => window.location.reload()} 
              className="retry-btn"
            >
              Retry
            </button>
            <Link to="/courses" className="browse-courses-btn">
              Browse All Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="recommendations-empty">
        <h3>Recommended Courses</h3>
        <div className="empty-state">
          <p>No personalized recommendations available yet.</p>
          <p>Start exploring and enrolling in courses to get better recommendations!</p>
          <Link to="/courses" className="browse-courses-btn">
            Explore Course Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendations-section">
      <div className="section-header">
        <h2>Recommended For You</h2>
        <div className="header-actions">
          <button 
            onClick={() => window.location.reload()} 
            className="refresh-btn"
            title="Refresh recommendations"
          >
            ↻ Refresh
          </button>
          <Link to="/courses" className="view-all">View More</Link>
        </div>
      </div>
      
      <div className="recommendations-list">
        {recommendations.map(recommendation => (
          <div key={recommendation.course_id || recommendation.id} className="recommendation-item">
            <div className="recommendation-details">
              <h3>{recommendation.title}</h3>
              <p className="instructor">
                Instructor: {recommendation.instructor_name || recommendation.instructor}
              </p>
              <p className="department">
                Department: {recommendation.department_name || recommendation.department}
              </p>
              <p className="recommendation-description">
                {recommendation.description}
              </p>
              <div className="course-meta">
                <span className="difficulty">
                  {recommendation.difficulty_level || recommendation.difficulty}
                </span>
                <span className="credits">
                  {recommendation.credits} Credits
                </span>
                {recommendation.score && (
                  <span className="score">
                    Match: {Math.round((recommendation.score || 0) * 100)}%
                  </span>
                )}
              </div>
              {recommendation.reason && (
                <p className="recommendation-reason">
                  <em>{recommendation.reason}</em>
                </p>
              )}
            </div>
            <div className="recommendation-actions">
              <Link 
                to={`/courses/${recommendation.course_id || recommendation.id}/detail`} 
                className="view-course-btn"
              >
                View Details
              </Link>
              <Link 
                to={`/courses/${recommendation.course_id || recommendation.id}/enroll`} 
                className="enroll-btn"
              >
                Enroll Now
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {recommendations.length > 0 && (
        <div className="recommendations-footer">
          <p className="recommendations-note">
            These recommendations are personalized based on your interests and learning history.
          </p>
        </div>
      )}
    </div>
  );
};

export default CourseRecommendations;