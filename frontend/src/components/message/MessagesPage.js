import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './MessagesPage.css';
import Sidebar from '../common/Sidebar';
import AuthContext from '../../context/AuthContext';

const MessagesPage = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const { auth } = useContext(AuthContext);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // Updated useEffect for component cleanup
  useEffect(() => {
    fetchRecentConversations();
    
    // Initialize WebSocket connection
    if (auth?.token) {
      initializeSocket();
    }

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up MessagesPage component...');
      
      if (socketRef.current) {
        // Clear ping interval if exists
        if (socketRef.current.pingInterval) {
          clearInterval(socketRef.current.pingInterval);
        }
        
        // Remove all listeners to prevent memory leaks
        socketRef.current.removeAllListeners();
        
        // Disconnect socket
        socketRef.current.disconnect();
        
        console.log('✅ Socket cleaned up successfully');
      }
    };
  }, [auth?.token]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fixed initializeSocket function
  const initializeSocket = () => {
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    console.log('🔌 Initializing socket connection...');
    console.log('🔑 Using token:', auth.token ? 'Token present' : 'No token');

    // Create socket connection with JWT token
    socketRef.current = io('http://localhost:5000', {
      auth: {
        token: auth.token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: true,
    });

    // Listen for connection
    socketRef.current.on('connect', () => {
      console.log('✅ Connected to WebSocket server, Socket ID:', socketRef.current.id);
    });

    // Listen for successful authentication with proper data handling
    socketRef.current.on('connected', (data) => {
      console.log('✅ Authenticated successfully:', data);
      console.log('👤 User ID:', data.userId);
      console.log('📧 Email:', data.email);
      console.log('🏠 Room:', data.room);
    });

    // Listen for connection errors
    socketRef.current.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      console.error('🔍 Error details:', error);
    });

    // Better error handling with more details
    socketRef.current.on('error', (error) => {
      console.error('❌ Socket error:', error.message);
      console.error('🔍 Error details:', error.details);
      
      if (error.message.includes('token') || error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
        console.log('🔄 Authentication issue detected');
        console.log('🔑 Current token:', auth.token ? 'Present' : 'Missing');
      }
    });

    // Listen for disconnect
    socketRef.current.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
      
      if (reason === 'io server disconnect') {
        console.log('🔄 Server disconnected us - may be auth issue');
      }
    });

    // Listen for reconnection events
    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('✅ Reconnected after', attemptNumber, 'attempts');
      fetchRecentConversations();
    });

    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt:', attemptNumber);
    });

    socketRef.current.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error.message);
    });

    socketRef.current.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after maximum attempts');
    });

    // 🔧 FIX: Improved receive_message handler
    socketRef.current.on('receive_message', (message) => {
      console.log('📨 Received new message:', message);
      
      // Always update conversations first
      updateConversationsWithNewMessage(message);
      
      // Only update messages if this conversation is currently active
      if (selectedUser) {
        const isRelevantMessage = (message.sender.id === selectedUser.id && message.receiver.id === auth.user.id) ||
                                 (message.sender.id === auth.user.id && message.receiver.id === selectedUser.id);
        
        if (isRelevantMessage) {
          setMessages(prevMessages => {
            // Remove any optimistic messages with same content from same sender
            const filteredMessages = prevMessages.filter(msg => {
              if (msg.isOptimistic && 
                  msg.sender.id === message.sender.id && 
                  msg.content === message.content) {
                return false; // Remove optimistic message
              }
              return true;
            });
            
            // Check if this exact message already exists
            const messageExists = filteredMessages.some(msg => 
              msg.id === message.id || 
              (msg.content === message.content && 
               msg.sender.id === message.sender.id && 
               Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 2000)
            );
            
            if (!messageExists) {
              console.log('➕ Adding new message to chat');
              return [...filteredMessages, message];
            }
            console.log('⚠️ Message already exists, skipping');
            return filteredMessages;
          });
        }
      }
    });

    // 🔧 FIX: Improved message_sent handler
    socketRef.current.on('message_sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
      
      // Replace optimistic message with real message if we have the full message data
      if (data.message && selectedUser) {
        setMessages(prevMessages => {
          // Remove optimistic messages
          const filteredMessages = prevMessages.filter(msg => !msg.isOptimistic);
          
          // Check if real message already exists
          const messageExists = filteredMessages.some(msg => msg.id === data.message.id);
          
          if (!messageExists) {
            return [...filteredMessages, data.message];
          }
          return filteredMessages;
        });
      } else {
        // Fallback: just remove optimistic messages
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.isOptimistic ? { ...msg, isOptimistic: false } : msg
          )
        );
      }
    });

    // Listen for room join confirmation
    socketRef.current.on('joined_room', (data) => {
      console.log('✅ Successfully joined room:', data.room);
    });

    // Listen for user online/offline status
    socketRef.current.on('user_online', (userId) => {
      console.log(`👤 User ${userId} is online`);
    });

    socketRef.current.on('user_offline', (userId) => {
      console.log(`👤 User ${userId} is offline`);
    });

    // Improved ping/pong with better logging
    const pingInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, 30000);

    socketRef.current.on('pong', (data) => {
      console.log('🏓 Pong received:', data?.timestamp || 'connection alive');
    });

    // Store interval reference for cleanup
    socketRef.current.pingInterval = pingInterval;

    // Add debug helper
    socketRef.current.on('online_users', (users) => {
      console.log('👥 Online users:', users);
    });

    // Optional: Request online users list after connection
    setTimeout(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('get_online_users');
      }
    }, 1000);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRecentConversations = async () => {
    try {
      const res = await axios.get('/messages/recent', {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });
      console.log('Recent conversations:', res.data);
      setConversations(res.data);
    } catch (err) {
      console.error('Error fetching recent messages:', err.response?.data || err.message);
      setConversations([]);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const res = await axios.get(`/messages/with/${userId}`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });
      setMessages(res.data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(`/users/search-basic?query=${value}`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    fetchMessages(user.id);
    setSearchResults([]);
    setSearchTerm('');
    
    // Update conversations list to include this new chat if not exists
    updateConversationsWithNewUser(user);
  };

  // 🔧 FIX: Enhanced updateConversationsWithNewMessage function
  const updateConversationsWithNewMessage = (message) => {
    setConversations(prevConversations => {
      const otherUserId = message.sender.id === auth.user.id ? message.receiver.id : message.sender.id;
      const otherUser = message.sender.id === auth.user.id ? message.receiver : message.sender;
      
      // Remove existing conversation with this user
      const filteredConversations = prevConversations.filter(chat => {
        // 🔧 FIX: Better logic to identify the other user in conversation
        const chatOtherUser = chat.sender?.id === auth.user.id ? chat.receiver : chat.sender;
        return chatOtherUser?.id !== otherUserId;
      });
      
      // Create new conversation at the top with latest message
      const newConversation = {
        id: message.id,
        sender: message.sender,
        receiver: message.receiver,
        content: message.content,
        createdAt: message.createdAt,
        isPlaceholder: false,
        // 🔧 FIX: Properly set the other user and last message info
        otherUser: otherUser,
        lastMessageSender: message.sender,
        lastMessageTime: message.createdAt,
        // 🔧 FIX: Add additional properties for better display
        lastMessageContent: message.content,
        isFromCurrentUser: message.sender.id === auth.user.id
      };
      
      return [newConversation, ...filteredConversations];
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return date.toLocaleDateString();
  };

  const updateConversationsWithNewUser = (user) => {
    const existingConversation = conversations.find(chat => {
      const other = chat.sender?.id === auth.user.id ? chat.receiver : chat.sender;
      return other?.id === user.id;
    });

    if (!existingConversation) {
      // Create a placeholder conversation entry
      const newConversation = {
        id: `temp_${user.id}`,
        sender: auth.user,
        receiver: user,
        content: 'Start a conversation...',
        createdAt: new Date().toISOString(),
        isPlaceholder: true,
        otherUser: user,
        lastMessageSender: null,
        lastMessageTime: new Date().toISOString()
      };
      setConversations(prev => [newConversation, ...prev]);
    }
  };

  // 🔧 FIX: Improved handleSend function
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    
    const messageContent = newMessage.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    
    try {
      // Send via WebSocket instead of HTTP
      if (socketRef.current && socketRef.current.connected) {
        console.log('📤 Sending message via WebSocket...');
        
        // 🔧 FIX: Create optimistic message immediately for better UX
        const optimisticMessage = {
          id: tempId,
          content: messageContent,
          sender: auth.user,
          receiver: selectedUser,
          createdAt: new Date().toISOString(),
          isOptimistic: true
        };
        
        // Add optimistic message to UI immediately
        setMessages(prevMessages => [...prevMessages, optimisticMessage]);
        
        // Clear message input immediately
        setNewMessage('');
        
        // Send via WebSocket
        socketRef.current.emit('send_message', {
          message: {
            receiverId: selectedUser.id,
            content: messageContent
          }
        });
        
        // 🔧 FIX: Create optimistic conversation update
        const optimisticConversationMessage = {
          id: tempId,
          content: messageContent,
          sender: auth.user,
          receiver: selectedUser,
          createdAt: new Date().toISOString(),
          isOptimistic: true
        };
        
        updateConversationsWithNewMessage(optimisticConversationMessage);
        
      } else {
        console.log('📤 Sending message via HTTP (WebSocket not connected)...');
        
        // Fallback to HTTP if WebSocket is not connected
        const response = await axios.post('/messages', {
          receiverId: selectedUser.id,
          content: messageContent
        }, {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        });
        
        // Clear message input
        setNewMessage('');
        
        // Add message to UI
        setMessages(prevMessages => [...prevMessages, response.data]);
        
        // Update conversations
        updateConversationsWithNewMessage(response.data);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      
      // If there was an error, remove the optimistic message
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== tempId)
      );
      
      // Also remove from conversations
      setConversations(prevConversations => 
        prevConversations.filter(conv => conv.id !== tempId)
      );
      
      // Show error message to user
      alert('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // 🔧 FIX: Enhanced function to get display info for conversation
  const getConversationDisplayInfo = (chat) => {
    // Determine the other user in the conversation
    const other = chat.sender?.id === auth.user.id ? chat.receiver : chat.sender;
    
    // Get the last message info with fallbacks
    const lastMessageSender = chat.lastMessageSender || chat.sender;
    const lastMessage = chat.lastMessageContent || chat.content || 'No messages yet';
    const lastMessageTime = chat.lastMessageTime || chat.createdAt;
    
    // Determine if the last message was from current user
    const isFromCurrentUser = lastMessageSender?.id === auth.user.id;
    
    // Get sender name with fallbacks
    const senderName = lastMessageSender?.first_name || 
                      lastMessageSender?.name || 
                      lastMessageSender?.email?.split('@')[0] || 
                      'Unknown';
    
    return {
      user: other || { first_name: 'Unknown', last_name: 'User', email: 'unknown@example.com' },
      lastMessage: lastMessage,
      lastMessageTime: lastMessageTime,
      isFromCurrentUser: isFromCurrentUser,
      isPlaceholder: chat.isPlaceholder || false,
      senderName: senderName,
      senderEmail: lastMessageSender?.email || 'unknown@example.com'
    };
  };

  return (
    <div className="messages-page">
      <Sidebar activeItem="messages" />
      <div className="chat-wrapper">
        <div className="chat-sidebar">
          <div className="search-wrapper">
            <input
              className="chat-search"
              placeholder="Search users..."
              value={searchTerm}
              onChange={handleSearch}
            />

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="user-search-item"
                    onClick={() => handleSelectUser(user)}
                  >
                    <img src={user.avatar || '/default-avatar.png'} alt="avatar" className="avatar" />
                    <div className="user-info">
                      <strong>{user.first_name} {user.last_name}</strong>
                      <small>{user.email}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="recent-chats">
            <h3 className="recent-chats-title">Recent Chats</h3>
            {conversations.length === 0 ? (
              <div className="no-conversations">
                <p>No conversations yet. Search for users above to start chatting!</p>
              </div>
            ) : (
              conversations.map((chat) => {
                const displayInfo = getConversationDisplayInfo(chat);
                const isSelected = selectedUser && selectedUser.id === displayInfo.user.id;
                
                return (
                  <div 
                    key={chat.id} 
                    className={`chat-user-item ${isSelected ? 'selected' : ''}`} 
                    onClick={() => handleSelectUser(displayInfo.user)}
                  >
                    <div className="chat-avatar-container">
                      <img 
                        src={displayInfo.user.avatar || '/default-avatar.png'} 
                        alt="avatar" 
                        className="avatar" 
                      />
                      <div className="status-indicator online"></div>
                    </div>
                    <div className="chat-info">
                      <div className="chat-header-info">
                        <div className="user-details">
                          <strong className="user-name">
                            {displayInfo.user.first_name || 'Unknown'} {displayInfo.user.last_name || 'User'}
                          </strong>
                          <small className="user-email">
                            {displayInfo.user.email || 'unknown@example.com'}
                          </small>
                        </div>
                        <span className="message-time">
                          {formatTime(displayInfo.lastMessageTime)}
                        </span>
                      </div>
                      <div className="last-message">
                        <div className="message-content">
                          {!displayInfo.isPlaceholder && (
                            <span className="message-sender">
                              {displayInfo.isFromCurrentUser ? 'You: ' : `${displayInfo.senderName}: `}
                            </span>
                          )}
                          <span className={`message-preview ${displayInfo.isPlaceholder ? 'placeholder' : ''}`}>
                            {displayInfo.lastMessage.length > 35 
                              ? `${displayInfo.lastMessage.slice(0, 35)}...` 
                              : displayInfo.lastMessage}
                          </span>
                        </div>
                        {!displayInfo.isPlaceholder && !displayInfo.isFromCurrentUser && (
                          <div className="unread-indicator"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="chat-window">
          {selectedUser ? (
            <>
              <div className="chat-header">
                <div className="chat-header-info">
                  <div className="selected-user-details">
                    <img 
                      src={selectedUser.avatar || '/default-avatar.png'} 
                      alt="avatar" 
                      className="header-avatar" 
                    />
                    <div className="user-info">
                      <h3>{selectedUser.first_name} {selectedUser.last_name}</h3>
                      <small>{selectedUser.email}</small>
                    </div>
                  </div>
                  <span className="connection-status">
                    {socketRef.current?.connected ? '🟢 Online' : '🔴 Offline'}
                  </span>
                </div>
              </div>
              <div className="chat-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message-bubble ${msg.sender.id === auth.user.id ? 'sent' : 'received'} ${msg.isOptimistic ? 'optimistic' : ''}`}
                  >
                    <div className="message-content">
                      <p>{msg.content}</p>
                      <div className="message-meta">
                        <span className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                        {msg.isOptimistic && (
                          <span className="sending-indicator">Sending...</span>
                        )}
                        {msg.sender.id !== auth.user.id && (
                          <span className="message-sender-info">
                            {msg.sender.first_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="chat-input-area">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="chat-input"
                />
                <button onClick={handleSend} className="send-button">Send</button>
              </div>
            </>
          ) : (
            <div className="chat-placeholder">
              <div className="placeholder-content">
                <h3>Welcome to Messages</h3>
                <p>Select a conversation to start chatting or search for users to begin a new conversation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;