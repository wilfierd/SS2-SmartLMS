// src/context/ChatbotContext.js
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import chatbotConfig from '../config/chatbot';
import AuthContext from './AuthContext';

const ChatbotContext = createContext();

export const ChatbotProvider = ({ children }) => {
  const { auth } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load messages from localStorage on initial render
  useEffect(() => {
    if (auth.isAuthenticated) {
      const savedMessages = localStorage.getItem(`chatMessages_${auth.user.id}`);
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (err) {
          console.error('Error parsing saved messages:', err);
          // Clear corrupted messages
          localStorage.removeItem(`chatMessages_${auth.user.id}`);
        }
      }
    }
  }, [auth.isAuthenticated, auth.user?.id]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (auth.isAuthenticated && messages.length > 0) {
      localStorage.setItem(`chatMessages_${auth.user.id}`, JSON.stringify(messages));
    }
  }, [messages, auth.isAuthenticated, auth.user?.id]);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  const clearMessages = () => {
    setMessages([]);
    if (auth.isAuthenticated) {
      localStorage.removeItem(`chatMessages_${auth.user.id}`);
    }
  };

  const sendMessage = useCallback(async (messageText) => {
    setError(null);
    
    // Add user message to the list
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      // Create message history in the format expected by OpenRouter API
      const messageHistory = [
        {
          role: 'system',
          content: chatbotConfig.defaultSystemPrompt
        },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: messageText
        }
      ];

      // Call OpenRouter API
      const response = await axios.post(
        chatbotConfig.apiUrl,
        {
          model: chatbotConfig.modelId,
          messages: messageHistory,
          temperature: chatbotConfig.temperature,
          max_tokens: chatbotConfig.maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${chatbotConfig.openRouterApiKey}`,
            'HTTP-Referer': chatbotConfig.referer,
          }
        }
      );

      // Extract AI response from API response
      const aiResponse = response.data.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
      
      // Add AI response to the list
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        model: chatbotConfig.modelName
      };
      
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (err) {
      console.error('Error sending message to AI:', err);
      setError('Failed to get a response from the AI. Please try again.');
      
      // Add error message
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: 'Failed to get a response. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const value = {
    messages,
    isOpen,
    isLoading,
    error,
    toggleChatbot,
    sendMessage,
    clearMessages
  };

  return (
    <ChatbotContext.Provider value={value}>
      {children}
    </ChatbotContext.Provider>
  );
};

export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
};

export default ChatbotContext;