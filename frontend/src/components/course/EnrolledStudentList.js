// src/components/course/EnrolledStudentList.js - Fixed version with proper permission check
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import './StudentList.css';

const EnrolledStudentList = ({ courseId, auth }) => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all', // 'all', 'active', 'inactive'
    sortBy: 'name' // 'name', 'date', 'progress'
  });

  const API_URL = config.apiUrl;

  // Check if user has permission to view students
  const hasPermission = auth.user.role === 'admin' || auth.user.role === 'instructor';

  // Fetch enrolled students - ONLY if user has permission
  useEffect(() => {
    const fetchEnrolledStudents = async () => {
      // Early return if no permission - don't even start loading
      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/courses/${courseId}/students`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        setStudents(response.data);
      } catch (error) {
        console.error('Error fetching enrolled students:', error);
        
        // Only show error notification for legitimate errors, not permission issues
        if (error.response?.status === 403 || error.response?.status === 401) {
          // Don't show notification for permission errors - user shouldn't see this anyway
          console.warn('Permission denied for student list');
        } else {
          notification.error('Failed to load student list');
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we have courseId, auth token, and permission
    if (courseId && auth.token && hasPermission) {
      fetchEnrolledStudents();
    } else if (!hasPermission) {
      // If no permission, just set loading to false without API call
      setIsLoading(false);
    }
  }, [courseId, auth.token, API_URL, hasPermission]);

  // Handle feedback submission
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !feedback.trim()) return;

    try {
      await axios.post(`${API_URL}/courses/${courseId}/student-feedback`, {
        studentId: selectedStudentId,
        feedback: feedback
      }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      notification.success('Feedback submitted successfully');
      
      // Update the student's feedback in the local state
      setStudents(students.map(student => 
        student.id === selectedStudentId 
          ? {...student, instructorFeedback: feedback} 
          : student
      ));
      
      // Close modal and reset form
      setShowFeedbackModal(false);
      setFeedback('');
      setSelectedStudentId(null);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        notification.error('You do not have permission to submit feedback');
      } else {
        notification.error('Failed to submit feedback');
      }
    }
  };

  // Open feedback modal for a student
  const openFeedbackModal = (student) => {
    setSelectedStudentId(student.id);
    setFeedback(student.instructorFeedback || '');
    setShowFeedbackModal(true);
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  // Apply filters and sorting to student list
  const getFilteredStudents = () => {
    return students
      .filter(student => {
        // Apply search filter
        if (filters.search && !`${student.first_name} ${student.last_name} ${student.email}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())) {
          return false;
        }
        
        // Apply status filter
        if (filters.status === 'active' && !student.lastActivity) return false;
        if (filters.status === 'inactive' && student.lastActivity) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Apply sorting
        switch (filters.sortBy) {
          case 'name':
            return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
          case 'date':
            return new Date(b.enrollment_date) - new Date(a.enrollment_date);
          case 'progress':
            return (b.progress || 0) - (a.progress || 0);
          default:
            return 0;
        }
      });
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Early return for no permission - prevents any rendering or API calls
  if (!hasPermission) {
    return (
      <div className="enrolled-students-container">
        <div className="permission-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to view the student list for this course.</p>
        </div>
      </div>
    );
  }

  const filteredStudents = getFilteredStudents();

  return (
    <div className="enrolled-students-container">
      <div className="students-header">
        <h2>Enrolled Students ({students.length})</h2>
        
        <div className="student-filters">
          <div className="search-box">
            <input
              type="text"
              name="search"
              placeholder="Search students..."
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <select 
              name="status" 
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="all">All Students</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select 
              name="sortBy" 
              value={filters.sortBy}
              onChange={handleFilterChange}
            >
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Enrollment Date</option>
              <option value="progress">Sort by Progress</option>
            </select>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="loading-spinner">Loading students...</div>
      ) : (
        <>
          {filteredStudents.length > 0 ? (
            <table className="students-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                  <th>Enrollment Date</th>
                  <th>Last Activity</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td>{student.id}</td>
                    <td>{student.first_name}</td>
                    <td>{student.last_name}</td>
                    <td>{student.email}</td>
                    <td>{formatDate(student.enrollment_date)}</td>
                    <td>{student.lastActivity ? formatDate(student.lastActivity) : 'Never'}</td>
                    <td>
                      <div className="progress-bar-small">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${student.progress || 0}%` }}
                        />
                      </div>
                      <span className="progress-text">{student.progress || 0}%</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="feedback-btn"
                          onClick={() => openFeedbackModal(student)}
                          title="Add/Edit Feedback"
                        >
                          📝
                        </button>
                        <button 
                          className="view-details-btn"
                          onClick={() => window.location.href = `/courses/${courseId}/students/${student.id}`}
                          title="View Student Progress"
                        >
                          👁️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-list-message">
              {filters.search || filters.status !== 'all' 
                ? 'No students match your filters.'
                : 'No students are enrolled in this course yet.'}
            </div>
          )}
        </>
      )}
      
      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Instructor Feedback</h2>
              <button className="close-btn" onClick={() => setShowFeedbackModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmitFeedback}>
              <div className="form-group">
                <label htmlFor="feedback">
                  Feedback for {students.find(s => s.id === selectedStudentId)?.first_name} {students.find(s => s.id === selectedStudentId)?.last_name}
                </label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter your feedback for this student..."
                  rows="6"
                ></textarea>
                <small>This feedback is only visible to instructors and administrators.</small>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowFeedbackModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={!feedback.trim()}
                >
                  Save Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrolledStudentList;