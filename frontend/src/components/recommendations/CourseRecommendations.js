// CourseRecommendations.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './CourseRecommendations.css';
import config from '../../config';

const CourseRecommendations = ({ limit = 3 }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`${config.apiUrl}/recommendations?limit=${limit}`);
        setRecommendations(response.data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommended courses. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [limit]);

  if (isLoading) {
    return <div className="recommendations-loading">Loading recommendations...</div>;
  }

  if (error) {
    return <div className="recommendations-error">{error}</div>;
  }

  if (recommendations.length === 0 || (recommendations.length === 1 && recommendations[0].error)) {
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
              <h3>{recommendation.courseDetails?.title || recommendation.title}</h3>
              <p className="instructor">
                {recommendation.courseDetails?.instructor && 
                  `Instructor: ${recommendation.courseDetails.instructor}`}
              </p>
              <p className="recommendation-description">
                {recommendation.courseDetails?.description || recommendation.description || 'No description available'}
              </p>
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