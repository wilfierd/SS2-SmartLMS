// src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import Sidebar from './Sidebar';
import Header from './Header';
import axios from 'axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    coursesCount: 63,
    usersCount: 1200,
    sessionsCount: 72,
    activeUsers: 72
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Calendar data for the current week
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const currentDay = new Date().getDay();
  
  // Featured courses
  const [featuredCourses, setFeaturedCourses] = useState([
    {
      id: 1,
      name: "Network Security Essentials",
      abbreviation: "NSE",
      lessons: 5,
      quizzes: 40,
      description: "40 questions related to Network Security from Lesson 1 to Lesson 5",
      instructor: "Vuong Quang Huy"
    },
    {
      id: 2,
      name: "Web Programming Refresher",
      abbreviation: "WPR",
      lessons: 10,
      exercises: 4,
      description: "Some exercises to get prepared for Final Exam!",
      instructor: "Đặng Đình Quân"
    }
  ]);

  // Enrolled courses
  const [enrolledCourses, setEnrolledCourses] = useState([
    {
      id: 1,
      name: "Basic of Python Language",
      progress: 20,
      status: "In Progress",
      lessons_completed: 2,
      total_lessons: 10
    },
    {
      id: 2,
      name: "Introduction the web development",
      progress: 0,
      status: "Not Started",
      lessons_completed: 0,
      total_lessons: 10
    },
    {
      id: 3,
      name: "Basic data-structure and algorithm",
      progress: 100,
      status: "Completed",
      lessons_completed: 8,
      total_lessons: 8
    },
    {
      id: 4,
      name: "Computer Network",
      progress: 100,
      status: "Completed",
      lessons_completed: 12,
      total_lessons: 12
    }
  ]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real implementation, you would fetch this data from your API
        // For example:
        // const response = await axios.get('/api/admin/dashboard-stats');
        // setStats(response.data);
        
        // Using mock data for now
        setTimeout(() => {
          setStats({
            coursesCount: 63,
            usersCount: 1200,
            sessionsCount: 72,
            activeUsers: 72
          });
          
          setIsLoading(false);
        }, 500);
        
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <div className="admin-dashboard-container">
      <Sidebar activeItem="dashboard" />
      
      <div className="admin-main-content">
        <Header title="Admin Dashboard" />
        
        <div className="dashboard-content">
          <div className="status-section">
            <h2>All Status</h2>
            
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-icon courses-icon">📚</div>
                <div className="stat-info">
                  <h3>{stats.coursesCount} courses</h3>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon users-icon">👥</div>
                <div className="stat-info">
                  <h3>{stats.usersCount} users</h3>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon sessions-icon">🎮</div>
                <div className="stat-info">
                  <h3>{stats.sessionsCount} sessions</h3>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon active-icon">👤</div>
                <div className="stat-info">
                  <h3>{stats.activeUsers} active users</h3>
                </div>
              </div>
            </div>
          </div>
          
          <div className="charts-section">
            <div className="chart-container">
              <h3>Lecturers / Students Ratio</h3>
              <div className="chart-placeholder">
                {/* In a real implementation, you would use a charting library here */}
                <div className="mock-chart">
                  <div className="chart-bar" style={{ height: '70%', backgroundColor: '#3498db' }}>
                    <span>Students</span>
                  </div>
                  <div className="chart-bar" style={{ height: '30%', backgroundColor: '#e74c3c' }}>
                    <span>Lecturers</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="chart-container">
              <h3>Course Enrollment Trends</h3>
              <div className="chart-placeholder">
                {/* In a real implementation, you would use a charting library here */}
                <div className="mock-line-chart">
                  <div className="line-point" style={{ bottom: '20%', left: '10%' }}></div>
                  <div className="line-point" style={{ bottom: '40%', left: '30%' }}></div>
                  <div className="line-point" style={{ bottom: '35%', left: '50%' }}></div>
                  <div className="line-point" style={{ bottom: '60%', left: '70%' }}></div>
                  <div className="line-point" style={{ bottom: '70%', left: '90%' }}></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="calendar-section">
            <h2>April 2025 <span className="calendar-controls">◀ ▶</span></h2>
            <div className="calendar-week">
              {weekDays.map((day, index) => (
                <div 
                  key={day}
                  className={`calendar-day ${index === currentDay - 1 ? 'current-day' : ''}`}
                >
                  <div className="day-name">{day}</div>
                  <div className="day-number">{26 + index}</div>
                </div>
              ))}
            </div>
            
            <div className="upcoming-assignments">
              <div className="assignment-card">
                <div className="assignment-icon">📝</div>
                <div className="assignment-details">
                  <div className="assignment-date">Due Date: May 01, 2025</div>
                  <div className="assignment-title">Assignment 04</div>
                  <div className="assignment-description">Make a search engine in Java</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="featured-section">
            <h2>Featured <a href="#" className="view-all-link">COURSE CATALOG</a></h2>
            <div className="featured-courses">
              {featuredCourses.map((course) => (
                <div key={course.id} className="featured-course-card">
                  <div className="course-icon">🎓</div>
                  <div className="course-details">
                    <div className="course-header">
                      <div className="course-abbr">{course.abbreviation}</div>
                      <div className="course-stats">
                        <span>{course.lessons} lessons</span>
                        <span>{course.quizzes || course.exercises} {course.quizzes ? 'quizzes' : 'exercises'}</span>
                      </div>
                    </div>
                    <div className="course-title">{course.description}</div>
                    <div className="course-instructor">👨‍🏫 {course.instructor}</div>
                    <div className="course-continue">Continue &gt;&gt;</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="enrolled-section">
            <h2>Enrolled Courses</h2>
            <div className="enrolled-courses">
              {enrolledCourses.map((course) => (
                <div key={course.id} className="enrolled-course-row">
                  <div className="course-icon">📚</div>
                  <div className="course-name">{course.name}</div>
                  <div className="course-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-filled" 
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="course-status">
                    <span className={`status-badge ${course.status.toLowerCase().replace(' ', '-')}`}>
                      {course.status === "Completed" ? "Completed" : `${course.lessons_completed}/${course.total_lessons}`}
                    </span>
                  </div>
                  <div className="course-actions">
                    {course.status === "Completed" && (
                      <button className="view-certificate-btn">View Certificate</button>
                    )}
                    {course.status !== "Completed" && (
                      <>
                        <button className="view-details-btn">...</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;