// src/components/chatbot/ChatbotMessage.js
import React from 'react';
import ReactMarkdown from 'react-markdown';
import './Chatbot.css';

const ChatbotMessage = ({ message }) => {
  const { role, content, timestamp, isError, model } = message;
  
  // Format timestamp for display
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className={`chatbot-message ${role}-message ${isError ? 'error-message' : ''}`}>
      <div className="message-header">
        <span className="message-sender">
          {role === 'user' ? 'You' : role === 'assistant' ? 'AI Assistant' : 'System'}
        </span>
        <span className="message-time">{formatTime(timestamp)}</span>
      </div>
      
      <div className="message-content">
        {role === 'assistant' ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <p>{content}</p>
        )}
      </div>
      
      {model && (
        <div className="message-footer">
          <span className="model-info">Powered by {model}</span>
        </div>
      )}
    </div>
  );
};

export default ChatbotMessage;