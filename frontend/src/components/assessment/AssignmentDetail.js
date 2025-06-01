// src/components/assignment/AssignmentDetail.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import courseService from '../../services/courseService';
import notification from '../../utils/notification';
import './AssignmentDetail.css';

const AssignmentDetail = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);

  const [assignment, setAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionData, setSubmissionData] = useState({
    file: null,
    comments: ''
  });

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      setIsLoading(true);
      const data = await courseService.getAssignment(assignmentId);
      setAssignment(data);
    } catch (error) {
      notification.error('Failed to load assignment');
      console.error('Error fetching assignment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSubmissionData(prev => ({
      ...prev,
      file
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!submissionData.file && !submissionData.comments.trim()) {
      notification.error('Please provide either a file or comments for your submission');
      return;
    }

    try {
      setIsSubmitting(true);
      await courseService.submitAssignment(assignmentId, {
        file: submissionData.file,
        submission_text: submissionData.comments
      });

      notification.success('Assignment submitted successfully');
      fetchAssignment(); // Refresh to show submission

      // Reset form
      setSubmissionData({
        file: null,
        comments: ''
      });

      // Reset file input
      const fileInput = document.getElementById('assignment-file');
      if (fileInput) fileInput.value = '';

    } catch (error) {
      notification.error('Failed to submit assignment');
      console.error('Error submitting assignment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = () => {
    if (!assignment?.due_date) return false;
    return new Date() > new Date(assignment.due_date);
  };

  const canSubmit = () => {
    if (auth.user.role !== 'student') return false;
    if (assignment?.submission && assignment.submission.is_graded) return false;
    if (isOverdue() && !assignment?.allow_late_submissions) return false;
    return true;
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
    return <div className="loading-spinner">Loading assignment...</div>;
  }

  if (!assignment) {
    return <div className="error-message">Assignment not found</div>;
  }

  return (
    <div className="assignment-detail-container">
      <Sidebar activeItem="courses" />

      <div className="admin-main-content">
        <Header title={assignment.title} />

        <div className="assignment-detail-content">
          <div className="assignment-header">
            <div className="assignment-info">
              <h1>{assignment.title}</h1>
              <div className="assignment-meta">
                <span className="course-title">Course: {assignment.course_title}</span>
                <span className="due-date">
                  Due: <span className={isOverdue() ? 'overdue' : 'due-soon'}>
                    {formatDate(assignment.due_date)}
                  </span>
                </span>
                <span className="max-points">Points: {assignment.max_points}</span>
                {isOverdue() && !assignment.allow_late_submissions && (
                  <span className="status-badge overdue">Overdue</span>
                )}
                {assignment.allow_late_submissions && (
                  <span className="status-badge late-allowed">Late submissions allowed</span>
                )}
              </div>
            </div>

            <div className="action-buttons">
              <button
                className="secondary-btn"
                onClick={() => navigate(-1)}
              >
                ← Back
              </button>
            </div>
          </div>

          <div className="assignment-content">
            {/* Assignment Description */}
            {assignment.description && (
              <div className="assignment-section">
                <h3>Description</h3>
                <div className="assignment-description">
                  {assignment.description}
                </div>
              </div>
            )}

            {/* Assignment Instructions */}
            {assignment.instructions && (
              <div className="assignment-section">
                <h3>Instructions</h3>
                <div className="assignment-instructions">
                  {assignment.instructions}
                </div>
              </div>
            )}

            {/* Student Submission Section */}
            {auth.user.role === 'student' && (
              <div className="assignment-section">
                <h3>Your Submission</h3>

                {assignment.submission ? (
                  <div className="existing-submission">
                    <div className="submission-info">
                      <p><strong>Submitted:</strong> {formatDate(assignment.submission.submission_date)}</p>                      {assignment.submission.file_path && (
                        <p><strong>File:</strong>
                          <button
                            className="download-link-btn"
                            onClick={() => downloadFile(assignment.submission.id, 'submission-file')}
                          >
                            📎 Download Submitted File
                          </button>
                        </p>
                      )}
                      {assignment.submission.submission_text && (
                        <div>
                          <strong>Comments:</strong>
                          <div className="submission-text">
                            {assignment.submission.submission_text}
                          </div>
                        </div>
                      )}

                      {assignment.submission.is_graded ? (
                        <div className="grade-section">
                          <div className="grade-score">
                            <span className="grade-label">Grade:</span>
                            <span className="grade-value">{assignment.submission.grade}/{assignment.max_points}</span>
                          </div>
                          {assignment.submission.feedback && (
                            <div className="grade-feedback">
                              <strong>Feedback:</strong>
                              <div>{assignment.submission.feedback}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="pending-grade">
                          <span className="status-badge pending">Pending Grading</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="no-submission">
                    <p>You haven't submitted this assignment yet.</p>
                  </div>
                )}

                {/* Submission Form */}
                {canSubmit() && (
                  <form onSubmit={handleSubmit} className="submission-form">
                    <div className="form-group">
                      <label htmlFor="assignment-file">Upload File (optional)</label>
                      <input
                        type="file"
                        id="assignment-file"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                      />
                      <small className="form-help">
                        Accepted formats: PDF, DOC, DOCX, TXT, ZIP, RAR (Max 10MB)
                      </small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="submission-comments">Comments/Text Submission</label>
                      <textarea
                        id="submission-comments"
                        rows="6"
                        value={submissionData.comments}
                        onChange={(e) => setSubmissionData(prev => ({
                          ...prev,
                          comments: e.target.value
                        }))}
                        placeholder="Enter your submission text or additional comments..."
                      />
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="primary-btn"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                      </button>
                    </div>
                  </form>
                )}

                {!canSubmit() && !assignment.submission && (
                  <div className="cannot-submit">
                    <p className="error-message">
                      {isOverdue() && !assignment.allow_late_submissions
                        ? 'This assignment is overdue and late submissions are not allowed.'
                        : 'You cannot submit this assignment.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Instructor View - All Submissions */}
            {(auth.user.role === 'instructor' || auth.user.role === 'admin') && assignment.submissions && (
              <div className="assignment-section">
                <h3>Student Submissions ({assignment.submissions.length})</h3>

                {assignment.submissions.length > 0 ? (
                  <div className="submissions-list">
                    {assignment.submissions.map(submission => (
                      <div key={submission.id} className="submission-item">
                        <div className="submission-header">
                          <div className="student-info">
                            <strong>{submission.student_name}</strong>
                            <span className="submission-date">
                              Submitted: {formatDate(submission.submission_date)}
                            </span>
                          </div>

                          <div className="submission-actions">
                            {submission.is_graded ? (
                              <span className="grade-display">
                                {submission.grade}/{assignment.max_points}
                              </span>
                            ) : (
                              <button
                                className="primary-btn small"
                                onClick={() => navigate(`/courses/${assignment.course_id}/assignments/${assignmentId}/submissions/${submission.id}/grade`)}
                              >
                                Grade
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="submission-content">                          {submission.file_path && (
                          <div className="submission-file">
                            <button
                              className="download-link-btn"
                              onClick={() => downloadFile(submission.id, 'submission-file')}
                            >
                              📎 Download Submitted File
                            </button>
                          </div>
                        )}

                          {submission.submission_text && (
                            <div className="submission-text">
                              <strong>Text Submission:</strong>
                              <div>{submission.submission_text}</div>
                            </div>
                          )}

                          {submission.feedback && (
                            <div className="submission-feedback">
                              <strong>Feedback:</strong>
                              <div>{submission.feedback}</div>
                            </div>
                          )}

                          {/* Download Button for Instructors/Admins */}
                          {(auth.user.role === 'instructor' || auth.user.role === 'admin') && submission.file_path && (
                            <div className="download-button">
                              <button
                                className="primary-btn small"
                                onClick={() => downloadFile(submission.id, submission.file_path.split('/').pop())}
                              >
                                Download Submission
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No submissions yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetail;