// src/components/course/DiscussionForum.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import AuthContext from '../../context/AuthContext';
import './DiscussionForum.css';

const DiscussionForum = ({ courseId }) => {
  const { auth } = useContext(AuthContext);
  const [discussions, setDiscussions] = useState([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  
  const API_URL = config.apiUrl;
  const isInstructor = auth.user.role === 'instructor' || auth.user.role === 'admin';

  // Fetch discussions
  useEffect(() => {
    const fetchDiscussions = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/courses/${courseId}/discussions`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        setDiscussions(response.data);
        
        // Select the first discussion by default if there is one
        if (response.data.length > 0 && !selectedDiscussion) {
          setSelectedDiscussion(response.data[0].id);
          fetchPosts(response.data[0].id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching discussions:', error);
        notification.error('Failed to load discussions');
        setIsLoading(false);
      }
    };

    fetchDiscussions();
  }, [courseId, auth.token, API_URL, selectedDiscussion]);

  // Fetch posts for a discussion
  const fetchPosts = async (discussionId) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/courses/${courseId}/discussions/${discussionId}/posts`, 
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      // Organize posts in a hierarchical structure
      const parentPosts = response.data.filter(post => !post.parent_post_id);
      const childPosts = response.data.filter(post => post.parent_post_id);
      
      // Attach child posts to their parents
      const organizedPosts = parentPosts.map(parent => {
        const children = childPosts.filter(child => child.parent_post_id === parent.id);
        return { ...parent, replies: children };
      });
      
      setPosts(organizedPosts);
      setSelectedDiscussion(discussionId);
    } catch (error) {
      console.error('Error fetching discussion posts:', error);
      notification.error('Failed to load discussion posts');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new discussion
  const handleCreateDiscussion = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      notification.warning('Please enter a discussion title');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/courses/${courseId}/discussions`,
        {
          title: formData.title,
          description: formData.description
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      // Add the new discussion to the state
      const newDiscussion = {
        id: response.data.discussionId,
        title: formData.title,
        description: formData.description,
        created_by: auth.user.id,
        created_at: new Date().toISOString(),
        user: {
          first_name: auth.user.firstName,
          last_name: auth.user.lastName
        }
      };
      
      setDiscussions([...discussions, newDiscussion]);
      setSelectedDiscussion(response.data.discussionId);
      
      // Reset form and close modal
      setFormData({ title: '', description: '' });
      setShowCreateModal(false);
      
      notification.success('Discussion created successfully');
      
      // Fetch the newly created discussion's posts
      fetchPosts(response.data.discussionId);
    } catch (error) {
      console.error('Error creating discussion:', error);
      notification.error('Failed to create discussion');
    }
  };

  // Create a new post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    if (!replyContent.trim()) {
      notification.warning('Please enter your message');
      return;
    }
    
    try {
      const payload = {
        content: replyContent,
        parentPostId: replyingTo
      };
      
      const response = await axios.post(
        `${API_URL}/courses/${courseId}/discussions/${selectedDiscussion}/posts`,
        payload,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      // Refresh posts after posting
      fetchPosts(selectedDiscussion);
      
      // Clear input fields
      setReplyContent('');
      setReplyingTo(null);
      
      notification.success('Your message has been posted');
    } catch (error) {
      console.error('Error creating post:', error);
      notification.error('Failed to post your message');
    }
  };

  // Start replying to a specific post
  const handleReplyTo = (postId) => {
    setReplyingTo(postId);
    // Focus on the reply input
    document.getElementById('reply-input').focus();
  };

  // Cancel replying
  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="discussion-forum-container">
      <div className="forum-header">
        <h2>Discussion Forum</h2>
        {isInstructor && (
          <button 
            className="create-discussion-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <span className="btn-icon">+</span>
            Create New Discussion
          </button>
        )}
      </div>
      
      <div className="forum-content">
        <div className="discussion-list">
          <div className="discussion-list-header">
            <h3>Topics</h3>
            <div className="discussion-count">
              {discussions.length} discussion{discussions.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {discussions.length > 0 ? (
            <ul className="discussions">
              {discussions.map(discussion => (
                <li 
                  key={discussion.id} 
                  className={`discussion-item ${selectedDiscussion === discussion.id ? 'active' : ''}`}
                  onClick={() => fetchPosts(discussion.id)}
                >
                  <div className="discussion-item-title">{discussion.title}</div>
                  <div className="discussion-item-meta">
                    <span>Created by: {discussion.user?.first_name} {discussion.user?.last_name}</span>
                    <span>{formatDate(discussion.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-discussions">
              <p>No discussions have been created yet.</p>
              {isInstructor && (
                <button 
                  className="start-discussion-btn"
                  onClick={() => setShowCreateModal(true)}
                >
                  Start the first discussion
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="posts-container">
          {selectedDiscussion ? (
            isLoading ? (
              <div className="loading-posts">Loading discussion...</div>
            ) : (
              <>
                <div className="discussion-header">
                  <h3>
                    {discussions.find(d => d.id === selectedDiscussion)?.title}
                  </h3>
                  {discussions.find(d => d.id === selectedDiscussion)?.description && (
                    <div className="discussion-description">
                      {discussions.find(d => d.id === selectedDiscussion)?.description}
                    </div>
                  )}
                </div>
                
                <div className="posts-list">
                  {posts.length > 0 ? (
                    posts.map(post => (
                      <div key={post.id} className="post-thread">
                        <div className="post-item">
                          <div className="post-header">
                            <span className="post-author">{post.user?.first_name} {post.user?.last_name}</span>
                            <span className="post-date">{formatDate(post.created_at)}</span>
                          </div>
                          <div className="post-content">{post.content}</div>
                          <div className="post-actions">
                            <button 
                              className="reply-btn"
                              onClick={() => handleReplyTo(post.id)}
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                        
                        {post.replies && post.replies.length > 0 && (
                          <div className="post-replies">
                            {post.replies.map(reply => (
                              <div key={reply.id} className="reply-item">
                                <div className="post-header">
                                  <span className="post-author">{reply.user?.first_name} {reply.user?.last_name}</span>
                                  <span className="post-date">{formatDate(reply.created_at)}</span>
                                </div>
                                <div className="post-content">{reply.content}</div>
                                <div className="post-actions">
                                  <button 
                                    className="reply-btn"
                                    onClick={() => handleReplyTo(post.id)} // Reply to parent post
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="empty-posts">
                      <p>No posts yet. Be the first to share your thoughts!</p>
                    </div>
                  )}
                </div>
                
                <div className="reply-form">
                  {replyingTo && (
                    <div className="replying-to">
                      <span>Replying to a message</span>
                      <button 
                        className="cancel-reply-btn"
                        onClick={handleCancelReply}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  
                  <form onSubmit={handleCreatePost}>
                    <textarea
                      id="reply-input"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write your message here..."
                      rows="3"
                    ></textarea>
                    <button 
                      type="submit" 
                      className="post-btn"
                      disabled={!replyContent.trim()}
                    >
                      Post Message
                    </button>
                  </form>
                </div>
              </>
            )
          ) : (
            <div className="select-discussion">
              {discussions.length > 0 ? 
                'Select a discussion from the list to view posts' : 
                'No discussions available yet'
              }
            </div>
          )}
        </div>
      </div>
      
      {/* Create Discussion Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Discussion</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateDiscussion}>
              <div className="form-group">
                <label htmlFor="title">Discussion Title*</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter a title for this discussion"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Provide a brief description to help students understand what to discuss"
                  rows="4"
                ></textarea>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={!formData.title.trim()}
                >
                  Create Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscussionForum;