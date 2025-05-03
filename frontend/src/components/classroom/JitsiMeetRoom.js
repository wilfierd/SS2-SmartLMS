// src/components/classroom/JitsiMeetRoom.js
import React, { useEffect, useRef, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import JitsiMeetManager from '../../utils/JitsiMeetManager';
import SessionActivityTracker from '../../utils/SessionActivityTracker';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import './JitsiMeetRoom.css';

const JitsiMeetRoom = ({ 
  sessionId, 
  roomId, 
  displayName, 
  email, 
  password, 
  isModerator, 
  onLeave 
}) => {
  const { auth } = useContext(AuthContext);
  const containerRef = useRef(null);
  const jitsiManagerRef = useRef(null);
  const activityTrackerRef = useRef(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [isJoined, setIsJoined] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    initJitsiMeet();
    
    return () => {
      // Clean up
      if (jitsiManagerRef.current) {
        jitsiManagerRef.current.dispose();
      }
      
      if (activityTrackerRef.current) {
        activityTrackerRef.current.stopTracking();
      }
    };
  }, []);

  const initJitsiMeet = async () => {
    try {
      // Initialize Jitsi Meet manager
      jitsiManagerRef.current = new JitsiMeetManager();
      
      // Initialize activity tracker
      activityTrackerRef.current = new SessionActivityTracker(
        sessionId, 
        auth.user.id,
        axios.create({
          baseURL: config.apiUrl,
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        })
      );
      
      // Register callbacks
      jitsiManagerRef.current.registerCallbacks({
        onJoin: handleJoin,
        onParticipantJoin: handleParticipantJoin,
        onParticipantLeave: handleParticipantLeave,
        onAudioToggle: handleAudioToggle,
        onVideoToggle: handleVideoToggle,
        onScreenShareToggle: handleScreenShareToggle,
        onChatMessage: handleChatMessage,
        onLeave: handleLeave,
        onError: handleError
      });
      
      // Initialize Jitsi Meet
      await jitsiManagerRef.current.init(containerRef.current, {
        roomName: roomId,
        displayName: displayName || auth.user.email.split('@')[0],
        email: email || auth.user.email,
        password,
        isModerator,
        prejoinPageEnabled: !isModerator
      });
      
      // Start tracking activity
      activityTrackerRef.current.startTracking();
    } catch (error) {
      console.error('Error initializing Jitsi Meet:', error);
      notification.error('Failed to initialize meeting room. Please try again.');
      
      // Notify parent component
      if (onLeave) {
        onLeave();
      }
    }
  };

  const handleJoin = (event) => {
    setIsJoined(true);
    notification.success('You have joined the meeting.');
    
    // Update participant count
    updateParticipantCount();
  };

  const handleParticipantJoin = (event) => {
    updateParticipantCount();
    
    // Add system message to chat
    addSystemMessage(`${event.displayName} has joined the meeting.`);
  };

  const handleParticipantLeave = (event) => {
    updateParticipantCount();
    
    // Add system message to chat
    if (event.displayName) {
      addSystemMessage(`${event.displayName} has left the meeting.`);
    }
  };

  const handleAudioToggle = (muted) => {
    setIsAudioMuted(muted);
    
    // Record activity
    if (activityTrackerRef.current) {
      activityTrackerRef.current.recordMediaChange('microphone', !muted);
    }
  };

  const handleVideoToggle = (muted) => {
    setIsVideoMuted(muted);
    
    // Record activity
    if (activityTrackerRef.current) {
      activityTrackerRef.current.recordMediaChange('camera', !muted);
    }
  };

  const handleScreenShareToggle = (on) => {
    setIsScreenSharing(on);
    
    // Record activity
    if (activityTrackerRef.current) {
      activityTrackerRef.current.recordScreenShare(on);
    }
  };

  const handleChatMessage = (event) => {
    setChatMessages(prevMessages => [
      ...prevMessages,
      {
        id: Date.now(),
        sender: event.from,
        message: event.message,
        isPrivate: event.privateMessage,
        timestamp: new Date()
      }
    ]);
    
    // If chat is closed, show notification
    if (!isChatOpen) {
      notification.info(`New message from ${event.from}`);
    }
  };

  const handleLeave = (event) => {
    if (activityTrackerRef.current) {
      activityTrackerRef.current.stopTracking();
    }
    
    // Notify parent component
    if (onLeave) {
      onLeave();
    }
  };

  const handleError = (error) => {
    console.error('Jitsi Meet error:', error);
    notification.error('An error occurred in the meeting room.');
  };

  const updateParticipantCount = () => {
    if (jitsiManagerRef.current) {
      setParticipantCount(jitsiManagerRef.current.getParticipantCount());
    }
  };

  const addSystemMessage = (message) => {
    setChatMessages(prevMessages => [
      ...prevMessages,
      {
        id: Date.now(),
        sender: 'System',
        message,
        isSystem: true,
        timestamp: new Date()
      }
    ]);
  };

  const toggleAudio = () => {
    if (jitsiManagerRef.current) {
      jitsiManagerRef.current.toggleAudio();
    }
  };

  const toggleVideo = () => {
    if (jitsiManagerRef.current) {
      jitsiManagerRef.current.toggleVideo();
    }
  };

  const toggleScreenSharing = () => {
    if (jitsiManagerRef.current) {
      jitsiManagerRef.current.toggleScreenSharing();
    }
  };

  const toggleChat = () => {
    setIsChatOpen(prevState => !prevState);
  };

  const toggleRaiseHand = () => {
    if (jitsiManagerRef.current) {
      jitsiManagerRef.current.toggleRaiseHand();
      setIsHandRaised(prevState => !prevState);
      
      // Record activity
      if (activityTrackerRef.current) {
        activityTrackerRef.current.recordHandRaise(!isHandRaised);
      }
    }
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    
    if (!chatMessage.trim()) return;
    
    if (jitsiManagerRef.current) {
      jitsiManagerRef.current.sendChatMessage(chatMessage);
      
      // Add to local chat messages immediately
      setChatMessages(prevMessages => [
        ...prevMessages,
        {
          id: Date.now(),
          sender: 'You',
          message: chatMessage,
          isMe: true,
          timestamp: new Date()
        }
      ]);
      
      setChatMessage('');
    }
  };

  const handleLeaveMeeting = () => {
    if (jitsiManagerRef.current) {
      jitsiManagerRef.current.hangup();
    }
  };

  return (
    <div className="jitsi-meet-container">
      <div className="jitsi-meet-room" ref={containerRef}></div>
      
      {/* Custom UI Controls */}
      <div className={`jitsi-controls ${isJoined ? 'visible' : ''}`}>
        <div className="controls-left">
          <button 
            className={`control-button ${isAudioMuted ? 'disabled' : ''}`}
            onClick={toggleAudio}
            title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isAudioMuted ? '🔇' : '🎤'}
          </button>
          
          <button 
            className={`control-button ${isVideoMuted ? 'disabled' : ''}`}
            onClick={toggleVideo}
            title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoMuted ? '📷' : '🎥'}
          </button>
          
          <button 
            className={`control-button ${isScreenSharing ? 'active' : ''}`}
            onClick={toggleScreenSharing}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share your screen'}
          >
            📊
          </button>
          
          <button 
            className={`control-button ${isHandRaised ? 'active' : ''}`}
            onClick={toggleRaiseHand}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          >
            ✋
          </button>
        </div>
        
        <div className="controls-center">
          <div className="participant-count">
            👥 {participantCount} participants
          </div>
        </div>
        
        <div className="controls-right">
          <button 
            className={`control-button ${isChatOpen ? 'active' : ''}`}
            onClick={toggleChat}
            title="Toggle chat"
          >
            💬
          </button>
          
          <button 
            className="control-button leave-button"
            onClick={handleLeaveMeeting}
            title="Leave meeting"
          >
            📴 Leave
          </button>
        </div>
      </div>
      
      {/* Chat Panel */}
      <div className={`chat-panel ${isChatOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <h3>Meeting Chat</h3>
          <button className="close-chat" onClick={toggleChat}>×</button>
        </div>
        
        <div className="chat-messages">
          {chatMessages.length === 0 ? (
            <div className="no-messages">No messages yet.</div>
          ) : (
            chatMessages.map(msg => (
              <div 
                key={msg.id} 
                className={`chat-message ${msg.isSystem ? 'system' : ''} ${msg.isMe ? 'me' : ''} ${msg.isPrivate ? 'private' : ''}`}
              >
                <div className="message-sender">
                  {msg.isSystem ? '✅ ' : msg.isMe ? 'You' : msg.sender}
                  {msg.isPrivate && ' (Private)'}
                </div>
                <div className="message-text">{msg.message}</div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
        
        <form className="chat-input" onSubmit={sendChatMessage}>
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
          />
          <button type="submit" disabled={!chatMessage.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
};

JitsiMeetRoom.propTypes = {
  sessionId: PropTypes.string.isRequired,
  roomId: PropTypes.string.isRequired,
  displayName: PropTypes.string,
  email: PropTypes.string,
  password: PropTypes.string,
  isModerator: PropTypes.bool,
  onLeave: PropTypes.func
};

JitsiMeetRoom.defaultProps = {
  displayName: '',
  email: '',
  password: '',
  isModerator: false,
  onLeave: () => {}
};

export default JitsiMeetRoom;