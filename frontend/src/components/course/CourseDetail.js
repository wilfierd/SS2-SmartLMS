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