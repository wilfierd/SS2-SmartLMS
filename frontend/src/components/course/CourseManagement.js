// src/components/course/CourseManagement.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import AuthContext from '../../context/AuthContext';
import './CourseManagement.css';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import { useNavigate } from 'react-router-dom';
import CourseService from '../../services/courseService';

const CourseManagement = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const courseServiceInstance = CourseService;
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollmentKey, setEnrollmentKey] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [editingCourse, setEditingCourse] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState({ visible: false, x: 0, y: 0, courseId: null });
  const [sidebarExpanded, setSidebarExpanded] = useState(
    localStorage.getItem('sidebarExpanded') === 'true' || false
  );

  // State for dropdowns
  const [instructors, setInstructors] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    instructorId: '',
    departmentId: '',
    description: '',
    startDate: '',
    endDate: '',
    thumbnailImage: null,
    status: 'Draft',
    isFeatured: false,
    enrollmentKey: '',
    requiresEnrollmentKey: false
  });

  // API URL from config
  const API_URL = config.apiUrl;

  // Dynamic filter options based on departments
  const [filterOptions, setFilterOptions] = useState(['All']);

  // Set permissions based on role
  const permissions = React.useMemo(() => {
    switch(auth.user.role) {
      case 'admin':
        return {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canArchive: true,
          canEnroll: false,
          canLeave: false,
          needsEnrollmentKey: false,
          canSetEnrollmentKey: true,
          canViewAllCourses: true,
          pageTitle: "Course Catalog"
        };
      case 'instructor':
        return {
          canCreate: true, 
          canEdit: true, // Can edit their own courses
          canDelete: false, // FIXED: Instructors shouldn't delete courses
          canArchive: true, // Can archive their own courses
          canEnroll: false,
          canLeave: false,
          needsEnrollmentKey: false,
          canSetEnrollmentKey: true, // Can set enrollment keys for their courses
          canViewAllCourses: false, // Only see their own courses
          pageTitle: "My Courses"
        };
      case 'student':
        return {
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canArchive: false,
          canEnroll: true,
          canLeave: true,
          needsEnrollmentKey: true,
          canSetEnrollmentKey: false,
          canViewAllCourses: true, // Students can see all available courses
          pageTitle: "Available Courses"
        };
      default:
        return {};
    }
  }, [auth.user.role]);

  // Listen for sidebar state changes
  useEffect(() => {
    const handleSidebarChange = () => {
      setSidebarExpanded(localStorage.getItem('sidebarExpanded') === 'true');
    };

    window.addEventListener('storage', handleSidebarChange);

    // Check sidebar state when component mounts
    const checkSidebarState = () => {
      const isSidebarExpanded = document.body.classList.contains('sidebar-expanded');
      setSidebarExpanded(isSidebarExpanded);
    };

    // Add MutationObserver to watch for body class changes
    const observer = new MutationObserver(checkSidebarState);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('storage', handleSidebarChange);
      observer.disconnect();
    };
  }, []);

  // Load all data on component mount
  useEffect(() => {
    fetchCourses();
    if (auth.user.role === 'student') {
      fetchEnrolledCourses();
    }
    if (permissions.canEdit || permissions.canCreate) {
      fetchInstructors();
      fetchDepartments();
    }
  }, [auth.token, auth.user.role, permissions.canEdit, permissions.canCreate]);

  // Update filter options when departments are loaded
  useEffect(() => {
    if (departments.length > 0) {
      setFilterOptions([
        'All',
        ...departments.map(dept => dept.name)
      ]);
    }
  }, [departments]);

  // Check if student is enrolled in a course
  const isEnrolled = (courseId) => {
    return enrolledCourses.some(course => course.id === courseId);
  };

  // Check if instructor owns a course
  const isOwnCourse = (course) => {
    return auth.user.role === 'instructor' && course.instructorId === auth.user.id;
  };

  // Navigation to course details
  const handleViewCourseDetails = (courseId) => {
    navigate(`/courses/${courseId}/detail`);
  };
  // Fetch courses from the API
  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const response = await axios.get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      // For instructors, filter to only show their courses
      if (auth.user.role === 'instructor' && !permissions.canViewAllCourses) {
        setCourses(response.data.filter(course => course.instructorId === auth.user.id));
      } else {
        setCourses(response.data);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching courses:", err);
      notification.error("Failed to load courses. Please try again.");
      setIsLoading(false);
    }
  }, [auth.token, auth.user.role, auth.user.id, permissions.canViewAllCourses]);
  // Fetch enrolled courses for students
  const fetchEnrolledCourses = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/enrollments/my-courses`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setEnrolledCourses(response.data);
    } catch (err) {
      console.error("Error fetching enrolled courses:", err);
      notification.error("Failed to load your enrolled courses.");
    }
  }, [auth.token]);
  // Fetch instructors for the dropdown
  const fetchInstructors = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/instructors`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setInstructors(response.data);
    } catch (err) {
      console.error("Error fetching instructors:", err);
      notification.error("Failed to load instructors list.");
    }
  }, [auth.token]);
  // Fetch departments for the dropdown
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/departments`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setDepartments(response.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
      notification.error("Failed to load departments list.");
    }
  }, [auth.token]);

  // Reset form data
  const resetFormData = () => {
    setFormData({
      title: '',
      code: '',
      instructorId: '',
      departmentId: '',
      description: '',
      startDate: '',
      endDate: '',
      thumbnailImage: null,
      status: 'Draft',
      isFeatured: false,
      enrollmentKey: '',
      requiresEnrollmentKey: false
    });
  };

  // Open add course modal
  const handleAddNewCourse = () => {
    if (!permissions.canCreate) {
      notification.warning("You don't have permission to create courses");
      return;
    }
    
    resetFormData();
    setEditingCourse(null);
    setShowAddModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingCourse(null);
  };

  // Close enrollment modal
  const handleCloseEnrollModal = () => {
    setShowEnrollModal(false);
    setEnrollmentKey('');
    setSelectedCourseId(null);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle file input changes
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        thumbnailImage: file
      });
    }
  };

  // Handle form submission with real API
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!permissions.canCreate && !permissions.canEdit) {
      notification.warning("You don't have permission to create or edit courses");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Show loading toast
      const loadingToastId = notification.loading(editingCourse ? 'Updating course...' : 'Creating course...');
        // Handle file upload first if we have a file
      let thumbnailUrl = null;
      if (formData.thumbnailImage) {
        try {          // For editing: use course-specific endpoint, for creation: use general endpoint
          const courseId = editingCourse ? editingCourse.id : null;
          const uploadResponse = await courseServiceInstance.uploadThumbnail(formData.thumbnailImage, courseId);
          thumbnailUrl = uploadResponse.thumbnailUrl;
        } catch (error) {
          console.error('Error uploading thumbnail:', error);
          notification.error('Failed to upload thumbnail. Please try again.');
          notification.dismiss(loadingToastId);
          setIsLoading(false);
          return;
        }
      }
      
      // Prepare the course data
      const courseData = {
        title: formData.title,
        code: formData.code,
        instructorId: auth.user.role === 'instructor' ? auth.user.id : formData.instructorId,
        departmentId: formData.departmentId || null,
        description: formData.description,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        status: formData.status,
        thumbnailUrl: thumbnailUrl || (editingCourse ? editingCourse.thumbnail : null),
        isFeatured: formData.isFeatured,
        enrollmentKey: formData.requiresEnrollmentKey ? formData.enrollmentKey : null
      };
      
      if (editingCourse) {
        // Check if instructor owns this course
        if (auth.user.role === 'instructor' && editingCourse.instructorId !== auth.user.id) {
          notification.error("You can only edit your own courses");
          notification.dismiss(loadingToastId);
          setIsLoading(false);
          return;
        }
        
        // Update existing course
        await axios.put(`${API_URL}/courses/${editingCourse.id}`, courseData, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        notification.dismiss(loadingToastId);
        notification.success('Course updated successfully');
      } else {
        // Create new course
        await axios.post(`${API_URL}/courses`, courseData, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        notification.dismiss(loadingToastId);
        notification.success('Course created successfully');
      }
      
      // Refresh the courses list
      fetchCourses();
      handleCloseModal();
      
    } catch (err) {
      console.error("Error saving course:", err);
      const errorMessage = err.response?.data?.message || "Failed to save course. Please try again.";
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle course selection for batch operations
  const handleToggleSelection = (courseId) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter(id => id !== courseId));
    } else {
      setSelectedCourses([...selectedCourses, courseId]);
    }
  };

  // Handle enrollment
  const handleEnrollCourse = (courseId) => {
    if (!permissions.canEnroll) {
      notification.warning("You don't have permission to enroll in courses");
      return;
    }
    
    setSelectedCourseId(courseId);
    setShowEnrollModal(true);
  };

  // Handle enrollment submission
  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await axios.post(`${API_URL}/enrollments/enroll`, {
        courseId: selectedCourseId,
        enrollmentKey: enrollmentKey
      }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      notification.success("Successfully enrolled in course");
      
      // Refresh enrolled courses
      fetchEnrolledCourses();
      handleCloseEnrollModal();
    } catch (err) {
      console.error("Error enrolling in course:", err);
      const errorMessage = err.response?.data?.message || "Failed to enroll in course. Please check your enrollment key.";
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle leaving a course
  const handleLeaveCourse = async (courseId) => {
    if (!permissions.canLeave) {
      notification.warning("You don't have permission to leave courses");
      return;
    }
    
    setIsLoading(true);
    
    try {
      await axios.delete(`${API_URL}/enrollments/leave/${courseId}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      notification.success("Successfully left the course");
      
      // Refresh enrolled courses
      fetchEnrolledCourses();
    } catch (err) {
      console.error("Error leaving course:", err);
      const errorMessage = err.response?.data?.message || "Failed to leave course. Please try again.";
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
    
    handleCloseContextMenu();
  };

  // Handle course removal with real API
  const handleRemoveCourses = () => {
    if (!permissions.canDelete) {
      notification.warning("You don't have permission to delete courses");
      return;
    }
    
    if (selectedCourses.length === 0) {
      notification.warning("Please select at least one course to delete.");
      return;
    }
    
    // Check if any selected course is published
    const hasPublishedCourse = courses.some(
      course => selectedCourses.includes(course.id) && course.status.toLowerCase() === 'published'
    );
    
    if (hasPublishedCourse) {
      setShowDeleteConfirm(true);
    } else {
      performDeleteCourses();
    }
  };

  // Perform the actual course deletion with batch API
  const performDeleteCourses = async () => {
    if (!permissions.canDelete) {
      notification.warning("You don't have permission to delete courses");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Show loading toast
      const loadingToastId = notification.loading('Deleting courses...');
      
      // Use batch delete endpoint
      await axios.post(`${API_URL}/courses/batch-delete`, 
        { courseIds: selectedCourses },
        { headers: { Authorization: `Bearer ${auth.token}` }}
      );
      
      notification.dismiss(loadingToastId);
      notification.success(`${selectedCourses.length} course(s) deleted successfully`);
      
      // Refresh the courses list
      fetchCourses();
      setSelectedCourses([]);
      setShowDeleteConfirm(false);
      
    } catch (err) {
      console.error("Error deleting courses:", err);
      const errorMessage = err.response?.data?.message || "Failed to delete courses. Please try again.";
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter courses based on selected category
  const getFilteredCourses = () => {
    if (activeFilter === 'All') {
      return courses;
    }
    
    // Filter by department name
    return courses.filter(course => 
      course.department === activeFilter
    );
  };

  // Handle context menu (right-click) on a course
  const handleContextMenu = (e, courseId) => {
    e.preventDefault();
    
    const course = courses.find(c => c.id === courseId);
    
    // For instructors, only show context menu for their own courses
    if (auth.user.role === 'instructor' && !isOwnCourse(course)) {
      return;
    }
    
    setShowContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      courseId
    });
  };

  // Close context menu
  const handleCloseContextMenu = () => {
    setShowContextMenu({ visible: false, x: 0, y: 0, courseId: null });
  };

  // Edit course with real data
  const handleEditCourse = (courseId) => {
    if (!permissions.canEdit) {
      notification.warning("You don't have permission to edit courses");
      return;
    }
    
    const course = courses.find(c => c.id === courseId);
    
    // For instructors, check if they own the course
    if (auth.user.role === 'instructor' && !isOwnCourse(course)) {
      notification.warning("You can only edit your own courses");
      return;
    }
    
    if (course) {
      setFormData({
        title: course.title,
        code: course.code || '',
        instructorId: course.instructorId || '',
        departmentId: course.departmentId || '',
        description: course.description || '',
        startDate: course.startDate || '',
        endDate: course.endDate || '',
        thumbnailImage: null, // Can't prefill the file input
        status: course.status || 'Draft',
        isFeatured: course.isFeatured || false,
        enrollmentKey: course.enrollmentKey || '',
        requiresEnrollmentKey: !!course.enrollmentKey
      });
      setEditingCourse(course);
      setShowAddModal(true);
    }
    handleCloseContextMenu();
  };

  // Archive course with real API
  const handleArchiveCourse = async (courseId) => {
    if (!permissions.canArchive) {
      notification.warning("You don't have permission to archive courses");
      return;
    }
    
    const course = courses.find(c => c.id === courseId);
    
    // For instructors, check if they own the course
    if (auth.user.role === 'instructor' && !isOwnCourse(course)) {
      notification.warning("You can only archive your own courses");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Show loading toast
      const loadingToastId = notification.loading('Archiving course...');
      
      // Use the archive endpoint
      await axios.put(`${API_URL}/courses/${courseId}/archive`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      notification.dismiss(loadingToastId);
      notification.success('Course archived successfully');
      
      // Refresh the courses list
      fetchCourses();
      
    } catch (err) {
      console.error("Error archiving course:", err);
      const errorMessage = err.response?.data?.message || "Failed to archive course. Please try again.";
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
      handleCloseContextMenu();
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

  // Listen for clicks outside the context menu
  useEffect(() => {
    const handleClickOutside = () => {
      if (showContextMenu.visible) {
        handleCloseContextMenu();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showContextMenu.visible]);

  return (
    <div className={`admin-course-management ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
      <Sidebar activeItem="courses" />
      
      <div className="admin-main-content">
        <Header title={permissions.pageTitle} />
        
        <div className="course-catalog-content">
          {auth.user.role === 'student' && (
            <div className="course-tabs-container">
              <button 
                className={`course-tab ${activeFilter !== 'Enrolled' ? 'active' : ''}`}
                onClick={() => setActiveFilter('All')}
              >
                Available Courses
              </button>
              <button 
                className={`course-tab ${activeFilter === 'Enrolled' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Enrolled')}
              >
                My Enrolled Courses
              </button>
            </div>
          )}
          
          <div className="filter-options">
            {filterOptions.map(filter => (
              <button
                key={filter}
                className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          
          <div className="action-buttons">
            {permissions.canCreate && (
              <button className="add-btn" onClick={handleAddNewCourse}>
                <span className="icon">+</span> Add New Course
              </button>
            )}
            
            {permissions.canDelete && (
              <button 
                className="remove-btn" 
                onClick={handleRemoveCourses}
                disabled={selectedCourses.length === 0}
              >
                Remove {selectedCourses.length > 0 ? `(${selectedCourses.length})` : ''}
              </button>
            )}
          </div>
          
          {isLoading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <div className="course-grid">
              {/* For students in "My Enrolled Courses" view */}
              {auth.user.role === 'student' && activeFilter === 'Enrolled' ? (
                // Show enrolled courses
                enrolledCourses.length > 0 ? (
                  enrolledCourses.map(course => (
                    <div 
                      key={course.id}
                      className="course-card"
                      onContextMenu={(e) => handleContextMenu(e, course.id)}
                      onClick={(e) => {
                        // Only navigate to details if not clicking on the checkbox or menu button
                        if (!e.target.closest('.course-checkbox') && !e.target.closest('.course-menu-btn')) {
                          handleViewCourseDetails(course.id);
                        }
                      }}                      style={{ cursor: 'pointer' }}
                    >
                      <div className="course-thumbnail">
                        {course.thumbnailUrl ? (
                          <img src={course.thumbnailUrl} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div className="placeholder-thumbnail"></div>
                        )}
                      </div>
                      
                      <div className="course-info">
                        <h3>{course.title}</h3>
                        <div className="instructor-info">
                          {course.instructor}
                        </div>
                        <div className="course-meta">
                          <span className={`status-badge ${course.status.toLowerCase()}`}>{course.status}</span>
                          <span style={{ marginLeft: '10px' }}>{course.code}</span>
                        </div>
                        <div className="course-dates">
                          <small>{formatDate(course.startDate)} - {formatDate(course.endDate)}</small>
                        </div>
                        
                        <div className="course-actions">
                          <button 
                            className="leave-course-btn"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent navigating to course detail
                              handleLeaveCourse(course.id);
                            }}
                          >
                            Leave Course
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-courses-message">
                    <p>You are not enrolled in any courses yet. Browse available courses to enroll.</p>
                  </div>
                )
              ) : (
                // Show all/filtered courses based on role
                getFilteredCourses().map(course => (
                  <div 
                    key={course.id}
                    className={`course-card ${selectedCourses.includes(course.id) ? 'selected' : ''}`}
                    onContextMenu={(e) => handleContextMenu(e, course.id)}
                    onClick={(e) => {
                      // Only navigate to details if not clicking on the checkbox or menu button
                      if (!e.target.closest('.course-checkbox') && !e.target.closest('.course-menu-btn')) {
                        handleViewCourseDetails(course.id);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {(permissions.canDelete || permissions.canEdit) && (
                      <div 
                        className="course-checkbox"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.id)}
                          onChange={(e) => {
                            handleToggleSelection(course.id);
                          }}
                        />                      </div>
                    )}
                    
                    <div className="course-thumbnail">
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="placeholder-thumbnail"></div>
                      )}
                    </div>
                    
                    <div className="course-info">
                      <h3>{course.title}</h3>
                      <div className="instructor-info">
                        {course.instructor}
                      </div>
                      <div className="course-meta">
                        <span className={`status-badge ${course.status.toLowerCase()}`}>{course.status}</span>
                        <span style={{ marginLeft: '10px' }}>{course.code}</span>
                      </div>
                      <div className="course-dates">
                        <small>{formatDate(course.startDate)} - {formatDate(course.endDate)}</small>
                      </div>
                      
                      {/* For students, show enroll button if not already enrolled */}
                      {auth.user.role === 'student' && !isEnrolled(course.id) && (
                        <button 
                          className="enroll-btn"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent navigating to course detail
                            handleEnrollCourse(course.id);
                          }}
                        >
                          Enroll Now
                        </button>
                      )}
                    </div>
                    
                    {/* Only show menu button for admin or for instructors who own the course */}
                    {(auth.user.role === 'admin' || (auth.user.role === 'instructor' && isOwnCourse(course))) && (
                      <button 
                        className="course-menu-btn" 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent navigating to course detail
                          handleContextMenu(e, course.id);
                        }}
                      >
                        ⋮
                      </button>
                    )}
                  </div>
                ))
              )}
              
              {getFilteredCourses().length === 0 && !isLoading && activeFilter !== 'Enrolled' && (
                <div className="no-courses-message">
                  <p>No courses found. {activeFilter !== 'All' ? 'Try changing the filter or ' : ''}
                  {permissions.canCreate ? 'Add a new course to get started.' : ''}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Context Menu */}
          {showContextMenu.visible && (
            <div 
              className="context-menu"
              style={{ top: showContextMenu.y, left: showContextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="menu-item" onClick={() => {
                handleViewCourseDetails(showContextMenu.courseId);
                handleCloseContextMenu();
              }}>
                <i className="menu-icon">👁️</i> View Details
              </div>
              
              {permissions.canEdit && (
                <div className="menu-item" onClick={() => handleEditCourse(showContextMenu.courseId)}>
                  <i className="menu-icon">✏️</i> Edit
                </div>
              )}
              
              {permissions.canArchive && (
                <div className="menu-item" onClick={() => handleArchiveCourse(showContextMenu.courseId)}>
                  <i className="menu-icon">📦</i> Archive
                </div>
              )}
              
              {permissions.canDelete && (
                <div className="menu-item" onClick={() => {
                  setSelectedCourses([showContextMenu.courseId]);
                  setShowDeleteConfirm(true);
                  handleCloseContextMenu();
                }}>
                  <i className="menu-icon">🗑️</i> Delete
                </div>
              )}
              
              {permissions.canLeave && (
                <div className="menu-item" onClick={() => handleLeaveCourse(showContextMenu.courseId)}>
                  <i className="menu-icon">🚪</i> Leave Course
                </div>
              )}
            </div>
          )}
          
          {/* Add/Edit Course Modal */}
          {showAddModal && (
            <div className="modal-overlay" onClick={handleCloseModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingCourse ? 'Edit Course' : 'Add New Course'}</h2>
                  <button className="close-btn" onClick={handleCloseModal}>×</button>
                </div>
                
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="title">Course Title*</label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter course title"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="code">Course Code*</label>
                      <input
                        type="text"
                        id="code"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        placeholder="e.g., CS101"
                        required
                      />
                    </div>
                  </div>
                  
                  {auth.user.role === 'admin' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="instructorId">Assigned Instructor*</label>
                        <select
                          id="instructorId"
                          name="instructorId"
                          value={formData.instructorId}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select an instructor</option>
                          {instructors.map(instructor => (
                            <option key={instructor.id} value={instructor.id}>
                              {instructor.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="departmentId">Department</label>
                        <select
                          id="departmentId"
                          name="departmentId"
                          value={formData.departmentId}
                          onChange={handleInputChange}
                        >
                          <option value="">Select department</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  
                  {auth.user.role === 'instructor' && (
                    <div className="form-group">
                      <label htmlFor="departmentId">Department</label>
                      <select
                        id="departmentId"
                        name="departmentId"
                        value={formData.departmentId}
                        onChange={handleInputChange}
                      >
                        <option value="">Select department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label htmlFor="description">Course Description*</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Enter a detailed description of the course"
                      rows="4"
                      required
                    ></textarea>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="startDate">Start Date*</label>
                      <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="endDate">End Date*</label>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="thumbnailImage">Course Thumbnail Image</label>
                      <input
                        type="file"
                        id="thumbnailImage"
                        name="thumbnailImage"
                        onChange={handleFileChange}
                        accept="image/*"
                      />                      <small>
                        {formData.thumbnailImage 
                          ? formData.thumbnailImage.name 
                          : editingCourse && editingCourse.thumbnailUrl 
                            ? 'Current thumbnail will be preserved' 
                            : 'No file chosen'}
                      </small>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="status">Status*</label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="Draft">Draft</option>
                        <option value="Published">Published</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>
                  
                  {permissions.canSetEnrollmentKey && (
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="requiresEnrollmentKey"
                          checked={formData.requiresEnrollmentKey}
                          onChange={handleInputChange}
                        />
                        Require enrollment key for students to join
                      </label>
                    </div>
                  )}
                  
                  {formData.requiresEnrollmentKey && permissions.canSetEnrollmentKey && (
                    <div className="form-group">
                      <label htmlFor="enrollmentKey">Enrollment Key*</label>
                      <input
                        type="text"
                        id="enrollmentKey"
                        name="enrollmentKey"
                        value={formData.enrollmentKey}
                        onChange={handleInputChange}
                        placeholder="Create an enrollment key for students"
                        required={formData.requiresEnrollmentKey}
                      />
                      <small>
                        Share this key with students who should enroll in this course
                      </small>
                    </div>
                  )}
                  
                  {auth.user.role === 'admin' && (
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="isFeatured"
                          checked={formData.isFeatured}
                          onChange={handleInputChange}
                        />
                        Feature this course on the home page
                      </label>
                    </div>
                  )}
                  
                  <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn" disabled={isLoading}>
                      {isLoading ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="modal-overlay">
              <div className="modal-content confirmation-modal">
                <div className="modal-header">
                  <h2>Warning</h2>
                  <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>×</button>
                </div>
                
                <div className="confirmation-message">
                  <p>You are about to delete {selectedCourses.length > 1 ? `${selectedCourses.length} courses` : 'a course'}. This will remove all associated data and cannot be undone.</p>
                  <p>Are you sure you want to continue?</p>
                </div>
                
                <div className="confirmation-actions">
                  <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </button>
                  <button className="delete-btn" onClick={performDeleteCourses}>
                    Delete Anyway
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Enrollment Key Modal */}
          {showEnrollModal && (
            <div className="modal-overlay" onClick={handleCloseEnrollModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Course Enrollment</h2>
                  <button className="close-btn" onClick={handleCloseEnrollModal}>×</button>
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
                    <button type="button" className="cancel-btn" onClick={handleCloseEnrollModal}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn" disabled={isLoading}>
                      {isLoading ? 'Enrolling...' : 'Enroll'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseManagement;