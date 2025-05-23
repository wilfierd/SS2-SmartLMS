// src/components/course/CourseStatistics.js - Fixed to use correct API endpoints
import React, { useState, useEffect } from 'react';
import courseService from '../../services/courseService';
import notification from '../../utils/notification';
import './CourseStatistics.css';

const CourseStatistics = ({ courseId, auth }) => {
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch course statistics using the existing endpoint
  useEffect(() => {
    const fetchStatistics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Use the existing statistics endpoint from server.js
        const statsData = await courseService.getCourseStatistics(courseId);
        setStatistics(statsData);
        
      } catch (error) {
        console.error('Error fetching course statistics:', error);
        setError(error.message || "Failed to load course statistics");
        notification.error('Failed to load course statistics');
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      fetchStatistics();
    }
  }, [courseId]);

  // Calculate distribution for chart from enrollment data
  const calculateDistribution = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [
        { range: '0-59', min: 0, max: 59, count: 0 },
        { range: '60-69', min: 60, max: 69, count: 0 },
        { range: '70-79', min: 70, max: 79, count: 0 },
        { range: '80-89', min: 80, max: 89, count: 0 },
        { range: '90-100', min: 90, max: 100, count: 0 }
      ];
    }

    // Define score ranges
    const ranges = [
      { range: '0-59', min: 0, max: 59, count: 0 },
      { range: '60-69', min: 60, max: 69, count: 0 },
      { range: '70-79', min: 70, max: 79, count: 0 },
      { range: '80-89', min: 80, max: 89, count: 0 },
      { range: '90-100', min: 90, max: 100, count: 0 }
    ];

    // For demonstration, create some sample distribution based on completion trend
    data.forEach(item => {
      const completionPercentage = item.completions > 0 ? (item.completions / item.enrollments) * 100 : 0;
      
      for (const range of ranges) {
        if (completionPercentage >= range.min && completionPercentage <= range.max) {
          range.count++;
          break;
        }
      }
    });

    return ranges;
  };

  // Render a distribution chart
  const renderDistribution = (distribution, title) => {
    if (!distribution || distribution.length === 0) {
      return <div className="no-data">No distribution data available</div>;
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
                    height: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : '1%',
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

  if (error) {
    return (
      <div className="statistics-error">
        <h3>Unable to Load Statistics</h3>
        <p>There was an issue loading the course statistics: {error}</p>
        <p>Please try refreshing the page or contact support if the problem persists.</p>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="no-data">
        <h3>No Statistics Available</h3>
        <p>Statistics will be available once students start engaging with the course content.</p>
      </div>
    );
  }

  // Calculate completion rate
  const completionRate = statistics.enrollmentStats?.total_students > 0 
    ? Math.round((statistics.enrollmentStats.completed_count / statistics.enrollmentStats.total_students) * 100)
    : 0;

  // Calculate assignment submission rate
  const assignmentSubmissionRate = statistics.assignmentStats?.total_assignments > 0
    ? Math.round((statistics.assignmentStats.total_submissions / statistics.assignmentStats.total_assignments) * 100)
    : 0;

  // Calculate grading completion rate
  const gradingRate = statistics.assignmentStats?.total_submissions > 0
    ? Math.round((statistics.assignmentStats.graded_count / statistics.assignmentStats.total_submissions) * 100)
    : 0;

  return (
    <div className="course-statistics-container">
      <div className="statistics-header">
        <h2>Course Statistics & Analytics</h2>
      </div>
      
      <div className="statistics-grid">
        {/* Enrollment Statistics */}
        <div className="statistics-card enrollment-stats">
          <h3>Enrollment & Completion</h3>
          <div className="stats-body">
            <div className="stat-row">
              <div className="stat-item">
                <div className="stat-value">{statistics.enrollmentStats?.total_students || 0}</div>
                <div className="stat-label">Total Enrolled</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.enrollmentStats?.in_progress_count || 0}</div>
                <div className="stat-label">In Progress</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.enrollmentStats?.completed_count || 0}</div>
                <div className="stat-label">Completed</div>
              </div>
            </div>
            
            <div className="progress-container">
              <div className="progress-label">Course Completion Rate</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <div className="progress-percentage">{completionRate}%</div>
            </div>
          </div>
        </div>

        {/* Quiz Statistics */}
        <div className="statistics-card quiz-stats">
          <h3>Quiz Performance</h3>
          <div className="stats-body">
            <div className="stat-row">
              <div className="stat-item">
                <div className="stat-value">{statistics.quizStats?.total_quizzes || 0}</div>
                <div className="stat-label">Total Quizzes</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.quizStats?.total_attempts || 0}</div>
                <div className="stat-label">Total Attempts</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {statistics.quizStats?.average_score ? Math.round(statistics.quizStats.average_score) : 0}%
                </div>
                <div className="stat-label">Average Score</div>
              </div>
            </div>
            
            <div className="quiz-performance">
              <div className="performance-label">Passing Rate</div>
              <div className="performance-stat">
                <span className="passing-count">{statistics.quizStats?.passing_count || 0}</span>
                <span className="total-attempts">/ {statistics.quizStats?.total_attempts || 0}</span>
                <span className="percentage">
                  ({statistics.quizStats?.total_attempts > 0 
                    ? Math.round((statistics.quizStats.passing_count / statistics.quizStats.total_attempts) * 100)
                    : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Assignment Statistics */}
        <div className="statistics-card assignment-stats">
          <h3>Assignment Performance</h3>
          <div className="stats-body">
            <div className="stat-row">
              <div className="stat-item">
                <div className="stat-value">{statistics.assignmentStats?.total_assignments || 0}</div>
                <div className="stat-label">Total Assignments</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.assignmentStats?.total_submissions || 0}</div>
                <div className="stat-label">Submissions</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.assignmentStats?.graded_count || 0}</div>
                <div className="stat-label">Graded</div>
              </div>
            </div>
            
            <div className="assignment-rates">
              <div className="rate-item">
                <div className="rate-label">Submission Rate</div>
                <div className="rate-meter">
                  <div 
                    className="meter-fill submission-fill" 
                    style={{ width: `${assignmentSubmissionRate}%` }}
                  ></div>
                  <div className="meter-value">{assignmentSubmissionRate}%</div>
                </div>
              </div>
              
              <div className="rate-item">
                <div className="rate-label">Grading Progress</div>
                <div className="rate-meter">
                  <div 
                    className="meter-fill grading-fill" 
                    style={{ width: `${gradingRate}%` }}
                  ></div>
                  <div className="meter-value">{gradingRate}%</div>
                </div>
              </div>
            </div>

            {statistics.assignmentStats?.average_grade && (
              <div className="average-grade">
                <div className="grade-label">Average Grade</div>
                <div className="grade-value">
                  {Math.round(statistics.assignmentStats.average_grade)}/100
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Discussion Statistics */}
        <div className="statistics-card discussion-stats">
          <h3>Discussion Activity</h3>
          <div className="stats-body">
            <div className="stat-row">
              <div className="stat-item">
                <div className="stat-value">{statistics.discussionStats?.total_discussions || 0}</div>
                <div className="stat-label">Total Discussions</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.discussionStats?.total_posts || 0}</div>
                <div className="stat-label">Total Posts</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.discussionStats?.participating_students || 0}</div>
                <div className="stat-label">Active Participants</div>
              </div>
            </div>

            <div className="participation-rate">
              <div className="participation-label">Participation Rate</div>
              <div className="participation-percentage">
                {statistics.enrollmentStats?.total_students > 0
                  ? Math.round((statistics.discussionStats?.participating_students / statistics.enrollmentStats.total_students) * 100)
                  : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Trend */}
      {statistics.completionTrend && statistics.completionTrend.length > 0 && (
        <div className="statistics-card trend-chart">
          <h3>Enrollment & Completion Trend</h3>
          <div className="stats-body">
            <div className="trend-container">
              {statistics.completionTrend.map((item, index) => (
                <div key={index} className="trend-item">
                  <div className="trend-month">{item.month}</div>
                  <div className="trend-bars">
                    <div className="trend-bar enrollments" style={{ height: `${(item.enrollments / 10) * 100}%` }}>
                      <span className="bar-value">{item.enrollments}</span>
                    </div>
                    <div className="trend-bar completions" style={{ height: `${(item.completions / 10) * 100}%` }}>
                      <span className="bar-value">{item.completions}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="trend-legend">
              <div className="legend-item">
                <div className="legend-color enrollments"></div>
                <span>Enrollments</span>
              </div>
              <div className="legend-item">
                <div className="legend-color completions"></div>
                <span>Completions</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseStatistics;