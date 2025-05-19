// src/components/course/CourseStatistics.js - Using Real Data
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import './CourseStatistics.css';

const CourseStatistics = ({ courseId, auth }) => {
  const [students, setStudents] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const API_URL = config.apiUrl;

  // Fetch all needed data
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch enrolled students
        const studentsPromise = axios.get(`${API_URL}/courses/${courseId}/students`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        
        // Fetch quizzes
        const quizzesPromise = axios.get(`${API_URL}/courses/${courseId}/quizzes`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        
        // Fetch tests
        const testsPromise = axios.get(`${API_URL}/courses/${courseId}/tests`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }).catch(() => ({ data: [] })); // Fallback if endpoint doesn't exist
        
        // Fetch assignments
        const assignmentsPromise = axios.get(`${API_URL}/courses/${courseId}/assignments`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        
        // Wait for all data to load
        const [studentsRes, quizzesRes, testsRes, assignmentsRes] = await Promise.all([
          studentsPromise,
          quizzesPromise,
          testsPromise,
          assignmentsPromise
        ]);
        
        setStudents(studentsRes.data);
        setQuizzes(quizzesRes.data);
        setTests(Array.isArray(testsRes.data) ? testsRes.data : []);
        setAssignments(assignmentsRes.data);
        
      } catch (error) {
        console.error('Error fetching course data:', error);
        setError(error.message || "Failed to load course data");
        notification.error('Failed to load course statistics');
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId && auth.token) {
      fetchAllData();
    }
  }, [courseId, auth.token, API_URL]);
  
  // Calculate statistics from fetched data
  const calculateStatistics = () => {
    // Enrollment stats
    const totalStudents = students.length;
    
    // Calculate active students (enrolled in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeStudents = students.filter(student => {
      const enrollmentDate = new Date(student.enrollment_date);
      return enrollmentDate >= thirtyDaysAgo;
    }).length;
    
    // Completion rate - estimate based on active students and assignments completed
    let completionRate = 0;
    if (totalStudents > 0) {
      // Simple estimation: % of active students compared to total
      completionRate = Math.round((activeStudents / totalStudents) * 100);
    }
    
    // Quiz stats
    const quizScores = quizzes.flatMap(quiz => 
      (quiz.attempts || []).map(attempt => attempt.score || 0)
    );
    
    const averageQuizScore = quizScores.length > 0 
      ? Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length)
      : 0;
      
    const highestQuizScore = quizScores.length > 0 
      ? Math.max(...quizScores)
      : 0;
      
    const lowestQuizScore = quizScores.length > 0 
      ? Math.min(...quizScores)
      : 0;
    
    // Assignment stats  
    const totalAssignments = assignments.length;
    const submittedAssignments = assignments.filter(a => a.submission).length;
    const gradedAssignments = assignments.filter(a => a.submission && a.submission.is_graded).length;
    
    const assignmentScores = assignments
      .filter(a => a.submission && a.submission.is_graded)
      .map(a => a.submission.grade);
      
    const averageAssignmentScore = assignmentScores.length > 0
      ? Math.round(assignmentScores.reduce((sum, score) => sum + score, 0) / assignmentScores.length)
      : 0;
    
    // On-time submission rate
    const onTimeSubmissions = assignments
      .filter(a => a.submission && !a.submission.is_late)
      .length;
      
    const onTimeRate = submittedAssignments > 0
      ? Math.round((onTimeSubmissions / submittedAssignments) * 100)
      : 0;
    
    // Create quiz distribution
    const distribution = calculateDistribution(quizScores);
    
    return {
      enrollmentStats: {
        totalStudents,
        activeStudents,
        completionRate
      },
      quizStats: {
        total: quizzes.length,
        averageScore: averageQuizScore,
        highestScore: highestQuizScore,
        lowestScore: lowestQuizScore,
        distribution
      },
      assignmentStats: {
        total: totalAssignments,
        submitted: submittedAssignments,
        graded: gradedAssignments,
        averageScore: averageAssignmentScore,
        onTimeSubmissionRate: onTimeRate
      }
    };
  };
  
  // Calculate distribution for chart
  const calculateDistribution = (scores) => {
    // Define score ranges
    const ranges = [
      { range: '0-59', min: 0, max: 59, count: 0 },
      { range: '60-69', min: 60, max: 69, count: 0 },
      { range: '70-79', min: 70, max: 79, count: 0 },
      { range: '80-89', min: 80, max: 89, count: 0 },
      { range: '90-100', min: 90, max: 100, count: 0 }
    ];
    
    // Count scores in each range
    scores.forEach(score => {
      for (const range of ranges) {
        if (score >= range.min && score <= range.max) {
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

  // Calculate statistics from real data
  const statistics = calculateStatistics();

  return (
    <div className="course-statistics-container">
      <div className="statistics-header">
        <h2>Course Statistics & Analytics</h2>
      </div>
      
      {error && (
        <div className="statistics-error">
          <p>There was an issue loading some course data: {error}</p>
          <p>Some statistics may be incomplete or unavailable.</p>
        </div>
      )}
      
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
                <div className="stat-label">Est. Completion Rate</div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseStatistics;