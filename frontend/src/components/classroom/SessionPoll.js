// src/components/classroom/SessionPoll.js
import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import './SessionPoll.css';

/**
 * SessionPoll component that handles creating, responding to, and displaying polls
 * during a virtual classroom session
 */
const SessionPoll = ({ sessionId, isInstructor }) => {
  const { auth } = useContext(AuthContext);
  const [activePolls, setActivePolls] = useState([]);
  const [closedPolls, setClosedPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pollForm, setPollForm] = useState({
    question: '',
    options: ['', ''],
    isAnonymous: false,
    isMultipleChoice: false
  });
  
  // API URL from config
  const API_URL = config.apiUrl;

  // Fetch polls when component mounts and then on a regular interval
  useEffect(() => {
    fetchPolls();
    
    // Set up polling interval
    const pollInterval = setInterval(() => {
      fetchPolls();
    }, 10000); // Check for new polls every 10 seconds
    
    return () => clearInterval(pollInterval);
  }, [sessionId]);

  const fetchPolls = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/virtual-sessions/${sessionId}/polls`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      // Separate active and closed polls
      const active = response.data.filter(poll => !poll.ended_at);
      const closed = response.data.filter(poll => poll.ended_at);
      
      setActivePolls(active);
      setClosedPolls(closed);
    } catch (error) {
      console.error('Error fetching polls:', error);
      // Silent error - don't show notification for background polling
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!pollForm.question.trim()) {
      notification.error('Please enter a question for the poll');
      return;
    }
    
    // Filter out empty options
    const validOptions = pollForm.options.filter(option => option.trim());
    
    if (validOptions.length < 2) {
      notification.error('Please provide at least two options');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await axios.post(
        `${API_URL}/virtual-sessions/${sessionId}/poll`,
        {
          question: pollForm.question,
          options: validOptions,
          isAnonymous: pollForm.isAnonymous,
          isMultipleChoice: pollForm.isMultipleChoice
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      notification.success('Poll created successfully');
      setShowCreateForm(false);
      
      // Reset form
      setPollForm({
        question: '',
        options: ['', ''],
        isAnonymous: false,
        isMultipleChoice: false
      });
      
      // Refresh polls
      fetchPolls();
    } catch (error) {
      console.error('Error creating poll:', error);
      notification.error(error.response?.data?.message || 'Failed to create poll');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...pollForm.options];
    newOptions[index] = value;
    setPollForm({ ...pollForm, options: newOptions });
  };

  const handleAddOption = () => {
    setPollForm({ ...pollForm, options: [...pollForm.options, ''] });
  };

  const handleRemoveOption = (index) => {
    if (pollForm.options.length <= 2) {
      notification.warning('A poll must have at least two options');
      return;
    }
    
    const newOptions = pollForm.options.filter((_, i) => i !== index);
    setPollForm({ ...pollForm, options: newOptions });
  };

  const handleRespondToPoll = async (pollId, optionId) => {
    try {
      await axios.post(
        `${API_URL}/virtual-sessions/${sessionId}/poll/${pollId}/respond`,
        { optionId },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      notification.success('Response submitted');
      
      // Refresh polls
      fetchPolls();
    } catch (error) {
      console.error('Error responding to poll:', error);
      notification.error(error.response?.data?.message || 'Failed to submit response');
    }
  };

  const handleEndPoll = async (pollId) => {
    try {
      await axios.post(
        `${API_URL}/virtual-sessions/${sessionId}/poll/${pollId}/end`,
        {},
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      notification.success('Poll ended');
      
      // Refresh polls
      fetchPolls();
    } catch (error) {
      console.error('Error ending poll:', error);
      notification.error(error.response?.data?.message || 'Failed to end poll');
    }
  };

  // Render a poll item
  const renderPollItem = (poll, isActive = true) => {
    // Check if user has already responded to this poll
    const hasResponded = poll.userResponseIds && poll.userResponseIds.length > 0;
    
    return (
      <div key={poll.id} className={`poll-item ${isActive ? 'active' : 'closed'}`}>
        <div className="poll-header">
          <h3>{poll.question}</h3>
          {poll.isAnonymous && <span className="anonymous-badge">Anonymous</span>}
          {isInstructor && isActive && (
            <button 
              className="end-poll-button" 
              onClick={() => handleEndPoll(poll.id)}
              disabled={isLoading}
            >
              End Poll
            </button>
          )}
        </div>
        
        <div className="poll-options">
          {poll.options.map(option => {
            // Check if this is a selected option for the user
            const isSelected = poll.userResponseIds && poll.userResponseIds.includes(option.id);
            
            const progressWidth = poll.totalResponses > 0 
              ? `${option.percentage}%` 
              : '0%';
            
            return (
              <div key={option.id} className="poll-option">
                <div 
                  className={`option-content ${isSelected ? 'selected' : ''} ${!isActive || hasResponded ? 'disabled' : ''}`}
                  onClick={() => isActive && !hasResponded && handleRespondToPoll(poll.id, option.id)}
                >
                  <div className="option-text">{option.option_text}</div>
                  
                  {(hasResponded || !isActive) && (
                    <div className="option-progress">
                      <div 
                        className="progress-bar" 
                        style={{ width: progressWidth }}
                      ></div>
                      <div className="progress-text">
                        {option.count} votes ({option.percentage}%)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="poll-footer">
          {hasResponded ? (
            <div className="response-status">You've responded to this poll</div>
          ) : isActive ? (
            <div className="response-prompt">Click an option to respond</div>
          ) : (
            <div className="response-status">This poll has ended</div>
          )}
          
          <div className="total-responses">
            Total responses: {poll.totalResponses}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="session-polls-container">
      {isInstructor && (
        <div className="polls-header">
          <h2>Polls</h2>
          {!showCreateForm ? (
            <button 
              className="create-poll-button"
              onClick={() => setShowCreateForm(true)}
            >
              Create New Poll
            </button>
          ) : (
            <button 
              className="cancel-button"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
          )}
        </div>
      )}
      
      {/* Create Poll Form */}
      {showCreateForm && (
        <div className="create-poll-form">
          <form onSubmit={handleCreatePoll}>
            <div className="form-group">
              <label htmlFor="question">Question</label>
              <input
                type="text"
                id="question"
                value={pollForm.question}
                onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })}
                placeholder="Enter your question"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Options</label>
              {pollForm.options.map((option, index) => (
                <div key={index} className="option-input">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    required
                  />
                  <button 
                    type="button" 
                    className="remove-option-button"
                    onClick={() => handleRemoveOption(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              
              <button 
                type="button" 
                className="add-option-button"
                onClick={handleAddOption}
              >
                + Add Option
              </button>
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={pollForm.isAnonymous}
                  onChange={(e) => setPollForm({ ...pollForm, isAnonymous: e.target.checked })}
                />
                Anonymous Poll (don't show who voted for what)
              </label>
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={pollForm.isMultipleChoice}
                  onChange={(e) => setPollForm({ ...pollForm, isMultipleChoice: e.target.checked })}
                />
                Allow multiple choices
              </label>
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-poll-button"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Poll'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Active Polls */}
      {activePolls.length > 0 && (
        <div className="active-polls-section">
          <h3>Active Polls</h3>
          {activePolls.map(poll => renderPollItem(poll))}
        </div>
      )}
      
      {/* Closed Polls */}
      {closedPolls.length > 0 && (
        <div className="closed-polls-section">
          <h3>Closed Polls</h3>
          {closedPolls.slice(0, 5).map(poll => renderPollItem(poll, false))}
          
          {closedPolls.length > 5 && (
            <div className="more-polls-message">
              {closedPolls.length - 5} more polls not shown
            </div>
          )}
        </div>
      )}
      
      {/* Empty State */}
      {activePolls.length === 0 && closedPolls.length === 0 && !showCreateForm && (
        <div className="no-polls-message">
          {isInstructor ? (
            <p>No polls created yet. Create a poll to get audience feedback.</p>
          ) : (
            <p>No polls available yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

SessionPoll.propTypes = {
  sessionId: PropTypes.string.isRequired,
  isInstructor: PropTypes.bool
};

SessionPoll.defaultProps = {
  isInstructor: false
};

export default SessionPoll;