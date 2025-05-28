// src/components/quiz/QuizDetail.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import courseService from '../../services/courseService';
import notification from '../../utils/notification';
import './QuizDetail.css';

const QuizDetail = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useContext(AuthContext);
  
  // Get courseId from navigation state
  const courseId = location.state?.courseId;
    const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAttempt, setCurrentAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!courseId) {
      notification.error('Course ID not found. Please navigate from course page.');
      navigate(-1);
      return;
    }
    fetchQuiz();
  }, [quizId, courseId]);

  // Timer effect
  useEffect(() => {
    if (currentAttempt && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [currentAttempt, timeLeft]);
  const fetchQuiz = async () => {
    try {
      setIsLoading(true);
      const data = await courseService.getQuiz(courseId, quizId);
      setQuiz(data);
    } catch (error) {
      notification.error('Failed to load quiz');
      console.error('Error fetching quiz:', error);
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  };
  const handleStartQuiz = async () => {
    try {
      const response = await courseService.startQuiz(courseId, quizId);
      setCurrentAttempt(response);
      setTimeLeft(quiz.time_limit_minutes * 60); // Convert to seconds
      
      // Initialize answers object
      const initialAnswers = {};
      response.questions.forEach(q => {
        initialAnswers[q.id] = null;
      });
      setAnswers(initialAnswers);
      
    } catch (error) {
      notification.error('Failed to start quiz');
      console.error('Error starting quiz:', error);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        selectedOptionId: answer,
        textAnswer: typeof answer === 'string' ? answer : null
      }));      const result = await courseService.submitQuizAttempt(courseId, currentAttempt.attemptId, formattedAnswers);
      
      notification.success(`Quiz submitted! Score: ${result.score.toFixed(1)}%`);
      setCurrentAttempt(null);
      fetchQuiz(); // Refresh to show updated attempt history
      
    } catch (error) {
      notification.error('Failed to submit quiz');
      console.error('Error submitting quiz:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No limit';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <div className="loading-spinner">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="error-message">Quiz not found</div>;
  }

  return (
    <div className="quiz-detail-container">
      <Sidebar activeItem="courses" />
      
      <div className="admin-main-content">
        <Header title={quiz.title} />
        
        <div className="quiz-detail-content">
          {!currentAttempt ? (
            // Quiz Overview
            <div className="quiz-overview">
              <div className="quiz-header">
                <h1>{quiz.title}</h1>
                <div className="quiz-meta">
                  <span>Course: {quiz.course_title}</span>
                  <span>Time Limit: {quiz.time_limit_minutes} minutes</span>
                  <span>Passing Score: {quiz.passing_score}%</span>
                  <span>Max Attempts: {quiz.max_attempts}</span>
                </div>
              </div>

              {quiz.description && (
                <div className="quiz-description">
                  <h3>Description</h3>
                  <p>{quiz.description}</p>
                </div>
              )}

              <div className="quiz-info">
                <div className="info-grid">
                  <div className="info-item">
                    <label>Questions:</label>
                    <span>{quiz.questions?.length || 0}</span>
                  </div>
                  <div className="info-item">
                    <label>Available From:</label>
                    <span>{formatDate(quiz.start_date)}</span>
                  </div>
                  <div className="info-item">
                    <label>Available Until:</label>
                    <span>{formatDate(quiz.end_date)}</span>
                  </div>
                  <div className="info-item">
                    <label>Randomized:</label>
                    <span>{quiz.is_randomized ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {/* Student specific information */}
              {auth.user.role === 'student' && (
                <div className="student-info">
                  <div className="attempts-info">
                    <h3>Your Attempts</h3>
                    <p>Attempts Used: {quiz.attempts || 0} / {quiz.max_attempts}</p>
                    
                    {quiz.attemptHistory && quiz.attemptHistory.length > 0 && (
                      <div className="attempt-history">
                        <h4>Previous Attempts:</h4>
                        {quiz.attemptHistory.map((attempt, index) => (
                          <div key={attempt.id} className="attempt-item">
                            <span>Attempt {index + 1}: </span>
                            <span>{attempt.score ? `${attempt.score}%` : 'In Progress'}</span>
                            <span className={attempt.is_passing ? 'passed' : 'failed'}>
                              {attempt.is_passing ? ' (Passed)' : ' (Failed)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="quiz-actions">
                    {quiz.canTake ? (
                      <button 
                        className="start-quiz-btn"
                        onClick={handleStartQuiz}
                      >
                        {quiz.attempts > 0 ? 'Retake Quiz' : 'Start Quiz'}
                      </button>
                    ) : (
                      <div className="cannot-take">
                        <p className="error-message">
                          {quiz.notAvailableReason || 'No attempts remaining'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="back-action">
                <button className="secondary-btn" onClick={() => navigate(-1)}>
                  ← Back to Course
                </button>
              </div>
            </div>
          ) : (
            // Quiz Taking Interface
            <div className="quiz-taking">
              <div className="quiz-header">
                <h2>Taking Quiz: {quiz.title}</h2>
                <div className="quiz-timer">
                  Time Remaining: <span className={timeLeft <= 300 ? 'warning' : ''}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              <div className="quiz-questions">
                {currentAttempt.questions.map((question, index) => (
                  <div key={question.id} className="question-item">
                    <div className="question-header">
                      <h3>Question {index + 1}</h3>
                      <span className="question-points">({question.points} points)</span>
                    </div>
                    
                    <div className="question-text">
                      {question.text}
                    </div>

                    <div className="question-options">
                      {question.type === 'multiple_choice' && question.options.map(option => (
                        <label key={option.id} className="option-label">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option.id}
                            checked={answers[question.id] === option.id}
                            onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
                          />
                          {option.option_text}
                        </label>
                      ))}

                      {question.type === 'true_false' && question.options.map(option => (
                        <label key={option.id} className="option-label">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option.id}
                            checked={answers[question.id] === option.id}
                            onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
                          />
                          {option.option_text}
                        </label>
                      ))}

                      {(question.type === 'short_answer' || question.type === 'essay') && (
                        <textarea
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          placeholder="Enter your answer here..."
                          rows={question.type === 'essay' ? 6 : 3}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="quiz-submit">
                <button
                  className="submit-quiz-btn"
                  onClick={handleSubmitQuiz}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizDetail;