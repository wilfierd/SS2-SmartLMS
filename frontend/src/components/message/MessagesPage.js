import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
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

  useEffect(() => {
    fetchRecentConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRecentConversations = async () => {
    try {
      const res = await axios.get('/messages/recent');
      setConversations(res.data);
    } catch (err) {
      console.error('Error fetching recent messages:', err);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const res = await axios.get(`/messages/with/${userId}`);
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
      const res = await axios.get(`/users/search-basic?query=${value}`);
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
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    try {
      await axios.post('/messages', {
        receiverId: selectedUser.id,
        content: newMessage
      });
      setNewMessage('');
      fetchMessages(selectedUser.id);
    } catch (err) {
      console.error('Error sending message:', err);
    }
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
            {conversations.map((chat) => {
              const other = chat.sender.id === auth.user.id ? chat.receiver : chat.sender;
              return (
                <div key={chat.id} className="chat-user-item" onClick={() => handleSelectUser(other)}>
                  <img src={other.avatar || '/default-avatar.png'} alt="avatar" className="avatar" />
                  <div>
                    <strong>{other.first_name} {other.last_name}</strong>
                    <p>{chat.content.slice(0, 30)}...</p>
                    <span>{new Date(chat.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chat-window">
          {selectedUser ? (
            <>
              <div className="chat-header">
                Chatting with {selectedUser.first_name} {selectedUser.last_name}
              </div>
              <div className="chat-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message-bubble ${msg.sender.id === auth.user.id ? 'sent' : 'received'}`}
                  >
                    <p>{msg.content}</p>
                    <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
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
                  className="chat-input"
                />
                <button onClick={handleSend} className="send-button">Send</button>
              </div>
            </>
          ) : (
            <div className="chat-placeholder">Select a conversation to start chatting.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
