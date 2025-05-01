// src/components/classroom/SessionAnalytics.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import './SessionAnalytics.css';

/**
 * SessionAnalytics component that shows detailed analytics for a virtual classroom session
 * Only accessible to instructors and admins
 */
const SessionAnalytics = () => {
  const { sessionId } = useParams();
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [activities, setActivities] = useState([]);
  const [metrics, setMetrics] = useState({
    uniqueParticipants: 0,
    totalJoins: 0,
    totalLeaves: 0,
    avgDurationSeconds: 0,
    maxDurationSeconds: 0
  });
  const [presenceTimeline, setPresenceTimeline] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [feedbackAverages, setFeedbackAverages] = useState({
    overallRating: 0,
    audioRating: 0,
    videoRating: 0,
    contentRating: 0,
    totalResponses: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  
  // API URL from config
  const API_URL = config.apiUrl;

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if user is authorized (instructor or admin)
      if (auth.user.role !== 'instructor' && auth.user.role !== 'admin') {
        throw new Error('You do not have permission to view this page');
      }

      // Fetch session details
      const sessionResponse = await axios.get(`${API_URL}/virtual-sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      const sessionData = sessionResponse.data;
      setSession(sessionData);

      // For instructors, ensure they own the session
      if (auth.user.role === 'instructor' && sessionData.instructorId !== auth.user.id) {
        throw new Error('You can only view analytics for your own sessions');
      }

      // Fetch session activities
      const activitiesResponse = await axios.get(`${API_URL}/virtual-sessions/${sessionId}/activities`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      setActivities(activitiesResponse.data.activities || []);
      setMetrics(activitiesResponse.data.metrics || {});
      setPresenceTimeline(activitiesResponse.data.presenceTimeline || []);

      // Fetch session feedback if the session is completed
      if (sessionData.status === 'completed') {
        const feedbackResponse = await axios.get(`${API_URL}/virtual-sessions/${sessionId}/feedback`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });

        setFeedback(feedbackResponse.data.feedback || []);
        setFeedbackAverages(feedbackResponse.data.averages || {});
      }

    } catch (error) {
      console.error('Error fetching session analytics:', error);
      setError(error.message || 'Failed to load session analytics');
      notification.error(error.message || 'Failed to load session analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0 mins';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''}`;
    }
    
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const calculateAttendanceRate = () => {
    if (!session || !metrics) return '0%';
    
    const registeredCount = session.participantCount || 0;
    if (registeredCount === 0) return '100%';
    
    const attendedCount = metrics.uniqueParticipants || 0;
    const rate = (attendedCount / registeredCount) * 100;
    
    return `${Math.round(rate)}%`;
  };

  const getParticipantTotalTime = (userId) => {
    // Filter activities for this user and only join/leave actions
    const userActivities = activities.filter(
      activity => activity.user_id === userId && 
                (activity.action === 'join' || activity.action === 'leave')
    );
    
    // Sort by timestamp
    userActivities.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    let totalDuration = 0;
    let joinTime = null;
    
    // Calculate total time by pairing join and leave events
    for (const activity of userActivities) {
      if (activity.action === 'join') {
        joinTime = new Date(activity.timestamp);
      } else if (activity.action === 'leave' && joinTime) {
        const leaveTime = new Date(activity.timestamp);
        const duration = (leaveTime - joinTime) / 1000; // convert to seconds
        totalDuration += duration;
        joinTime = null;
      }
    }
    
    // If there's an unpaired join (user never left properly)
    if (joinTime && session.actual_end_time) {
      const sessionEndTime = new Date(session.actual_end_time);
      const duration = (sessionEndTime - joinTime) / 1000;
      totalDuration += duration;
    }
    
    return totalDuration;
  };

  const renderOverviewTab = () => {
    if (!session) return null;
    
    return (
      <div className="analytics-overview">
        <div className="overview-header">
          <h2>{session.title}</h2>
          <div className="session-date-time">
            {session.sessionDate && <span>Date: {formatDate(session.sessionDate)}</span>}
            {session.actual_start_time && <span>Started: {formatTime(session.actual_start_time)}</span>}
            {session.actual_end_time && <span>Ended: {formatTime(session.actual_end_time)}</span>}
          </div>
        </div>
        
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon participants-icon">👥</div>
            <div className="metric-data">
              <div className="metric-value">{metrics.uniqueParticipants || 0}</div>
              <div className="metric-label">Participants</div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-icon attendance-icon">📊</div>
            <div className="metric-data">
              <div className="metric-value">{calculateAttendanceRate()}</div>
              <div className="metric-label">Attendance Rate</div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-icon duration-icon">⏱️</div>
            <div className="metric-data">
              <div className="metric-value">{formatDuration(metrics.avgDurationSeconds)}</div>
              <div className="metric-label">Avg. Attendance Time</div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-icon feedback-icon">⭐</div>
            <div className="metric-data">
              <div className="metric-value">
                {feedbackAverages.totalResponses > 0 
                  ? `${feedbackAverages.overallRating.toFixed(1)}/5` 
                  : 'N/A'}
              </div>
              <div className="metric-label">Avg. Rating</div>
            </div>
          </div>
        </div>
        
        <div className="session-duration-summary">
          <h3>Session Duration</h3>
          {session.actual_start_time && session.actual_end_time ? (
            <div className="duration-data">
              <p>
                Total Duration: <strong>
                  {formatDuration(
                    (new Date(session.actual_end_time) - new Date(session.actual_start_time)) / 1000
                  )}
                </strong>
              </p>
            </div>
          ) : (
            <p className="no-data-message">Duration data not available</p>
          )}
        </div>
        
        {feedback.length > 0 && (
          <div className="feedback-summary">
            <h3>Feedback Summary</h3>
            <div className="feedback-averages">
              <div className="rating-item">
                <span className="rating-label">Overall:</span>
                <div className="rating-stars">
                  {renderStarRating(feedbackAverages.overallRating)}
                </div>
                <span className="rating-value">{feedbackAverages.overallRating.toFixed(1)}</span>
              </div>
              
              {feedbackAverages.audioRating > 0 && (
                <div className="rating-item">
                  <span className="rating-label">Audio Quality:</span>
                  <div className="rating-stars">
                    {renderStarRating(feedbackAverages.audioRating)}
                  </div>
                  <span className="rating-value">{feedbackAverages.audioRating.toFixed(1)}</span>
                </div>
              )}
              
              {feedbackAverages.videoRating > 0 && (
                <div className="rating-item">
                  <span className="rating-label">Video Quality:</span>
                  <div className="rating-stars">
                    {renderStarRating(feedbackAverages.videoRating)}
                  </div>
                  <span className="rating-value">{feedbackAverages.videoRating.toFixed(1)}</span>
                </div>
              )}
              
              {feedbackAverages.contentRating > 0 && (
                <div className="rating-item">
                  <span className="rating-label">Content Quality:</span>
                  <div className="rating-stars">
                    {renderStarRating(feedbackAverages.contentRating)}
                  </div>
                  <span className="rating-value">{feedbackAverages.contentRating.toFixed(1)}</span>
                </div>
              )}
            </div>
            
            <div className="feedback-count">
              <p>Based on {feedbackAverages.totalResponses} participant feedback submissions</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<span key={i} className="star full">★</span>);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<span key={i} className="star half">★</span>);
      } else {
        stars.push(<span key={i} className="star empty">☆</span>);
      }
    }
    
    return stars;
  };

  const renderParticipantsTab = () => {
    // Get unique participants
    const uniqueParticipantIds = [...new Set(
      activities
        .filter(a => a.action === 'join' || a.action === 'leave')
        .map(a => a.user_id)
    )];
    
    // Create participant data with total time
    const participantsData = uniqueParticipantIds.map(userId => {
      // Find a sample activity to get the name
      const sampleActivity = activities.find(a => a.user_id === userId);
      const totalTime = getParticipantTotalTime(userId);
      
      // Find first join and last leave
      const userActivities = activities.filter(a => 
        a.user_id === userId && (a.action === 'join' || a.action === 'leave')
      );
      
      userActivities.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      const firstJoin = userActivities.find(a => a.action === 'join');
      const lastLeave = [...userActivities].reverse().find(a => a.action === 'leave');
      
      return {
        id: userId,
        name: sampleActivity ? sampleActivity.userName : `User ${userId}`,
        email: sampleActivity ? sampleActivity.email : '',
        totalTimeSeconds: totalTime,
        firstJoin: firstJoin ? firstJoin.timestamp : null,
        lastLeave: lastLeave ? lastLeave.timestamp : null
      };
    });
    
    // Sort by total time (descending)
    participantsData.sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);
    
    return (
      <div className="participants-tab">
        <h3>Session Participants ({participantsData.length})</h3>
        
        <div className="participants-table-container">
          <table className="participants-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Time in Session</th>
                <th>Attendance</th>
                <th>First Join</th>
                <th>Last Leave</th>
              </tr>
            </thead>
            <tbody>
              {participantsData.map(participant => {
                // Calculate attendance percentage
                let attendancePercentage = 0;
                if (session && session.actual_start_time && session.actual_end_time) {
                  const sessionDuration = 
                    (new Date(session.actual_end_time) - new Date(session.actual_start_time)) / 1000;
                  
                  if (sessionDuration > 0) {
                    attendancePercentage = Math.min(100, Math.round((participant.totalTimeSeconds / sessionDuration) * 100));
                  }
                }
                
                return (
                  <tr key={participant.id}>
                    <td className="participant-name">
                      <div>{participant.name}</div>
                      <div className="participant-email">{participant.email}</div>
                    </td>
                    <td>{formatDuration(participant.totalTimeSeconds)}</td>
                    <td>
                      <div className="attendance-bar-container">
                        <div 
                          className="attendance-bar-fill" 
                          style={{ width: `${attendancePercentage}%` }}
                        ></div>
                        <span className="attendance-value">{attendancePercentage}%</span>
                      </div>
                    </td>
                    <td>{participant.firstJoin ? formatTime(participant.firstJoin) : 'N/A'}</td>
                    <td>{participant.lastLeave ? formatTime(participant.lastLeave) : 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {participantsData.length === 0 && (
          <div className="no-data-message">No participant data available for this session</div>
        )}
      </div>
    );
  };

  const renderTimelineTab = () => {
    // Group by user and sort by timestamp
    const timelineByUser = {};
    
    presenceTimeline.forEach(event => {
      if (!timelineByUser[event.user_id]) {
        timelineByUser[event.user_id] = {
          userId: event.user_id,
          userName: event.userName,
          events: []
        };
      }
      
      timelineByUser[event.user_id].events.push({
        action: event.action,
        timestamp: new Date(event.timestamp)
      });
    });
    
    // Sort each user's events by timestamp
    Object.values(timelineByUser).forEach(user => {
      user.events.sort((a, b) => a.timestamp - b.timestamp);
    });
    
    // Get the session start and end times
    let timelineStart, timelineEnd;
    
    if (session && session.actual_start_time) {
      timelineStart = new Date(session.actual_start_time);
      timelineEnd = session.actual_end_time 
        ? new Date(session.actual_end_time)
        : new Date(Math.max(...presenceTimeline.map(e => new Date(e.timestamp))));
    } else if (presenceTimeline.length > 0) {
      timelineStart = new Date(Math.min(...presenceTimeline.map(e => new Date(e.timestamp))));
      timelineEnd = new Date(Math.max(...presenceTimeline.map(e => new Date(e.timestamp))));
    } else {
      return (
        <div className="timeline-tab">
          <h3>Session Timeline</h3>
          <div className="no-data-message">No timeline data available for this session</div>
        </div>
      );
    }
    
    // Ensure we have at least 10 minutes of timeline
    const minDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
    if (timelineEnd - timelineStart < minDuration) {
      timelineEnd = new Date(timelineStart.getTime() + minDuration);
    }
    
    const timelineDuration = timelineEnd - timelineStart;
    
    return (
      <div className="timeline-tab">
        <h3>Session Timeline</h3>
        <div className="timeline-header">
          <div className="timeline-legend">
            <div className="legend-item">
              <div className="legend-color join"></div>
              <div className="legend-label">Join</div>
            </div>
            <div className="legend-item">
              <div className="legend-color leave"></div>
              <div className="legend-label">Leave</div>
            </div>
            <div className="legend-item">
              <div className="legend-color present"></div>
              <div className="legend-label">Present</div>
            </div>
          </div>
          
          <div className="timeline-time-labels">
            <div className="time-label start">{formatTime(timelineStart)}</div>
            <div className="time-label middle">{formatTime(new Date((timelineStart.getTime() + timelineEnd.getTime()) / 2))}</div>
            <div className="time-label end">{formatTime(timelineEnd)}</div>
          </div>
        </div>
        
        <div className="timeline-container">
          {Object.values(timelineByUser).map(user => {
            // Generate segments showing joined/left periods
            const segments = [];
            let currentSegment = null;
            
            user.events.forEach((event, index) => {
              if (event.action === 'join') {
                // Start a new segment
                currentSegment = {
                  start: event.timestamp,
                  end: null
                };
              } else if (event.action === 'leave' && currentSegment) {
                // Complete the current segment
                currentSegment.end = event.timestamp;
                segments.push(currentSegment);
                currentSegment = null;
              }
            });
            
            // If the last segment doesn't have an end (user didn't leave), set it to the session end
            if (currentSegment && !currentSegment.end) {
              currentSegment.end = timelineEnd;
              segments.push(currentSegment);
            }
            
            return (
              <div key={user.userId} className="timeline-row">
                <div className="timeline-user">{user.userName}</div>
                <div className="timeline-events">
                  {segments.map((segment, i) => {
                    // Calculate position and width as percentages
                    const leftPos = ((segment.start - timelineStart) / timelineDuration) * 100;
                    const width = ((segment.end - segment.start) / timelineDuration) * 100;
                    
                    return (
                      <div 
                        key={i}
                        className="timeline-segment"
                        style={{
                          left: `${leftPos}%`,
                          width: `${width}%`
                        }}
                        title={`${formatTime(segment.start)} - ${formatTime(segment.end)}`}
                      ></div>
                    );
                  })}
                  
                  {user.events.map((event, i) => {
                    // Calculate position as percentage
                    const leftPos = ((event.timestamp - timelineStart) / timelineDuration) * 100;
                    
                    return (
                      <div 
                        key={`event-${i}`}
                        className={`timeline-event ${event.action}`}
                        style={{
                          left: `${leftPos}%`
                        }}
                        title={`${event.action === 'join' ? 'Joined' : 'Left'} at ${formatTime(event.timestamp)}`}
                      ></div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {Object.keys(timelineByUser).length === 0 && (
          <div className="no-data-message">No timeline data available for this session</div>
        )}
      </div>
    );
  };

  const renderFeedbackTab = () => {
    return (
      <div className="feedback-tab">
        <h3>Session Feedback</h3>
        
        {feedback.length > 0 ? (
          <>
            <div className="feedback-summary-card">
              <div className="summary-section">
                <h4>Rating Summary</h4>
                <div className="rating-summary">
                  <div className="rating-average">
                    <div className="big-rating">{feedbackAverages.overallRating.toFixed(1)}</div>
                    <div className="rating-stars large">
                      {renderStarRating(feedbackAverages.overallRating)}
                    </div>
                    <div className="response-count">{feedbackAverages.totalResponses} total responses</div>
                  </div>
                  
                  <div className="rating-breakdown">
                    {feedbackAverages.audioRating > 0 && (
                      <div className="breakdown-item">
                        <div className="breakdown-label">Audio Quality</div>
                        <div className="breakdown-stars">
                          {renderStarRating(feedbackAverages.audioRating)}
                        </div>
                        <div className="breakdown-value">{feedbackAverages.audioRating.toFixed(1)}</div>
                      </div>
                    )}
                    
                    {feedbackAverages.videoRating > 0 && (
                      <div className="breakdown-item">
                        <div className="breakdown-label">Video Quality</div>
                        <div className="breakdown-stars">
                          {renderStarRating(feedbackAverages.videoRating)}
                        </div>
                        <div className="breakdown-value">{feedbackAverages.videoRating.toFixed(1)}</div>
                      </div>
                    )}
                    
                    {feedbackAverages.contentRating > 0 && (
                      <div className="breakdown-item">
                        <div className="breakdown-label">Content Quality</div>
                        <div className="breakdown-stars">
                          {renderStarRating(feedbackAverages.contentRating)}
                        </div>
                        <div className="breakdown-value">{feedbackAverages.contentRating.toFixed(1)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="feedback-list">
              <h4>Individual Feedback</h4>
              {feedback.map(item => (
                <div key={item.id} className="feedback-item">
                  <div className="feedback-header">
                    <div className="feedback-user">{item.userName}</div>
                    <div className="feedback-timestamp">{formatDate(item.submitted_at)} {formatTime(item.submitted_at)}</div>
                  </div>
                  
                  <div className="feedback-ratings">
                    <div className="feedback-rating">
                      <span className="rating-label">Overall:</span>
                      <div className="rating-stars">
                        {renderStarRating(item.rating)}
                      </div>
                    </div>
                    
                    {item.audio_quality_rating && (
                      <div className="feedback-rating">
                        <span className="rating-label">Audio:</span>
                        <div className="rating-stars">
                          {renderStarRating(item.audio_quality_rating)}
                        </div>
                      </div>
                    )}
                    
                    {item.video_quality_rating && (
                      <div className="feedback-rating">
                        <span className="rating-label">Video:</span>
                        <div className="rating-stars">
                          {renderStarRating(item.video_quality_rating)}
                        </div>
                      </div>
                    )}
                    
                    {item.content_rating && (
                      <div className="feedback-rating">
                        <span className="rating-label">Content:</span>
                        <div className="rating-stars">
                          {renderStarRating(item.content_rating)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {item.comments && (
                    <div className="feedback-comments">
                      <p>{item.comments}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="no-data-message">No feedback has been submitted for this session yet</div>
        )}
      </div>
    );
  };

  return (
    <div className="session-analytics-container">
      <Sidebar activeItem="classroom" />
      
      <div className="analytics-content">
        <Header title="Session Analytics" />
        
        <div className="analytics-main-content">
          {isLoading ? (
            <div className="loading-spinner">Loading analytics data...</div>
          ) : error ? (
            <div className="error-message">
              <h3>Error</h3>
              <p>{error}</p>
              <button 
                className="back-button"
                onClick={() => navigate('/virtual-classroom')}
              >
                Back to Virtual Classroom
              </button>
            </div>
          ) : session ? (
            <>
              <div className="analytics-header">
                <div className="breadcrumb">
                  <a href="/virtual-classroom">Virtual Classroom</a> &gt; 
                  <span className="current-page">Session Analytics</span>
                </div>
                
                <div className="session-status">
                  <span className={`status-badge ${session.status}`}>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </span>
                </div>
              </div>
              
              <div className="analytics-tabs">
                <button 
                  className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button 
                  className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
                  onClick={() => setActiveTab('participants')}
                >
                  Participants
                </button>
                <button 
                  className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
                  onClick={() => setActiveTab('timeline')}
                >
                  Timeline
                </button>
                <button 
                  className={`tab-button ${activeTab === 'feedback' ? 'active' : ''}`}
                  onClick={() => setActiveTab('feedback')}
                >
                  Feedback
                </button>
              </div>
              
              <div className="analytics-tab-content">
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'participants' && renderParticipantsTab()}
                {activeTab === 'timeline' && renderTimelineTab()}
                {activeTab === 'feedback' && renderFeedbackTab()}
              </div>
              
              <div className="analytics-footer">
                <button 
                  className="back-button"
                  onClick={() => navigate('/virtual-classroom')}
                >
                  Back to Virtual Classroom
                </button>
                
                {session.status === 'completed' && (
                  <button 
                    className="download-report-button"
                    onClick={() => {
                      notification.info('Downloading analytics report...');
                      // In a real implementation, this would generate and download a report
                    }}
                  >
                    Download Report
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="not-found-message">
              <h3>Session Not Found</h3>
              <p>The requested session could not be found or you don't have permission to view it.</p>
              <button 
                className="back-button"
                onClick={() => navigate('/virtual-classroom')}
              >
                Back to Virtual Classroom
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionAnalytics;