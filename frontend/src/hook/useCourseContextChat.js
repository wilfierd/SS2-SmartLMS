// src/hooks/useCourseContextChat.js
import { useEffect, useContext } from 'react';
import { useChatbot } from '../context/ChatbotContext';
import AuthContext from '../context/AuthContext';

/**
 * A custom hook that enhances the chatbot with course-specific context
 * 
 * @param {Object} courseData - Current course data
 * @returns {Object} - The enhanced chatbot methods
 */
const useCourseContextChat = (courseData) => {
  const { auth } = useContext(AuthContext);
  const { messages, sendMessage, isOpen, toggleChatbot } = useChatbot();

  // Helper function to add course context
  const askAboutCourse = () => {
    if (!courseData) return;
    
    // Create a prompt with course context
    const contextPrompt = `I'd like to ask about the course "${courseData.title}" (Code: ${courseData.code}). 
    The instructor is ${courseData.instructor}. 
    This is a ${courseData.status} course that runs from ${courseData.startDate || 'unspecified'} to ${courseData.endDate || 'unspecified'}.`;
    
    // Open chatbot if closed
    if (!isOpen) {
      toggleChatbot();
    }
    
    // Send the message with course context
    sendMessage(contextPrompt);
  };

  // Helper to ask about assignments
  const askAboutAssignments = () => {
    if (!courseData) return;
    
    const assignmentPrompt = `I want to know about the assignments for the course "${courseData.title}" (${courseData.code}). 
    What are the typical types of assignments, deadlines, and grading policies?`;
    
    if (!isOpen) {
      toggleChatbot();
    }
    
    sendMessage(assignmentPrompt);
  };

  // Helper to get help with course content
  const getHelpWithCourse = () => {
    if (!courseData) return;
    
    const helpPrompt = `I'm taking the course "${courseData.title}" (${courseData.code}) and need some help understanding the content better. 
    Can you provide me with additional learning resources or explain some core concepts from this subject area?`;
    
    if (!isOpen) {
      toggleChatbot();
    }
    
    sendMessage(helpPrompt);
  };

  return {
    // Original chatbot capabilities
    messages,
    sendMessage,
    isOpen,
    toggleChatbot,
    
    // Enhanced capabilities with course context
    askAboutCourse,
    askAboutAssignments,
    getHelpWithCourse
  };
};

export default useCourseContextChat;