import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import './AdminCourse.css';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import axios from 'axios';
import config from '../../config';

const AdminCourse = () => {
  const { auth } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    isFeatured: false
  });

  // API URL from config
  const API_URL = config.apiUrl;

  // Dynamic filter options based on departments
  const [filterOptions, setFilterOptions] = useState(['All']);

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
    fetchInstructors();
    fetchDepartments();
  }, [auth.token]);

  // Update filter options when departments are loaded
  useEffect(() => {
    if (departments.length > 0) {
      setFilterOptions([
        'All',
        ...departments.map(dept => dept.name)
      ]);
    }
  }, [departments]);

  // Fetch courses from the API
  const fetchCourses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setCourses(response.data);
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load courses. Please try again.");
      setIsLoading(false);
    }
  };

  // Fetch instructors for the dropdown
  const fetchInstructors = async () => {
    try {
      const response = await axios.get(`${API_URL}/instructors`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setInstructors(response.data);
    } catch (err) {
      console.error("Error fetching instructors:", err);
      // Don't set error here to avoid overriding course errors
    }
  };

  // Fetch departments for the dropdown
  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_URL}/departments`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setDepartments(response.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

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
      isFeatured: false
    });
  };

  // Open add course modal
  const handleAddNewCourse = () => {
    resetFormData();
    setEditingCourse(null);
    setShowAddModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingCourse(null);
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
    setIsLoading(true);
    
    try {
      // Handle file upload first if we have a file
      let thumbnailUrl = null;
      if (formData.thumbnailImage) {
        const fileFormData = new FormData();
        fileFormData.append('thumbnail', formData.thumbnailImage);
        
        const uploadResponse = await axios.post(`${API_URL}/upload/thumbnail`, fileFormData, {
          headers: { 
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        thumbnailUrl = uploadResponse.data.thumbnailUrl;
      }
      
      // Prepare the course data
      const courseData = {
        title: formData.title,
        code: formData.code,
        instructorId: formData.instructorId,
        departmentId: formData.departmentId || null,
        description: formData.description,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        status: formData.status,
        thumbnailUrl: thumbnailUrl || (editingCourse ? editingCourse.thumbnail : null),
        isFeatured: formData.isFeatured
      };
      
      if (editingCourse) {
        // Update existing course
        await axios.put(`${API_URL}/courses/${editingCourse.id}`, courseData, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
      } else {
        // Create new course
        await axios.post(`${API_URL}/courses`, courseData, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
      }
      
      // Refresh the courses list
      fetchCourses();
      handleCloseModal();
      
    } catch (err) {
      console.error("Error saving course:", err);
      setError(err.response?.data?.message || "Failed to save course. Please try again.");
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

  // Handle course removal with real API
  const handleRemoveCourses = () => {
    if (selectedCourses.length === 0) {
      setError("Please select at least one course to delete.");
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
    setIsLoading(true);
    
    try {
      // Use batch delete endpoint
      await axios.post(`${API_URL}/courses/batch-delete`, 
        { courseIds: selectedCourses },
        { headers: { Authorization: `Bearer ${auth.token}` }}
      );
      
      // Refresh the courses list
      fetchCourses();
      setSelectedCourses([]);
      setShowDeleteConfirm(false);
      
    } catch (err) {
      console.error("Error deleting courses:", err);
      setError(err.response?.data?.message || "Failed to delete courses. Please try again.");
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
    const course = courses.find(c => c.id === courseId);
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
        isFeatured: course.isFeatured || false
      });
      setEditingCourse(course);
      setShowAddModal(true);
    }
    handleCloseContextMenu();
  };

  // Archive course with real API
  const handleArchiveCourse = async (courseId) => {
    setIsLoading(true);
    
    try {
      // Use the archive endpoint
      await axios.put(`${API_URL}/courses/${courseId}/archive`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      // Refresh the courses list
      fetchCourses();
      
    } catch (err) {
      console.error("Error archiving course:", err);
      setError(err.response?.data?.message || "Failed to archive course. Please try again.");
    } finally {
      setIsLoading(false);
      handleCloseContextMenu();
    }
  };

  // Close error alert
  const handleCloseError = () => {
    setError(null);
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
        <Header title="Course Catalog" />
        
        <div className="course-catalog-content">
          {error && (
            <div className="error-message">
              {error}
              <button className="close-button" onClick={handleCloseError}>×</button>
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
            <button className="add-btn" onClick={handleAddNewCourse}>
              <span className="icon">+</span> Add New Course
            </button>
            <button className="remove-btn" onClick={handleRemoveCourses} disabled={selectedCourses.length === 0}>
              Remove {selectedCourses.length > 0 ? `(${selectedCourses.length})` : ''}
            </button>
          </div>
          
          {isLoading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <div className="course-grid">
              {getFilteredCourses().map(course => (
                <div 
                  key={course.id}
                  className={`course-card ${selectedCourses.includes(course.id) ? 'selected' : ''}`}
                  onContextMenu={(e) => handleContextMenu(e, course.id)}
                >
                  <div className="course-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(course.id)}
                      onChange={() => handleToggleSelection(course.id)}
                    />
                  </div>
                  
                  <div className="course-thumbnail">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  </div>
                  
                  <button className="course-menu-btn" onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, course.id);
                  }}>
                    ⋮
                  </button>
                </div>
              ))}
              
              {getFilteredCourses().length === 0 && !isLoading && (
                <div className="no-courses-message">
                  <p>No courses found. {activeFilter !== 'All' ? 'Try changing the filter or ' : ''}Add a new course to get started.</p>
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
              <div className="menu-item" onClick={() => handleEditCourse(showContextMenu.courseId)}>
                <i className="menu-icon">✏️</i> Edit
              </div>
              <div className="menu-item" onClick={() => handleArchiveCourse(showContextMenu.courseId)}>
                <i className="menu-icon">📦</i> Archive
              </div>
              <div className="menu-item" onClick={() => {
                setSelectedCourses([showContextMenu.courseId]);
                setShowDeleteConfirm(true);
                handleCloseContextMenu();
              }}>
                <i className="menu-icon">🗑️</i> Delete
              </div>
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
                      />
                      <small>
                        {formData.thumbnailImage 
                          ? formData.thumbnailImage.name 
                          : editingCourse && editingCourse.thumbnail 
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
        </div>
      </div>
    </div>
  );
};

export default AdminCourse;