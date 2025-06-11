// src/components/course/StudentProgressView.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import './StudentList.css';

const StudentProgressView = () => {
  const { courseId, studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [assessments, setAssessments] = useState({
    quizzes: [],
    assignments: [],
    tests: []
  });
  const [activityHistory, setActivityHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [feedback, setFeedback] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const API_URL = config.apiUrl;

  useEffect(() => {
    const fetchStudentData = async () => {
      setIsLoading(true);
      try {
        // Fetch student details
        const studentResponse = await axios.get(
          `${API_URL}/courses/${courseId}/students/${studentId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setStudent(studentResponse.data);
        setFeedback(studentResponse.data.instructorFeedback || '');
        
        // Fetch assessments
        const assessmentsResponse = await axios.get(
          `${API_URL}/courses/${courseId}/students/${studentId}/assessments`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setAssessments(assessmentsResponse.data);
        
        // Fetch activity history
        const historyResponse = await axios.get(
          `${API_URL}/courses/${courseId}/students/${studentId}/activity`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setActivityHistory(historyResponse.data);
      } catch (error) {
        console.error('Error fetching student data:', error);
        notification.error('Failed to load student data');
        navigate(`/courses/${courseId}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId && studentId) {
      fetchStudentData();
    }
  }, [courseId, studentId, API_URL, navigate]);

  // Save feedback for the student
  const handleSaveFeedback = async () => {
    try {
      await axios.post(
        `${API_URL}/courses/${courseId}/student-feedback`,
        {
          studentId: studentId,
          feedback: feedback
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      notification.success('Feedback saved successfully');
      setShowFeedbackModal(false);
      
      // Update local state
      setStudent({
        ...student,
        instructorFeedback: feedback
      });
    } catch (error) {
      console.error('Error saving feedback:', error);
      notification.error('Failed to save feedback');
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

  // Calculate average score
  const calculateAverageScore = (assessmentArray) => {
    if (!assessmentArray || assessmentArray.length === 0) return 'N/A';
    
    // If there are multiple attempts for quizzes/tests, take the highest score
    const scores = assessmentArray.map(item => {
      if (item.attempts && item.attempts.length > 0) {
        return Math.max(...item.attempts.map(attempt => attempt.score || 0));
      }
      return item.score || 0;
    });
    
    const sum = scores.reduce((total, score) => total + parseFloat(score), 0);
    return (sum / scores.length).toFixed(1);
  };

  // Get score class (for color coding)
  const getScoreClass = (score) => {
    if (score === 'N/A') return '';
    const numScore = parseFloat(score);
    if (numScore >= 80) return 'high';
    if (numScore >= 60) return 'medium';
    return 'low';
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    const total = assessments.quizzes.length + assessments.tests.length + assessments.assignments.length;
    if (total === 0) return 0;
    
    let completed = 0;
    
    // Count completed quizzes
    completed += assessments.quizzes.filter(quiz => 
      quiz.attempts && quiz.attempts.length > 0
    ).length;
    
    // Count completed tests
    completed += assessments.tests.filter(test => 
      test.attempts && test.attempts.length > 0
    ).length;
    
    // Count completed assignments
    completed += assessments.assignments.filter(assignment => 
      assignment.submission
    ).length;
    
    return Math.round((completed / total) * 100);
  };

  if (isLoading) {
    return <div className="loading-spinner">Loading student progress...</div>;
  }

  if (!student) {
    return <div className="error-message">Student not found or you don't have access.</div>;
  }

  return (
    <div className="student-progress-view">
      <Sidebar activeItem="courses" />
      
      <div className="admin-main-content">
        <Header title={`Student Progress: ${student.first_name} ${student.last_name}`} />
        
        <div className="course-detail-content">
          <div className="course-header">
            <div className="course-info">
              <h1>{student.first_name} {student.last_name}</h1>
              <div className="course-meta">
                <span>Email: {student.email}</span>
                <span>Enrolled: {formatDate(student.enrollment_date)}</span>
                <span>Last Activity: {student.last_activity ? formatDate(student.last_activity) : 'Never'}</span>
              </div>
              <p className="course-description">
                {student.instructorFeedback ? (
                  <>
                    <strong>Instructor Feedback:</strong> {student.instructorFeedback}
                  </>
                ) : (
                  'No instructor feedback provided yet.'
                )}
              </p>
            </div>
            
            <div className="main-actions">
              <button 
                className="primary-btn" 
                onClick={() => setShowFeedbackModal(true)}
              >
                <span className="btn-icon">📝</span> Add/Edit Feedback
              </button>
              
              <button 
                className="secondary-btn" 
                onClick={() => navigate(`/courses/${courseId}`)}
              >
                <span className="btn-icon">◀</span> Back to Course
              </button>
            </div>
          </div>
          
          <div className="student-detail-tabs">
            <button 
              className={`student-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`student-tab ${activeTab === 'assessments' ? 'active' : ''}`}
              onClick={() => setActiveTab('assessments')}
            >
              Assessments
            </button>
            <button 
              className={`student-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Activity History
            </button>
          </div>
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="student-progress-summary">
                <div className="progress-stat">
                  <div className="stat-value">{calculateCompletion()}%</div>
                  <div className="stat-label">Overall Completion</div>
                </div>
                
                <div className="progress-stat">
                  <div className={`stat-value ${getScoreClass(calculateAverageScore(assessments.quizzes))}`}>
                    {calculateAverageScore(assessments.quizzes)}
                  </div>
                  <div className="stat-label">Avg. Quiz Score</div>
                </div>
                
                <div className="progress-stat">
                  <div className={`stat-value ${getScoreClass(calculateAverageScore(assessments.tests))}`}>
                    {calculateAverageScore(assessments.tests)}
                  </div>
                  <div className="stat-label">Avg. Test Score</div>
                </div>
                
                <div className="progress-stat">
                  <div className="stat-value">
                    {assessments.assignments.filter(a => a.submission).length}/{assessments.assignments.length}
                  </div>
                  <div className="stat-label">Assignments Completed</div>
                </div>
              </div>
              
              <div className="recent-activity">
                <h3 className="activity-title">Recent Activity</h3>
                {activityHistory.length > 0 ? (
                  <ul className="history-list">
                    {activityHistory.slice(0, 5).map((activity, index) => (
                      <li key={index} className="history-item">
                        <div className="history-date">{formatDate(activity.timestamp)}</div>
                        <div className="history-event">{activity.event}</div>
                        {activity.score !== undefined && (
                          <div className="history-meta">
                            Score: <span className={`score-value ${getScoreClass(activity.score.toString())}`}>
                              {activity.score}/100
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-list-message">No recent activity recorded.</p>
                )}
              </div>
            </div>
          )}
          
          {/* Assessments Tab */}
          {activeTab === 'assessments' && (
            <div className="assessments-tab">
              <h3 className="section-title">Quizzes</h3>
              <div className="assessments-grid">
                {assessments.quizzes.length > 0 ? (
                  assessments.quizzes.map((quiz) => (
                    <div key={quiz.id} className="assessment-card">
                      <div className="assessment-header">
                        <span className="assessment-type quiz">Quiz</span>
                        <h4 className="assessment-title">{quiz.title}</h4>
                      </div>
                      <div className="assessment-body">
                        <div className="assessment-status">
                          Status: {quiz.attempts && quiz.attempts.length > 0 ? 'Completed' : 'Not Started'}
                        </div>
                        {quiz.attempts && quiz.attempts.length > 0 && (
                          <div className="assessment-attempts">
                            <div className="attempts-label">
                              {quiz.attempts.length} Attempt{quiz.attempts.length > 1 ? 's' : ''}:
                            </div>
                            {quiz.attempts.map((attempt, idx) => (
                              <div key={idx} className="attempt-item">
                                <span className="attempt-date">{formatDate(attempt.date)}</span>
                                <span className={`attempt-score ${getScoreClass(attempt.score.toString())}`}>
                                  {attempt.score}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-list-message">No quizzes assigned in this course.</p>
                )}
              </div>
              
              <h3 className="section-title">Tests</h3>
              <div className="assessments-grid">
                {assessments.tests.length > 0 ? (
                  assessments.tests.map((test) => (
                    <div key={test.id} className="assessment-card">
                      <div className="assessment-header">
                        <span className="assessment-type test">Test</span>
                        <h4 className="assessment-title">{test.title}</h4>
                      </div>
                      <div className="assessment-body">
                        <div className="assessment-status">
                          Status: {test.attempts && test.attempts.length > 0 ? 'Completed' : 'Not Started'}
                        </div>
                        {test.attempts && test.attempts.length > 0 && (
                          <div className="assessment-attempts">
                            <div className="attempts-label">
                              {test.attempts.length} Attempt{test.attempts.length > 1 ? 's' : ''}:
                            </div>
                            {test.attempts.map((attempt, idx) => (
                              <div key={idx} className="attempt-item">
                                <span className="attempt-date">{formatDate(attempt.date)}</span>
                                <span className={`attempt-score ${getScoreClass(attempt.score.toString())}`}>
                                  {attempt.score}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-list-message">No tests assigned in this course.</p>
                )}
              </div>
              
              <h3 className="section-title">Assignments</h3>
              <div className="assessments-grid">
                {assessments.assignments.length > 0 ? (
                  assessments.assignments.map((assignment) => (
                    <div key={assignment.id} className="assessment-card">
                      <div className="assessment-header">
                        <span className="assessment-type assignment">Assignment</span>
                        <h4 className="assessment-title">{assignment.title}</h4>
                      </div>
                      <div className="assessment-body">
                        <div className="assessment-status">
                          Status: {assignment.submission 
                            ? (assignment.submission.is_graded 
                              ? 'Graded' 
                              : 'Submitted')
                            : 'Not Submitted'}
                        </div>
                        
                        {assignment.submission && (
                          <>
                            <div className="submission-info">
                              <p>Submitted: {formatDate(assignment.submission.submission_date)}</p>
                              {assignment.submission.is_late && (
                                <p className="late-submission">Late Submission</p>
                              )}
                              {assignment.submission.is_graded && (
                                <p>
                                  Score: <span className={`score-value ${getScoreClass((assignment.submission.grade * 100 / assignment.max_points).toString())}`}>
                                    {assignment.submission.grade}/{assignment.max_points}
                                  </span>
                                </p>
                              )}
                              {assignment.submission.feedback && (
                                <div className="instructor-feedback">
                                  <strong>Feedback:</strong>
                                  <p>{assignment.submission.feedback}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="submission-actions">
                              {assignment.submission.file_path && (
                                <a 
                                  href={API_URL + assignment.submission.file_path} 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="download-btn"
                                >
                                  View Submission
                                </a>
                              )}
                              
                              {!assignment.submission.is_graded && (
                                <button 
                                  className="grade-btn"
                                  onClick={() => navigate(`/courses/${courseId}/assignments/${assignment.id}/submissions/${assignment.submission.id}`)}
                                >
                                  Grade Submission
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-list-message">No assignments in this course.</p>
                )}
              </div>
            </div>
          )}
          
          {/* Activity History Tab */}
          {activeTab === 'history' && (
            <div className="history-tab">
              <h3 className="activity-title">Full Activity History</h3>
              {activityHistory.length > 0 ? (
                <ul className="history-list">
                  {activityHistory.map((activity, index) => (
                    <li key={index} className="history-item">
                      <div className="history-date">{formatDate(activity.timestamp)}</div>
                      <div className="history-event">{activity.event}</div>
                      {activity.score !== undefined && (
                        <div className="history-meta">
                          Score: <span className={`score-value ${getScoreClass(activity.score.toString())}`}>
                            {activity.score}/100
                          </span>
                        </div>
                      )}
                      {activity.details && (
                        <div className="history-details">
                          {activity.details}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-list-message">No activity history recorded for this student.</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Instructor Feedback</h2>
              <button className="close-btn" onClick={() => setShowFeedbackModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="feedback">
                  Feedback for {student.first_name} {student.last_name}
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
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowFeedbackModal(false)}
              >
                Cancel
              </button>
              <button 
                className="submit-btn"
                onClick={handleSaveFeedback}
              >
                Save Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProgressView;