// src/components/quiz/QuizDetail.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import './QuizDetail.css';

const QuizDetail = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const timerRef = useRef(null);
  
  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attemptId, setAttemptId] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [responses, setResponses] = useState([]);
  const [results, setResults] = useState(null);
  
  const API_URL = config.apiUrl;
  
  // Fetch quiz details
  useEffect(() => {
    const fetchQuizDetails = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        
        setQuiz(response.data);
        
        // Check if there's an existing attempt
        if (response.data.attempts && response.data.attempts.length > 0) {
          const latestAttempt = response.data.attempts[0];
          
          if (!latestAttempt.is_completed) {
            setAttemptId(latestAttempt.id);
            setIsStarted(true);
            initializeResponses(response.data.questions);
            
            // Calculate remaining time
            const startTime = new Date(latestAttempt.start_time);
            const timeLimit = response.data.time_limit_minutes * 60; // in seconds
            const elapsedSeconds = Math.floor((new Date() - startTime) / 1000);
            const remaining = Math.max(0, timeLimit - elapsedSeconds);
            
            setTimeLeft(remaining);
            startTimer(remaining);
          }
        }
      } catch (error) {
        console.error('Error fetching quiz details:', error);
        notification.error('Failed to load quiz details');
        navigate('/courses');
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId && auth.token) {
      fetchQuizDetails();
    }
    
    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizId, auth.token, API_URL, navigate]);
  
  // Initialize responses array
  const initializeResponses = (questions) => {
    if (!questions) return;
    
    const initialResponses = questions.map(question => ({
      questionId: question.id,
      optionId: null,
      textAnswer: '',
      isAnswered: false
    }));
    
    setResponses(initialResponses);
  };
  
  // Start the quiz
  const handleStartQuiz = async () => {
    try {
      const response = await axios.post(`${API_URL}/quizzes/${quizId}/start`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setAttemptId(response.data.attemptId);
      setIsStarted(true);
      
      // Initialize responses
      initializeResponses(quiz.questions);
      
      // Start timer
      const timeLimit = quiz.time_limit_minutes * 60; // convert to seconds
      setTimeLeft(timeLimit);
      startTimer(timeLimit);
      
      notification.success('Quiz started. Good luck!');
    } catch (error) {
      console.error('Error starting quiz:', error);
      notification.error('Failed to start quiz. Please try again.');
    }
  };
  
  // Start countdown timer
  const startTimer = (seconds) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          // Time's up, submit quiz automatically
          clearInterval(timerRef.current);
          handleSubmitQuiz();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Handle radio button select (multiple choice)
  const handleOptionSelect = (questionIndex, optionId) => {
    const updatedResponses = [...responses];
    updatedResponses[questionIndex] = {
      ...updatedResponses[questionIndex],
      optionId: optionId,
      isAnswered: true
    };
    
    setResponses(updatedResponses);
  };
  
  // Handle text answer change (fill in the blank)
  const handleTextAnswerChange = (questionIndex, value) => {
    const updatedResponses = [...responses];
    updatedResponses[questionIndex] = {
      ...updatedResponses[questionIndex],
      textAnswer: value,
      isAnswered: value.trim() !== ''
    };
    
    setResponses(updatedResponses);
  };
  
  // Go to next question
  const handleNextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };
  
  // Go to previous question
  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };
  
  // Jump to specific question
  const jumpToQuestion = (index) => {
    setCurrentQuestion(index);
  };
  
  // Submit quiz
  const handleSubmitQuiz = async () => {
    // Ask for confirmation
    if (!window.confirm('Are you sure you want to submit your quiz? Once submitted, you cannot make changes.')) {
      return;
    }
    
    try {
      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      const submissionData = {
        responses: responses.map(response => ({
          questionId: response.questionId,
          optionId: response.optionId,
          textAnswer: response.textAnswer
        }))
      };
      
      const response = await axios.post(
        `${API_URL}/quiz-attempts/${attemptId}/submit`,
        submissionData,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      // Set completion state and results
      setIsCompleted(true);
      setResults(response.data);
      
      notification.success('Quiz submitted successfully!');
    } catch (error) {
      console.error('Error submitting quiz:', error);
      notification.error('Failed to submit quiz. Please try again.');
    }
  };
  
  // Calculate progress
  const calculateProgress = () => {
    if (!quiz || !quiz.questions) return 0;
    
    const answeredCount = responses.filter(r => r.isAnswered).length;
    return Math.round((answeredCount / quiz.questions.length) * 100);
  };
  
  // Get unanswered question count
  const getUnansweredCount = () => {
    if (!responses.length) return 0;
    return responses.filter(r => !r.isAnswered).length;
  };
  
  // Navigate back to course
  const handleReturnToCourse = () => {
    navigate(`/courses/${quiz.course_id}`);
  };
  
  if (isLoading) {
    return <div className="loading-spinner">Loading quiz details...</div>;
  }

  if (!quiz) {
    return <div className="error-message">Quiz not found or you don't have access.</div>;
  }
  
  // Results display after submission
  if (isCompleted && results) {
    return (
      <div className="quiz-container quiz-results">
        <div className="quiz-header">
          <h1>{quiz.title} - Results</h1>
          <div className="quiz-meta">
            <span>Course: {quiz.course_title}</span>
            <span>Lesson: {quiz.lesson_title}</span>
          </div>
        </div>
        
        <div className="results-summary">
          <div className="result-card">
            <h2>Your Score</h2>
            <div className="score-display">
              <div className={`score-circle ${results.passed ? 'passed' : 'failed'}`}>
                <span className="score-percent">{Math.round(results.score)}%</span>
              </div>
              <div className="score-details">
                <p>Points: {results.earnedPoints} / {results.totalPoints}</p>
                <p className="pass-status">
                  {results.passed 
                    ? <span className="passed-text">PASSED</span> 
                    : <span className="failed-text">FAILED</span>}
                </p>
                <p>Passing Score: {quiz.passing_score}%</p>
              </div>
            </div>
          </div>
          
          <div className="feedback-section">
            {results.passed 
              ? <p>Congratulations! You have successfully passed this {quiz.is_test ? 'test' : 'quiz'}.</p>
              : <p>You did not reach the passing score. {quiz.is_test 
                 ? 'Please contact your instructor for next steps.' 
                 : 'You may be able to retake this quiz later.'}
                </p>}
          </div>
        </div>
        
        <div className="action-buttons">
          <button className="primary-btn" onClick={handleReturnToCourse}>
            Return to Course
          </button>
        </div>
      </div>
    );
  }
  
  // Quiz introduction before starting
  if (!isStarted) {
    return (
      <div className="quiz-container quiz-intro">
        <div className="quiz-header">
          <h1>{quiz.title}</h1>
          <div className="quiz-meta">
            <span>Course: {quiz.course_title}</span>
            <span>Lesson: {quiz.lesson_title}</span>
            <span className="quiz-type">{quiz.is_test ? 'Graded Test' : 'Practice Quiz'}</span>
          </div>
        </div>
        
        <div className="quiz-details">
          <div className="detail-item">
            <span className="detail-icon">⏱️</span>
            <span className="detail-label">Time Limit:</span>
            <span className="detail-value">{quiz.time_limit_minutes} minutes</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-icon">❓</span>
            <span className="detail-label">Questions:</span>
            <span className="detail-value">{quiz.questions?.length || 0}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-icon">🎯</span>
            <span className="detail-label">Passing Score:</span>
            <span className="detail-value">{quiz.passing_score}%</span>
          </div>
        </div>
        
        <div className="quiz-instructions">
          <h3>Instructions</h3>
          <div className="instruction-content">
            {quiz.description ? (
              <p>{quiz.description}</p>
            ) : (
              <>
                <p>Please read each question carefully and select the best answer.</p>
                <p>Once you start the {quiz.is_test ? 'test' : 'quiz'}, a timer will begin counting down.</p>
                <p>You must complete all questions within the time limit.</p>
                {quiz.is_test && <p>This is a graded test that will count towards your course grade.</p>}
              </>
            )}
          </div>
        </div>
        
        <div className="action-buttons">
          <button className="secondary-btn" onClick={handleReturnToCourse}>
            Back to Course
          </button>
          <button className="primary-btn start-btn" onClick={handleStartQuiz}>
            Start {quiz.is_test ? 'Test' : 'Quiz'} Now
          </button>
        </div>
      </div>
    );
  }
  
  // Active quiz taking interface
  if (!quiz.questions || quiz.questions.length === 0) {
    return <div className="error-message">No questions available for this quiz.</div>;
  }
  
  const question = quiz.questions[currentQuestion];
  const response = responses[currentQuestion];
  
  return (
    <div className="quiz-container quiz-active">
      <div className="quiz-header">
        <h1>{quiz.title}</h1>
        <div className="timer-container">
          <span className={`timer ${timeLeft < 60 ? 'timer-warning' : ''}`}>
            <span className="timer-icon">⏱️</span>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>
      
      <div className="quiz-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${calculateProgress()}%` }}
          ></div>
        </div>
        <div className="progress-stats">
          <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
          <span>{getUnansweredCount()} questions unanswered</span>
        </div>
      </div>
      
      <div className="question-container">
        <div className="question-text">
          <h3>Question {currentQuestion + 1}</h3>
          <p>{question.question_text}</p>
          
          {question.image_data && (
            <div className="question-image">
              <img src={question.image_data} alt="Question" />
            </div>
          )}
        </div>
        
        <div className="answer-container">
          {question.question_type === 'multiple_choice' && question.options && (
            <div className="options-list">
              {question.options.map((option) => (
                <label key={option.id} className="option-item">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    checked={response?.optionId === option.id}
                    onChange={() => handleOptionSelect(currentQuestion, option.id)}
                  />
                  <span className="option-text">{option.option_text}</span>
                </label>
              ))}
            </div>
          )}
          
          {question.question_type === 'fill_in_blank' && (
            <div className="fill-blank-container">
              <label>Your Answer:</label>
              <input
                type="text"
                value={response?.textAnswer || ''}
                onChange={(e) => handleTextAnswerChange(currentQuestion, e.target.value)}
                placeholder="Type your answer here..."
                className="fill-blank-input"
              />
            </div>
          )}
        </div>
      </div>
      
      <div className="navigation-buttons">
        <button 
          className="nav-btn prev-btn" 
          onClick={handlePrevQuestion}
          disabled={currentQuestion === 0}
        >
          Previous
        </button>
        
        <button 
          className="nav-btn next-btn" 
          onClick={handleNextQuestion}
          disabled={currentQuestion === quiz.questions.length - 1}
        >
          Next
        </button>
      </div>
      
      <div className="question-navigator">
        <div className="navigator-label">Question Navigator:</div>
        <div className="question-dots">
          {quiz.questions.map((_, index) => (
            <div 
              key={index}
              className={`question-dot ${index === currentQuestion ? 'active' : ''} ${
                responses[index]?.isAnswered ? 'answered' : ''
              }`}
              onClick={() => jumpToQuestion(index)}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>
      
      <div className="action-buttons">
        <button className="submit-btn" onClick={handleSubmitQuiz}>
          Submit {quiz.is_test ? 'Test' : 'Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuizDetail;