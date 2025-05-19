// src/components/course/CourseDetail.js (updated with student list and statistics)
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import EnrolledStudentList from './EnrolledStudentList';
import CourseStatistics from './CourseStatistics';
import DiscussionForum from './DiscussionForum';
import notification from '../../utils/notification';
import './CourseDetail.css';

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollmentKey, setEnrollmentKey] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  
  // Assessment states
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentType, setAssessmentType] = useState(null); // 'quiz', 'assignment', 'test'
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  
  // State for assessments display
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [tests, setTests] = useState([]);
  
  // Form states
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    order: 1
  });
  
  const [sessionFormData, setSessionFormData] = useState({
    title: '',
    description: '',
    content: '',
    contentType: 'document',
    lessonId: null,
    files: [],
    videoUrl: '',
    order: 1
  });

  const API_URL = config.apiUrl;
  const isInstructor = auth.user.role === 'instructor';
  const isStudent = auth.user.role === 'student';
  const isAdmin = auth.user.role === 'admin';

  // Permissions based on role
  const permissions = {
    canAddLessons: isAdmin || (isInstructor && (course?.instructorId === auth.user.id)),
    canAddSessions: isAdmin || (isInstructor && (course?.instructorId === auth.user.id)),
    canViewStudents: isAdmin || (isInstructor && (course?.instructorId === auth.user.id)),
    canEnroll: isStudent,
    isEnrolled: false // Will be updated after fetching data
  };

  // Fetch course details
  useEffect(() => {
    const fetchCourseDetails = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        setCourse(response.data);
        
        // Load lessons and sessions
        fetchLessons();
        
        // Load assessments
        fetchAssessments();
        
        // If student, check if enrolled
        if (isStudent) {
          checkEnrollmentStatus();
        }
      } catch (error) {
        console.error('Error fetching course details:', error);
        notification.error('Failed to load course details');
        navigate('/courses');
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId && auth.token) {
      fetchCourseDetails();
    }
  }, [courseId, auth.token, API_URL, isInstructor, isAdmin, navigate, isStudent]);

  // Check if student is enrolled in this course
  const checkEnrollmentStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/enrollments/my-courses`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      const enrolled = response.data.some(course => course.id === parseInt(courseId));
      permissions.isEnrolled = enrolled;
      
      // Force a re-render since we're modifying permissions object
      setCourse(prevCourse => ({...prevCourse}));
    } catch (error) {
      console.error('Error checking enrollment status:', error);
    }
  };

  // Fetch lessons and their sessions
  const fetchLessons = async () => {
    try {
      const response = await axios.get(`${API_URL}/courses/${courseId}/modules`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setLessons(response.data);
      
      // Select the first lesson and session by default if available
      if (response.data.length > 0 && !selectedLesson) {
        const firstLesson = response.data[0];
        setSelectedLesson(firstLesson.id);
        
        if (firstLesson.lessons && firstLesson.lessons.length > 0) {
          setSelectedSession(firstLesson.lessons[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      notification.error('Failed to load course lessons');
    }
  };

  // Fetch assessments (quizzes, assignments, tests)
  const fetchAssessments = async () => {
    try {
      // Fetch quizzes
      const quizzesResponse = await axios.get(`${API_URL}/courses/${courseId}/quizzes`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setQuizzes(quizzesResponse.data);
      
      // Fetch assignments
      const assignmentsResponse = await axios.get(`${API_URL}/courses/${courseId}/assignments`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setAssignments(assignmentsResponse.data);
      
      // Fetch tests
      const testsResponse = await axios.get(`${API_URL}/courses/${courseId}/tests`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setTests(testsResponse.data);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    }
  };

  // Handle enrollment
  const handleEnrollCourse = () => {
    if (!permissions.canEnroll) {
      notification.warning("You don't have permission to enroll in courses");
      return;
    }
    
    setShowEnrollModal(true);
  };

  // Handle enrollment submission
  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API_URL}/enrollments/enroll`, {
        courseId: courseId,
        enrollmentKey: enrollmentKey
      }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      notification.success("Successfully enrolled in course");
      
      // Update enrollment status
      permissions.isEnrolled = true;
      setCourse(prevCourse => ({...prevCourse}));
      
      // Close modal
      setShowEnrollModal(false);
      setEnrollmentKey('');
    } catch (err) {
      console.error("Error enrolling in course:", err);
      const errorMessage = err.response?.data?.message || "Failed to enroll in course. Please check your enrollment key.";
      notification.error(errorMessage);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return <div className="loading-spinner">Loading course details...</div>;
  }

  if (!course) {
    return <div className="error-message">Course not found or you don't have access.</div>;
  }

  return (
    <div className="course-detail-container">
      <Sidebar activeItem="courses" />
      
      <div className="admin-main-content">
        <Header title={course.title} />
        
        <div className="course-detail-content">
          <div className="course-header">
            <div className="course-info">
              <h1>{course.title}</h1>
              <div className="course-meta">
                <span className="course-code">{course.code}</span>
                <span className="course-instructor">Instructor: {course.instructor}</span>
                <span className={`status-badge ${course.status.toLowerCase()}`}>{course.status}</span>
              </div>
              <p className="course-description">{course.description}</p>
            </div>
            
            {/* Main Action Buttons */}
            <div className="main-actions">
              {/* Instructor/Admin Actions */}
              {permissions.canAddLessons && (
                <>
                  <button 
                    className="secondary-btn" 
                    onClick={() => setShowAddLessonModal(true)}
                  >
                    <span className="btn-icon">📚</span> Add Lesson
                  </button>
                  
                  <button 
                    className="secondary-btn" 
                    onClick={() => {
                      if (lessons.length === 0) {
                        notification.warning('Please create a lesson first');
                        setShowAddLessonModal(true);
                      } else {
                        setSessionFormData({
                          ...sessionFormData,
                          lessonId: lessons[0].id
                        });
                        setShowAddSessionModal(true);
                      }
                    }}
                  >
                    <span className="btn-icon">🗒️</span> Add Session
                  </button>
                  
                  <button 
                    className="secondary-btn assessment-btn" 
                    onClick={() => setShowAssessmentModal(true)}
                  >
                    <span className="btn-icon">📝</span> Create Assessment
                  </button>
                </>
              )}
              
              {/* Student Actions */}
              {isStudent && !permissions.isEnrolled && (
                <button 
                  className="enroll-btn"
                  onClick={handleEnrollCourse}
                >
                  <span className="btn-icon">✅</span> Enroll in Course
                </button>
              )}
            </div>
          </div>

            {showAddLessonModal && (
            <div className="modal-overlay" onClick={() => setShowAddLessonModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add New Lesson</h2>
                    <button className="close-btn" onClick={() => setShowAddLessonModal(false)}>×</button>
                </div>
                
                <form onSubmit={(e) => {
                    e.preventDefault();
                    // Add your lesson creation logic here
                    // Example API call:
                    // createLesson(lessonFormData).then(() => {
                    //   setShowAddLessonModal(false);
                    //   fetchLessons();
                    // });
                    notification.info("This feature is still being implemented");
                    setShowAddLessonModal(false);
                }}>
                    <div className="form-group">
                    <label htmlFor="lessonTitle">Lesson Title*</label>
                    <input
                        type="text"
                        id="lessonTitle"
                        name="title"
                        value={lessonFormData.title}
                        onChange={(e) => setLessonFormData({...lessonFormData, title: e.target.value})}
                        placeholder="Enter lesson title"
                        required
                    />
                    </div>
                    
                    <div className="form-group">
                    <label htmlFor="lessonDescription">Description</label>
                    <textarea
                        id="lessonDescription"
                        name="description"
                        value={lessonFormData.description}
                        onChange={(e) => setLessonFormData({...lessonFormData, description: e.target.value})}
                        placeholder="Enter a description for this lesson"
                        rows="4"
                    ></textarea>
                    </div>
                    
                    <div className="form-group">
                    <label htmlFor="lessonOrder">Order</label>
                    <input
                        type="number"
                        id="lessonOrder"
                        name="order"
                        value={lessonFormData.order}
                        onChange={(e) => setLessonFormData({...lessonFormData, order: e.target.value})}
                        min="1"
                    />
                    <small>The order in which this lesson appears in the course</small>
                    </div>
                    
                    <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowAddLessonModal(false)}>
                        Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                        Create Lesson
                    </button>
                    </div>
                </form>
                </div>
            </div>
            )}

            {showAddSessionModal && (
            <div className="modal-overlay" onClick={() => setShowAddSessionModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add New Session</h2>
                    <button className="close-btn" onClick={() => setShowAddSessionModal(false)}>×</button>
                </div>
                
                <form onSubmit={(e) => {
                    e.preventDefault();
                    // Add your session creation logic here
                    notification.info("This feature is still being implemented");
                    setShowAddSessionModal(false);
                }}>
                    <div className="form-group">
                    <label htmlFor="sessionTitle">Session Title*</label>
                    <input
                        type="text"
                        id="sessionTitle"
                        name="title"
                        value={sessionFormData.title}
                        onChange={(e) => setSessionFormData({...sessionFormData, title: e.target.value})}
                        placeholder="Enter session title"
                        required
                    />
                    </div>
                    
                    <div className="form-group">
                    <label htmlFor="lessonSelect">Lesson*</label>
                    <select
                        id="lessonSelect"
                        name="lessonId"
                        value={sessionFormData.lessonId || ''}
                        onChange={(e) => setSessionFormData({...sessionFormData, lessonId: e.target.value})}
                        required
                    >
                        <option value="">Select a lesson</option>
                        {lessons.map(lesson => (
                        <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                        ))}
                    </select>
                    </div>
                    
                    <div className="form-group">
                    <label htmlFor="contentType">Content Type*</label>
                    <select
                        id="contentType"
                        name="contentType"
                        value={sessionFormData.contentType}
                        onChange={(e) => setSessionFormData({...sessionFormData, contentType: e.target.value})}
                        required
                    >
                        <option value="document">Document</option>
                        <option value="video">Video</option>
                        <option value="quiz">Quiz</option>
                        <option value="assignment">Assignment</option>
                    </select>
                    </div>
                    
                    <div className="form-group">
                    <label htmlFor="sessionDescription">Description</label>
                    <textarea
                        id="sessionDescription"
                        name="description"
                        value={sessionFormData.description}
                        onChange={(e) => setSessionFormData({...sessionFormData, description: e.target.value})}
                        placeholder="Enter a description for this session"
                        rows="3"
                    ></textarea>
                    </div>
                    
                    {sessionFormData.contentType === 'video' && (
                    <div className="form-group">
                        <label htmlFor="videoUrl">Video URL</label>
                        <input
                        type="url"
                        id="videoUrl"
                        name="videoUrl"
                        value={sessionFormData.videoUrl}
                        onChange={(e) => setSessionFormData({...sessionFormData, videoUrl: e.target.value})}
                        placeholder="Enter YouTube or video URL"
                        />
                    </div>
                    )}
                    
                    {sessionFormData.contentType === 'document' && (
                    <div className="form-group">
                        <label htmlFor="sessionContent">Content</label>
                        <textarea
                        id="sessionContent"
                        name="content"
                        value={sessionFormData.content}
                        onChange={(e) => setSessionFormData({...sessionFormData, content: e.target.value})}
                        placeholder="Enter content or instructions"
                        rows="6"
                        ></textarea>
                    </div>
                    )}
                    
                    <div className="form-group">
                    <label htmlFor="sessionFiles">Upload Files (Optional)</label>
                    <input
                        type="file"
                        id="sessionFiles"
                        name="files"
                        multiple
                        onChange={(e) => setSessionFormData({...sessionFormData, files: e.target.files})}
                    />
                    <small>You can upload multiple files as materials for this session</small>
                    </div>
                    
                    <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowAddSessionModal(false)}>
                        Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                        Create Session
                    </button>
                    </div>
                </form>
                </div>
            </div>
            )}

            {showAssessmentModal && (
            <div className="modal-overlay" onClick={() => setShowAssessmentModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create Assessment</h2>
                    <button className="close-btn" onClick={() => setShowAssessmentModal(false)}>×</button>
                </div>
                
                <div className="assessment-options">
                    <div className="option-title">Select Assessment Type:</div>
                    
                    <div className="options-grid">
                    <div className="assessment-option" onClick={() => {
                        setAssessmentType('quiz');
                        setShowAssessmentModal(false);
                        setShowQuizModal(true);
                    }}>
                        <div className="option-icon">🧩</div>
                        <div className="option-name">Quiz</div>
                        <div className="option-desc">Create a practice quiz with automatic grading</div>
                    </div>
                    
                    <div className="assessment-option" onClick={() => {
                        setAssessmentType('assignment');
                        setShowAssessmentModal(false);
                        setShowAssignmentModal(true);
                    }}>
                        <div className="option-icon">📝</div>
                        <div className="option-name">Assignment</div>
                        <div className="option-desc">Create an assignment with file submissions</div>
                    </div>
                    
                    <div className="assessment-option" onClick={() => {
                        setAssessmentType('test');
                        setShowAssessmentModal(false);
                        setShowTestModal(true);
                    }}>
                        <div className="option-icon">📊</div>
                        <div className="option-name">Test</div>
                        <div className="option-desc">Create a graded test with time limits</div>
                    </div>
                    </div>
                    
                    <div className="modal-footer">
                    <button className="cancel-btn" onClick={() => setShowAssessmentModal(false)}>
                        Cancel
                    </button>
                    </div>
                </div>
                </div>
            </div>
            )}

            {showQuizModal && (
            <div className="modal-overlay" onClick={() => setShowQuizModal(false)}>
                <div className="modal-content quiz-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create Quiz</h2>
                    <button className="close-btn" onClick={() => setShowQuizModal(false)}>×</button>
                </div>
                
                <form onSubmit={(e) => {
                    e.preventDefault();
                    notification.info("Quiz creation feature is still being implemented");
                    setShowQuizModal(false);
                }}>
                    {/* Basic Quiz Info */}
                    <div className="form-section">
                    <h3 className="section-title">Quiz Information</h3>
                    
                    <div className="form-group">
                        <label htmlFor="quizTitle">Quiz Title*</label>
                        <input
                        type="text"
                        id="quizTitle"
                        name="title"
                        placeholder="Enter quiz title"
                        required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="lessonSelect">Lesson*</label>
                        <select
                        id="lessonSelect"
                        name="lessonId"
                        required
                        >
                        <option value="">Select a lesson</option>
                        {lessons.map(lesson => (
                            <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                        ))}
                        </select>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                        <label htmlFor="timeLimit">Time Limit (minutes)</label>
                        <input
                            type="number"
                            id="timeLimit"
                            name="timeLimit"
                            min="1"
                            placeholder="30"
                        />
                        </div>
                        
                        <div className="form-group">
                        <label htmlFor="passingScore">Passing Score (%)</label>
                        <input
                            type="number"
                            id="passingScore"
                            name="passingScore"
                            min="0"
                            max="100"
                            placeholder="70"
                        />
                        </div>
                    </div>
                    </div>
                    
                    {/* This would normally have questions UI, simplified for now */}
                    <div className="form-section">
                    <h3 className="section-title">Questions</h3>
                    <p className="placeholder-text">Question creation UI will appear here</p>
                    </div>
                    
                    <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowQuizModal(false)}>
                        Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                        Create Quiz
                    </button>
                    </div>
                </form>
                </div>
            </div>
            )}

            {showAssignmentModal && (
            <div className="modal-overlay" onClick={() => setShowAssignmentModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create Assignment</h2>
                    <button className="close-btn" onClick={() => setShowAssignmentModal(false)}>×</button>
                </div>
                
                <form onSubmit={(e) => {
                    e.preventDefault();
                    notification.info("Assignment creation feature is still being implemented");
                    setShowAssignmentModal(false);
                }}>
                    <div className="form-group">
                    <label htmlFor="assignmentTitle">Assignment Title*</label>
                    <input
                        type="text"
                        id="assignmentTitle"
                        name="title"
                        placeholder="Enter assignment title"
                        required
                    />
                    </div>
                    
                    <div className="form-group">
                    <label htmlFor="lessonSelect">Lesson*</label>
                    <select
                        id="lessonSelect"
                        name="lessonId"
                        required
                    >
                        <option value="">Select a lesson</option>
                        {lessons.map(lesson => (
                        <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                        ))}
                    </select>
                    </div>
                    
                    <div className="form-group">
                    <label htmlFor="assignmentDescription">Description*</label>
                    <textarea
                        id="assignmentDescription"
                        name="description"
                        placeholder="Enter assignment description and instructions"
                        rows="4"
                        required
                    ></textarea>
                    </div>
                    
                    <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="maxPoints">Maximum Points*</label>
                        <input
                        type="number"
                        id="maxPoints"
                        name="maxPoints"
                        min="1"
                        placeholder="100"
                        required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="dueDate">Due Date*</label>
                        <input
                        type="datetime-local"
                        id="dueDate"
                        name="dueDate"
                        required
                        />
                    </div>
                    </div>
                    
                    <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="allowedFileTypes">Allowed File Types</label>
                        <input
                        type="text"
                        id="allowedFileTypes"
                        name="allowedFileTypes"
                        placeholder="pdf,docx,jpg,png"
                        />
                        <small>Comma-separated list of allowed file extensions</small>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="maxFileSize">Max File Size (MB)</label>
                        <input
                        type="number"
                        id="maxFileSize"
                        name="maxFileSize"
                        min="1"
                        placeholder="5"
                        />
                    </div>
                    </div>
                    
                    <div className="form-group checkbox-group">
                    <label>
                        <input
                        type="checkbox"
                        name="allowLateSubmissions"
                        />
                        Allow late submissions
                    </label>
                    </div>
                    
                    <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowAssignmentModal(false)}>
                        Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                        Create Assignment
                    </button>
                    </div>
                </form>
                </div>
            </div>
            )}

            {showTestModal && (
            <div className="modal-overlay" onClick={() => setShowTestModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create Test</h2>
                    <button className="close-btn" onClick={() => setShowTestModal(false)}>×</button>
                </div>
                
                <form onSubmit={(e) => {
                    e.preventDefault();
                    notification.info("Test creation feature is still being implemented");
                    setShowTestModal(false);
                }}>
                    {/* Form content similar to Quiz but with additional test settings */}
                    <div className="form-group">
                    <label htmlFor="testTitle">Test Title*</label>
                    <input
                        type="text"
                        id="testTitle"
                        name="title"
                        placeholder="Enter test title"
                        required
                    />
                    </div>
                    
                    <div className="form-group">
                    <label htmlFor="lessonSelect">Lesson*</label>
                    <select
                        id="lessonSelect"
                        name="lessonId"
                        required
                    >
                        <option value="">Select a lesson</option>
                        {lessons.map(lesson => (
                        <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                        ))}
                    </select>
                    </div>
                    
                    <div className="form-group">
                    <label htmlFor="testDescription">Description</label>
                    <textarea
                        id="testDescription"
                        name="description"
                        placeholder="Enter test description"
                        rows="3"
                    ></textarea>
                    </div>
                    
                    <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="timeLimit">Time Limit (minutes)*</label>
                        <input
                        type="number"
                        id="timeLimit"
                        name="timeLimit"
                        min="1"
                        placeholder="60"
                        required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="passingScore">Passing Score (%)*</label>
                        <input
                        type="number"
                        id="passingScore"
                        name="passingScore"
                        min="0"
                        max="100"
                        placeholder="70"
                        required
                        />
                    </div>
                    </div>
                    
                    <div className="form-section">
                    <h3 className="section-title">Test Settings</h3>
                    
                    <div className="form-group checkbox-group">
                        <label>
                        <input type="checkbox" name="randomizeQuestions" />
                        Randomize questions
                        </label>
                    </div>
                    
                    <div className="form-group checkbox-group">
                        <label>
                        <input type="checkbox" name="showAnswers" />
                        Show answers after completion
                        </label>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="maxAttempts">Maximum Attempts</label>
                        <input
                        type="number"
                        id="maxAttempts"
                        name="maxAttempts"
                        min="1"
                        placeholder="1"
                        />
                        <small>Leave at 1 for a single attempt test</small>
                    </div>
                    </div>
                    
                    <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowTestModal(false)}>
                        Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                        Create Test
                    </button>
                    </div>
                </form>
                </div>
            </div>
            )}
          
          {/* Course Navigation Tabs */}
          <div className="course-tabs">
            <button 
              className={`course-tab ${activeTab === 'content' ? 'active' : ''}`}
              onClick={() => setActiveTab('content')}
            >
              Course Content
            </button>
            
            {(isInstructor || isAdmin) && (
              <button 
                className={`course-tab ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                Students
              </button>
            )}
            
            {(isInstructor || isAdmin) && (
              <button 
                className={`course-tab ${activeTab === 'statistics' ? 'active' : ''}`}
                onClick={() => setActiveTab('statistics')}
              >
                Statistics
              </button>
            )}
            
            <button 
              className={`course-tab ${activeTab === 'discussion' ? 'active' : ''}`}
              onClick={() => setActiveTab('discussion')}
            >
              Discussion Forum
            </button>
          </div>
          
          {/* Course Content Tab */}
          {activeTab === 'content' && (
            <div className="course-content-container">
              {/* Lesson Sidebar */}
              <div className="course-lessons-sidebar">
                <h3>Course Content</h3>
                {lessons.length > 0 ? (
                  <ul className="lesson-list">
                    {lessons.map(lesson => (
                      <li 
                        key={lesson.id} 
                        className={selectedLesson === lesson.id ? 'active' : ''}
                      >
                        <div 
                          className="lesson-header" 
                          onClick={() => setSelectedLesson(lesson.id)}
                        >
                          <span className="lesson-title">{lesson.title}</span>
                          <span className="session-count">
                            {lesson.lessons?.length || 0} sessions
                          </span>
                        </div>
                        
                        {/* Sessions under this lesson */}
                        {selectedLesson === lesson.id && (
                          <ul className="session-list">
                            {/* Regular sessions */}
                            {lesson.lessons && lesson.lessons.map(session => (
                              <li 
                                key={session.id} 
                                className={selectedSession === session.id ? 'active' : ''}
                                onClick={() => setSelectedSession(session.id)}
                              >
                                <span className="session-icon">📄</span>
                                {session.title}
                              </li>
                            ))}
                            
                            {/* Show quizzes for this lesson */}
                            {quizzes
                              .filter(quiz => quiz.lesson_id === lesson.id)
                              .map(quiz => (
                                <li 
                                  key={`quiz-${quiz.id}`} 
                                  className="assessment-item quiz-item"
                                  onClick={() => navigate(`/quizzes/${quiz.id}`)}
                                >
                                  <span className="session-icon">🧩</span>
                                  Quiz: {quiz.title}
                                </li>
                              ))
                            }
                            
                            {/* Show assignments for this lesson */}
                            {assignments
                              .filter(assignment => assignment.lesson_id === lesson.id)
                              .map(assignment => (
                                <li 
                                  key={`assignment-${assignment.id}`} 
                                  className="assessment-item assignment-item"
                                  onClick={() => navigate(`/assignments/${assignment.id}`)}
                                >
                                  <span className="session-icon">📋</span>
                                  Assignment: {assignment.title}
                                </li>
                              ))
                            }
                            
                            {/* Show tests for this lesson */}
                            {tests
                              .filter(test => test.lesson_id === lesson.id)
                              .map(test => (
                                <li 
                                  key={`test-${test.id}`} 
                                  className="assessment-item test-item"
                                  onClick={() => navigate(`/quizzes/${test.id}`)}
                                >
                                  <span className="session-icon">📊</span>
                                  Test: {test.title}
                                </li>
                              ))
                            }
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">
                    <p>No lessons available yet.</p>
                    {permissions.canAddLessons && (
                      <button 
                        className="add-btn" 
                        onClick={() => setShowAddLessonModal(true)}
                      >
                        Create First Lesson
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Session Content Area */}
              <div className="course-session-content">
                {selectedLesson && selectedSession ? (
                  <div className="session-content">
                    {(() => {
                      // Find current lesson and session
                      const currentLesson = lessons.find(l => l.id === selectedLesson);
                      if (!currentLesson || !currentLesson.lessons) return null;
                      
                      const currentSession = currentLesson.lessons.find(s => s.id === selectedSession);
                      if (!currentSession) return null;
                      
                      return (
                        <>
                          <div className="session-header">
                            <h2>{currentSession.title}</h2>
                            <div className="lesson-label">Lesson: {currentLesson.title}</div>
                          </div>
                          
                          <div className="session-description">
                            {currentSession.description}
                          </div>
                          
                          {/* Content based on type */}
                          {currentSession.contentType === 'video' && currentSession.videoUrl && (
                            <div className="video-container">
                              <iframe 
                                title={currentSession.title}
                                src={currentSession.videoUrl.includes('youtube') ? 
                                    currentSession.videoUrl.replace('watch?v=', 'embed/') : 
                                    currentSession.videoUrl
                                }
                                allowFullScreen
                              ></iframe>
                            </div>
                          )}
                          
                          {currentSession.contentType === 'document' && currentSession.documentUrl && (
                            <div className="document-container">
                              <a 
                                href={currentSession.documentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="document-link"
                              >
                                <span className="document-icon">📄</span> {currentSession.title}
                              </a>
                            </div>
                          )}
                                                      
                          {currentSession.content && (
                            <div className="session-main-content">
                              {currentSession.content}
                            </div>
                          )}

                          {currentSession.contentType === 'quiz' && (
                            <div className="quiz-container">
                              <h3>{currentSession.title}</h3>
                              <p>{currentSession.description}</p>
                              <button className="primary-btn">Start Quiz</button>
                            </div>
                          )}
                          
                          {/* Session Materials */}
                          {currentSession.materials && currentSession.materials.length > 0 && (
                            <div className="session-materials">
                              <h4>Materials</h4>
                              <ul>
                                {currentSession.materials.map(material => (
                                  <li key={material.id}>
                                    <a href={material.filePath || material.externalUrl} 
                                       target="_blank"
                                       rel="noopener noreferrer">
                                      {material.title}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="empty-state">
                    {lessons.length > 0 ? (
                      <p>Select a lesson and session to view content</p>
                    ) : (
                      <p>No content available yet. {permissions.canAddLessons ? 'Add a lesson to get started.' : ''}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Students Tab */}
          {activeTab === 'students' && (isInstructor || isAdmin) && (
            <EnrolledStudentList courseId={courseId} auth={auth} />
          )}
          
          {/* Statistics Tab */}
          {activeTab === 'statistics' && (isInstructor || isAdmin) && (
            <CourseStatistics courseId={courseId} auth={auth} />
          )}
          
          {/* Discussion Forum Tab */}
          {activeTab === 'discussion' && (
            <DiscussionForum courseId={courseId} />
          )}
        </div>
      </div>
      
      {/* Enrollment Modal */}
      {showEnrollModal && (
        <div className="modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Course Enrollment</h2>
              <button className="close-btn" onClick={() => setShowEnrollModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleEnrollSubmit}>
              <div className="form-group">
                <label htmlFor="enrollKey">Enrollment Key</label>
                <input
                  type="text"
                  id="enrollKey"
                  name="enrollKey"
                  value={enrollmentKey}
                  onChange={(e) => setEnrollmentKey(e.target.value)}
                  placeholder="Enter the enrollment key provided by your instructor"
                  required
                />
                <small>
                  This course requires an enrollment key. Contact your instructor if you don't have one.
                </small>
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowEnrollModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Other modals remain the same as in your original code */}
    </div>
  );
};

export default CourseDetail;