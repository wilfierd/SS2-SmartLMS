import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import './AdminCourse.css';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';

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

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    instructor: '',
    department: '',
    description: '',
    startDate: '',
    endDate: '',
    thumbnailImage: null,
    status: 'Draft'
  });

  // Sample data for instructors and departments
  const instructors = [
    { id: 1, name: 'John Smith' },
    { id: 2, name: 'Sarah Johnson' },
    { id: 3, name: 'Michael Brown' },
    { id: 4, name: 'Lisa Wong' }
  ];

  const departments = [
    'Computer Science',
    'Mathematics',
    'Physics',
    'Business',
    'Arts'
  ];

  // Filter options
  const filterOptions = ['All', 'Programming', 'System Design', 'Graphic Design'];

  // Mock courses data for initial display
  const mockCourses = [
    {
      id: 1,
      title: 'Web Programming',
      code: 'WP101',
      instructor: 'Shams Tabrez',
      department: 'Computer Science',
      description: 'Learn web development fundamentals with HTML, CSS, and JavaScript',
      startDate: '2025-01-15',
      endDate: '2025-04-15',
      status: 'Published',
      thumbnail: '/thumbnails/web-programming.jpg',
      lessons: 12,
      quizzes: 7
    },
    {
      id: 2,
      title: 'Graphic Designing',
      code: 'GD101',
      instructor: 'Shams Tabrez',
      department: 'Arts',
      description: 'Master graphic design principles and tools like Photoshop and Illustrator',
      startDate: '2025-02-01',
      endDate: '2025-05-01',
      status: 'Published',
      thumbnail: '/thumbnails/graphic-design.jpg',
      lessons: 12,
      quizzes: 7
    },
    {
      id: 3,
      title: 'System Analysis & Design',
      code: 'SAD101',
      instructor: 'Shams Tabrez',
      department: 'Computer Science',
      description: 'Learn to analyze and design complex software systems',
      startDate: '2025-01-10',
      endDate: '2025-04-10',
      status: 'Published',
      thumbnail: '/thumbnails/system-design.jpg',
      lessons: 12,
      quizzes: 7
    },
    {
      id: 4,
      title: 'Mobile Programming',
      code: 'MP101',
      instructor: 'Shams Tabrez',
      department: 'Computer Science',
      description: 'Develop mobile applications for iOS and Android platforms',
      startDate: '2025-03-01',
      endDate: '2025-06-01',
      status: 'Upcoming',
      thumbnail: '/thumbnails/mobile-dev.jpg',
      lessons: 12,
      quizzes: 7
    }
  ];

  // Load courses data
  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real implementation, you would fetch from your API
        // Example:
        // const response = await fetch(`${config.apiUrl}/courses`, {
        //   headers: { Authorization: `Bearer ${auth.token}` }
        // });
        // const data = await response.json();
        // setCourses(data);
        
        // Using mock data for now
        setTimeout(() => {
          setCourses(mockCourses);
          setIsLoading(false);
        }, 500);
        
      } catch (err) {
        console.error("Error fetching courses:", err);
        setError("Failed to load courses. Please try again.");
        setIsLoading(false);
      }
    };
    
    fetchCourses();
  }, [auth.token]);

  // Reset form data
  const resetFormData = () => {
    setFormData({
      title: '',
      code: '',
      instructor: '',
      department: '',
      description: '',
      startDate: '',
      endDate: '',
      thumbnailImage: null,
      status: 'Draft'
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
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingCourse) {
        // Update existing course
        // In a real implementation, you would send a PUT request
        // Example:
        // const response = await fetch(`${config.apiUrl}/courses/${editingCourse.id}`, {
        //   method: 'PUT',
        //   headers: { 
        //     'Authorization': `Bearer ${auth.token}`,
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify(formData)
        // });
        
        // Update in our local state
        const updatedCourses = courses.map(course => 
          course.id === editingCourse.id ? { ...course, ...formData } : course
        );
        setCourses(updatedCourses);
        
      } else {
        // Create new course
        // In a real implementation, you would send a POST request
        // Example:
        // const response = await fetch(`${config.apiUrl}/courses`, {
        //   method: 'POST',
        //   headers: { 
        //     'Authorization': `Bearer ${auth.token}`,
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify(formData)
        // });
        // const data = await response.json();
        
        // Add to our local state
        const newCourse = {
          id: courses.length + 1,
          ...formData,
          lessons: 0,
          quizzes: 0
        };
        setCourses([...courses, newCourse]);
      }
      
      handleCloseModal();
      
    } catch (err) {
      console.error("Error saving course:", err);
      setError("Failed to save course. Please try again.");
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

  // Handle course removal (archive or delete)
  const handleRemoveCourses = () => {
    if (selectedCourses.length === 0) {
      setError("Please select at least one course to delete.");
      return;
    }
    
    // Check if any selected course is published
    const hasPublishedCourse = courses.some(
      course => selectedCourses.includes(course.id) && course.status === 'Published'
    );
    
    if (hasPublishedCourse) {
      setShowDeleteConfirm(true);
    } else {
      performDeleteCourses();
    }
  };

  // Perform the actual course deletion
  const performDeleteCourses = async () => {
    setIsLoading(true);
    
    try {
      // In a real implementation, you would send DELETE requests
      // Example:
      // await Promise.all(selectedCourses.map(courseId => 
      //   fetch(`${config.apiUrl}/courses/${courseId}`, {
      //     method: 'DELETE',
      //     headers: { Authorization: `Bearer ${auth.token}` }
      //   })
      // ));
      
      // Update our local state
      const remainingCourses = courses.filter(course => !selectedCourses.includes(course.id));
      setCourses(remainingCourses);
      setSelectedCourses([]);
      setShowDeleteConfirm(false);
      
    } catch (err) {
      console.error("Error deleting courses:", err);
      setError("Failed to delete courses. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter courses based on selected category
  const getFilteredCourses = () => {
    if (activeFilter === 'All') {
      return courses;
    }
    
    // Map filter options to potential category/department names in your data
    const filterMap = {
      'Programming': ['Web Programming', 'Mobile Programming'],
      'System Design': ['System Analysis & Design'],
      'Graphic Design': ['Graphic Designing']
    };
    
    return courses.filter(course => 
      filterMap[activeFilter]?.some(category => course.title.includes(category))
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

  // Edit course
  const handleEditCourse = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setFormData({
        title: course.title,
        code: course.code,
        instructor: course.instructor,
        department: course.department,
        description: course.description,
        startDate: course.startDate,
        endDate: course.endDate,
        thumbnailImage: null, // Can't prefill the file input
        status: course.status
      });
      setEditingCourse(course);
      setShowAddModal(true);
    }
    handleCloseContextMenu();
  };

  // Archive course
  const handleArchiveCourse = async (courseId) => {
    setIsLoading(true);
    
    try {
      // In a real implementation, you would send a PATCH request
      // Example:
      // await fetch(`${config.apiUrl}/courses/${courseId}`, {
      //   method: 'PATCH',
      //   headers: { 
      //     'Authorization': `Bearer ${auth.token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ status: 'Archive' })
      // });
      
      // Update our local state
      const updatedCourses = courses.map(course => 
        course.id === courseId ? { ...course, status: 'Archive' } : course
      );
      setCourses(updatedCourses);
      
    } catch (err) {
      console.error("Error archiving course:", err);
      setError("Failed to archive course. Please try again.");
    } finally {
      setIsLoading(false);
      handleCloseContextMenu();
    }
  };

  // Close error alert
  const handleCloseError = () => {
    setError(null);
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
    <div className="admin-course-management">
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
                    {/* In a real implementation, use the actual thumbnail */}
                    <div className="placeholder-thumbnail">
                      {course.title === 'Web Programming' || course.title === 'Mobile Programming' ? (
                        <div className="avatar-blue"></div>
                      ) : (
                        <div className="avatar-grey"></div>
                      )}
                    </div>
                  </div>
                  
                  <div className="course-info">
                    <h3>{course.title}</h3>
                    <div className="instructor-info">
                      <span className="instructor-icon">👨‍🏫</span> {course.instructor}
                    </div>
                    <div className="course-meta">
                      {course.lessons} lessons • {course.quizzes} quiz
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
                Edit
              </div>
              <div className="menu-item" onClick={() => handleArchiveCourse(showContextMenu.courseId)}>
                Archive
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
                      <label htmlFor="instructor">Assigned Instructor*</label>
                      <select
                        id="instructor"
                        name="instructor"
                        value={formData.instructor}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select an instructor</option>
                        {instructors.map(instructor => (
                          <option key={instructor.id} value={instructor.name}>
                            {instructor.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="department">Department*</label>
                      <select
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select department</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>
                            {dept}
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
                      <small>No file chosen</small>
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
                        <option value="Archive">Archive</option>
                      </select>
                    </div>
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
                  <p>You are about to delete published course(s). This will remove all associated data and cannot be undone.</p>
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