// src/components/assessment/GradeAssignment.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import courseService from '../../services/courseService';
import notification from '../../utils/notification';
import './GradeAssignment.css';

const GradeAssignment = () => {
  const { courseId, assignmentId, submissionId } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);

  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradeData, setGradeData] = useState({
    grade: '',
    feedback: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchSubmissionData();
  }, [submissionId]);

  const fetchSubmissionData = async () => {
    try {
      setIsLoading(true);

      // Get assignment details which includes submission info
      const assignmentData = await courseService.getAssignment(assignmentId);
      setAssignment(assignmentData);

      // Find the specific submission
      const submissionToGrade = assignmentData.submissions?.find(
        sub => sub.id === parseInt(submissionId)
      );

      if (!submissionToGrade) {
        notification.error('Submission not found');
        navigate(-1);
        return;
      }

      setSubmission(submissionToGrade);

      // Pre-fill existing grade data if available
      if (submissionToGrade.is_graded) {
        setGradeData({
          grade: submissionToGrade.grade || '',
          feedback: submissionToGrade.feedback || ''
        });
      }

    } catch (error) {
      console.error('Error fetching submission:', error);
      notification.error('Failed to load submission details');
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  };

  const validateGrade = () => {
    const newErrors = {};

    if (!gradeData.grade && gradeData.grade !== 0) {
      newErrors.grade = 'Grade is required';
    } else {
      const grade = parseFloat(gradeData.grade);
      if (isNaN(grade) || grade < 0 || grade > assignment.max_points) {
        newErrors.grade = `Grade must be between 0 and ${assignment.max_points}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setGradeData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmitGrade = async (e) => {
    e.preventDefault();

    if (!validateGrade()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await courseService.gradeSubmission(submissionId, {
        grade: parseFloat(gradeData.grade),
        feedback: gradeData.feedback.trim() || null
      });

      notification.success('Grade submitted successfully');
      navigate(`/assignments/${assignmentId}`);

    } catch (error) {
      console.error('Error submitting grade:', error);
      notification.error('Failed to submit grade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatePercentage = () => {
    if (!gradeData.grade || !assignment) return 0;
    const grade = parseFloat(gradeData.grade);
    return ((grade / assignment.max_points) * 100).toFixed(1);
  };

  const getGradeColor = () => {
    const percentage = parseFloat(calculatePercentage());
    if (percentage >= 90) return '#10b981'; // Green
    if (percentage >= 80) return '#f59e0b'; // Yellow
    if (percentage >= 70) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const downloadFile = async (submissionId, fileName) => {
    try {
      const response = await fetch(`/api/uploads/download/submission/${submissionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'submission-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      notification.error('Failed to download file');
    }
  };

  if (isLoading) {
    return <div className="loading-spinner">Loading submission...</div>;
  }

  if (!submission || !assignment) {
    return <div className="error-message">Submission not found</div>;
  }

  return (
    <div className="grade-assignment-container">
      <Sidebar activeItem="courses" />

      <div className="admin-main-content">
        <Header title={`Grade Submission`} />

        <div className="grade-assignment-content">
          {/* Grade Header */}
          <div className="grade-header">
            <div className="grade-info">
              <h1>Grade Submission</h1>
              <div className="grade-meta">
                <span className="student-name">{submission.student_name}</span>
                <span className="assignment-title">{assignment.title}</span>
                <span className="max-points">Max: {assignment.max_points} points</span>
                <span className="submission-date">
                  Submitted: {formatDate(submission.submission_date)}
                </span>
              </div>
            </div>

            <div className="action-buttons">
              <button
                className="back-btn"
                onClick={() => navigate(`/assignments/${assignmentId}`)}
              >
                ← Back to Assignment
              </button>
            </div>
          </div>

          <div className="grade-main-content">
            {/* Submission Panel */}
            <div className="submission-panel">
              <h3>Student Submission</h3>

              <div className="submission-content">
                {/* File Submission */}
                {submission.file_path && (
                  <div className="submission-file">
                    <div className="file-info">
                      <span className="file-icon">📎</span>
                      <span>Submitted File</span>
                    </div>
                    <div className="file-actions">
                      <button
                        className="file-btn download-btn"
                        onClick={() => downloadFile(submission.id, 'submission')}
                      >
                        Download
                      </button>
                      <button
                        className="file-btn view-btn"
                        onClick={() => window.open(submission.file_path, '_blank')}
                      >
                        View
                      </button>
                    </div>

                    {/* File Viewer (for certain file types) */}
                    {submission.file_path.match(/\.(pdf|txt|jpg|jpeg|png|gif)$/i) && (
                      <div className="file-viewer">
                        {submission.file_path.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img
                            src={submission.file_path}
                            alt="Submission"
                            style={{ maxWidth: '100%', height: 'auto' }}
                          />
                        ) : submission.file_path.endsWith('.pdf') ? (
                          <iframe
                            src={submission.file_path}
                            title="Submission PDF"
                          />
                        ) : (
                          <div className="file-viewer-error">
                            <p>Preview not available for this file type.</p>
                            <p>Please download the file to view it.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Text Submission */}
                <div className="submission-text-section">
                  <h4>Text Submission</h4>
                  {submission.submission_text ? (
                    <div className="submission-text">
                      {submission.submission_text}
                    </div>
                  ) : (
                    <div className="no-text-submission">
                      No text submission provided
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Grading Panel */}
            <div className="grading-panel">
              <h3>Grade Submission</h3>

              {/* Show existing grade if available */}
              {submission.is_graded && (
                <div className="existing-grade">
                  <h4>Current Grade</h4>
                  <div className="grade-display">
                    <span className="current-grade">
                      {submission.grade}/{assignment.max_points}
                    </span>
                    <span className="grade-date">
                      Graded: {formatDate(submission.graded_at)}
                    </span>
                  </div>
                  {submission.feedback && (
                    <div className="existing-feedback">
                      <strong>Current Feedback:</strong>
                      <div>{submission.feedback}</div>
                    </div>
                  )}
                  <div className="update-grade-note">
                    You can update the grade and feedback below
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitGrade} className="grading-form">
                <div className="form-group">
                  <label htmlFor="grade">
                    Grade <span className="required">*</span>
                  </label>
                  <div className="grade-input-group">
                    <input
                      type="number"
                      id="grade"
                      name="grade"
                      value={gradeData.grade}
                      onChange={handleInputChange}
                      min="0"
                      max={assignment.max_points}
                      step="0.5"
                      className={`grade-input ${errors.grade ? 'error' : ''}`}
                      placeholder="0"
                    />
                    <span className="grade-separator">/</span>
                    <span className="max-grade">{assignment.max_points}</span>
                    {gradeData.grade && (
                      <span
                        className="grade-percentage"
                        style={{ color: getGradeColor() }}
                      >
                        {calculatePercentage()}%
                      </span>
                    )}
                  </div>
                  {errors.grade && (
                    <span className="error-message">{errors.grade}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="feedback">
                    Feedback
                  </label>
                  <textarea
                    id="feedback"
                    name="feedback"
                    value={gradeData.feedback}
                    onChange={handleInputChange}
                    className="feedback-textarea"
                    placeholder="Provide feedback to the student about their submission..."
                    rows="6"
                  />
                  <small className="feedback-help">
                    Give constructive feedback to help the student improve
                  </small>
                </div>

                <div className="grading-actions">
                  <button
                    type="submit"
                    className="submit-grade-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner"></span>
                        Submitting Grade...
                      </>
                    ) : (
                      submission.is_graded ? 'Update Grade' : 'Submit Grade'
                    )}
                  </button>

                  <button
                    type="button"
                    className="back-btn"
                    onClick={() => navigate(`/assignments/${assignmentId}`)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradeAssignment;