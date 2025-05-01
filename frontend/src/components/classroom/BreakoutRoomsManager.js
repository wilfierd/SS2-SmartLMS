// src/components/classroom/BreakoutRoomsManager.js
import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import './BreakoutRoomsManager.css';

/**
 * BreakoutRoomsManager component that allows instructors to create and manage breakout rooms
 * and students to see and join their assigned rooms
 */
const BreakoutRoomsManager = ({ sessionId, onJoinBreakoutRoom }) => {
  const { auth } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userRoom, setUserRoom] = useState(null);
  const [isInRoom, setIsInRoom] = useState(false);
  
  // Form state
  const [createForm, setCreateForm] = useState({
    roomCount: 2,
    autoAssign: true,
    roomNames: ['Breakout Room 1', 'Breakout Room 2'],
    participantAssignments: {}
  });
  
  // Check if user is instructor
  const isInstructor = auth.user.role === 'instructor';
  
  // API URL from config
  const API_URL = config.apiUrl;
  
  // Fetch rooms and participants when component mounts and then on a regular interval
  useEffect(() => {
    fetchRooms();
    if (isInstructor) {
      fetchParticipants();
    }
    
    // Set up polling interval
    const pollInterval = setInterval(() => {
      fetchRooms();
    }, 10000); // Check for updates every 10 seconds
    
    return () => clearInterval(pollInterval);
  }, [sessionId]);
  
  // Fetch breakout rooms
  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/virtual-sessions/${sessionId}/breakout`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      if (isInstructor) {
        setRooms(response.data || []);
      } else {
        // For students, find their assigned room
        setUserRoom(response.data?.userRoom || null);
        setIsInRoom(response.data?.isInRoom || false);
      }
    } catch (error) {
      console.error('Error fetching breakout rooms:', error);
      // Silent error - don't show notification for background polling
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch session participants (for instructor)
  const fetchParticipants = async () => {
    try {
      const response = await axios.get(`${API_URL}/virtual-sessions/${sessionId}/participants`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      setParticipants(response.data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };
  
  // Handle room count change
  const handleRoomCountChange = (count) => {
    // Clamp between 2 and 10
    count = Math.max(2, Math.min(10, count));
    
    // Update room names if needed
    let newRoomNames = [...createForm.roomNames];
    if (count > createForm.roomNames.length) {
      // Add more room names
      for (let i = createForm.roomNames.length; i < count; i++) {
        newRoomNames.push(`Breakout Room ${i + 1}`);
      }
    } else if (count < createForm.roomNames.length) {
      // Remove extra room names
      newRoomNames = newRoomNames.slice(0, count);
    }
    
    setCreateForm({
      ...createForm,
      roomCount: count,
      roomNames: newRoomNames
    });
  };
  
  // Handle room name change
  const handleRoomNameChange = (index, name) => {
    const newRoomNames = [...createForm.roomNames];
    newRoomNames[index] = name;
    setCreateForm({ ...createForm, roomNames: newRoomNames });
  };
  
  // Handle participant assignment
  const handleParticipantAssignment = (participantId, roomIndex) => {
    const newAssignments = { ...createForm.participantAssignments };
    
    // Remove participant from previous room
    Object.keys(newAssignments).forEach(key => {
      newAssignments[key] = newAssignments[key].filter(id => id !== participantId);
    });
    
    // Add to new room
    if (!newAssignments[roomIndex]) {
      newAssignments[roomIndex] = [];
    }
    newAssignments[roomIndex].push(participantId);
    
    setCreateForm({ 
      ...createForm, 
      participantAssignments: newAssignments,
      autoAssign: false // Turn off auto-assign when manually assigning
    });
  };
  
  // Handle auto-assign toggle
  const handleAutoAssignToggle = (autoAssign) => {
    setCreateForm({
      ...createForm,
      autoAssign,
      // Clear manual assignments if auto-assign is turned on
      participantAssignments: autoAssign ? {} : createForm.participantAssignments
    });
  };
  
  // Handle create breakout rooms
  const handleCreateBreakoutRooms = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      await axios.post(
        `${API_URL}/virtual-sessions/${sessionId}/breakout`,
        {
          roomCount: createForm.roomCount,
          roomNames: createForm.roomNames,
          autoAssign: createForm.autoAssign,
          participantAssignments: createForm.autoAssign ? null : createForm.participantAssignments
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      notification.success('Breakout rooms created successfully');
      setShowCreateForm(false);
      
      // Refresh rooms
      fetchRooms();
    } catch (error) {
      console.error('Error creating breakout rooms:', error);
      notification.error(error.response?.data?.message || 'Failed to create breakout rooms');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle join breakout room
  const handleJoinRoom = (roomId, roomName) => {
    if (onJoinBreakoutRoom) {
      onJoinBreakoutRoom(roomId, roomName);
    }
  };
  
  // Handle close all breakout rooms
  const handleCloseAllRooms = async () => {
    try {
      await axios.post(
        `${API_URL}/virtual-sessions/${sessionId}/breakout/close-all`,
        {},
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      notification.success('All breakout rooms closed');
      
      // Refresh rooms
      fetchRooms();
    } catch (error) {
      console.error('Error closing breakout rooms:', error);
      notification.error(error.response?.data?.message || 'Failed to close breakout rooms');
    }
  };
  
  // Render instructor view
  const renderInstructorView = () => {
    return (
      <>
        <div className="breakout-header">
          <h2>Breakout Rooms</h2>
          {rooms.length === 0 ? (
            <button 
              className="create-rooms-button"
              onClick={() => setShowCreateForm(true)}
              disabled={isLoading}
            >
              Create Breakout Rooms
            </button>
          ) : (
            <button 
              className="close-rooms-button"
              onClick={handleCloseAllRooms}
              disabled={isLoading}
            >
              Close All Rooms
            </button>
          )}
        </div>
        
        {/* Create Breakout Rooms Form */}
        {showCreateForm && (
          <div className="create-rooms-form">
            <form onSubmit={handleCreateBreakoutRooms}>
              <div className="form-group">
                <label htmlFor="roomCount">Number of Rooms</label>
                <input
                  type="number"
                  id="roomCount"
                  min="2"
                  max="10"
                  value={createForm.roomCount}
                  onChange={(e) => handleRoomCountChange(parseInt(e.target.value))}
                  required
                />
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.autoAssign}
                    onChange={(e) => handleAutoAssignToggle(e.target.checked)}
                  />
                  Automatically assign participants to rooms
                </label>
              </div>
              
              {!createForm.autoAssign && (
                <div className="manual-assignment">
                  <h3>Assign Participants to Rooms</h3>
                  
                  <div className="room-assignment-area">
                    <div className="room-columns">
                      {Array.from({ length: createForm.roomCount }).map((_, index) => (
                        <div key={index} className="room-column">
                          <div className="room-header">
                            <input
                              type="text"
                              value={createForm.roomNames[index]}
                              onChange={(e) => handleRoomNameChange(index, e.target.value)}
                              placeholder={`Room ${index + 1}`}
                            />
                          </div>
                          <div className="room-participants">
                            {createForm.participantAssignments[index]?.map(participantId => {
                              const participant = participants.find(p => p.id === participantId);
                              return participant ? (
                                <div key={participant.id} className="assigned-participant">
                                  {participant.displayName || participant.email}
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="unassigned-participants">
                      <h4>Unassigned Participants</h4>
                      <div className="participant-list">
                        {participants.filter(participant => {
                          // Check if participant is assigned to any room
                          return !Object.values(createForm.participantAssignments).flat().includes(participant.id);
                        }).map(participant => (
                          <div key={participant.id} className="participant-item">
                            <span>{participant.displayName || participant.email}</span>
                            <div className="room-select">
                              <select 
                                onChange={(e) => handleParticipantAssignment(participant.id, parseInt(e.target.value))}
                                value=""
                              >
                                <option value="" disabled>Assign to room</option>
                                {Array.from({ length: createForm.roomCount }).map((_, index) => (
                                  <option key={index} value={index}>
                                    {createForm.roomNames[index]}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="create-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Rooms'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Active Breakout Rooms */}
        {rooms.length > 0 && (
          <div className="active-rooms">
            <h3>Active Breakout Rooms</h3>
            <div className="rooms-grid">
              {rooms.map(room => (
                <div key={room.id} className="room-card">
                  <div className="room-card-header">
                    <h4>{room.name}</h4>
                    <div className="participant-count">
                      {room.participants.length} participants
                    </div>
                  </div>
                  
                  <div className="room-participants-list">
                    {room.participants.length > 0 ? (
                      room.participants.map(participant => (
                        <div key={participant.id} className="room-participant">
                          {participant.participantName}
                        </div>
                      ))
                    ) : (
                      <div className="no-participants">No participants in this room</div>
                    )}
                  </div>
                  
                  <div className="room-actions">
                    <button 
                      className="join-room-button"
                      onClick={() => handleJoinRoom(room.id, room.name)}
                    >
                      Join Room
                    </button>
                    <button className="broadcast-button">
                      Broadcast Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {rooms.length === 0 && !showCreateForm && (
          <div className="no-rooms-message">
            <p>No breakout rooms are currently active.</p>
            <p>Create breakout rooms to divide participants into smaller groups for discussions.</p>
          </div>
        )}
      </>
    );
  };
  
  // Render student view
  const renderStudentView = () => {
    return (
      <>
        <div className="breakout-header">
          <h2>Breakout Rooms</h2>
        </div>
        
        {userRoom ? (
          <div className="student-room-view">
            <div className="assigned-room-card">
              <h3>You've been assigned to:</h3>
              <div className="room-name">{userRoom.name}</div>
              <div className="room-participants-count">
                {userRoom.participants.length} participants in this room
              </div>
              
              <div className="room-participants-list">
                <h4>Participants:</h4>
                {userRoom.participants.map(participant => (
                  <div key={participant.id} className="room-participant">
                    {participant.participantName}
                    {participant.user_id === auth.user.id && " (You)"}
                  </div>
                ))}
              </div>
              
              <div className="join-room-action">
                <button 
                  className="join-room-button large"
                  onClick={() => handleJoinRoom(userRoom.id, userRoom.name)}
                  disabled={isInRoom}
                >
                  {isInRoom ? 'Currently in this Room' : 'Join Breakout Room'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-rooms-message">
            <p>You have not been assigned to any breakout room yet.</p>
            <p>The instructor will create breakout rooms and assign participants.</p>
          </div>
        )}
      </>
    );
  };
  
  return (
    <div className="breakout-rooms-container">
      {isInstructor ? renderInstructorView() : renderStudentView()}
    </div>
  );
};

BreakoutRoomsManager.propTypes = {
  sessionId: PropTypes.string.isRequired,
  onJoinBreakoutRoom: PropTypes.func
};

BreakoutRoomsManager.defaultProps = {
  onJoinBreakoutRoom: () => {}
};

export default BreakoutRoomsManager;