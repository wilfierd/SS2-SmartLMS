// src/components/dashboard/InstructorDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

// Course Management Card
const CourseCard = ({ course }) => {
  return (
    <div className="course-card instructor-course">
      <div className="course-card-header">
        {course.thumbnail_url && (
          <img 
            src={course.thumbnail_url} 
            alt={course.title} 
            className="course-thumbnail"
          />
        )}
        <div className="course-card-overlay">
          <h3 className="course-title">{course.title}</h3>
          <span className={`course-status-badge ${course.status}`}>
            {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
          </span>
        </div>
      </div>
      <div className="course-card-body">
        <div className="course-description">
          {course.description || "No description available."}
        </div>
        <div className="course-stats">
          <div className="stat-item">
            <i className="fa fa-users"></i>
            <span>{course.enrollment_count || 0} Students</span>
          </div>
          <div className="stat-item">
            <i className="fa fa-calendar"></i>
            <span>
              {course.start_date ? new Date(course.start_date).toLocaleDateString() : 'No start date'}
            </span>
          </div>
        </div>
      </div>
      <div className="course-card-footer instructor-actions">
        <Link to={`/courses/${course.id}/edit`} className="edit-button">
          Edit Course
        </Link>
        <Link to={`/courses/${course.id}/manage`} className="manage-button">
          Manage Content
        </Link>
        <Link to={`/courses/${course.id}/students`} className="students-button">
          View Students
        </Link>
      </div>
    </div>
  );
};

// Recent Submission Card
const SubmissionCard = ({ submission }) => {
  const submissionDate = new Date(submission.submission_date);
  const now = new Date();
  const hoursAgo = Math.round((now - submissionDate) / (1000 * 60 * 60));
  
  return (
    <div className="submission-card">
      <div className="submission-header">
        <div>
          <h4 className="submission-title">{submission.assignment_title}</h4>
          <p className="submission-course">{submission.course_title}</p>
        </div>
        <span className="submission-time">
          {hoursAgo < 24 
            ? `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago` 
            : submissionDate.toLocaleDateString()}
        </span>
      </div>
      <div className="submission-details">
        <span className="student-name">
          <i className="fa fa-user"></i> {submission.student_name}
        </span>
        <span className={`submission-status ${submission.is_graded ? 'graded' : 'pending'}`}>
          {submission.is_graded ? 'Graded' : 'Needs Grading'}
        </span>
      </div>
      <div className="submission-footer">
        <Link to={`/submissions/${submission.id}`} className="grade-button">
          {submission.is_graded ? 'Review Feedback' : 'Grade Submission'}
        </Link>
      </div>
    </div>
  );
};

// Upcoming Session Card
const UpcomingSessionCard = ({ session }) => {
  const sessionDate = new Date(session.start_time);
  const isToday = new Date().toDateString() === sessionDate.toDateString();
  
  return (
    <div className={`upcoming-session instructor-session ${isToday ? 'today' : ''}`}>
      <div className="session-header">
        <div>
          <h4 className="session-title">{session.title}</h4>
          <p className="session-course">{session.course_title}</p>
        </div>
        <span className={`date-badge ${isToday ? 'today' : ''}`}>
          {isToday ? 'Today' : sessionDate.toLocaleDateString()}
        </span>
      </div>
      <div className="session-time">
        <i className="fa fa-clock"></i>
        <span>
          {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
          {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="session-footer">
        <div className="session-platform">
          <span>Platform: {session.platform}</span>
          <span>Students: {session.attendees_count || 0}</span>
        </div>
        <div className="session-actions">
          <a 
            href={session.meeting_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="host-button"
          >
            Host Session
          </a>
          <Link to={`/sessions/${session.id}/edit`} className="edit-session">
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
};

// Main Instructor Dashboard Component
const InstructorDashboard = () => {
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    totalAssignments: 0,
    pendingGrading: 0,
    upcomingSessions: 0
  });
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get courses taught by instructor
        const coursesResponse = await axios.get('/api/courses', {
          params: { instructor: auth.user.id }
        });
        setCourses(coursesResponse.data);
        
        if (coursesResponse.data.length > 0) {
          // Get submissions for all courses
          const submissionsPromises = coursesResponse.data.map(course => 
            axios.get(`/api/courses/${course.id}/submissions`, {
              params: { status: 'all', limit: 5 }
            })
          );
          
          const submissionsResponses = await Promise.all(submissionsPromises);
          const allSubmissions = submissionsResponses.flatMap(response => response.data);
          
          // Sort submissions by date (most recent first)
          const sortedSubmissions = allSubmissions
            .sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date))
            .slice(0, 10);
          
          setRecentSubmissions(sortedSubmissions);
          
          // Get upcoming sessions
          const sessionsPromises = coursesResponse.data.map(course => 
            axios.get(`/api/courses/${course.id}/live-sessions`)
          );
          
          const sessionsResponses = await Promise.all(sessionsPromises);
          const allSessions = sessionsResponses.flatMap(response => response.data);
          
          // Filter and sort upcoming sessions
          const upcoming = allSessions
            .filter(session => new Date(session.start_time) > new Date())
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            .slice(0, 5);
          
          setUpcomingSessions(upcoming);
          
          // Calculate dashboard stats
          const totalStudents = coursesResponse.data.reduce(
            (sum, course) => sum + (course.enrollment_count || 0), 0
          );
          
          const pendingGrading = allSubmissions.filter(
            submission => !submission.is_graded
          ).length;
          
          setDashboardStats({
            totalStudents,
            totalCourses: coursesResponse.data.length,
            pendingGrading,
            upcomingSessions: upcoming.length
          });
        }
      } catch (error) {
        console.error('Error fetching instructor dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [auth.user.id]);

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Instructor Dashboard</h1>
      
      {/* Instructor Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon courses-icon">
            <i className="fa fa-book"></i>
          </div>
          <div className="stat-content">
            <h2 className="stat-value">{dashboardStats.totalCourses}</h2>
            <p className="stat-label">Courses</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon students-icon">
            <i className="fa fa-users"></i>
          </div>
          <div className="stat-content">
            <h2 className="stat-value">{dashboardStats.totalStudents}</h2>
            <p className="stat-label">Students</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon grading-icon">
            <i className="fa fa-tasks"></i>
          </div>
          <div className="stat-content">
            <h2 className="stat-value">{dashboardStats.pendingGrading}</h2>
            <p className="stat-label">Pending Grades</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon sessions-icon">
            <i className="fa fa-video"></i>
          </div>
          <div className="stat-content">
            <h2 className="stat-value">{dashboardStats.upcomingSessions}</h2>
            <p className="stat-label">Upcoming Sessions</p>
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="instructor-actions-panel">
        <Link to="/courses/create" className="action-button create-course">
          <i className="fa fa-plus-circle"></i>
          <span>Create New Course</span>
        </Link>
        
        <Link to="/sessions/schedule" className="action-button schedule-session">
          <i className="fa fa-calendar-plus"></i>
          <span>Schedule Live Session</span>
        </Link>
        
        <Link to="/assignments/create" className="action-button create-assignment">
          <i className="fa fa-tasks"></i>
          <span>Create Assignment</span>
        </Link>
        
        <Link to="/announcements/create" className="action-button create-announcement">
          <i className="fa fa-bullhorn"></i>
          <span>Post Announcement</span>
        </Link>
      </div>
      
      <div className="dashboard-grid">
        {/* Main content - Courses */}
        <div className="main-content">
          <div className="content-header">
            <h2 className="section-title">My Courses</h2>
            <Link to="/courses" className="view-all-link">View All</Link>
          </div>
          
          {courses.length === 0 ? (
            <div className="empty-state">
              <p className="empty-message">You don't have any courses yet.</p>
              <Link to="/courses/create" className="action-button">
                Create Your First Course
              </Link>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.slice(0, 4).map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
          
          {/* Recent submissions section */}
          <div className="submissions-section">
            <div className="content-header">
              <h2 className="section-title">Recent Submissions</h2>
              <Link to="/submissions" className="view-all-link">View All</Link>
            </div>
            
            {recentSubmissions.length === 0 ? (
              <div className="empty-state">
                <p className="empty-message">No submissions to review.</p>
              </div>
            ) : (
              <div className="submissions-list">
                {recentSubmissions.slice(0, 5).map(submission => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Sidebar - Upcoming sessions */}
        <div className="dashboard-sidebar">
          <div className="sidebar-section">
            <div className="content-header">
              <h2 className="section-title">Upcoming Sessions</h2>
              <Link to="/sessions" className="view-all-link">View All</Link>
            </div>
            
            {upcomingSessions.length === 0 ? (
              <div className="empty-state">
                <p className="empty-message">No upcoming sessions scheduled.</p>
                <Link to="/sessions/schedule" className="action-button">
                  Schedule Session
                </Link>
              </div>
            ) : (
              <div className="sessions-list">
                {upcomingSessions.map(session => (
                  <UpcomingSessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>
          
          {/* Instructor tools section */}
          <div className="sidebar-section">
            <h2 className="section-title">Instructor Tools</h2>
            <div className="tools-list">
              <Link to="/analytics" className="tool-card">
                <div className="tool-icon">
                  <i className="fa fa-chart-bar"></i>
                </div>
                <div className="tool-info">
                  <h3 className="tool-name">Analytics</h3>
                  <p className="tool-description">View course performance and student progress</p>
                </div>
              </Link>
              
              <Link to="/ai-assistant" className="tool-card">
                <div className="tool-icon">
                  <i className="fa fa-robot"></i>
                </div>
                <div className="tool-info">
                  <h3 className="tool-name">AI Assistant</h3>
                  <p className="tool-description">Generate content and assessments</p>
                </div>
              </Link>
              
              <Link to="/gradebook" className="tool-card">
                <div className="tool-icon">
                  <i className="fa fa-graduation-cap"></i>
                </div>
                <div className="tool-info">
                  <h3 className="tool-name">Gradebook</h3>
                  <p className="tool-description">Manage student grades and feedback</p>
                </div>
              </Link>
              
              <Link to="/resources" className="tool-card">
                <div className="tool-icon">
                  <i className="fa fa-book"></i>
                </div>
                <div className="tool-info">
                  <h3 className="tool-name">Resource Library</h3>
                  <p className="tool-description">Browse and use teaching materials</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;