// src/components/classroom/SessionRecordingView.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import './SessionRecordingView.css';

const SessionRecordingView = () => {
  const { sessionId, recordingId } = useParams();
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(null);
  const [session, setSession] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);

  // API URL from config
  const API_URL = config.apiUrl;

  useEffect(() => {
    fetchRecordingData();

    // Hide controls after 3 seconds of inactivity
    const controlsTimeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(controlsTimeout);
  }, [sessionId, recordingId, isPlaying]);

  const fetchRecordingData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch session information
      const sessionResponse = await axios.get(`${API_URL}/virtual-sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      setSession(sessionResponse.data);

      // Fetch recording information
      const recordingResponse = await axios.get(
        `${API_URL}/virtual-sessions/${sessionId}/recordings${recordingId ? `/${recordingId}` : ''}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      // If recordingId is not specified, use the first recording
      const recordingData = recordingId 
        ? recordingResponse.data 
        : recordingResponse.data[0];

      if (!recordingData) {
        throw new Error('Recording not found');
      }

      setRecording(recordingData);

      // Record view activity
      await axios.post(
        `${API_URL}/virtual-sessions/${sessionId}/recordings/${recordingData.id}/view`,
        {},
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

    } catch (error) {
      console.error('Error fetching recording data:', error);
      setError(error.response?.data?.message || 'Failed to load recording. Please try again.');
      notification.error('Failed to load recording');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current) {
      const seekTime = (e.target.value / 100) * duration;
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value / 100;
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return [
      hours > 0 ? hours : null,
      minutes < 10 && hours > 0 ? `0${minutes}` : minutes,
      secs < 10 ? `0${secs}` : secs
    ].filter(Boolean).join(':');
  };

  const handleMouseMove = () => {
    setShowControls(true);
    
    // Reset the timeout when mouse moves
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const controlsTimeoutRef = useRef(null);

  const handleBackToSessions = () => {
    navigate('/virtual-classroom');
  };

  return (
    <div className="recording-view-container">
      <Sidebar activeItem="classroom" />
      
      <div className="recording-content">
        <Header title="Session Recording" />
        
        <div className="recording-main-content">
          {isLoading ? (
            <div className="loading-spinner">Loading recording...</div>
          ) : error ? (
            <div className="error-message">
              <h3>Error Loading Recording</h3>
              <p>{error}</p>
              <button className="back-button" onClick={handleBackToSessions}>
                Back to Virtual Classroom
              </button>
            </div>
          ) : recording ? (
            <>
              <div className="recording-info">
                <h2>{session?.title || 'Classroom Session'}</h2>
                <p className="recording-details">
                  <span className="recording-date">
                    {new Date(recording.start_time).toLocaleDateString()} • 
                  </span>
                  <span className="recording-duration">
                    {formatTime(duration)}
                  </span>
                </p>
              </div>
              
              <div 
                className="video-container" 
                onMouseMove={handleMouseMove}
              >
                <video
                  ref={videoRef}
                  src={recording.recording_url}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onEnded={handleVideoEnded}
                  onClick={handlePlayPause}
                />
                
                <div className={`video-controls ${showControls ? 'visible' : ''}`}>
                  <div className="seek-bar">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(currentTime / duration) * 100 || 0}
                      onChange={handleSeek}
                      className="progress-slider"
                    />
                  </div>
                  
                  <div className="controls-bottom">
                    <div className="controls-left">
                      <button className="control-button" onClick={handlePlayPause}>
                        {isPlaying ? '⏸️' : '▶️'}
                      </button>
                      
                      <div className="volume-control">
                        <button className="control-button">
                          {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume * 100}
                          onChange={handleVolumeChange}
                          className="volume-slider"
                        />
                      </div>
                      
                      <div className="time-display">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </div>
                    </div>
                    
                    <div className="controls-right">
                      <div className="playback-control">
                        <select 
                          value={playbackRate}
                          onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                          className="playback-select"
                        >
                          <option value="0.5">0.5x</option>
                          <option value="1">1x</option>
                          <option value="1.25">1.25x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2">2x</option>
                        </select>
                      </div>
                      
                      <button className="control-button fullscreen-button">
                        🔍
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="recording-description">
                <div className="instructor-info">
                  <strong>Instructor:</strong> {session?.instructorName || 'Unknown'}
                </div>
                <div className="recording-transcript">
                  <h3>Session Notes</h3>
                  <p>{session?.description || 'No notes available for this recording.'}</p>
                </div>
              </div>
              
              <div className="recording-actions">
                <button className="back-button" onClick={handleBackToSessions}>
                  Back to Virtual Classroom
                </button>
                {auth.user.role === 'instructor' && session?.instructorId === auth.user.id && (
                  <button className="edit-button" onClick={() => navigate(`/virtual-classroom/edit-session/${sessionId}`)}>
                    Edit Session Details
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="no-recording-message">
              <h3>No Recording Available</h3>
              <p>The recording you're looking for does not exist or you don't have permission to view it.</p>
              <button className="back-button" onClick={handleBackToSessions}>
                Back to Virtual Classroom
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionRecordingView;