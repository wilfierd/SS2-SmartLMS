// src/components/classroom/VirtualClassroom.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import AuthContext from '../../context/AuthContext';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import './VirtualClassroom.css';

const VirtualClassroom = () => {
  const { auth } = useContext(AuthContext);
  const [sessions, setSessions] = useState({
    upcoming: [],
    active: [],
    past: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionPassword, setSessionPassword] = useState('');
  const [courses, setCourses] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [activeSessionIds, setActiveSessionIds] = useState([]);
  const jitsiTabRef = useRef(null);
  
  // Form state for creating/editing a session
  const [formData, setFormData] = useState({
    title: '',
    courseId: '',
    description: '',
    sessionDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    password: '',
    maxParticipants: 30,
    isRecorded: true,
    startNow: false
  });

  // API URL from config
  const API_URL = config.apiUrl;

  // Load all session data
  useEffect(() => {
    fetchSessions();
    fetchCourses();
    
    // Set up interval to check for session status updates
    const updateInterval = setInterval(() => {
      updateSessionStatuses();
    }, 60000); // Check every minute
    
    // Update immediately when component mounts
    updateSessionStatuses();
    
    // Check for active sessions from localStorage
    const storedActiveSessions = localStorage.getItem('activeSessionIds');
    if (storedActiveSessions) {
      try {
        setActiveSessionIds(JSON.parse(storedActiveSessions));
      } catch (error) {
        console.error('Error parsing active sessions from localStorage:', error);
      }
    }
    
    return () => clearInterval(updateInterval);
  }, [auth.token]);

  // Update session statuses
  const updateSessionStatuses = async () => {
    try {
      await axios.get(`${API_URL}/virtual-sessions/update-status`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      fetchSessions(); // Reload sessions after update
    } catch (error) {
      console.error('Error updating session statuses:', error);
      // No error notification for background process
    }
  };

  // Fetch sessions from API
  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      // Fetch upcoming sessions
      const upcomingResponse = await axios.get(`${API_URL}/virtual-sessions`, {
        params: { upcoming: true, status: 'scheduled' },
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      // Fetch active sessions
      const activeResponse = await axios.get(`${API_URL}/virtual-sessions`, {
        params: { status: 'active' },
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      // Fetch past sessions
      const pastResponse = await axios.get(`${API_URL}/virtual-sessions`, {
        params: { past: true, status: 'completed' },
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setSessions({
        upcoming: upcomingResponse.data || [],
        active: activeResponse.data || [],
        past: pastResponse.data || []
      });
      
      // Auto-switch to active tab if the instructor has an active session
      if (activeResponse.data.length > 0) {
        if (auth.user.role === 'instructor') {
          const instructorActiveSessions = activeResponse.data.filter(
            session => session.instructorId === auth.user.id
          );
          if (instructorActiveSessions.length > 0) {
            setActiveTab('active');
          }
        } else {
          setActiveTab('active');
        }
      }
      
    } catch (error) {
      console.error('Error fetching sessions:', error);
      notification.error('Failed to load sessions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch courses for dropdown
  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      // Filter courses based on role
      let filteredCourses = response.data;
      if (auth.user.role === 'instructor') {
        filteredCourses = response.data.filter(course => course.instructorId === auth.user.id);
      }

      setCourses(filteredCourses);
      
      // Set default courseId if courses are available
      if (filteredCourses.length > 0) {
        setFormData(prev => ({
          ...prev,
          courseId: filteredCourses[0].id
        }));
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      notification.error('Failed to load courses');
    }
  };

  // Create Jitsi URL for the session room
  const createJitsiUrl = (session) => {
    // Base URL
    const baseUrl = 'https://meet.jit.si/';
    
    // Add room name
    let roomUrl = `${baseUrl}${session.roomId}`;
    
    // Add configuration parameters
    const params = new URLSearchParams();
    
    // Add display name
    params.append('userInfo.displayName', `${auth.user.firstName || auth.user.email.split('@')[0]} (${auth.user.role})`);
    
    // Add email
    if (auth.user.email) {
      params.append('userInfo.email', auth.user.email);
    }
    
    // Configuration for moderator role
    if (auth.user.role === 'instructor' && session.instructorId === auth.user.id) {
      params.append('userInfo.moderator', 'true');
      
      // Disable prejoin page for instructor
      params.append('config.prejoinPageEnabled', 'false');
    }
    
    // Common configurations
    params.append('config.disableDeepLinking', 'true');
    params.append('config.startWithAudioMuted', 'false');
    params.append('config.startWithVideoMuted', 'false');
    params.append('config.enableWelcomePage', 'false');
    params.append('config.enableClosePage', 'false');
    params.append('config.disableInviteFunctions', 'true');
    
    // Add query params to URL
    if (params.toString()) {
      roomUrl += `#${params.toString()}`;
    }
    
    return roomUrl;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Logic for startNow checkbox
    if (name === 'startNow' && checked) {
      // If starting now, clear sessionDate and startTime
      setFormData(prev => ({
        ...prev,
        startNow: true,
        sessionDate: '',
        startTime: ''
      }));
    } else if (name === 'startNow' && !checked) {
      // If not starting now, set sessionDate to today
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        startNow: false,
        sessionDate: today
      }));
    }
  };

  // Create new session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    
    try {
      // Validate time inputs
      if (!formData.startNow) {
        if (!formData.sessionDate || !formData.startTime) {
          notification.error('Please provide session date and start time');
          return;
        }
        
        if (formData.endTime) {
          const start = new Date(`2000-01-01T${formData.startTime}`);
          const end = new Date(`2000-01-01T${formData.endTime}`);
          
          if (end <= start) {
            notification.error('End time must be after start time');
            return;
          }
        }
      }
      
      const response = await axios.post(
        `${API_URL}/virtual-sessions`, 
        formData, 
        { headers: { Authorization: `Bearer ${auth.token}` }}
      );
      
      notification.success('Session created successfully');
      handleCloseCreateModal();
      
      // If starting now, open new tab with Jitsi room
      if (formData.startNow) {
        // Record join activity
        await axios.post(
          `${API_URL}/virtual-sessions/${response.data.session.id}/activity`, 
          { action: 'join' },
          { headers: { Authorization: `Bearer ${auth.token}` }}
        );
        
        // Add to active sessions list
        const updatedActiveSessionIds = [...activeSessionIds, response.data.session.id];
        setActiveSessionIds(updatedActiveSessionIds);
        localStorage.setItem('activeSessionIds', JSON.stringify(updatedActiveSessionIds));
        
        // Open Jitsi room in new tab
        const jitsiUrl = createJitsiUrl(response.data.session);
        const newTab = window.open(jitsiUrl, '_blank');
        
        if (newTab) {
          jitsiTabRef.current = newTab;
          
          // Handle tab close event
          const checkTabInterval = setInterval(() => {
            if (newTab.closed) {
              clearInterval(checkTabInterval);
              handleLeaveSession(response.data.session.id);
            }
          }, 1000);
        } else {
          notification.error('Please allow pop-ups to open the classroom');
        }
        
        setActiveTab('active');
      }
      
      fetchSessions(); // Refresh sessions list
    } catch (error) {
      console.error('Error creating session:', error);
      notification.error(error.response?.data?.message || 'Failed to create session');
    }
  };

  // Update session
  const handleUpdateSession = async (e) => {
    e.preventDefault();
    
    try {
      // Validate time inputs
      if (!formData.startNow && formData.endTime) {
        const start = new Date(`2000-01-01T${formData.startTime}`);
        const end = new Date(`2000-01-01T${formData.endTime}`);
        
        if (end <= start) {
          notification.error('End time must be after start time');
          return;
        }
      }
      
      await axios.put(
        `${API_URL}/virtual-sessions/${selectedSession.id}`, 
        formData, 
        { headers: { Authorization: `Bearer ${auth.token}` }}
      );
      
      notification.success('Session updated successfully');
      handleCloseCreateModal();
      fetchSessions(); // Refresh sessions list
    } catch (error) {
      console.error('Error updating session:', error);
      notification.error(error.response?.data?.message || 'Failed to update session');
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId) => {
    try {
      await axios.delete(
        `${API_URL}/virtual-sessions/${sessionId}`, 
        { headers: { Authorization: `Bearer ${auth.token}` }}
      );
      
      notification.success('Session deleted successfully');
      fetchSessions(); // Refresh sessions list
    } catch (error) {
      console.error('Error deleting session:', error);
      notification.error(error.response?.data?.message || 'Failed to delete session');
    }
  };

  // Join a session (for both instructors and students)
  const handleJoinSession = async (session) => {
    try {
      // For students, verify registration
      if (auth.user.role === 'student') {
        try {
          const response = await axios.get(
            `${API_URL}/virtual-sessions/${session.id}`, 
            { headers: { Authorization: `Bearer ${auth.token}` }}
          );
          
          if (!response.data.enrollmentStatus) {
            notification.error('You are not registered for this session.');
            return;
          }
        } catch (error) {
          console.error('Error verifying registration:', error);
          notification.error('Failed to verify session registration');
          return;
        }
      }
      
      // Record join activity
      try {
        await axios.post(
          `${API_URL}/virtual-sessions/${session.id}/activity`, 
          { action: 'join' },
          { headers: { Authorization: `Bearer ${auth.token}` }}
        );
      } catch (error) {
        console.error('Error recording join activity:', error);
        // Continue anyway, this is not critical
      }
      
      // Add to active sessions list
      const updatedActiveSessionIds = [...activeSessionIds, session.id];
      setActiveSessionIds(updatedActiveSessionIds);
      localStorage.setItem('activeSessionIds', JSON.stringify(updatedActiveSessionIds));
      
      // Create Jitsi URL and open in new tab
      const jitsiUrl = createJitsiUrl(session);
      const newTab = window.open(jitsiUrl, '_blank');
      
      if (newTab) {
        jitsiTabRef.current = newTab;
        
        // Handle tab close event
        const checkTabInterval = setInterval(() => {
          if (newTab.closed) {
            clearInterval(checkTabInterval);
            handleLeaveSession(session.id);
          }
        }, 1000);
        
        notification.success('Classroom opened in a new tab');
      } else {
        notification.error('Please allow pop-ups to open the classroom');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      notification.error('Failed to join session');
    }
  };

  // Handle leave session
  const handleLeaveSession = async (sessionId) => {
    try {
      // Record leave activity
      await axios.post(
        `${API_URL}/virtual-sessions/${sessionId}/activity`, 
        { action: 'leave' },
        { headers: { Authorization: `Bearer ${auth.token}` }}
      );
      
      // Update active sessions list
      const updatedActiveSessionIds = activeSessionIds.filter(id => id !== sessionId);
      setActiveSessionIds(updatedActiveSessionIds);
      localStorage.setItem('activeSessionIds', JSON.stringify(updatedActiveSessionIds));
      
      // If instructor and room created by instructor, ask to end session
      const session = sessions.active.find(s => s.id === sessionId);
      if (auth.user.role === 'instructor' && session && session.instructorId === auth.user.id) {
        if (window.confirm('Do you want to end the session for all participants?')) {
          await handleEndSession(sessionId);
        }
      }
      
      fetchSessions(); // Refresh session list
    } catch (error) {
      console.error('Error leaving session:', error);
      notification.error('Failed to record session leave');
    }
  };

  // End a session (for instructors)
  const handleEndSession = async (sessionId) => {
    try {
      await axios.post(
        `${API_URL}/virtual-sessions/${sessionId}/end`, 
        {}, 
        { headers: { Authorization: `Bearer ${auth.token}` }}
      );
      
      notification.success('Session ended successfully');
      fetchSessions(); // Refresh sessions list
    } catch (error) {
      console.error('Error ending session:', error);
      notification.error(error.response?.data?.message || 'Failed to end session');
    }
  };

  // Register for a session (for students)
  const handleRegisterSession = async (sessionId) => {
    // First check if the session requires a password
    try {
      const response = await axios.get(
        `${API_URL}/virtual-sessions/${sessionId}`, 
        { headers: { Authorization: `Bearer ${auth.token}` }}
      );
      
      const session = response.data;
      
      if (session.password) {
        // Show password modal
        setSelectedSession(session);
        setShowPasswordModal(true);
      } else {
        // No password required, register directly
        await registerForSession(sessionId, '');
      }
    } catch (error) {
      console.error('Error checking session:', error);
      notification.error('Failed to check session details');
    }
  };

  // Submit registration with password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    await registerForSession(selectedSession.id, sessionPassword);
  };

  // Register for session (internal helper)
  const registerForSession = async (sessionId, password) => {
    try {
      await axios.post(
        `${API_URL}/virtual-sessions/${sessionId}/register`, 
        { password }, 
        { headers: { Authorization: `Bearer ${auth.token}` }}
      );
      
      notification.success('Successfully registered for the session');
      setShowPasswordModal(false);
      setSessionPassword('');
      fetchSessions(); // Refresh sessions list
    } catch (error) {
      console.error('Error registering for session:', error);
      notification.error(error.response?.data?.message || 'Failed to register for session');
    }
  };

  // Unregister from a session (for students)
  const handleUnregisterSession = async (sessionId) => {
    try {
      await axios.delete(
        `${API_URL}/virtual-sessions/${sessionId}/register`, 
        { headers: { Authorization: `Bearer ${auth.token}` }}
      );
      
      notification.success('Successfully unregistered from the session');
      fetchSessions(); // Refresh sessions list
    } catch (error) {
      console.error('Error unregistering from session:', error);
      notification.error(error.response?.data?.message || 'Failed to unregister from session');
    }
  };

  // Open modal for creating a new session
  const handleOpenCreateModal = () => {
    resetFormData();
    setSelectedSession(null);
    setShowCreateModal(true);
  };

  // Create and immediately join a session
  const handleCreateAndJoinSession = () => {
    setFormData(prev => ({
      ...prev,
      startNow: true,
      title: 'New Class Session',
      sessionDate: '',
      startTime: ''
    }));
    setSelectedSession(null);
    setShowCreateModal(true);
  };

  // Open modal for editing a session
  const handleEditSession = (session) => {
    setFormData({
      title: session.title,
      courseId: session.courseId,
      description: session.description || '',
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime || '',
      password: session.password || '',
      maxParticipants: session.maxParticipants,
      isRecorded: session.isRecorded,
      startNow: false // Cannot "start now" when editing
    });
    setSelectedSession(session);
    setShowCreateModal(true);
  };

  // Close create/edit modal
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    resetFormData();
  };

  // Close password modal
  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setSessionPassword('');
    setSelectedSession(null);
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      title: '',
      courseId: courses.length > 0 ? courses[0].id : '',
      description: '',
      sessionDate: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      password: '',
      maxParticipants: 30,
      isRecorded: true,
      startNow: false
    });
  };

  // Check if session is active for current user
  const isSessionActive = (sessionId) => {
    return activeSessionIds.includes(sessionId);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // Convert HH:MM:SS to HH:MM AM/PM
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Render empty state
  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon">🎦</div>
      <h3>No Virtual Classroom Sessions</h3>
      <p>There are no live sessions scheduled at the moment.</p>
      {auth.user.role === 'instructor' && (
        <div className="empty-actions">
          <button className="start-now-btn" onClick={handleCreateAndJoinSession}>
            Start Meeting Now
          </button>
          <button className="create-session-btn" onClick={handleOpenCreateModal}>
            Schedule for Later
          </button>
        </div>
      )}
    </div>
  );

  // Render upcoming sessions
  const renderUpcomingSessions = () => (
    <div className="sessions-section">
      <div className="section-header">
        <h2>Upcoming Sessions</h2>
      </div>
      
      {sessions.upcoming.length > 0 ? (
        <div className="upcoming-sessions">
          {sessions.upcoming.map(session => (
            <div key={session.id} className="session-card">
              <div className="session-header">
                <div className="session-date-time">
                  <div className="session-date">{new Date(session.sessionDate).getDate()}</div>
                  <div className="session-month">{new Date(session.sessionDate).toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div className="session-title">
                  <h3>{session.title}</h3>
                  <p className="session-course">{session.courseTitle}</p>
                </div>
              </div>
              <div className="session-details">
                <p><strong>Instructor:</strong> {session.instructorName}</p>
                <p><strong>Date:</strong> {formatDate(session.sessionDate)}</p>
                <p><strong>Time:</strong> {formatTime(session.startTime)} {session.endTime ? `- ${formatTime(session.endTime)}` : ''}</p>
                <p><strong>Description:</strong> {session.description || 'No description provided'}</p>
                <p><strong>Participants:</strong> {session.participantCount} enrolled</p>
                {session.password && (
                  <p><strong>Password Protected:</strong> Yes</p>
                )}
                {auth.user.role === 'student' && session.enrollmentStatus && (
                  <p className="enrollment-status">
                    <strong>Status:</strong> {session.enrollmentStatus === 'registered' ? 'Registered' : 'Attended'}
                  </p>
                )}
              </div>
              <div className="session-actions">
                {auth.user.role === 'instructor' && session.instructorId === auth.user.id ? (
                  <>
                    <button className="secondary-btn" onClick={() => handleEditSession(session)}>
                      Edit Details
                    </button>
                    <button className="danger-btn" onClick={() => handleDeleteSession(session.id)}>
                      Cancel
                    </button>
                  </>
                ) : auth.user.role === 'student' ? (
                  session.enrollmentStatus ? (
                    <button className="secondary-btn" onClick={() => handleUnregisterSession(session.id)}>
                      Cancel Registration
                    </button>
                  ) : (
                    <button className="primary-btn" onClick={() => handleRegisterSession(session.id)}>
                      Register
                    </button>
                  )
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-sessions-message">
          <p>No upcoming sessions scheduled.</p>
          {auth.user.role === 'instructor' && (
            <button className="create-session-btn small" onClick={handleOpenCreateModal}>
              Schedule New Session
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Render active sessions
  const renderActiveSessions = () => (
    <div className="sessions-section">
      <div className="section-header">
        <h2>Live Now</h2>
      </div>
      
      <div className="active-sessions">
        {sessions.active.length > 0 ? (
          sessions.active.map(session => (
            <div key={session.id} className="active-session-card">
              <div className="live-indicator">LIVE</div>
              <div className="session-content">
                <h3>{session.title}</h3>
                <p className="session-course">{session.courseTitle}</p>
                <div className="session-details">
                  <p><strong>Instructor:</strong> {session.instructorName}</p>
                  <p><strong>Started at:</strong> {formatTime(session.startTime)}</p>
                  <p><strong>Participants:</strong> {session.participantCount} joined</p>
                  {auth.user.role === 'student' && session.enrollmentStatus && (
                    <p className="enrollment-status">
                      <strong>Status:</strong> {session.enrollmentStatus === 'registered' ? 'Registered' : 'Attended'}
                    </p>
                  )}
                </div>
                
                {isSessionActive(session.id) ? (
                  <div className="active-session-controls">
                    <button 
                      className="rejoin-btn"
                      onClick={() => handleJoinSession(session)}
                    >
                      Rejoin Classroom
                    </button>
                    <button 
                      className="leave-btn"
                      onClick={() => handleLeaveSession(session.id)}
                    >
                      Leave Session
                    </button>
                    {auth.user.role === 'instructor' && session.instructorId === auth.user.id && (
                      <button 
                        className="end-btn"
                        onClick={() => handleEndSession(session.id)}
                      >
                        End for All
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {auth.user.role === 'instructor' && session.instructorId === auth.user.id ? (
                      <button 
                        className="rejoin-btn"
                        onClick={() => handleJoinSession(session)}
                      >
                        Join Your Meeting
                      </button>
                    ) : (
                      <button 
                        className="join-btn"
                        onClick={() => handleJoinSession(session)}
                        disabled={auth.user.role === 'student' && !session.enrollmentStatus}
                      >
                        {auth.user.role === 'student' && !session.enrollmentStatus ? 'Registration Required' : 'Join Now'}
                      </button>
                    )}
                    
                    {auth.user.role === 'student' && !session.enrollmentStatus && (
                      <button 
                        className="register-btn"
                        onClick={() => handleRegisterSession(session.id)}
                      >
                        Register to Join
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-sessions-message">
            <p>No active sessions right now.</p>
            {auth.user.role === 'instructor' && (
              <button className="start-now-btn small" onClick={handleCreateAndJoinSession}>
                Start a new session
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render past sessions
  const renderPastSessions = () => (
    <div className="sessions-section">
      <div className="section-header">
        <h2>Past Sessions</h2>
      </div>
      
      {sessions.past.length > 0 ? (
        <div className="past-sessions">
          {sessions.past.map(session => (
            <div key={session.id} className="session-card past">
              <div className="session-header">
                <div className="session-date-time past">
                  <div className="session-date">{new Date(session.sessionDate).getDate()}</div>
                  <div className="session-month">{new Date(session.sessionDate).toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div className="session-title">
                  <h3>{session.title}</h3>
                  <p className="session-course">{session.courseTitle}</p>
                </div>
              </div>
              <div className="session-details">
                <p><strong>Instructor:</strong> {session.instructorName}</p>
                <p><strong>Date:</strong> {formatDate(session.sessionDate)}</p>
                <p><strong>Duration:</strong> {session.durationMinutes} minutes</p>
                <p><strong>Participants:</strong> {session.participantCount} attended</p>
              </div>
              <div className="session-actions">
                {session.recordingUrl ? (
                  <a 
                    href={session.recordingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="primary-btn record-btn"
                  >
                    View Recording
                  </a>
                ) : (
                  <button className="disabled-btn" disabled>No Recording Available</button>
                )}
                {auth.user.role === 'instructor' && session.instructorId === auth.user.id && (
                  <button className="secondary-btn" onClick={() => handleEditSession(session)}>
                    Edit Recording URL
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-sessions-message">
          <p>No past sessions available.</p>
        </div>
      )}
    </div>
  );

  // Render create/edit session modal
  const renderCreateEditModal = () => (
    <div className="modal-overlay" onClick={handleCloseCreateModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{selectedSession ? 'Edit Session' : formData.startNow ? 'Start New Meeting' : 'Schedule New Session'}</h2>
          <button className="close-btn" onClick={handleCloseCreateModal}>×</button>
        </div>
        
        <form onSubmit={selectedSession ? handleUpdateSession : handleCreateSession}>
          <div className="form-group">
            <label htmlFor="title">Session Title*</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter a descriptive title for the session"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="courseId">Course*</label>
            <select
              id="courseId"
              name="courseId"
              value={formData.courseId}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe what will be covered in this session"
              rows="3"
            ></textarea>
          </div>
          
          {!selectedSession && (
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="startNow"
                  checked={formData.startNow}
                  onChange={handleInputChange}
                />
                Start meeting immediately
              </label>
              <small>Meeting will start as soon as you create it</small>
            </div>
          )}
          
          {!formData.startNow && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sessionDate">Date*</label>
                  <input
                    type="date"
                    id="sessionDate"
                    name="sessionDate"
                    value={formData.sessionDate}
                    onChange={handleInputChange}
                    required={!formData.startNow}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="startTime">Start Time*</label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required={!formData.startNow}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="endTime">End Time</label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                />
                <small>Optional. Will be used to calculate session duration.</small>
              </div>
            </>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Session Password (Optional)</label>
              <input
                type="text"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Leave blank for no password"
              />
              <small>Students will need this password to join the session</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="maxParticipants">Max Participants</label>
              <input
                type="number"
                id="maxParticipants"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleInputChange}
                min="1"
                max="100"
              />
            </div>
          </div>
          
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isRecorded"
                checked={formData.isRecorded}
                onChange={handleInputChange}
              />
              Record this session
            </label>
            <small>Recorded sessions will be available for students to watch later</small>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={handleCloseCreateModal}>
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              {selectedSession ? 'Update Session' : formData.startNow ? 'Start Meeting' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render password modal
  const renderPasswordModal = () => (
    <div className="modal-overlay" onClick={handleClosePasswordModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Session Password Required</h2>
          <button className="close-btn" onClick={handleClosePasswordModal}>×</button>
        </div>
        
        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label htmlFor="sessionPassword">Enter Password for {selectedSession.title}</label>
            <input
              type="password"
              id="sessionPassword"
              name="sessionPassword"
              value={sessionPassword}
              onChange={(e) => setSessionPassword(e.target.value)}
              placeholder="Enter session password"
              required
              autoFocus
            />
            <small>This password was provided by your instructor</small>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={handleClosePasswordModal}>
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Register for Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="virtual-classroom-container">
      <Sidebar activeItem="classroom" />
      
      <div className="classroom-main-content">
        <Header title="Virtual Classroom" />
        
        <div className="classroom-content">
          {isLoading ? (
            <div className="loading-spinner">Loading sessions...</div>
          ) : (
            <>
              {auth.user.role === 'instructor' && (
                <div className="instructor-actions">
                  <button className="start-now-btn" onClick={handleCreateAndJoinSession}>
                    <span className="btn-icon">📹</span> Start Meeting Now
                  </button>
                  <button className="create-session-btn" onClick={handleOpenCreateModal}>
                    <span className="btn-icon">+</span> Schedule for Later
                  </button>
                </div>
              )}

              {/* Tabs for navigation */}
              <div className="classroom-tabs">
                <button 
                  className={`classroom-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upcoming')}
                >
                  Upcoming Sessions {sessions.upcoming.length > 0 && `(${sessions.upcoming.length})`}
                </button>
                <button 
                  className={`classroom-tab ${activeTab === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveTab('active')}
                >
                  Live Now {sessions.active.length > 0 && `(${sessions.active.length})`}
                </button>
                <button 
                  className={`classroom-tab ${activeTab === 'past' ? 'active' : ''}`}
                  onClick={() => setActiveTab('past')}
                >
                  Past Sessions
                </button>
              </div>

              {/* Active sessions section */}
              {activeTab === 'active' && renderActiveSessions()}

              {/* Upcoming sessions section */}
              {activeTab === 'upcoming' && renderUpcomingSessions()}

              {/* Past sessions section */}
              {activeTab === 'past' && renderPastSessions()}

              {/* Empty state when no sessions */}
              {sessions.upcoming.length === 0 && 
               sessions.active.length === 0 && 
               sessions.past.length === 0 && 
               renderEmptyState()}
            </>
          )}
        </div>

        {/* Create/Edit Session Modal */}
        {showCreateModal && renderCreateEditModal()}
        
        {/* Password Modal for joining password-protected sessions */}
        {showPasswordModal && selectedSession && renderPasswordModal()}
      </div>
    </div>
  );
};

export default VirtualClassroom;