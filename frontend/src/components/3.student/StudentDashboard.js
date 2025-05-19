// src/components/student/StudentDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import './StudentDashboard.css';
import Sidebar from '../common/Sidebar';
import Header from  '../common/Header';
import AuthContext from '../../context/AuthContext';
import CourseRecommendations from '../recommendations/CourseRecommendations';
import axios from 'axios';

const StudentDashboard = () => {
  const { auth } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dashboard data
  const [enrolledCourses, setEnrolledCourses] = useState([
    {
      id: 1,
      title: "Basic of Python Language",
      instructorName: "John Smith",
      progress: 20,
      nextLesson: "Functions and Objects",
      status: "In Progress",
      lastAccessed: "2 days ago"
    },
    {
      id: 2,
      title: "Introduction the web development",
      instructorName: "Sarah Johnson",
      progress: 0,
      nextLesson: "HTML Essentials",
      status: "Not Started",
      lastAccessed: "Never"
    },
    {
      id: 3,
      title: "Basic data-structure and algorithm",
      instructorName: "Michael Brown",
      progress: 100,
      status: "Completed",
      completionDate: "Mar 15, 2025"
    }
  ]);

  const [upcomingDeadlines, setUpcomingDeadlines] = useState([
    {
      id: 1,
      title: "Python Functions Exercise",
      courseTitle: "Basic of Python Language",
      dueDate: "Apr 22, 2025",
      type: "assignment",
      submitted: false
    },
    {
      id: 2,
      title: "JavaScript Basics Quiz",
      courseTitle: "Introduction to Web Development",
      dueDate: "Apr 25, 2025",
      type: "quiz",
      submitted: false
    },
    {
      id: 3,
      title: "Data Structures Final Project",
      courseTitle: "Basic data-structure and algorithm",
      dueDate: "May 5, 2025",
      type: "project",
      submitted: false
    }
  ]);

  const [upcomingSessions, setUpcomingSessions] = useState([
    {
      id: 1,
      title: "Python Debugging Workshop",
      courseTitle: "Basic of Python Language",
      date: "Apr 20, 2025",
      time: "10:00 - 11:30 AM",
      platform: "Zoom",
      instructorName: "John Smith"
    },
    {
      id: 2,
      title: "Web Development Q&A",
      courseTitle: "Introduction to Web Development",
      date: "Apr 23, 2025",
      time: "2:00 - 3:30 PM",
      platform: "Microsoft Teams",
      instructorName: "Sarah Johnson"
    }
  ]);

  const [recentGrades, setRecentGrades] = useState([
    {
      id: 1,
      title: "Variables and Data Types Quiz",
      courseTitle: "Basic of Python Language",
      grade: "85%",
      maxGrade: "100%",
      gradedDate: "Apr 10, 2025"
    },
    {
      id: 2,
      title: "Introduction to Programming Assignment",
      courseTitle: "Basic of Python Language",
      grade: "92%",
      maxGrade: "100%",
      gradedDate: "Apr 5, 2025"
    },
    {
      id: 3,
      title: "HTML Structure Assignment",
      courseTitle: "Introduction to Web Development",
      grade: "88%",
      maxGrade: "100%",
      gradedDate: "Mar 28, 2025"
    }
  ]);

  // Recommendations
  const [recommendations, setRecommendations] = useState([
    {
      id: 1,
      title: "Advanced JavaScript",
      instructorName: "Sarah Johnson",
      description: "Deep dive into JavaScript frameworks and modern practices",
      enrolled: 240,
      rating: 4.8
    },
    {
      id: 2,
      title: "Mobile App Development",
      instructorName: "Michael Brown",
      description: "Introduction to building mobile applications with React Native",
      enrolled: 180,
      rating: 4.6
    }
  ]);

  useEffect(() => {
    const fetchStudentData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real implementation, fetch data from your API
        // Example:
        // const response = await axios.get('/api/student/dashboard', {
        //   headers: { Authorization: `Bearer ${auth.token}` }
        // });
        // setEnrolledCourses(response.data.enrolledCourses);
        // setUpcomingDeadlines(response.data.upcomingDeadlines);
        // ...
        
        // Using mock data for now
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
        
      } catch (err) {
        console.error("Error fetching student data:", err);
        setError("Failed to load dashboard data. Please try again later.");
        setIsLoading(false);
      }
    };
    
    fetchStudentData();
  }, [auth.token]);

  return (
    <div className="student-dashboard-container">
      <Sidebar activeItem="dashboard" />
      
      <div className="student-main-content">
        <Header title="Student Dashboard" />
        
        <div className="student-dashboard-content">
          {isLoading ? (
            <div className="loading-spinner">Loading...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <>
              <div className="welcome-section">
                <h2>Welcome back, {auth.user.firstName || auth.user.email.split('@')[0]}</h2>
                <p>Continue your learning journey</p>
              </div>
              
              <div className="enrolled-courses-section">
                <div className="section-header">
                  <h2>My Courses</h2>
                  <a href="#" className="browse-courses-btn">Browse More Courses</a>
                </div>

                {/* Course Recommendations */}
                <CourseRecommendations limit={3} />
                
                <div className="courses-grid">
                  {enrolledCourses.map(course => (
                    <div key={course.id} className="course-card">
                      <div className="course-header">
                        <h3>{course.title}</h3>
                        <span className={`status-badge ${course.status.toLowerCase().replace(' ', '-')}`}>
                          {course.status}
                        </span>
                      </div>
                      
                      <p className="instructor">Instructor: {course.instructorName}</p>
                      
                      {course.status === "Completed" ? (
                        <div className="completion-info">
                          <p>Completed on: {course.completionDate}</p>
                          <button className="certificate-btn">View Certificate</button>
                        </div>
                      ) : (
                        <div className="progress-info">
                          <div className="progress-header">
                            <span>Progress</span>
                            <span>{course.progress}%</span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-filled" 
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                          {course.nextLesson && (
                            <p className="next-lesson">Next: {course.nextLesson}</p>
                          )}
                          <p className="last-accessed">Last accessed: {course.lastAccessed}</p>
                          <button className="continue-btn">Continue Learning</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="two-column-section">
                <div className="upcoming-deadlines-section">
                  <div className="section-header">
                    <h2>Upcoming Deadlines</h2>
                    <a href="#" className="view-all">View Calendar</a>
                  </div>
                  
                  <div className="deadlines-list">
                    {upcomingDeadlines.map(deadline => (
                      <div key={deadline.id} className="deadline-item">
                        <div className="deadline-icon">
                          {deadline.type === 'assignment' ? '📝' : 
                           deadline.type === 'quiz' ? '📋' : '🏆'}
                        </div>
                        <div className="deadline-details">
                          <h3>{deadline.title}</h3>
                          <p>{deadline.courseTitle}</p>
                          <p className="deadline-date">Due: {deadline.dueDate}</p>
                        </div>
                        <button className={`deadline-btn ${deadline.submitted ? 'submitted' : ''}`}>
                          {deadline.submitted ? 'Submitted' : (
                            deadline.type === 'assignment' ? 'Submit' : 
                            deadline.type === 'quiz' ? 'Take Quiz' : 'View Details'
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="upcoming-sessions-section">
                  <div className="section-header">
                    <h2>Upcoming Live Sessions</h2>
                    <a href="#" className="view-all">View All</a>
                  </div>
                  
                  <div className="sessions-list">
                    {upcomingSessions.map(session => (
                      <div key={session.id} className="session-item">
                        <div className="session-date-time">
                          <div className="session-date">{session.date.split(' ')[1]}</div>
                          <div className="session-month">{session.date.split(' ')[0]}</div>
                        </div>
                        <div className="session-details">
                          <h3>{session.title}</h3>
                          <p>{session.courseTitle}</p>
                          <p className="session-info">
                            <span>{session.time}</span>
                            <span className="platform-badge">{session.platform}</span>
                          </p>
                          <p className="instructor-name">with {session.instructorName}</p>
                        </div>
                        <button className="join-btn">Set Reminder</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="two-column-section">
                <div className="recent-grades-section">
                  <div className="section-header">
                    <h2>Recent Grades</h2>
                    <a href="#" className="view-all">View All</a>
                  </div>
                  
                  <div className="grades-list">
                    {recentGrades.map(grade => (
                      <div key={grade.id} className="grade-item">
                        <div className="grade-details">
                          <h3>{grade.title}</h3>
                          <p>{grade.courseTitle}</p>
                          <p className="grade-date">Graded: {grade.gradedDate}</p>
                        </div>
                        <div className="grade-value">
                          <div className="grade">{grade.grade}</div>
                          <div className="max-grade">out of {grade.maxGrade}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="recommendations-section">
                  <div className="section-header">
                    <h2>Recommended Courses</h2>
                    <a href="#" className="view-all">View More</a>
                  </div>
                  
                  <div className="recommendations-list">
                    {recommendations.map(course => (
                      <div key={course.id} className="recommendation-item">
                        <div className="recommendation-details">
                          <h3>{course.title}</h3>
                          <p>Instructor: {course.instructorName}</p>
                          <p className="recommendation-description">{course.description}</p>
                          <div className="recommendation-stats">
                            <span><strong>{course.enrolled}</strong> students</span>
                            <span><strong>{course.rating}</strong> ★</span>
                          </div>
                        </div>
                        <button className="enroll-btn">Enroll Now</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;