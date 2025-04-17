// src/components/dashboard/StudentDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

// Course Card Component
const CourseCard = ({ course }) => {
  return (
    <div className="course-card">
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
          <p className="instructor-name">
            Instructor: {course.instructor_first_name} {course.instructor_last_name}
          </p>
        </div>
      </div>
      <div className="course-card-body">
        <div className="course-description">
          {course.description || "No description available."}
        </div>
        <div className="course-meta">
          <span className="course-modules">
            <i className="fa fa-book"></i>
            {course.modules_count || 0} modules • {course.lessons_count || 0} lessons
          </span>
        </div>
        <div className="course-enrollment-date">
          <i className="fa fa-clock"></i>
          <span>
            Enrolled: {new Date(course.enrollment_date).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="course-card-footer">
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${course.progress || 0}%` }}
          />
        </div>
        <div className="course-progress-info">
          <span className="progress-percentage">{course.progress || 0}% complete</span>
          <span className={`status-badge ${course.completion_status}`}>
            {course.completion_status === 'completed' ? 'Completed' :
             course.completion_status === 'in_progress' ? 'In Progress' : 
             'Not Started'}
          </span>
        </div>
        <Link
          to={`/courses/${course.course_id}`}
          className="continue-button"
        >
          Continue Learning
        </Link>
      </div>
    </div>
  );
};

// Upcoming Session Component
const UpcomingSession = ({ session }) => {
  const sessionDate = new Date(session.start_time);
  const isToday = new Date().toDateString() === sessionDate.toDateString();
  
  return (
    <div className={`upcoming-session ${isToday ? 'today' : ''}`}>
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
        <span className="platform-info">
          Platform: {session.platform}
        </span>
        <a 
          href={session.meeting_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="join-link"
        >
          Join Session
        </a>
      </div>
    </div>
  );
};

// Assignment Card Component
const AssignmentCard = ({ assignment }) => {
  const dueDate = new Date(assignment.due_date);
  const now = new Date();
  const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  const isOverdue = dueDate < now && !assignment.allow_late_submissions;
  
  let statusClass = '';
  if (isOverdue) {
    statusClass = 'overdue';
  } else if (daysUntilDue <= 3) {
    statusClass = 'due-soon';
  } else {
    statusClass = 'upcoming';
  }
  
  return (
    <div className={`assignment-card ${statusClass}`}>
      <div className="assignment-header">
        <div>
          <h4 className="assignment-title">{assignment.title}</h4>
          <p className="assignment-course">{assignment.course_title}</p>
        </div>
        <div className="due-status">
          <i className={`fa fa-${isOverdue ? 'exclamation-circle' : daysUntilDue <= 3 ? 'exclamation-triangle' : 'check-circle'}`}></i>
          <span>
            {isOverdue ? 'Overdue' : 
             daysUntilDue === 0 ? 'Due today' :
             daysUntilDue === 1 ? 'Due tomorrow' :
             `Due in ${daysUntilDue} days`}
          </span>
        </div>
      </div>
      <div className="assignment-due-date">
        <i className="fa fa-calendar"></i>
        <span>Due: {dueDate.toLocaleDateString()}</span>
      </div>
      <div className="assignment-footer">
        <span className="submission-status">
          {assignment.submission ? (
            assignment.submission.is_graded ? 
            `Grade: ${assignment.submission.grade}/${assignment.max_points}` : 
            'Submitted, waiting for grade'
          ) : 'Not submitted yet'}
        </span>
        <Link 
          to={`/assignments/${assignment.id}`}
          className="assignment-action"
        >
          {assignment.submission ? 'View Submission' : 'Submit Assignment'}
        </Link>
      </div>
    </div>
  );
};

// Main Dashboard Component
const StudentDashboard = () => {
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get enrolled courses
        const coursesResponse = await axios.get(`/api/students/${auth.user.id}/enrollments`);
        setCourses(coursesResponse.data);
        
        // Fetch upcoming sessions
        const sessionsPromises = coursesResponse.data.map(enrollment => 
          axios.get(`/api/courses/${enrollment.course_id}/live-sessions`)
        );
        
        const sessionsResponses = await Promise.all(sessionsPromises);
        const allSessions = sessionsResponses.flatMap(response => response.data);
        
        // Filter and sort upcoming sessions
        const upcoming = allSessions
          .filter(session => new Date(session.start_time) > new Date())
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
          .slice(0, 5);
        
        setUpcomingSessions(upcoming);
        
        // Fetch upcoming assignments
        const assignmentsPromises = coursesResponse.data.map(enrollment => 
          axios.get(`/api/courses/${enrollment.course_id}/assignments`)
        );
        
        const assignmentsResponses = await Promise.all(assignmentsPromises);
        const allAssignments = assignmentsResponses.flatMap(response => response.data);
        
        // Filter and sort upcoming assignments
        const upcomingAssignments = allAssignments
          .filter(assignment => 
            assignment.due_date && 
            new Date(assignment.due_date) > new Date() && 
            (!assignment.submission || !assignment.submission.is_graded)
          )
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
          .slice(0, 5);
        
        setUpcomingAssignments(upcomingAssignments);
        
        // Fetch announcements
        const announcementsResponse = await axios.get('/api/announcements');
        setAnnouncements(announcementsResponse.data.slice(0, 3));
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
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
      <h1 className="dashboard-title">Student Dashboard</h1>
      
      {/* Welcome message */}
      <div className="welcome-banner">
        <h2 className="welcome-heading">
          Welcome back, {auth.user.firstName || auth.user.email}!
        </h2>
        <p className="welcome-text">
          {courses.length > 0 
            ? `You are currently enrolled in ${courses.length} course${courses.length > 1 ? 's' : ''}.`
            : "You are not enrolled in any courses yet. Browse our catalog to get started!"}
        </p>
        {courses.length > 0 && (
          <div className="welcome-actions">
            <Link 
              to="/courses/browse" 
              className="browse-button"
            >
              Browse More Courses
            </Link>
          </div>
        )}
      </div>
      
      <div className="dashboard-grid">
        {/* Main content - Enrolled courses */}
        <div className="main-content">
          <h2 className="section-title">My Courses</h2>
          
          {courses.length === 0 ? (
            <div className="empty-state">
              <p className="empty-message">You're not enrolled in any courses yet.</p>
              <Link 
                to="/courses/browse" 
                className="browse-button"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
        
        {/* Sidebar - Upcoming events, assignments */}
        <div className="dashboard-sidebar">
          {/* Upcoming sessions */}
          <div className="sidebar-section">
            <h2 className="section-title">Upcoming Live Sessions</h2>
            {upcomingSessions.length === 0 ? (
              <div className="empty-state">
                No upcoming sessions scheduled
              </div>
            ) : (
              <div className="sessions-list">
                {upcomingSessions.map(session => (
                  <UpcomingSession key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>
          
          {/* Upcoming assignments */}
          <div className="sidebar-section">
            <h2 className="section-title">Upcoming Assignments</h2>
            {upcomingAssignments.length === 0 ? (
              <div className="empty-state">
                No upcoming assignments due
              </div>
            ) : (
              <div className="assignments-list">
                {upcomingAssignments.map(assignment => (
                  <AssignmentCard key={assignment.id} assignment={assignment} />
                ))}
              </div>
            )}
          </div>
          
          {/* Recent announcements */}
          <div className="sidebar-section">
            <h2 className="section-title">Announcements</h2>
            {announcements.length === 0 ? (
              <div className="empty-state">
                No recent announcements
              </div>
            ) : (
              <div className="announcements-list">
                {announcements.map(announcement => (
                  <div key={announcement.id} className="announcement-item">
                    <h4 className="announcement-title">{announcement.title}</h4>
                    <p className="announcement-course">
                      {announcement.course_title 
                        ? `Course: ${announcement.course_title}`
                        : 'System Announcement'}
                    </p>
                    <p className="announcement-content">
                      {announcement.content}
                    </p>
                    <p className="announcement-date">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                <div className="view-all">
                  <Link 
                    to="/announcements" 
                    className="view-all-link"
                  >
                    View All Announcements
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;