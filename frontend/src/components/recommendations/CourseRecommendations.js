// CourseRecommendations.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './CourseRecommendations.css';

const CourseRecommendations = ({ limit = 3 }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Direct call to Flask service
        const response = await axios.get(`http://localhost:5000/api/recommendations?limit=${limit}`, {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Recommendations response:', response.data);

        if (response.data.success) {
          setRecommendations(response.data.recommendations || []);
        } else {
          setError(response.data.error || 'Failed to load recommendations');
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        
        if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
          setError('Unable to connect to recommendation service. Please ensure the Flask server is running on port 5000.');
        } else if (err.response?.status === 503) {
          setError('Recommendation service is temporarily unavailable. Please try again later.');
        } else {
          setError(`Failed to load recommendations: ${err.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [limit]);

  if (isLoading) {
    return (
      <div className="recommendations-loading">
        <div className="loading-spinner"></div>
        <p>Loading recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recommendations-error">
        <h3>Recommended Courses</h3>
        <div className="error-message">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-btn"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="recommendations-empty">
        <h3>Recommended Courses</h3>
        <p>No recommendations available at the moment. Explore our course catalog to find courses that interest you.</p>
        <Link to="/courses" className="browse-courses-btn">Browse Courses</Link>
      </div>
    );
  }

  return (
    <div className="recommendations-section">
      <div className="section-header">
        <h2>Recommended For You</h2>
        <Link to="/courses" className="view-all">View More</Link>
      </div>
      
      <div className="recommendations-list">
        {recommendations.map(recommendation => (
          <div key={recommendation.course_id} className="recommendation-item">
            <div className="recommendation-details">
              <h3>{recommendation.title}</h3>
              <p className="instructor">
                Instructor: {recommendation.instructor_name}
              </p>
              <p className="department">
                Department: {recommendation.department_name}
              </p>
              <p className="recommendation-description">
                {recommendation.description}
              </p>
              <div className="course-meta">
                <span className="difficulty">{recommendation.difficulty_level}</span>
                <span className="credits">{recommendation.credits} Credits</span>
                <span className="score">Match: {Math.round(recommendation.score * 100)}%</span>
              </div>
              <p className="recommendation-reason">
                <em>{recommendation.reason}</em>
              </p>
            </div>
            <Link 
              to={`/courses/${recommendation.course_id}/detail`} 
              className="enroll-btn"
            >
              View Course
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseRecommendations;