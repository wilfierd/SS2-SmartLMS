// src/components/dashboard/AdminDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';
import './AdminDashboard.css';

// User Activity Chart Component (Simplified without actual chart rendering)
const UserActivityChart = ({ data }) => {
  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">User Activity</h3>
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color students"></span>
            <span className="legend-label">Students</span>
          </div>
          <div className="legend-item">
            <span className="legend-color instructors"></span>
            <span className="legend-label">Instructors</span>
          </div>
        </div>
      </div>
      <div className="chart-placeholder">
        {/* In a real application, this would be a chart library component */}
        <div className="chart-message">
          Activity chart would render here using data from the API
        </div>
      </div>
    </div>
  );
};

// User Card Component for Admin View
const UserCard = ({ user, onView }) => {
  return (
    <div className="user-card">
      <div className="user-avatar">
        {user.profile_image ? (
          <img src={user.profile_image} alt={`${user.first_name} ${user.last_name}`} />
        ) : (
          <div className="avatar-placeholder">
            {user.first_name?.[0] || user.email[0].toUpperCase()}
          </div>
        )}
      </div>
      <div className="user-details">
        <h3 className="user-name">
          {user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.email}
        </h3>
        <p className="user-email">{user.email}</p>
        <div className="user-meta">
          <span className={`user-role ${user.role}`}>{user.role}</span>
          <span className="user-joined">
            Joined: {new Date(user.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="user-actions">
        <button 
          className="user-action-btn view-btn"
          onClick={() => onView(user.id)}
        >
          View
        </button>
        <Link to={`/admin/users/${user.id}/edit`} className="user-action-btn edit-btn">
          Edit
        </Link>
      </div>
    </div>
  );
};

// Course Row Component for Admin View
const CourseRow = ({ course }) => {
  return (
    <tr className="course-row">
      <td className="course-id">{course.id}</td>
      <td className="course-title">{course.title}</td>
      <td className="course-instructor">{course.instructor_name}</td>
      <td className="course-enrollment">{course.enrollment_count}</td>
      <td className={`course-status ${course.status}`}>
        {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
      </td>
      <td className="course-actions">
        <Link to={`/admin/courses/${course.id}`} className="table-action-btn view-btn">
          View
        </Link>
        <Link to={`/admin/courses/${course.id}/edit`} className="table-action-btn edit-btn">
          Edit
        </Link>
      </td>
    </tr>
  );
};

// System Activity Log Component for Admin View
const ActivityLogItem = ({ log }) => {
  return (
    <div className="activity-log-item">
      <div className="log-time">
        {new Date(log.created_at).toLocaleString()}
      </div>
      <div className="log-content">
        <span className={`log-action ${log.action}`}>{log.action.toUpperCase()}</span>
        <span className="log-entity">
          {log.entity_type}: {log.entity_id}
        </span>
        <span className="log-user">by {log.user_name || log.user_email || 'Unknown'}</span>
      </div>
    </div>
  );
};

// Main Admin Dashboard Component
const AdminDashboard = () => {
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentCourses, setRecentCourses] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [systemSettings, setSystemSettings] = useState({});
  const [viewUserModal, setViewUserModal] = useState({ show: false, userId: null });
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get system analytics
        const analyticsResponse = await axios.get('/api/analytics/system');
        setStats(analyticsResponse.data);
        
        // Get recent users
        const usersResponse = await axios.get('/api/users', {
          params: { limit: 5, sort: 'created_at', order: 'desc' }
        });
        setRecentUsers(usersResponse.data);
        
        // Get recent courses
        const coursesResponse = await axios.get('/api/courses', {
          params: { limit: 5, sort: 'created_at', order: 'desc' }
        });
        setRecentCourses(coursesResponse.data);
        
        // Get recent activity logs
        const logsResponse = await axios.get('/api/audit-logs', {
          params: { limit: 10 }
        });
        setActivityLogs(logsResponse.data);
        
        // Get system settings
        const settingsResponse = await axios.get('/api/settings');
        setSystemSettings(settingsResponse.data);
        
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const handleViewUser = (userId) => {
    setViewUserModal({ show: true, userId });
  };

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div className="dashboard-container admin-dashboard">
      <h1 className="dashboard-title">Admin Dashboard</h1>
      
      {/* System Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon users-icon">
            <i className="fa fa-users"></i>
          </div>
          <div className="stat-content">
            <h2 className="stat-value">{stats.user_stats?.total_users || 0}</h2>
            <p className="stat-label">Total Users</p>
            <div className="stat-breakdown">
              <span className="stat-item">
                <span className="stat-count">{stats.user_stats?.students || 0}</span> Students
              </span>
              <span className="stat-item">
                <span className="stat-count">{stats.user_stats?.instructors || 0}</span> Instructors
              </span>
            </div>
          </div>
        </div>
        
        <div className="admin-stat-card">
          <div className="stat-icon courses-icon">
            <i className="fa fa-book"></i>
          </div>
          <div className="stat-content">
            <h2 className="stat-value">{stats.course_stats?.total_courses || 0}</h2>
            <p className="stat-label">Total Courses</p>
            <div className="stat-breakdown">
              <span className="stat-item">
                <span className="stat-count">{stats.course_stats?.published || 0}</span> Published
              </span>
              <span className="stat-item">
                <span className="stat-count">{stats.course_stats?.drafts || 0}</span> Drafts
              </span>
            </div>
          </div>
        </div>
        
        <div className="admin-stat-card">
          <div className="stat-icon enrollments-icon">
            <i className="fa fa-user-graduate"></i>
          </div>
          <div className="stat-content">
            <h2 className="stat-value">{stats.enrollment_stats?.total_enrollments || 0}</h2>
            <p className="stat-label">Total Enrollments</p>
            <div className="stat-breakdown">
              <span className="stat-item">
                <span className="stat-count">{stats.enrollment_stats?.completed_enrollments || 0}</span> Completed
              </span>
              <span className="stat-item">
                <span className="stat-count">{stats.enrollment_stats?.new_last_30_days || 0}</span> Last 30 days
              </span>
            </div>
          </div>
        </div>
        
        <div className="admin-stat-card">
          <div className="stat-icon activity-icon">
            <i className="fa fa-chart-line"></i>
          </div>
          <div className="stat-content">
            <h2 className="stat-value">{
              (stats.activity_stats?.lessons_viewed_24h || 0) + 
              (stats.activity_stats?.submissions_24h || 0) + 
              (stats.activity_stats?.quiz_attempts_24h || 0)
            }</h2>
            <p className="stat-label">24h Activity</p>
            <div className="stat-breakdown">
              <span className="stat-item">
                <span className="stat-count">{stats.activity_stats?.lessons_viewed_24h || 0}</span> Lessons
              </span>
              <span className="stat-item">
                <span className="stat-count">{stats.activity_stats?.submissions_24h || 0}</span> Submissions
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Admin Quick Actions */}
      <div className="admin-actions">
        <Link to="/admin/users/create" className="admin-action-button">
          <i className="fa fa-user-plus"></i>
          <span>Add User</span>
        </Link>
        
        <Link to="/admin/courses/create" className="admin-action-button">
          <i className="fa fa-plus-circle"></i>
          <span>Add Course</span>
        </Link>
        
        <Link to="/admin/settings" className="admin-action-button">
          <i className="fa fa-cog"></i>
          <span>System Settings</span>
        </Link>
        
        <Link to="/admin/analytics" className="admin-action-button">
          <i className="fa fa-chart-bar"></i>
          <span>Analytics</span>
        </Link>
      </div>
      
      <div className="admin-grid">
        {/* Main Content */}
        <div className="admin-main-content">
          {/* Recent Users */}
          <div className="admin-panel">
            <div className="panel-header">
              <h2 className="panel-title">Recent Users</h2>
              <Link to="/admin/users" className="view-all-link">View All Users</Link>
            </div>
            
            <div className="users-list">
              {recentUsers.length === 0 ? (
                <div className="empty-state">No users found</div>
              ) : (
                recentUsers.map(user => (
                  <UserCard 
                    key={user.id} 
                    user={user} 
                    onView={handleViewUser} 
                  />
                ))
              )}
            </div>
          </div>
          
          {/* Recent Courses */}
          <div className="admin-panel">
            <div className="panel-header">
              <h2 className="panel-title">Recent Courses</h2>
              <Link to="/admin/courses" className="view-all-link">View All Courses</Link>
            </div>
            
            <div className="courses-table-container">
              {recentCourses.length === 0 ? (
                <div className="empty-state">No courses found</div>
              ) : (
                <table className="admin-table courses-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Instructor</th>
                      <th>Enrollments</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCourses.map(course => (
                      <CourseRow key={course.id} course={course} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          {/* User Activity Chart */}
          <div className="admin-panel">
            <div className="panel-header">
              <h2 className="panel-title">User Activity</h2>
              <Link to="/admin/analytics/users" className="view-all-link">Detailed Analytics</Link>
            </div>
            
            <UserActivityChart data={stats.activity_stats} />
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="admin-sidebar">
          {/* System Status */}
          <div className="admin-panel">
            <div className="panel-header">
              <h2 className="panel-title">System Status</h2>
              <Link to="/admin/status" className="view-all-link">Details</Link>
            </div>
            
            <div className="system-status">
              <div className="status-item">
                <span className="status-label">Site Name:</span>
                <span className="status-value">{systemSettings.general?.site_name || 'LMS'}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Version:</span>
                <span className="status-value">{systemSettings.general?.version || '1.0.0'}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Environment:</span>
                <span className="status-value">{systemSettings.general?.environment || 'Production'}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Database:</span>
                <span className="status-value">
                  <span className="status-indicator online"></span> Online
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Storage:</span>
                <span className="status-value">
                  <span className="status-indicator online"></span> Online
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Email Service:</span>
                <span className="status-value">
                  <span className="status-indicator online"></span> Online
                </span>
              </div>
            </div>
          </div>
          
          {/* Activity Logs */}
          <div className="admin-panel">
            <div className="panel-header">
              <h2 className="panel-title">Recent Activity</h2>
              <Link to="/admin/logs" className="view-all-link">View All Logs</Link>
            </div>
            
            <div className="activity-logs">
              {activityLogs.length === 0 ? (
                <div className="empty-state">No recent activity</div>
              ) : (
                <div className="logs-list">
                  {activityLogs.map(log => (
                    <ActivityLogItem key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Tools */}
          <div className="admin-panel">
            <div className="panel-header">
              <h2 className="panel-title">Admin Tools</h2>
            </div>
            
            <div className="admin-tools">
              <Link to="/admin/backup" className="tool-button">
                <i className="fa fa-download"></i>
                <span>Backup System</span>
              </Link>
              
              <Link to="/admin/emails" className="tool-button">
                <i className="fa fa-envelope"></i>
                <span>Email Templates</span>
              </Link>
              
              <Link to="/admin/maintenance" className="tool-button">
                <i className="fa fa-tools"></i>
                <span>Maintenance Mode</span>
              </Link>
              
              <Link to="/admin/integrations" className="tool-button">
                <i className="fa fa-plug"></i>
                <span>Integrations</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* User View Modal (Simplified) */}
      {viewUserModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>User Details</h2>
              <button 
                className="modal-close" 
                onClick={() => setViewUserModal({ show: false, userId: null })}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>Viewing user {viewUserModal.userId}</p>
              <p>In a real application, this would fetch and display detailed user information</p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button secondary"
                onClick={() => setViewUserModal({ show: false, userId: null })}
              >
                Close
              </button>
              <Link 
                to={`/admin/users/${viewUserModal.userId}/edit`}
                className="modal-button primary"
              >
                Edit User
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;