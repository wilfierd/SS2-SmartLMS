// src/components/assessment/GradeAssignment.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import './GradeAssignment.css';

const GradeAssignment = () => {
  const { courseId, assignmentId, submissionId } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  
  const [submission, setSubmission] = useState(null);
  const [student, setStudent] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const API_URL = config.apiUrl;
  
  // Check if user is authorized (instructor or admin)
  useEffect(() => {
    if (auth.user.role !== 'instructor' && auth.user.role !== 'admin') {
      notification.error('You do not have permission to grade assignments');
      navigate(`/courses/${courseId}`);
    }
  }, [auth.user.role, courseId, navigate]);
  
  // Fetch submission details
  useEffect(() => {
    const fetchSubmissionDetails = async () => {
      setIsLoading(true);
      try {
        // Fetch submission with student and assignment details
        const response = await axios.get(
          `${API_URL}/submissions/${submissionId}/details`, 
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        
        setSubmission(response.data.submission);
        setStudent(response.data.student);
        setAssignment(response.data.assignment);
        
        // Pre-fill grade and feedback if already graded
        if (response.data.submission.is_graded) {
          setGrade(response.data.submission.grade);
          setFeedback(response.data.submission.feedback || '');
        }
      } catch (error) {
        console.error('Error fetching submission details:', error);
        notification.error('Failed to load submission. Please try again.');
        navigate(`/courses/${courseId}/assignments/${assignmentId}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (courseId && assignmentId && submissionId && auth.token) {
      fetchSubmissionDetails();
    }
  }, [courseId, assignmentId, submissionId, auth.token, API_URL, navigate]);
  
  // Handle grade submission
  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    
    // Validate grade
    if (!grade || isNaN(grade) || parseFloat(grade) < 0 || parseFloat(grade) > assignment.max_points) {
      notification.error(`Grade must be a number between 0 and ${assignment.max_points}`);
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Submit grade
      await axios.post(
        `${API_URL}/submissions/${submissionId}/grade`,
        {
          grade: parseFloat(grade),
          feedback: feedback
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      notification.success('Assignment graded successfully');
      
      // Update local state
      setSubmission({
        ...submission,
        is_graded: true,
        grade: parseFloat(grade),
        feedback: feedback,
        graded_by: auth.user.id,
        graded_at: new Date().toISOString()
      });
      
      // Navigate back to assignment overview
      navigate(`/courses/${courseId}/assignments/${assignmentId}`);
    } catch (error) {
      console.error('Error grading submission:', error);
      notification.error('Failed to save grade. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (isLoading) {
    return <div className="loading-spinner">Loading submission details...</div>;
  }
  
  if (!submission || !student || !assignment) {
    return <div className="error-message">Submission not found or you don't have access.</div>;
  }
  
  return (
    <div className="grade-assignment-container">
      <Sidebar activeItem="courses" />
      
      <div className="admin-main-content">
        <Header title="Grade Assignment" />
        
        <div className="grade-content">
          <div className="breadcrumb">
            <span onClick={() => navigate(`/courses/${courseId}`)}>Course</span> &gt; 
            <span onClick={() => navigate(`/courses/${courseId}/assignments/${assignmentId}`)}>Assignment</span> &gt; 
            <span>Grade Submission</span>
          </div>
          
          <div className="grading-header">
            <h1>{assignment.title}</h1>
            <p className="assignment-description">{assignment.description}</p>
          </div>
          
          <div className="submission-details">
            <div className="detail-row">
              <span className="detail-label">Student:</span>
              <span className="detail-value">{student.first_name} {student.last_name} ({student.email})</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Submitted:</span>
              <span className="detail-value">
                {formatDate(submission.submission_date)}
                {submission.is_late && <span className="late-badge">LATE</span>}
              </span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Due Date:</span>
              <span className="detail-value">{formatDate(assignment.due_date)}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Max Points:</span>
              <span className="detail-value">{assignment.max_points}</span>
            </div>
          </div>
          
          <div className="submission-content">
            <h2>Submission</h2>
            {submission.file_path ? (
              <div className="submission-file">
                <a 
                  href={API_URL + submission.file_path} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="file-link"
                >
                  <span className="file-icon">📎</span>
                  View Submitted File
                </a>
                <p className="file-info">
                  File Type: {submission.file_type.toUpperCase()} | 
                  Size: {(submission.file_size / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <p className="no-file">No file submitted</p>
            )}
            
            {submission.comments && (
              <div className="submission-comments">
                <h3>Student Comments</h3>
                <div className="comments-box">
                  {submission.comments}
                </div>
              </div>
            )}
          </div>
          
          <div className="grading-form">
            <h2>Grade Assignment</h2>
            <form onSubmit={handleSubmitGrade}>
              <div className="form-group">
                <label htmlFor="grade">Grade (out of {assignment.max_points} points)*</label>
                <input
                  type="number"
                  id="grade"
                  name="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  min="0"
                  max={assignment.max_points}
                  step="0.5"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="feedback">Feedback to Student (Optional)</label>
                <textarea
                  id="feedback"
                  name="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback for the student..."
                  rows="6"
                ></textarea>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={() => navigate(`/courses/${courseId}/assignments/${assignmentId}`)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradeAssignment;