// src/components/course/CourseStatistics.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import './CourseStatistics.css';

const CourseStatistics = ({ courseId, auth }) => {
  const [statistics, setStatistics] = useState({
    enrollmentStats: {
      totalStudents: 0,
      activeStudents: 0,
      completionRate: 0
    },
    quizStats: {
      total: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      distribution: []
    },
    testStats: {
      total: 0,
      averageScore: 0,
      passingRate: 0,
      distribution: []
    },
    assignmentStats: {
      total: 0,
      submitted: 0,
      graded: 0,
      averageScore: 0,
      onTimeSubmissionRate: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const API_URL = config.apiUrl;

  // Fetch statistics data
  useEffect(() => {
    const fetchCourseStatistics = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/courses/${courseId}/statistics`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        setStatistics(response.data);
      } catch (error) {
        console.error('Error fetching course statistics:', error);
        notification.error('Failed to load course statistics');
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId && auth.token) {
      fetchCourseStatistics();
    }
  }, [courseId, auth.token, API_URL]);

  // Render a distribution chart
  const renderDistribution = (distribution, title) => {
    if (!distribution || distribution.length === 0) {
      return <div className="no-data">No data available</div>;
    }
    
    const maxCount = Math.max(...distribution.map(item => item.count));
    
    return (
      <div className="distribution-chart">
        <div className="chart-title">{title}</div>
        <div className="chart-bars">
          {distribution.map((item, index) => (
            <div key={index} className="chart-bar-container">
              <div className="bar-label">{item.range}</div>
              <div className="bar-outer">
                <div 
                  className="bar-inner" 
                  style={{ 
                    height: `${(item.count / maxCount) * 100}%`,
                    backgroundColor: getBarColor(item.range)
                  }}
                ></div>
              </div>
              <div className="bar-count">{item.count}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Get color for chart bar based on score range
  const getBarColor = (range) => {
    const startScore = parseInt(range.split('-')[0]);
    if (startScore >= 90) return '#27ae60'; // Green (A)
    if (startScore >= 80) return '#2ecc71'; // Light green (B)
    if (startScore >= 70) return '#f1c40f'; // Yellow (C)
    if (startScore >= 60) return '#e67e22'; // Orange (D)
    return '#e74c3c'; // Red (F)
  };

  if (isLoading) {
    return <div className="loading-spinner">Loading statistics...</div>;
  }

  return (
    <div className="course-statistics-container">
      <div className="statistics-header">
        <h2>Course Statistics & Analytics</h2>
      </div>
      
      <div className="statistics-grid">
        <div className="statistics-card enrollment-stats">
          <h3>Enrollment & Engagement</h3>
          <div className="stats-body">
            <div className="stat-row">
              <div className="stat-item">
                <div className="stat-value">{statistics.enrollmentStats.totalStudents}</div>
                <div className="stat-label">Total Enrolled</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.enrollmentStats.activeStudents}</div>
                <div className="stat-label">Active Students</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.enrollmentStats.completionRate}%</div>
                <div className="stat-label">Completion Rate</div>
              </div>
            </div>
            
            <div className="progress-container">
              <div className="progress-label">Overall Course Progress</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${statistics.enrollmentStats.completionRate}%` }}
                ></div>
              </div>
            </div>
            
            <div className="activity-stat">
              <div className="activity-label">Student Activity Last 7 Days</div>
              <div className="activity-chart">
                {/* Placeholder for activity chart - in real implementation, would be a line/bar chart */}
                <div className="activity-data">
                  <div className="activity-day" style={{ height: '60%' }}></div>
                  <div className="activity-day" style={{ height: '80%' }}></div>
                  <div className="activity-day" style={{ height: '40%' }}></div>
                  <div className="activity-day" style={{ height: '90%' }}></div>
                  <div className="activity-day" style={{ height: '70%' }}></div>
                  <div className="activity-day" style={{ height: '50%' }}></div>
                  <div className="activity-day" style={{ height: '85%' }}></div>
                </div>
                <div className="activity-labels">
                  <span>M</span>
                  <span>T</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                  <span>S</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="statistics-card quiz-stats">
          <h3>Quiz Performance</h3>
          <div className="stats-body">
            <div className="stat-row">
              <div className="stat-item">
                <div className="stat-value">{statistics.quizStats.total}</div>
                <div className="stat-label">Total Quizzes</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.quizStats.averageScore}%</div>
                <div className="stat-label">Average Score</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.quizStats.highestScore}%</div>
                <div className="stat-label">Highest Score</div>
              </div>
            </div>
            
            {renderDistribution(statistics.quizStats.distribution, 'Quiz Score Distribution')}
          </div>
        </div>
        
        <div className="statistics-card test-stats">
          <h3>Test Performance</h3>
          <div className="stats-body">
            <div className="stat-row">
              <div className="stat-item">
                <div className="stat-value">{statistics.testStats.total}</div>
                <div className="stat-label">Total Tests</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.testStats.averageScore}%</div>
                <div className="stat-label">Average Score</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.testStats.passingRate}%</div>
                <div className="stat-label">Passing Rate</div>
              </div>
            </div>
            
            {renderDistribution(statistics.testStats.distribution, 'Test Score Distribution')}
          </div>
        </div>
        
        <div className="statistics-card assignment-stats">
          <h3>Assignment Performance</h3>
          <div className="stats-body">
            <div className="stat-row">
              <div className="stat-item">
                <div className="stat-value">{statistics.assignmentStats.submitted}/{statistics.assignmentStats.total}</div>
                <div className="stat-label">Submission Rate</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.assignmentStats.graded}/{statistics.assignmentStats.submitted}</div>
                <div className="stat-label">Graded</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.assignmentStats.averageScore}%</div>
                <div className="stat-label">Average Score</div>
              </div>
            </div>
            
            <div className="on-time-stat">
              <div className="on-time-label">On-Time Submission Rate</div>
              <div className="on-time-meter">
                <div className="meter-fill" style={{ width: `${statistics.assignmentStats.onTimeSubmissionRate}%` }}></div>
                <div className="meter-value">{statistics.assignmentStats.onTimeSubmissionRate}%</div>
              </div>
            </div>
            
            <div className="assignment-completion">
              <div className="completion-title">Assignment Completion Status</div>
              <div className="completion-chart">
                <div className="completion-segment submitted" style={{ width: `${(statistics.assignmentStats.submitted / statistics.assignmentStats.total) * 100}%` }}></div>
                <div className="completion-segment graded" style={{ width: `${(statistics.assignmentStats.graded / statistics.assignmentStats.total) * 100}%` }}></div>
                <div className="completion-segment pending" style={{ width: `${((statistics.assignmentStats.submitted - statistics.assignmentStats.graded) / statistics.assignmentStats.total) * 100}%` }}></div>
                <div className="completion-segment not-submitted" style={{ width: `${((statistics.assignmentStats.total - statistics.assignmentStats.submitted) / statistics.assignmentStats.total) * 100}%` }}></div>
              </div>
              <div className="completion-legend">
                <div className="legend-item">
                  <div className="legend-color graded"></div>
                  <div className="legend-label">Graded</div>
                </div>
                <div className="legend-item">
                  <div className="legend-color pending"></div>
                  <div className="legend-label">Submitted, Not Graded</div>
                </div>
                <div className="legend-item">
                  <div className="legend-color not-submitted"></div>
                  <div className="legend-label">Not Submitted</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="download-report">
        <button className="download-btn">
          <span className="download-icon">📊</span> Export Full Report
        </button>
      </div>
    </div>
  );
};

export default CourseStatistics;