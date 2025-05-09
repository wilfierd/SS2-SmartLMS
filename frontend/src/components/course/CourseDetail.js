// src/components/course/CourseDetail.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import notification from '../../utils/notification';
import './CourseDetail.css';

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [course, setCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollmentKey, setEnrollmentKey] = useState('');
  
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
  
  // Assignment form state
  const [assignmentFormData, setAssignmentFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    maxPoints: 100,
    lessonId: null,
    allowedFileTypes: ['docx', 'pdf', 'xlsx', 'pptx', 'zip'],
    maxFileSize: '5', // options: '5', '100', '200' (in MB)
    allowLateSubmissions: false
  });
  
  // Quiz form state
  const [quizFormData, setQuizFormData] = useState({
    title: '',
    description: '',
    lessonId: null,
    timeLimit: 30, // minutes
    passingScore: 70,
    questions: [
      {
        text: '',
        type: 'multiple_choice',
        image: null,
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        fillInAnswer: ''
      }
    ]
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
        
        // Check if user is instructor of this course or admin
        if (isInstructor || isAdmin) {
          fetchEnrolledStudents();
        }
        
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

  // Fetch enrolled students
  const fetchEnrolledStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/courses/${courseId}/students`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setEnrolledStudents(response.data);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
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

  // Handle adding a new lesson
  const handleAddLesson = async (e) => {
    e.preventDefault();
    
    if (!lessonFormData.title.trim()) {
      notification.warning('Lesson title is required');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/courses/${courseId}/modules`,
        lessonFormData,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      notification.success('Lesson added successfully');
      
      // Refresh lessons
      fetchLessons();
      
      // Reset form and close modal
      setLessonFormData({ title: '', description: '', order: 1 });
      setShowAddLessonModal(false);
    } catch (error) {
      console.error('Error adding lesson:', error);
      notification.error('Failed to add lesson');
    }
  };

  // Handle adding a new session
  const handleAddSession = async (e) => {
    e.preventDefault();
    
    if (!sessionFormData.title.trim() || !sessionFormData.lessonId) {
      notification.warning('Session title and lesson are required');
      return;
    }

    try {
      // Create FormData object for file uploads
      const formData = new FormData();
      formData.append('title', sessionFormData.title);
      formData.append('description', sessionFormData.description);
      formData.append('content', sessionFormData.content);
      formData.append('contentType', sessionFormData.contentType);
      formData.append('moduleId', sessionFormData.lessonId);
      formData.append('orderIndex', sessionFormData.order);
      
      if (sessionFormData.videoUrl) {
        formData.append('videoUrl', sessionFormData.videoUrl);
      }
      
      // Append files if any
      if (sessionFormData.files.length > 0) {
        for (let i = 0; i < sessionFormData.files.length; i++) {
          formData.append('materials', sessionFormData.files[i]);
        }
      }
      
      const response = await axios.post(
        `${API_URL}/courses/${courseId}/lessons`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      notification.success('Session added successfully');
      
      // Refresh lessons and sessions
      fetchLessons();
      
      // Reset form and close modal
      setSessionFormData({
        title: '',
        description: '',
        content: '',
        contentType: 'document',
        lessonId: null,
        files: [],
        videoUrl: '',
        order: 1
      });
      setShowAddSessionModal(false);
    } catch (error) {
      console.error('Error adding session:', error);
      notification.error('Failed to add session');
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

  // Handle form input changes for lesson
  const handleLessonInputChange = (e) => {
    const { name, value } = e.target;
    setLessonFormData({
      ...lessonFormData,
      [name]: value
    });
  };

  // Handle form input changes for session
  const handleSessionInputChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      setSessionFormData({
        ...sessionFormData,
        files: Array.from(files)
      });
    } else {
      setSessionFormData({
        ...sessionFormData,
        [name]: value
      });
    }
  };

  // Assignment form handlers
  const handleAssignmentInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'allowedFileTypes') {
      // Handle file type checkboxes
      const fileTypes = [...assignmentFormData.allowedFileTypes];
      if (checked) {
        if (!fileTypes.includes(value)) fileTypes.push(value);
      } else {
        const index = fileTypes.indexOf(value);
        if (index !== -1) fileTypes.splice(index, 1);
      }
      
      setAssignmentFormData({
        ...assignmentFormData,
        allowedFileTypes: fileTypes
      });
    } else {
      setAssignmentFormData({
        ...assignmentFormData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  // Handle assignment submission
  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Format the data
      const assignmentData = {
        course_id: courseId,
        lesson_id: assignmentFormData.lessonId,
        title: assignmentFormData.title,
        description: assignmentFormData.description,
        max_points: assignmentFormData.maxPoints,
        due_date: `${assignmentFormData.dueDate}T${assignmentFormData.dueTime || '23:59'}:00`,
        allowed_file_types: assignmentFormData.allowedFileTypes.join(','),
        max_file_size: assignmentFormData.maxFileSize,
        allow_late_submissions: assignmentFormData.allowLateSubmissions
      };
      
      const response = await axios.post(
        `${API_URL}/courses/${courseId}/assignments`,
        assignmentData,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      notification.success('Assignment created successfully');
      setShowAssignmentModal(false);
      
      // Reset the form data
      setAssignmentFormData({
        title: '',
        description: '',
        dueDate: '',
        dueTime: '',
        maxPoints: 100,
        lessonId: null,
        allowedFileTypes: ['docx', 'pdf', 'xlsx', 'pptx', 'zip'],
        maxFileSize: '5',
        allowLateSubmissions: false
      });
      
      // Refresh assessments
      fetchAssessments();
      // Refresh lessons to show the new assignment
      fetchLessons();
    } catch (error) {
      console.error('Error creating assignment:', error);
      notification.error('Failed to create assignment');
    }
  };

  // Quiz/Test form handlers
  const handleQuizInputChange = (e) => {
    const { name, value } = e.target;
    setQuizFormData({
      ...quizFormData,
      [name]: value
    });
  };

  // Handle changes to questions
  const handleQuestionChange = (questionIndex, field, value) => {
    const updatedQuestions = [...quizFormData.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      [field]: value
    };
    
    setQuizFormData({
      ...quizFormData,
      questions: updatedQuestions
    });
  };

  // Handle changes to options
  const handleOptionChange = (questionIndex, optionIndex, field, value) => {
    const updatedQuestions = [...quizFormData.questions];
    const updatedOptions = [...updatedQuestions[questionIndex].options];
    
    if (field === 'isCorrect') {
      // If it's a change to the correct answer
      updatedOptions.forEach((option, i) => {
        updatedOptions[i] = {
          ...option,
          isCorrect: i === optionIndex // Only the selected option is correct
        };
      });
    } else {
      updatedOptions[optionIndex] = {
        ...updatedOptions[optionIndex],
        [field]: value
      };
    }
    
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      options: updatedOptions
    };
    
    setQuizFormData({
      ...quizFormData,
      questions: updatedQuestions
    });
  };

  // Add a new question
  const addQuestion = () => {
    setQuizFormData({
      ...quizFormData,
      questions: [
        ...quizFormData.questions,
        {
          text: '',
          type: 'multiple_choice',
          image: null,
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ],
          fillInAnswer: ''
        }
      ]
    });
  };

  // Remove a question
  const removeQuestion = (index) => {
    const updatedQuestions = [...quizFormData.questions];
    updatedQuestions.splice(index, 1);
    
    setQuizFormData({
      ...quizFormData,
      questions: updatedQuestions
    });
  };

  // Handle image upload for a question
  const handleImageUpload = (questionIndex, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Limit file size (max 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      notification.error('Image size should be less than 2 MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const updatedQuestions = [...quizFormData.questions];
      updatedQuestions[questionIndex] = {
        ...updatedQuestions[questionIndex],
        image: event.target.result
      };
      
      setQuizFormData({
        ...quizFormData,
        questions: updatedQuestions
      });
    };
    
    reader.readAsDataURL(file);
  };

  // Submit quiz/test form
  const handleQuizSubmit = async (e, isTest = false) => {
    e.preventDefault();
    
    try {
      // Validate that each question has a correct answer
      for (let i = 0; i < quizFormData.questions.length; i++) {
        const question = quizFormData.questions[i];
        
        if (question.type === 'multiple_choice') {
          const hasCorrectOption = question.options.some(option => option.isCorrect);
          if (!hasCorrectOption) {
            notification.error(`Question ${i+1} must have at least one correct answer`);
            return;
          }
        } else if (question.type === 'fill_in_blank' && !question.fillInAnswer) {
          notification.error(`Question ${i+1} must have an answer`);
          return;
        }
      }
      
      // Format the data
      const quizData = {
        course_id: courseId,
        lesson_id: quizFormData.lessonId,
        title: quizFormData.title,
        description: quizFormData.description,
        time_limit_minutes: quizFormData.timeLimit,
        passing_score: quizFormData.passingScore,
        is_test: isTest,
        questions: quizFormData.questions.map(q => ({
          question_text: q.text,
          question_type: q.type,
          image: q.image,
          points: 1, // Default, each question is worth 1 point
          options: q.type === 'multiple_choice' ? q.options : [],
          answer: q.type === 'fill_in_blank' ? q.fillInAnswer : ''
        }))
      };
      
      // Different endpoint for quiz vs test
      const endpoint = isTest ? 'tests' : 'quizzes';
      
      const response = await axios.post(
        `${API_URL}/courses/${courseId}/${endpoint}`,
        quizData,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      notification.success(`${isTest ? 'Test' : 'Quiz'} created successfully`);
      setShowQuizModal(false);
      setShowTestModal(false);
      
      // Reset form data
      setQuizFormData({
        title: '',
        description: '',
        lessonId: null,
        timeLimit: 30,
        passingScore: 70,
        questions: [
          {
            text: '',
            type: 'multiple_choice',
            image: null,
            options: [
              { text: '', isCorrect: false },
              { text: '', isCorrect: false },
              { text: '', isCorrect: false },
              { text: '', isCorrect: false }
            ],
            fillInAnswer: ''
          }
        ]
      });
      
      // Refresh assessments
      fetchAssessments();
      // Refresh lessons
      fetchLessons();
    } catch (error) {
      console.error(`Error creating ${isTest ? 'test' : 'quiz'}:`, error);
      notification.error(`Failed to create ${isTest ? 'test' : 'quiz'}`);
    }
  };

  // Handle select assessment type
  const handleSelectAssessmentType = (type) => {
    setAssessmentType(type);
  };

  // Navigate to next session
  const handleNextSession = () => {
    if (!selectedLesson || !selectedSession) return;
    
    // Find current lesson
    const currentLesson = lessons.find(lesson => lesson.id === selectedLesson);
    if (!currentLesson || !currentLesson.lessons) return;
    
    // Find current session index
    const currentSessionIndex = currentLesson.lessons.findIndex(session => session.id === selectedSession);
    if (currentSessionIndex === -1) return;
    
    // If there's a next session in this lesson
    if (currentSessionIndex < currentLesson.lessons.length - 1) {
      setSelectedSession(currentLesson.lessons[currentSessionIndex + 1].id);
      return;
    }
    
    // If we're at the last session of this lesson, find the next lesson
    const currentLessonIndex = lessons.findIndex(lesson => lesson.id === selectedLesson);
    if (currentLessonIndex < lessons.length - 1) {
      const nextLesson = lessons[currentLessonIndex + 1];
      setSelectedLesson(nextLesson.id);
      
      // Select first session of the next lesson
      if (nextLesson.lessons && nextLesson.lessons.length > 0) {
        setSelectedSession(nextLesson.lessons[0].id);
      } else {
        setSelectedSession(null);
      }
    }
  };

  // Navigate to previous session
  const handlePrevSession = () => {
    if (!selectedLesson || !selectedSession) return;
    
    // Find current lesson
    const currentLesson = lessons.find(lesson => lesson.id === selectedLesson);
    if (!currentLesson || !currentLesson.lessons) return;
    
    // Find current session index
    const currentSessionIndex = currentLesson.lessons.findIndex(session => session.id === selectedSession);
    if (currentSessionIndex === -1) return;
    
    // If there's a previous session in this lesson
    if (currentSessionIndex > 0) {
      setSelectedSession(currentLesson.lessons[currentSessionIndex - 1].id);
      return;
    }
    
    // If we're at the first session of this lesson, find the previous lesson
    const currentLessonIndex = lessons.findIndex(lesson => lesson.id === selectedLesson);
    if (currentLessonIndex > 0) {
      const prevLesson = lessons[currentLessonIndex - 1];
      setSelectedLesson(prevLesson.id);
      
      // Select last session of the previous lesson
      if (prevLesson.lessons && prevLesson.lessons.length > 0) {
        setSelectedSession(prevLesson.lessons[prevLesson.lessons.length - 1].id);
      } else {
        setSelectedSession(null);
      }
    }
  };

  // Format student status for display
  const formatStudentStatus = (status) => {
    if (!status) return 'Not Started';
    
    // Replace underscores with spaces and capitalize words
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
              {permissions.canViewStudents && (
                <button 
                  className="primary-btn" 
                  onClick={() => setShowStudentsModal(true)}
                >
                  <span className="btn-icon">👥</span> View Participants ({enrolledStudents.length})
                </button>
              )}
              
              {permissions.canAddLessons && (
                <button 
                  className="secondary-btn" 
                  onClick={() => setShowAddLessonModal(true)}
                >
                  <span className="btn-icon">📚</span> Add Lesson
                </button>
              )}
              
              {permissions.canAddSessions && (
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
              )}
              
              {/* Assessment Button */}
              {permissions.canAddLessons && (
                <button 
                  className="secondary-btn assessment-btn" 
                  onClick={() => setShowAssessmentModal(true)}
                >
                  <span className="btn-icon">📝</span> Create Assessment
                </button>
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
          
          {/* Course Content Section */}
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
                    
                    // Calculate indices for navigation
                    const currentLessonIndex = lessons.findIndex(l => l.id === selectedLesson);
                    const currentSessionIndex = currentLesson.lessons.findIndex(s => s.id === selectedSession);
                    
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
                        
                        {/* Navigation Buttons */}
                        <div className="session-navigation">
                          <button 
                            className="nav-btn prev-btn" 
                            onClick={handlePrevSession}
                            disabled={currentLessonIndex === 0 && currentSessionIndex === 0}
                          >
                            ← Previous Session
                          </button>
                          
                          <span className="progress-indicator">
                            Session {currentSessionIndex + 1} of {currentLesson.lessons.length}
                          </span>
                          
                          <button 
                            className="nav-btn next-btn" 
                            onClick={handleNextSession}
                            disabled={currentLessonIndex === lessons.length - 1 && 
                                      currentSessionIndex === currentLesson.lessons.length - 1}
                          >
                            Next Session →
                          </button>
                        </div>
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
        </div>
      </div>
      
      {/* Add Lesson Modal */}
      {showAddLessonModal && (
        <div className="modal-overlay" onClick={() => setShowAddLessonModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Lesson</h2>
              <button className="close-btn" onClick={() => setShowAddLessonModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddLesson}>
              <div className="form-group">
                <label htmlFor="title">Lesson Title*</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={lessonFormData.title}
                  onChange={handleLessonInputChange}
                  placeholder="Enter lesson title (e.g., Week 1)"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={lessonFormData.description}
                  onChange={handleLessonInputChange}
                  placeholder="Enter lesson description"
                  rows="4"
                ></textarea>
              </div>
              
              <div className="form-group">
                <label htmlFor="order">Order</label>
                <input
                  type="number"
                  id="order"
                  name="order"
                  value={lessonFormData.order}
                  onChange={handleLessonInputChange}
                  min="1"
                />
                <small>The order in which this lesson appears in the course</small>
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddLessonModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add Session Modal */}
      {showAddSessionModal && (
        <div className="modal-overlay" onClick={() => setShowAddSessionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Session</h2>
              <button className="close-btn" onClick={() => setShowAddSessionModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddSession}>
              <div className="form-group">
                <label htmlFor="lessonId">Lesson*</label>
                <select
                  id="lessonId"
                  name="lessonId"
                  value={sessionFormData.lessonId || ''}
                  onChange={handleSessionInputChange}
                  required
                >
                  <option value="">Select a lesson</option>
                  {lessons.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="title">Session Title*</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={sessionFormData.title}
                  onChange={handleSessionInputChange}
                  placeholder="Enter session title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={sessionFormData.description}
                  onChange={handleSessionInputChange}
                  placeholder="Enter session description"
                  rows="3"
                ></textarea>
              </div>
              
              <div className="form-group">
                <label htmlFor="contentType">Content Type*</label>
                <select
                  id="contentType"
                  name="contentType"
                  value={sessionFormData.contentType}
                  onChange={handleSessionInputChange}
                  required
                >
                  <option value="document">Document</option>
                  <option value="video">Video</option>
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                  <option value="live_session">Live Session</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="content">Main Content</label>
                <textarea
                  id="content"
                  name="content"
                  value={sessionFormData.content}
                  onChange={handleSessionInputChange}
                  placeholder="Enter the main content of the session"
                  rows="6"
                ></textarea>
                <small>For documents, this is the main text. For other types, you can provide instructions.</small>
              </div>
              
              {sessionFormData.contentType === 'video' && (
                <div className="form-group">
                  <label htmlFor="videoUrl">Video URL</label>
                  <input
                    type="text"
                    id="videoUrl"
                    name="videoUrl"
                    value={sessionFormData.videoUrl}
                    onChange={handleSessionInputChange}
                    placeholder="Enter YouTube URL or other video link"
                  />
                  <small>Provide a YouTube link or other embeddable video URL</small>
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="order">Order</label>
                <input
                  type="number"
                  id="order"
                  name="order"
                  value={sessionFormData.order}
                  onChange={handleSessionInputChange}
                  min="1"
                />
                <small>The order in which this session appears in the lesson</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="files">Attachment Files</label>
                <input
                  type="file"
                  id="files"
                  name="files"
                  onChange={handleSessionInputChange}
                  multiple
                />
                <small>Upload PDF, PPT, or other supplementary materials (max 5 files)</small>
                {sessionFormData.files.length > 0 && (
                  <div className="selected-files">
                    <p>Selected files:</p>
                    <ul>
                      {Array.from(sessionFormData.files).map((file, index) => (
                        <li key={index}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddSessionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Enrolled Students Modal */}
      {showStudentsModal && (
        <div className="modal-overlay" onClick={() => setShowStudentsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Enrolled Students</h2>
              <button className="close-btn" onClick={() => setShowStudentsModal(false)}>×</button>
            </div>
            
            <div className="students-list-container">
              {enrolledStudents.length > 0 ? (
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Enrollment Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map(student => (
                      <tr key={student.id}>
                        <td>{student.firstName} {student.lastName}</td>
                        <td>{student.email}</td>
                        <td>{new Date(student.enrollmentDate).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-pill ${student.completionStatus?.toLowerCase() || 'not-started'}`}>
                            {formatStudentStatus(student.completionStatus)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <p>No students enrolled in this course yet.</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="close-btn" onClick={() => setShowStudentsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
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
      
      {/* Assessment Type Selection Modal */}
      {showAssessmentModal && (
        <div className="modal-overlay" onClick={() => setShowAssessmentModal(false)}>
          <div className="modal-content assessment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Assessment</h2>
              <button className="close-btn" onClick={() => setShowAssessmentModal(false)}>×</button>
            </div>
            
            <div className="assessment-type-selection">
              <p className="modal-description">Choose the type of assessment you want to create:</p>
              
              <div className="assessment-type-options">
                <div 
                  className={`assessment-option ${assessmentType === 'quiz' ? 'selected' : ''}`}
                  onClick={() => handleSelectAssessmentType('quiz')}
                >
                  <div className="option-icon">🧩</div>
                  <h3>Practice Quiz</h3>
                  <p>Create a short practice quiz with immediate feedback</p>
                </div>
                
                <div 
                  className={`assessment-option ${assessmentType === 'assignment' ? 'selected' : ''}`}
                  onClick={() => handleSelectAssessmentType('assignment')}
                >
                  <div className="option-icon">📋</div>
                  <h3>Assignment</h3>
                  <p>Create an assignment where students can submit files</p>
                </div>
                
                <div 
                  className={`assessment-option ${assessmentType === 'test' ? 'selected' : ''}`}
                  onClick={() => handleSelectAssessmentType('test')}
                >
                  <div className="option-icon">📊</div>
                  <h3>Graded Test</h3>
                  <p>Create a formal test with weightage towards final grade</p>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowAssessmentModal(false)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="submit-btn"
                  disabled={!assessmentType}
                  onClick={() => {
                    if (assessmentType === 'quiz') setShowQuizModal(true);
                    if (assessmentType === 'assignment') setShowAssignmentModal(true);
                    if (assessmentType === 'test') setShowTestModal(true);
                    setShowAssessmentModal(false);
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="modal-overlay" onClick={() => setShowAssignmentModal(false)}>
          <div className="modal-content assignment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Assignment</h2>
              <button className="close-btn" onClick={() => setShowAssignmentModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleAssignmentSubmit}>
              <div className="form-group">
                <label htmlFor="title">Assignment Title*</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={assignmentFormData.title}
                  onChange={handleAssignmentInputChange}
                  placeholder="e.g., Homework 1"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lessonId">Select Lesson*</label>
                <select
                  id="lessonId"
                  name="lessonId"
                  value={assignmentFormData.lessonId}
                  onChange={handleAssignmentInputChange}
                  required
                >
                  <option value="">Select a lesson</option>
                  {lessons.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Instructions</label>
                <textarea
                  id="description"
                  name="description"
                  value={assignmentFormData.description}
                  onChange={handleAssignmentInputChange}
                  placeholder="Provide detailed instructions for students"
                  rows="4"
                ></textarea>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dueDate">Due Date*</label>
                  <input
                    type="date"
                    id="dueDate"
                    name="dueDate"
                    value={assignmentFormData.dueDate}
                    onChange={handleAssignmentInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="dueTime">Due Time</label>
                  <input
                    type="time"
                    id="dueTime"
                    name="dueTime"
                    value={assignmentFormData.dueTime}
                    onChange={handleAssignmentInputChange}
                    placeholder="23:59"
                  />
                  <small>Default: 11:59 PM</small>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="maxPoints">Maximum Points</label>
                <input
                  type="number"
                  id="maxPoints"
                  name="maxPoints"
                  value={assignmentFormData.maxPoints}
                  onChange={handleAssignmentInputChange}
                  min="1"
                  max="1000"
                />
              </div>
              
              <div className="form-section">
                <h3 className="form-section-title">Submission Settings</h3>
                
                <div className="form-group">
                  <label>Allowed File Types</label>
                  <div className="checkbox-group file-types">
                    <label>
                      <input
                        type="checkbox"
                        name="allowedFileTypes"
                        value="docx"
                        checked={assignmentFormData.allowedFileTypes.includes('docx')}
                        onChange={handleAssignmentInputChange}
                      />
                      Word (.docx)
                    </label>
                    
                    <label>
                      <input
                        type="checkbox"
                        name="allowedFileTypes"
                        value="pdf"
                        checked={assignmentFormData.allowedFileTypes.includes('pdf')}
                        onChange={handleAssignmentInputChange}
                      />
                      PDF (.pdf)
                    </label>
                    
                    <label>
                      <input
                        type="checkbox"
                        name="allowedFileTypes"
                        value="xlsx"
                        checked={assignmentFormData.allowedFileTypes.includes('xlsx')}
                        onChange={handleAssignmentInputChange}
                      />
                      Excel (.xlsx)
                    </label>
                    
                    <label>
                      <input
                        type="checkbox"
                        name="allowedFileTypes"
                        value="pptx"
                        checked={assignmentFormData.allowedFileTypes.includes('pptx')}
                        onChange={handleAssignmentInputChange}
                      />
                      PowerPoint (.pptx)
                    </label>
                    
                    <label>
                      <input
                        type="checkbox"
                        name="allowedFileTypes"
                        value="zip"
                        checked={assignmentFormData.allowedFileTypes.includes('zip')}
                        onChange={handleAssignmentInputChange}
                      />
                      Zip Archive (.zip)
                    </label>
                    
                    <label>
                      <input
                        type="checkbox"
                        name="allowedFileTypes"
                        value="jpg"
                        checked={assignmentFormData.allowedFileTypes.includes('jpg')}
                        onChange={handleAssignmentInputChange}
                      />
                      Images (.jpg, .png)
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="maxFileSize">Maximum File Size</label>
                  <select
                    id="maxFileSize"
                    name="maxFileSize"
                    value={assignmentFormData.maxFileSize}
                    onChange={handleAssignmentInputChange}
                  >
                    <option value="5">Under 5 MB</option>
                    <option value="100">5 MB - 100 MB</option>
                    <option value="200">100 MB - 200 MB</option>
                  </select>
                </div>
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="allowLateSubmissions"
                      checked={assignmentFormData.allowLateSubmissions}
                      onChange={handleAssignmentInputChange}
                    />
                    Allow Late Submissions
                  </label>
                </div>
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
      
      {/* Quiz Modal */}
      {showQuizModal && (
        <div className="modal-overlay" onClick={() => setShowQuizModal(false)}>
          <div className="modal-content quiz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Practice Quiz</h2>
              <button className="close-btn" onClick={() => setShowQuizModal(false)}>×</button>
            </div>
            
            <form onSubmit={(e) => handleQuizSubmit(e, false)}>
              <div className="form-group">
                <label htmlFor="quizTitle">Quiz Title*</label>
                <input
                  type="text"
                  id="quizTitle"
                  name="title"
                  value={quizFormData.title}
                  onChange={handleQuizInputChange}
                  placeholder="e.g., Chapter 1 Review Quiz"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="quizLessonId">Assign to Lesson*</label>
                <select
                  id="quizLessonId"
                  name="lessonId"
                  value={quizFormData.lessonId || ''}
                  onChange={handleQuizInputChange}
                  required
                >
                  <option value="">Select a lesson</option>
                  {lessons.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="quizDescription">Description</label>
                <textarea
                  id="quizDescription"
                  name="description"
                  value={quizFormData.description}
                  onChange={handleQuizInputChange}
                  placeholder="Provide instructions for this quiz"
                  rows="3"
                ></textarea>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="timeLimit">Time Limit (minutes)</label>
                  <input
                    type="number"
                    id="timeLimit"
                    name="timeLimit"
                    value={quizFormData.timeLimit}
                    onChange={handleQuizInputChange}
                    min="1"
                    max="180"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="passingScore">Passing Score (%)</label>
                  <input
                    type="number"
                    id="passingScore"
                    name="passingScore"
                    value={quizFormData.passingScore}
                    onChange={handleQuizInputChange}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="quiz-questions-section">
                <h3 className="form-section-title">Questions</h3>
                
                {quizFormData.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="question-card">
                    <div className="question-header">
                      <h4>Question {questionIndex + 1}</h4>
                      {quizFormData.questions.length > 1 && (
                        <button 
                          type="button" 
                          className="remove-question-btn"
                          onClick={() => removeQuestion(questionIndex)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`question-${questionIndex}-text`}>Question Text*</label>
                      <textarea
                        id={`question-${questionIndex}-text`}
                        value={question.text}
                        onChange={(e) => handleQuestionChange(questionIndex, 'text', e.target.value)}
                        placeholder="Enter your question here"
                        rows="2"
                        required
                      ></textarea>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`question-${questionIndex}-type`}>Question Type</label>
                      <select
                        id={`question-${questionIndex}-type`}
                        value={question.type}
                        onChange={(e) => handleQuestionChange(questionIndex, 'type', e.target.value)}
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="fill_in_blank">Fill in the Blank</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`question-${questionIndex}-image`}>Question Image (optional)</label>
                      <input
                        type="file"
                        id={`question-${questionIndex}-image`}
                        accept="image/*"
                        onChange={(e) => handleImageUpload(questionIndex, e)}
                      />
                      {question.image && (
                        <div className="image-preview">
                          <img 
                            src={question.image} 
                            alt="Question" 
                            style={{ maxWidth: '200px', maxHeight: '150px', marginTop: '10px' }} 
                          />
                          <button 
                            type="button" 
                            className="remove-image-btn"
                            onClick={() => handleQuestionChange(questionIndex, 'image', null)}
                          >
                            Remove Image
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {question.type === 'multiple_choice' ? (
                      <div className="options-container">
                        <label>Answer Options</label>
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="option-row">
                            <input
                              type="radio"
                              name={`question-${questionIndex}-correct`}
                              checked={option.isCorrect}
                              onChange={() => handleOptionChange(questionIndex, optionIndex, 'isCorrect', true)}
                            />
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => handleOptionChange(questionIndex, optionIndex, 'text', e.target.value)}
                              placeholder={`Option ${optionIndex + 1} (leave empty if not needed)`}
                            />
                          </div>
                        ))}
                        <small>Select the radio button next to the correct answer</small>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label htmlFor={`question-${questionIndex}-answer`}>Correct Answer*</label>
                        <input
                          type="text"
                          id={`question-${questionIndex}-answer`}
                          value={question.fillInAnswer}
                          onChange={(e) => handleQuestionChange(questionIndex, 'fillInAnswer', e.target.value)}
                          placeholder="Enter the correct answer for the blank"
                          required={question.type === 'fill_in_blank'}
                        />
                      </div>
                    )}
                  </div>
                ))}
                
                <button type="button" className="add-question-btn" onClick={addQuestion}>
                  Add Another Question
                </button>
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
      
      {/* Test Modal - reuses the same form but is a graded assessment */}
      {showTestModal && (
        <div className="modal-overlay" onClick={() => setShowTestModal(false)}>
          <div className="modal-content quiz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header test-header">
              <h2>Create Graded Test</h2>
              <button className="close-btn" onClick={() => setShowTestModal(false)}>×</button>
            </div>
            
            <form onSubmit={(e) => handleQuizSubmit(e, true)}>
              <div className="form-group">
                <label htmlFor="testTitle">Test Title*</label>
                <input
                  type="text"
                  id="testTitle"
                  name="title"
                  value={quizFormData.title}
                  onChange={handleQuizInputChange}
                  placeholder="e.g., Midterm Exam"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="testLessonId">Assign to Lesson*</label>
                <select
                  id="testLessonId"
                  name="lessonId"
                  value={quizFormData.lessonId || ''}
                  onChange={handleQuizInputChange}
                  required
                >
                  <option value="">Select a lesson</option>
                  {lessons.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="testDescription">Description</label>
                <textarea
                  id="testDescription"
                  name="description"
                  value={quizFormData.description}
                  onChange={handleQuizInputChange}
                  placeholder="Provide instructions for this test"
                  rows="3"
                ></textarea>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="timeLimit">Time Limit (minutes)</label>
                  <input
                    type="number"
                    id="timeLimit"
                    name="timeLimit"
                    value={quizFormData.timeLimit}
                    onChange={handleQuizInputChange}
                    min="1"
                    max="180"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="passingScore">Passing Score (%)</label>
                  <input
                    type="number"
                    id="passingScore"
                    name="passingScore"
                    value={quizFormData.passingScore}
                    onChange={handleQuizInputChange}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="quiz-questions-section">
                <h3 className="form-section-title">Questions</h3>
                
                {quizFormData.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="question-card">
                    <div className="question-header">
                      <h4>Question {questionIndex + 1}</h4>
                      {quizFormData.questions.length > 1 && (
                        <button 
                          type="button" 
                          className="remove-question-btn"
                          onClick={() => removeQuestion(questionIndex)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`test-question-${questionIndex}-text`}>Question Text*</label>
                      <textarea
                        id={`test-question-${questionIndex}-text`}
                        value={question.text}
                        onChange={(e) => handleQuestionChange(questionIndex, 'text', e.target.value)}
                        placeholder="Enter your question here"
                        rows="2"
                        required
                      ></textarea>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`test-question-${questionIndex}-type`}>Question Type</label>
                      <select
                        id={`test-question-${questionIndex}-type`}
                        value={question.type}
                        onChange={(e) => handleQuestionChange(questionIndex, 'type', e.target.value)}
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="fill_in_blank">Fill in the Blank</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`test-question-${questionIndex}-image`}>Question Image (optional)</label>
                      <input
                        type="file"
                        id={`test-question-${questionIndex}-image`}
                        accept="image/*"
                        onChange={(e) => handleImageUpload(questionIndex, e)}
                      />
                      {question.image && (
                        <div className="image-preview">
                          <img 
                            src={question.image} 
                            alt="Question" 
                            style={{ maxWidth: '200px', maxHeight: '150px', marginTop: '10px' }} 
                          />
                          <button 
                            type="button" 
                            className="remove-image-btn"
                            onClick={() => handleQuestionChange(questionIndex, 'image', null)}
                          >
                            Remove Image
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {question.type === 'multiple_choice' ? (
                      <div className="options-container">
                        <label>Answer Options</label>
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="option-row">
                            <input
                              type="radio"
                              name={`test-question-${questionIndex}-correct`}
                              checked={option.isCorrect}
                              onChange={() => handleOptionChange(questionIndex, optionIndex, 'isCorrect', true)}
                            />
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => handleOptionChange(questionIndex, optionIndex, 'text', e.target.value)}
                              placeholder={`Option ${optionIndex + 1} (leave empty if not needed)`}
                            />
                          </div>
                        ))}
                        <small>Select the radio button next to the correct answer</small>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label htmlFor={`test-question-${questionIndex}-answer`}>Correct Answer*</label>
                        <input
                          type="text"
                          id={`test-question-${questionIndex}-answer`}
                          value={question.fillInAnswer}
                          onChange={(e) => handleQuestionChange(questionIndex, 'fillInAnswer', e.target.value)}
                          placeholder="Enter the correct answer for the blank"
                          required={question.type === 'fill_in_blank'}
                        />
                      </div>
                    )}
                  </div>
                ))}
                
                <button type="button" className="add-question-btn" onClick={addQuestion}>
                  Add Another Question
                </button>
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
    </div>
  );
};

export default CourseDetail;