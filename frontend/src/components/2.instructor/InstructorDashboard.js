// src/components/instructor/InstructorDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import './InstructorDashboard.css';
import Sidebar from  '../common/Sidebar';
import Header from  '../common/Header';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';

const InstructorDashboard = () => {
  const { auth } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Dashboard statistics
  const [stats, setStats] = useState({
    totalCourses: 3,
    totalStudents: 120,
    pendingAssignments: 15,
    upcomingSessions: 2
  });

  // Courses taught by instructor
  const [courses, setCourses] = useState([
    {
      id: 1,
      title: "Basic of Python Language",
      enrolledStudents: 45,
      completionRate: 65,
      averageGrade: 78,
      progress: 20,
      status: "Active"
    },
    {
      id: 2,
      title: "Introduction the web development",
      enrolledStudents: 38,
      completionRate: 10,
      averageGrade: 72,
      progress: 35,
      status: "Active"
    },
    {
      id: 3,
      title: "Basic data-structure and algorithm",
      enrolledStudents: 32,
      completionRate: 90,
      averageGrade: 84,
      progress: 100,
      status: "Completed"
    }
  ]);

  // Recent student activities
  const [recentActivities, setRecentActivities] = useState([
    {
      id: 1,
      studentName: "Maria Garcia",
      action: "Submitted assignment",
      course: "Basic of Python Language",
      timestamp: "2 hours ago"
    },
    {
      id: 2,
      studentName: "James Taylor",
      action: "Completed quiz",
      course: "Web Development",
      grade: "85%",
      timestamp: "5 hours ago"
    },
    {
      id: 3,
      studentName: "Alex Wilson",
      action: "Started new module",
      course: "Basic of Python Language",
      timestamp: "Yesterday"
    },
    {
      id: 4,
      studentName: "Sophie Chen",
      action: "Asked a question",
      course: "Web Development",
      timestamp: "Yesterday"
    }
  ]);

  // Upcoming sessions
  const [upcomingSessions, setUpcomingSessions] = useState([
    {
      id: 1,
      title: "Python Debugging Workshop",
      date: "Apr 20, 2025",
      time: "10:00 - 11:30 AM",
      platform: "Zoom",
      participants: 28
    },
    {
      id: 2,
      title: "Web Development Q&A",
      date: "Apr 23, 2025",
      time: "2:00 - 3:30 PM",
      platform: "Microsoft Teams",
      participants: 15
    }
  ]);

  // Pending assignments that need grading
  const [pendingAssignments, setPendingAssignments] = useState([
    {
      id: 1,
      title: "Python Functions Exercise",
      course: "Basic of Python Language",
      submittedBy: 15,
      deadline: "Apr 18, 2025"
    },
    {
      id: 2,
      title: "HTML/CSS Project",
      course: "Web Development",
      submittedBy: 12,
      deadline: "Apr 22, 2025"
    },
    {
      id: 3,
      title: "Algorithm Design Challenge",
      course: "Data Structures",
      submittedBy: 8,
      deadline: "Apr 25, 2025"
    }
  ]);

  useEffect(() => {
    const fetchInstructorData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real implementation, fetch data from your API
        // Example:
        // const response = await axios.get('/api/instructor/dashboard', {
        //   headers: { Authorization: `Bearer ${auth.token}` }
        // });
        // setStats(response.data.stats);
        // setCourses(response.data.courses);
        // setRecentActivities(response.data.recentActivities);
        // setUpcomingSessions(response.data.upcomingSessions);
        // setPendingAssignments(response.data.pendingAssignments);
        
        // Using mock data for now
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
        
      } catch (err) {
        console.error("Error fetching instructor data:", err);
        setError("Failed to load dashboard data. Please try again later.");
        setIsLoading(false);
      }
    };
    
    fetchInstructorData();
  }, [auth.token]);

  return (
    <div className="instructor-dashboard-container">
      <Sidebar activeItem="dashboard" />
      
      <div className="instructor-main-content">
        <Header title="Instructor Dashboard" />
        
        <div className="instructor-dashboard-content">
          {isLoading ? (
            <div className="loading-spinner">Loading...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <>
              <div className="welcome-section">
                <h2>Welcome, {auth.user.firstName || auth.user.email.split('@')[0]}</h2>
                <p>Here's what's happening with your courses today</p>
              </div>
              
              <div className="stats-section">
                <div className="stat-card">
                  <div className="stat-icon courses-icon">📚</div>
                  <div className="stat-info">
                    <h3>{stats.totalCourses}</h3>
                    <p>Active Courses</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon students-icon">👨‍🎓</div>
                  <div className="stat-info">
                    <h3>{stats.totalStudents}</h3>
                    <p>Total Students</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon assignments-icon">📝</div>
                  <div className="stat-info">
                    <h3>{stats.pendingAssignments}</h3>
                    <p>Pending Submissions</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon sessions-icon">🎥</div>
                  <div className="stat-info">
                    <h3>{stats.upcomingSessions}</h3>
                    <p>Upcoming Sessions</p>
                  </div>
                </div>
              </div>
              
              <div className="two-column-layout">
                <div className="main-column">
                  <div className="section-card my-courses">
                    <div className="section-header">
                      <h2>My Courses</h2>
                      <button className="action-button">Create New Course</button>
                    </div>
                    
                    <div className="courses-table">
                      <div className="table-header">
                        <div className="table-cell">Course Name</div>
                        <div className="table-cell">Students</div>
                        <div className="table-cell">Completion</div>
                        <div className="table-cell">Avg. Grade</div>
                        <div className="table-cell">Status</div>
                        <div className="table-cell">Actions</div>
                      </div>
                      
                      {courses.map(course => (
                        <div key={course.id} className="table-row">
                          <div className="table-cell course-name">{course.title}</div>
                          <div className="table-cell">{course.enrolledStudents}</div>
                          <div className="table-cell">
                            <div className="progress-bar">
                              <div 
                                className="progress-filled" 
                                style={{ width: `${course.completionRate}%` }}
                              ></div>
                            </div>
                            <div className="progress-text">{course.completionRate}%</div>
                          </div>
                          <div className="table-cell">{course.averageGrade}%</div>
                          <div className="table-cell">
                            <span className={`status-badge ${course.status.toLowerCase()}`}>
                              {course.status}
                            </span>
                          </div>
                          <div className="table-cell">
                            <button className="icon-button">📊</button>
                            <button className="icon-button">✏️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="section-card recent-activities">
                    <div className="section-header">
                      <h2>Recent Student Activities</h2>
                      <a href="#" className="view-all">View All</a>
                    </div>
                    
                    <div className="activities-list">
                      {recentActivities.map(activity => (
                        <div key={activity.id} className="activity-item">
                          <div className="activity-icon">
                            {activity.action.includes('Submitted') ? '📤' :
                             activity.action.includes('Completed') ? '✅' :
                             activity.action.includes('Started') ? '🏁' : '❓'}
                          </div>
                          <div className="activity-details">
                            <p><strong>{activity.studentName}</strong> {activity.action} in <strong>{activity.course}</strong></p>
                            {activity.grade && <p className="activity-grade">Grade: {activity.grade}</p>}
                            <p className="activity-time">{activity.timestamp}</p>
                          </div>
                          <div className="activity-actions">
                            {activity.action.includes('Submitted') && (
                              <button className="review-button">Review</button>
                            )}
                            {activity.action.includes('Asked') && (
                              <button className="answer-button">Answer</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="side-column">
                  <div className="section-card upcoming-sessions">
                    <div className="section-header">
                      <h2>Upcoming Sessions</h2>
                      <button className="action-button">Schedule New</button>
                    </div>
                    
                    {upcomingSessions.map(session => (
                      <div key={session.id} className="session-card">
                        <div className="session-header">
                          <h3>{session.title}</h3>
                          <span className="platform-badge">{session.platform}</span>
                        </div>
                        <div className="session-details">
                          <p><strong>Date:</strong> {session.date}</p>
                          <p><strong>Time:</strong> {session.time}</p>
                          <p><strong>Participants:</strong> {session.participants} enrolled</p>
                        </div>
                        <div className="session-actions">
                          <button className="primary-button">Start Session</button>
                          <button className="secondary-button">Edit Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="section-card pending-grades">
                    <div className="section-header">
                      <h2>Pending Assignments</h2>
                      <a href="#" className="view-all">View All</a>
                    </div>
                    
                    {pendingAssignments.map(assignment => (
                      <div key={assignment.id} className="pending-item">
                        <div className="pending-icon">📋</div>
                        <div className="pending-details">
                          <h3>{assignment.title}</h3>
                          <p>{assignment.course}</p>
                          <p><strong>{assignment.submittedBy}</strong> submissions need grading</p>
                          <p className="deadline">Deadline: {assignment.deadline}</p>
                        </div>
                        <button className="grade-button">Grade Now</button>
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

export default InstructorDashboard;