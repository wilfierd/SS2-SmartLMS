import React, { useState, useEffect, useContext } from 'react';
import './AdminUsers.css';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config';
import SidebarManager from '../common/SidebarManager';

const AdminUsers = () => {
  const { auth } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(
    SidebarManager.isExpanded()
  );

  // Default student password
  const DEFAULT_STUDENT_PASSWORD = '123456789';

  // For user selection and batch operations
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // For filtering
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // For sorting
  const [sortOrder, setSortOrder] = useState('role'); // 'role', 'name', 'email', 'date'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc', 'desc'

  // For pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // For add/edit user modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: '',
    bio: '',
    googleId: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // API URL from config
  const API_URL = config.apiUrl;

  // Listen for sidebar state changes
  useEffect(() => {
    const handleSidebarChange = () => {
      setSidebarExpanded(SidebarManager.isExpanded());
    };

    window.addEventListener('sidebarStateChanged', handleSidebarChange);

    return () => {
      window.removeEventListener('sidebarStateChanged', handleSidebarChange);
    };
  }, []);

  // Fetch users data
  useEffect(() => {
    fetchUsers();
  }, [auth.token]);

  // Generate random Google ID
  const generateRandomGoogleId = () => {
    return 'google_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Handle role change and set default password for students
  useEffect(() => {
    if (formData.role === 'student') {
      // Generate Google ID if it's empty
      if (!formData.googleId && !editingUser) {
        const randomGoogleId = generateRandomGoogleId();
        setFormData(prevData => ({
          ...prevData,
          googleId: randomGoogleId,
          password: DEFAULT_STUDENT_PASSWORD
        }));
      } else if (!formData.password && !editingUser) {
        setFormData(prevData => ({
          ...prevData,
          password: DEFAULT_STUDENT_PASSWORD
        }));
      }
    }
  }, [formData.role, editingUser]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      setUsers(response.data);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to load users. Please try again.');
      setIsLoading(false);
    }
  };

  // Get role priority for sorting (lower number = higher priority)
  const getRolePriority = (role) => {
    switch (role) {
      case 'admin': return 1;
      case 'instructor': return 2;
      case 'student': return 3;
      default: return 4;
    }
  };

  // Sort users based on current sort criteria
  const sortUsers = (userList) => {
    return [...userList].sort((a, b) => {
      let comparison = 0;

      if (sortOrder === 'role') {
        // Sort by role priority (admin, instructor, student)
        comparison = getRolePriority(a.role) - getRolePriority(b.role);
      } else if (sortOrder === 'name') {
        // Sort by full name
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortOrder === 'email') {
        // Sort by email
        comparison = a.email.toLowerCase().localeCompare(b.email.toLowerCase());
      } else if (sortOrder === 'date') {
        // Sort by creation date
        comparison = new Date(a.created_at) - new Date(b.created_at);
      }

      // Reverse if sort direction is descending
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  };

  // Handle changing sort order
  const handleSortChange = (order) => {
    if (sortOrder === order) {
      // Toggle direction if clicking the same order
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new order and reset to ascending
      setSortOrder(order);
      setSortDirection('asc');
    }
  };

  // Filter users based on role and search query, then sort
  const getFilteredUsers = () => {
    let filtered = [...users];

    // Filter by role
    if (activeFilter !== 'all') {
      filtered = filtered.filter(user => user.role === activeFilter);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(query) ||
        (user.first_name && user.first_name.toLowerCase().includes(query)) ||
        (user.last_name && user.last_name.toLowerCase().includes(query))
      );
    }

    // Sort the filtered users
    return sortUsers(filtered);
  };

  // Get current users for pagination
  const getCurrentUsers = () => {
    const filtered = getFilteredUsers();
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    return filtered.slice(indexOfFirstUser, indexOfLastUser);
  };

  // Calculate total pages
  const totalPages = Math.ceil(getFilteredUsers().length / usersPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Toggle user selection
  const handleToggleSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // Toggle all users selection
  const handleToggleAll = () => {
    const currentUsers = getCurrentUsers();
    if (selectedUsers.length === currentUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentUsers.map(user => user.id));
    }
  };

  // Open add user modal
  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: '',
      bio: '',
      googleId: ''
    });
    setFormErrors({});
    setShowUserModal(true);
  };

  // Open edit user modal
  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      role: user.role,
      bio: user.bio || '',
      googleId: user.google_id || ''
    });
    setFormErrors({});
    setShowUserModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setFormErrors({});
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  // Handle role change specifically
  const handleRoleChange = (e) => {
    const newRole = e.target.value;

    // Auto-set password for student accounts and random Google ID
    if (newRole === 'student' && !editingUser) {
      setFormData({
        ...formData,
        role: newRole,
        password: DEFAULT_STUDENT_PASSWORD,
        googleId: generateRandomGoogleId(),
        bio: '' // Clear bio field
      });
    } else if (newRole !== 'student') {
      setFormData({
        ...formData,
        role: newRole,
        googleId: '', // Clear Google ID field
        password: editingUser ? '' : formData.password,
      });
    } else {
      setFormData({
        ...formData,
        role: newRole
      });
    }

    // Clear error for role field
    if (formErrors.role) {
      setFormErrors({
        ...formErrors,
        role: ''
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!formData.role) {
      errors.role = 'Role selection is required';
    }

    if (!editingUser && !formData.password) {
      errors.password = 'Password is required for new users';
    } else if (!editingUser && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!formData.firstName) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      errors.lastName = 'Last name is required';
    }

    return errors;
  };

  // Handle create/update user
  const handleSaveUser = async (e) => {
    e.preventDefault();

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      // Chuẩn bị dữ liệu gửi đi dựa trên vai trò
      const baseUserData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role
      };

      // Thêm password nếu có
      if (formData.password) {
        baseUserData.password = formData.password;
      }

      // Thêm trường dữ liệu theo vai trò
      if (formData.role === 'student') {
        // Dữ liệu cho học viên
        baseUserData.googleId = formData.googleId || generateRandomGoogleId();
      } else {
        // Dữ liệu cho admin và giảng viên
        baseUserData.bio = formData.bio || '';
      }

      if (editingUser) {
        // Cập nhật người dùng hiện có
        await axios.put(
          `${API_URL}/users/${editingUser.id}`,
          baseUserData,
          {
            headers: { Authorization: `Bearer ${auth.token}` }
          }
        );

        setSuccess('User updated successfully');
      } else {
        // Tạo người dùng mới
        // Đảm bảo có mật khẩu cho người dùng mới
        if (!baseUserData.password) {
          baseUserData.password = formData.role === 'student' ?
            DEFAULT_STUDENT_PASSWORD : '';
        }
        await axios.post(
          `${API_URL}/users/admin-register`,
          baseUserData,
          {
            headers: { Authorization: `Bearer ${auth.token}` }
          }
        );

        setSuccess('User created successfully');
      }

      // Refresh users list
      fetchUsers();
      handleCloseModal();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (err) {
      console.error('Error saving user:', err);
      setFormErrors({
        submit: err.response?.data?.message || 'Failed to save user. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle batch user deletion
  const handleRemoveUsers = () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user to delete');
      return;
    }

    setShowDeleteConfirm(true);
  };

  // Perform user deletion
  const performDeleteUsers = async () => {
    setIsLoading(true);

    try {
      // Delete multiple users at once if supported by API
      if (selectedUsers.length > 1) {
        await axios.post(`${API_URL}/users/batch-delete`,
          { userIds: selectedUsers },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
      } else {
        // Delete single user
        await axios.delete(`${API_URL}/users/${selectedUsers[0]}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
      }

      setSuccess(`${selectedUsers.length} user(s) deleted successfully`);

      // Refresh users list
      fetchUsers();
      setSelectedUsers([]);
      setShowDeleteConfirm(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (err) {
      console.error('Error deleting users:', err);
      setError(err.response?.data?.message || 'Failed to delete users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle single user deletion
  const handleDeleteUser = (userId) => {
    setSelectedUsers([userId]);
    setShowDeleteConfirm(true);
  };

  // Close error/success alerts
  const handleCloseAlert = () => {
    setError(null);
    setSuccess(null);
  };

  // Get user name initials for avatar
  const getUserInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return '?';

    let initials = '';
    if (firstName) initials += firstName.charAt(0).toUpperCase();
    if (lastName) initials += lastName.charAt(0).toUpperCase();

    return initials;
  };

  // Get sort icon for table header
  const getSortIcon = (columnName) => {
    if (sortOrder !== columnName) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className={`admin-users-container ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
      <Sidebar activeItem="users" />

      <div className="admin-main-content">
        <Header title="User Management" />

        <div className="users-content">
          {error && (
            <div className="error-message">
              {error}
              <button className="close-button" onClick={handleCloseAlert}>×</button>
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
              <button className="close-button" onClick={handleCloseAlert}>×</button>
            </div>
          )}

          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-action-bar">
            <div className="filter-options">
              <button
                className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All Users
              </button>
              <button
                className={`filter-btn ${activeFilter === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveFilter('admin')}
              >
                Admins
              </button>
              <button
                className={`filter-btn ${activeFilter === 'instructor' ? 'active' : ''}`}
                onClick={() => setActiveFilter('instructor')}
              >
                Instructors
              </button>
              <button
                className={`filter-btn ${activeFilter === 'student' ? 'active' : ''}`}
                onClick={() => setActiveFilter('student')}
              >
                Students
              </button>
            </div>

            <div className="action-buttons">
              <button className="add-btn" onClick={handleAddUser}>
                <span className="icon">+</span> Add User
              </button>
              <button
                className="remove-btn"
                onClick={handleRemoveUsers}
                disabled={selectedUsers.length === 0}
              >
                Remove {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <>
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th className="checkbox-column">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === getCurrentUsers().length && getCurrentUsers().length > 0}
                          onChange={handleToggleAll}
                        />
                      </th>
                      <th className="avatar-column"></th>
                      <th onClick={() => handleSortChange('name')} className="sortable-header">
                        Name {getSortIcon('name')}
                      </th>
                      <th onClick={() => handleSortChange('email')} className="sortable-header">
                        Email {getSortIcon('email')}
                      </th>
                      <th onClick={() => handleSortChange('role')} className="sortable-header">
                        Role {getSortIcon('role')}
                      </th>
                      <th onClick={() => handleSortChange('date')} className="sortable-header">
                        Created At {getSortIcon('date')}
                      </th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentUsers().map(user => (
                      <tr key={user.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleToggleSelection(user.id)}
                          />
                        </td>
                        <td>
                          <div className={`avatar ${user.role}`}>
                            {getUserInitials(user.first_name, user.last_name)}
                          </div>
                        </td>
                        <td>{`${user.first_name || ''} ${user.last_name || ''}`}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`role-badge ${user.role}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="action-icon"
                            title="Edit user"
                            onClick={() => handleEditUser(user)}
                          >
                            ✏️
                          </button>
                          <button
                            className="action-icon delete-icon"
                            title="Delete user"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}

                    {getCurrentUsers().length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                          No users found. {searchQuery ? 'Try a different search term.' : ''}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <div className="pagination-info">
                    Showing {Math.min((currentPage - 1) * usersPerPage + 1, getFilteredUsers().length)} to {Math.min(currentPage * usersPerPage, getFilteredUsers().length)} of {getFilteredUsers().length} users
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      Previous
                    </button>

                    {[...Array(totalPages).keys()].map(number => (
                      <button
                        key={number + 1}
                        className={`pagination-btn ${currentPage === number + 1 ? 'active' : ''}`}
                        onClick={() => handlePageChange(number + 1)}
                      >
                        {number + 1}
                      </button>
                    ))}

                    <button
                      className="pagination-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Add/Edit User Modal */}
          {showUserModal && (
            <div className="modal-overlay" onClick={handleCloseModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
                  <button className="close-btn" onClick={handleCloseModal}>×</button>
                </div>

                <form className="user-form" onSubmit={handleSaveUser}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name*</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                      />
                      {formErrors.firstName && <div className="form-error">{formErrors.firstName}</div>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="lastName">Last Name*</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                      />
                      {formErrors.lastName && <div className="form-error">{formErrors.lastName}</div>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address*</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      disabled={editingUser !== null} // Can't change email for existing users
                    />
                    {formErrors.email && <div className="form-error">{formErrors.email}</div>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="role">Role*</label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleRoleChange}
                    >
                      <option value="">Please select role</option>
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                    {formErrors.role && <div className="form-error">{formErrors.role}</div>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">
                      {editingUser ? 'Password (leave blank to keep current)' : 'Password*'}
                      {formData.role === 'student' && !editingUser &&
                        ' - Default: 123456789'}
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={editingUser ? "Enter new password (optional)" :
                        formData.role === 'student' ? "Default: 123456789" : "Enter password"}
                      readOnly={formData.role === 'student' && !editingUser}
                    />
                    {formErrors.password && <div className="form-error">{formErrors.password}</div>}
                    {formData.role === 'student' && !editingUser && !formErrors.password &&
                      <div className="form-info" style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
                        Student accounts use default password: 123456789
                      </div>}
                  </div>

                  {/* Hiển thị trường Bio cho admin và instructor */}
                  {formData.role !== 'student' && formData.role !== '' && (
                    <div className="form-group">
                      <label htmlFor="bio">Bio</label>
                      <textarea
                        id="bio"
                        name="bio"
                        value={formData.bio || ''}
                        onChange={handleInputChange}
                        placeholder="Enter professional bio or description"
                        rows="3"
                      />
                    </div>
                  )}

                  {/* Hiển thị trường Google ID cho học viên */}
                  {formData.role === 'student' && (
                    <div className="form-group">
                      <label htmlFor="googleId">Google ID</label>
                      <input
                        type="text"
                        id="googleId"
                        name="googleId"
                        value={formData.googleId || ''}
                        onChange={handleInputChange}
                        placeholder="Google ID (generated automatically)"
                        readOnly
                      />
                      <div className="form-info" style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
                        Random Google ID is generated automatically for student accounts
                      </div>
                    </div>
                  )}

                  {formErrors.submit && <div className="form-error">{formErrors.submit}</div>}

                  <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="save-btn"
                      disabled={isLoading || formData.role === ''}
                    >
                      {isLoading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
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
                  <h2>Confirm Deletion</h2>
                  <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>×</button>
                </div>

                <div className="confirmation-message">
                  <p>
                    Are you sure you want to delete {selectedUsers.length > 1
                      ? `these ${selectedUsers.length} users`
                      : 'this user'}?
                  </p>
                  <p>This action cannot be undone.</p>
                </div>

                <div className="confirmation-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="remove-btn"
                    onClick={performDeleteUsers}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deleting...' : 'Delete'}
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

export default AdminUsers;