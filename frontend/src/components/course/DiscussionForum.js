// DiscussionForum.js - Complete Version with Posts Support

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import config from '../../config';
import notification from '../../utils/notification';
import AuthContext from '../../context/AuthContext';
import './DiscussionForum.css';

const DiscussionForum = ({ courseId, selectedDiscussionId }) => {
  const { auth } = useContext(AuthContext);
  const [discussions, setDiscussions] = useState([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [discussionDetail, setDiscussionDetail] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [postContent, setPostContent] = useState('');

  const API_URL = config.apiUrl;
  const isInstructor = auth.user?.role === 'instructor' || auth.user?.role === 'admin';

  // Fetch discussions
  useEffect(() => {
    const fetchDiscussions = async () => {
      setIsLoading(true);
      setError(null);

      // Validate courseId
      if (!courseId || isNaN(parseInt(courseId))) {
        console.error(`Invalid courseId: ${courseId}`);
        setError('Invalid course ID. Please try again with a valid course.');
        setIsLoading(false);
        return;
      }

      try {
        const validCourseId = parseInt(courseId);
        console.log(`Fetching discussions for course ${validCourseId}`);

        const response = await axios.get(`${API_URL}/courses/${validCourseId}/discussions`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });

        console.log(`Successfully fetched ${response.data.length} discussions`);

        const discussionsData = response.data || []; setDiscussions(discussionsData);
        // Priority selection: selectedDiscussionId prop > current selection > first discussion
        if (selectedDiscussionId) {
          const discussionExists = discussionsData.find(d => d.id === parseInt(selectedDiscussionId));
          if (discussionExists && selectedDiscussion === null) {
            console.log(`🎯 Setting discussion from prop during fetch: ${selectedDiscussionId}`);
            setSelectedDiscussion(parseInt(selectedDiscussionId));
          }
        } else if (discussionsData.length > 0 && selectedDiscussion === null) {
          console.log(`🎯 Setting first discussion as default: ${discussionsData[0].id}`);
          setSelectedDiscussion(discussionsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching discussions:', error);

        if (error.response) {
          console.error('Response data:', error.response.data);
          setError(`Failed to load discussions: ${error.response.data.message || error.message}`);
        } else {
          setError('Unable to load discussions. Please try again later.');
        }

        notification.error('Failed to load discussions');
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId && auth.token) {
      fetchDiscussions();
    }
  }, [courseId, auth.token, API_URL]);  // Fetch posts when a discussion is selected
  useEffect(() => {
    console.log(`🔄 useEffect triggered - selectedDiscussion: ${selectedDiscussion}, courseId: ${courseId}`);

    const fetchDiscussionPosts = async () => {
      if (!selectedDiscussion || !courseId) {
        console.log(`⚠️ Skipping fetch - selectedDiscussion: ${selectedDiscussion}, courseId: ${courseId}`);
        return;
      }

      console.log(`🚀 Starting to fetch posts for discussion ${selectedDiscussion}`);
      setIsPostsLoading(true);
      try {
        const validCourseId = parseInt(courseId);
        const validDiscussionId = parseInt(selectedDiscussion);

        console.log(`🔍 Fetching discussion ${validDiscussionId} for course ${validCourseId}`);
        console.log(`📡 API URL: ${API_URL}/courses/${validCourseId}/discussions/${validDiscussionId}`);
        console.log(`🔑 Auth token present: ${!!auth.token}`);

        // Fetch discussion details with posts
        const response = await axios.get(
          `${API_URL}/courses/${validCourseId}/discussions/${validDiscussionId}`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );

        console.log(`✅ Discussion data received:`, response.data);
        setDiscussionDetail(response.data);
        setPosts(response.data.posts || []);
      } catch (error) {
        console.error('🚨 Error fetching discussion posts:', error);
        console.error('🚨 Error response:', error.response?.data);
        console.error('🚨 Error status:', error.response?.status);
        notification.error('Failed to load discussion posts');
      } finally {
        setIsPostsLoading(false);
      }
    };

    if (selectedDiscussion) {
      fetchDiscussionPosts();
    }
  }, [selectedDiscussion, courseId, auth.token, API_URL]);
  // Handle selectedDiscussionId prop changes - only set initially, don't override user navigation
  useEffect(() => {
    if (selectedDiscussionId && discussions.length > 0) {
      const discussionExists = discussions.find(d => d.id === parseInt(selectedDiscussionId));
      if (discussionExists && selectedDiscussion === null) {
        // Only set from prop if no discussion is currently selected
        console.log(`🎯 Setting initial discussion from prop: ${selectedDiscussionId}`);
        setSelectedDiscussion(parseInt(selectedDiscussionId));
      }
    }
  }, [selectedDiscussionId, discussions]); // Removed selectedDiscussion from dependencies

  // Create a new discussion
  const handleCreateDiscussion = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      notification.warning('Please enter a discussion title');
      return;
    }

    // Validate courseId
    if (!courseId || isNaN(parseInt(courseId))) {
      notification.error('Invalid course ID. Cannot create discussion.');
      return;
    }

    setIsLoading(true);

    try {
      const validCourseId = parseInt(courseId);

      const response = await axios.post(
        `${API_URL}/courses/${validCourseId}/discussions`,
        {
          title: formData.title.trim(),
          description: formData.description.trim() || null
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
        post_count: 0,
        first_name: auth.user.firstName || '',
        last_name: auth.user.lastName || '',
        createdBy: `${auth.user.firstName || ''} ${auth.user.lastName || ''}`.trim() || auth.user.email
      };

      setDiscussions([newDiscussion, ...discussions]);
      setSelectedDiscussion(response.data.discussionId);

      // Reset form and close modal
      setFormData({ title: '', description: '' });
      setShowCreateModal(false);

      notification.success('Discussion created successfully');
    } catch (error) {
      console.error('Error creating discussion:', error);

      if (error.response) {
        notification.error(`Failed to create discussion: ${error.response.data.message || 'Please try again.'}`);
      } else {
        notification.error('Failed to create discussion. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new post or reply
  const handleCreatePost = async (e) => {
    e.preventDefault();

    if (!postContent.trim()) {
      notification.warning('Please enter post content');
      return;
    }

    if (!selectedDiscussion || !courseId) {
      notification.error('Missing discussion or course information');
      return;
    }

    setIsPostsLoading(true);

    try {
      const validCourseId = parseInt(courseId);
      const validDiscussionId = parseInt(selectedDiscussion);

      const response = await axios.post(
        `${API_URL}/courses/${validCourseId}/discussions/${validDiscussionId}/posts`,
        {
          content: postContent.trim(),
          parentPostId: replyTo ? replyTo.id : null
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      // Update posts state
      if (replyTo) {
        // Find the parent post and add this reply
        const updatedPosts = posts.map(post => {
          if (post.id === replyTo.id) {
            return {
              ...post,
              replies: [...(post.replies || []), response.data.post]
            };
          }
          return post;
        });
        setPosts(updatedPosts);
      } else {
        // Add as a new top-level post
        setPosts([...posts, { ...response.data.post, replies: [] }]);
      }

      // Update post count in discussions list
      const updatedDiscussions = discussions.map(discussion => {
        if (discussion.id === validDiscussionId) {
          return {
            ...discussion,
            post_count: (discussion.post_count || 0) + 1
          };
        }
        return discussion;
      });
      setDiscussions(updatedDiscussions);

      // Reset form and close modal if needed
      setPostContent('');
      setReplyTo(null);
      setShowReplyModal(false);

      notification.success(replyTo ? 'Reply posted successfully' : 'Post created successfully');
    } catch (error) {
      console.error('Error creating post:', error);

      if (error.response) {
        notification.error(`Failed to create post: ${error.response.data.message || 'Please try again.'}`);
      } else {
        notification.error('Failed to create post. Please try again.');
      }
    } finally {
      setIsPostsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Unknown date';
    }
  };

  // Safely get creator name
  const getCreatorName = (discussion) => {
    if (!discussion) return 'Unknown';

    // Check all possible fields in order of preference
    if (discussion.createdBy) return discussion.createdBy;
    if (discussion.first_name || discussion.last_name)
      return `${discussion.first_name || ''} ${discussion.last_name || ''}`.trim();
    if (discussion.created_by === auth.user?.id) return 'You';

    return 'Unknown User';
  };

  // Handle reply to post
  const handleReplyClick = (post) => {
    setReplyTo(post);
    setShowReplyModal(true);
  };

  // Render a single post with replies
  const renderPost = (post) => {
    const isCurrentUser = post.user_id === auth.user?.id;

    return (
      <div
        key={post.id}
        className={`discussion-post ${isCurrentUser ? 'current-user-post' : ''}`}
      >
        <div className="post-header">
          <div className="post-author">{post.authorName || 'Unknown'}</div>
          <div className="post-date">{formatDate(post.created_at)}</div>
        </div>
        <div className="post-content">{post.content}</div>
        <div className="post-actions">
          <button
            className="reply-button"
            onClick={() => handleReplyClick(post)}
          >
            Reply
          </button>
        </div>

        {/* Replies */}
        {post.replies && post.replies.length > 0 && (
          <div className="post-replies">
            {post.replies.map(reply => (
              <div
                key={reply.id}
                className={`post-reply ${reply.user_id === auth.user?.id ? 'current-user-post' : ''}`}
              >
                <div className="post-header">
                  <div className="post-author">{reply.authorName || 'Unknown'}</div>
                  <div className="post-date">{formatDate(reply.created_at)}</div>
                </div>
                <div className="post-content">{reply.content}</div>
                <div className="post-actions">
                  <button
                    className="reply-button"
                    onClick={() => handleReplyClick(post)} // Reply to the parent post
                  >
                    Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="discussion-forum-container">
      <div className="forum-header">
        <h2>Discussion Forum</h2>
        <button
          className="create-discussion-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <span className="btn-icon">+</span>
          Create New Discussion
        </button>
      </div>

      {error && (
        <div className="discussion-error">
          <p>{error}</p>
          <p>Please try refreshing the page or contact support if the problem persists.</p>
        </div>
      )}

      <div className="forum-content">
        <div className="discussion-list">
          <div className="discussion-list-header">
            <h3>Topics</h3>
            <div className="discussion-count">
              {discussions.length} discussion{discussions.length !== 1 ? 's' : ''}
            </div>
          </div>

          {isLoading ? (
            <div className="discussions-loading">Loading discussions...</div>
          ) : discussions.length > 0 ? (
            <ul className="discussions">
              {discussions.map(discussion => (<li
                key={discussion.id}
                className={`discussion-item ${selectedDiscussion === discussion.id ? 'active' : ''}`} onClick={() => {
                  console.log(`🖱️ Clicked discussion: ${discussion.id}, current selected: ${selectedDiscussion}`);
                  if (selectedDiscussion !== discussion.id) {
                    // Clear previous discussion data to force refresh
                    setDiscussionDetail(null);
                    setPosts([]);
                    setSelectedDiscussion(discussion.id);
                  }
                }}
              >
                <div className="discussion-item-title">{discussion.title}</div>
                <div className="discussion-item-meta">
                  <span>By {getCreatorName(discussion)}</span>
                  <span>{formatDate(discussion.created_at)}</span>
                </div>
                <div className="discussion-item-stats">
                  <span>{discussion.post_count || 0} posts</span>
                  {discussion.is_locked && <span className="locked-tag">Locked</span>}
                </div>
              </li>
              ))}
            </ul>
          ) : (
            <div className="empty-discussions">
              <p>No discussions have been created yet.</p>
              <button
                className="start-discussion-btn"
                onClick={() => setShowCreateModal(true)}
              >
                Start the first discussion
              </button>
            </div>
          )}
        </div>

        <div className="posts-container">
          {selectedDiscussion ? (
            isPostsLoading && !discussionDetail ? (
              <div className="loading-posts">Loading discussion...</div>
            ) : discussionDetail ? (
              <>
                <div className="discussion-header">
                  <h3>{discussionDetail.title}</h3>
                  {discussionDetail.is_locked && (
                    <div className="locked-discussion-badge">
                      This discussion is locked
                    </div>
                  )}
                  {discussionDetail.description && (
                    <div className="discussion-description">
                      {discussionDetail.description}
                    </div>
                  )}
                  <div className="discussion-meta">
                    Started by {getCreatorName(discussionDetail)} · {formatDate(discussionDetail.created_at)}
                  </div>
                </div>

                {/* Post creation form */}
                {!discussionDetail.is_locked && (
                  <div className="create-post-form">
                    <h4>Add to the discussion</h4>
                    <form onSubmit={handleCreatePost}>
                      <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Write your thoughts here..."
                        rows="3"
                        required
                      ></textarea>
                      <button
                        type="submit"
                        className="post-btn"
                        disabled={isPostsLoading || !postContent.trim()}
                      >
                        {isPostsLoading ? 'Posting...' : 'Post Reply'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Posts list */}
                <div className="posts-list">
                  <h4>Discussion Posts</h4>

                  {isPostsLoading ? (
                    <div className="loading-posts">Loading posts...</div>
                  ) : posts.length > 0 ? (
                    <div className="posts">
                      {posts.map(post => renderPost(post))}
                    </div>
                  ) : (
                    <div className="empty-posts">
                      <p>No posts yet. Be the first to contribute!</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="discussion-error">
                <p>Error loading the selected discussion.</p>
                <p>Please try selecting another discussion or refreshing the page.</p>
              </div>
            )
          ) : (
            <div className="select-discussion">
              {discussions.length > 0 ?
                'Select a discussion from the list to view details' :
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
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  disabled={!formData.title.trim() || isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Discussion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reply to Post</h2>
              <button className="close-btn" onClick={() => setShowReplyModal(false)}>×</button>
            </div>

            {replyTo && (
              <div className="reply-to-preview">
                <h4>Replying to:</h4>
                <div className="post-author">{replyTo.authorName || 'Unknown'}</div>
                <div className="post-content">{replyTo.content}</div>
              </div>
            )}

            <form onSubmit={handleCreatePost}>
              <div className="form-group">
                <label htmlFor="replyContent">Your Reply*</label>
                <textarea
                  id="replyContent"
                  name="replyContent"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Write your reply here..."
                  rows="4"
                  required
                ></textarea>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowReplyModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={!postContent.trim() || isPostsLoading}
                >
                  {isPostsLoading ? 'Posting...' : 'Post Reply'}
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