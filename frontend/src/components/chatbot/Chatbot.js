// src/components/chatbot/Chatbot.js
import React, { useState, useRef, useEffect } from 'react';
import { FaRobot, FaTimes, FaTrash, FaPaperPlane } from 'react-icons/fa';
import { useChatbot } from '../../context/ChatbotContext';
import ChatbotMessage from './ChatbotMessage';
import './Chatbot.css';

const Chatbot = () => {
  const { 
    messages, 
    isOpen, 
    isLoading, 
    error, 
    toggleChatbot, 
    sendMessage, 
    clearMessages 
  } = useChatbot();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Focus input field when chatbot opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput('');
    }
  };
  
  // If chatbot is closed, only show the toggle button
  if (!isOpen) {
    return (
      <button className="chatbot-toggle-button" onClick={toggleChatbot}>
        <FaRobot size={24} />
      </button>
    );
  }
  
  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="chatbot-title">
          <FaRobot size={20} />
          <span>AI Assistant</span>
        </div>
        <div className="chatbot-controls">
          {messages.length > 0 && (
            <button 
              className="chatbot-clear-button" 
              onClick={clearMessages}
              title="Clear conversation"
            >
              <FaTrash size={16} />
            </button>
          )}
          <button 
            className="chatbot-close-button" 
            onClick={toggleChatbot}
            title="Close chatbot"
          >
            <FaTimes size={18} />
          </button>
        </div>
      </div>
      
      <div className="chatbot-messages">
        {messages.length === 0 ? (
          <div className="empty-chat-message">
            <FaRobot size={40} />
            <p>Hi! I'm your AI assistant. How can I help you with the LMS today?</p>
          </div>
        ) : (
          messages.map(message => (
            <ChatbotMessage key={message.id} message={message} />
          ))
        )}
        
        {isLoading && (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        
        {error && !messages.some(msg => msg.isError) && (
          <div className="chatbot-error">
            <p>{error}</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chatbot-input-container" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          ref={inputRef}
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isLoading}
          className="chatbot-send-button"
        >
          <FaPaperPlane size={16} />
        </button>
      </form>
    </div>
  );
};

export default Chatbot;