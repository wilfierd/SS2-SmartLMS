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
  const [lastSelectedDiscussionIdProp, setLastSelectedDiscussionIdProp] = useState(null); // Track prop changes
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
        }); console.log(`Successfully fetched ${response.data.length} discussions`);

        // Debug: Log the structure of the first discussion
        if (response.data.length > 0) {
          console.log('First discussion structure:', JSON.stringify(response.data[0], null, 2));
        }

        const discussionsData = response.data || []; setDiscussions(discussionsData);

        // Priority selection: selectedDiscussionId prop > current selection > first discussion
        if (selectedDiscussionId) {
          const discussionExists = discussionsData.find(d => d.id === parseInt(selectedDiscussionId));
          if (discussionExists) {
            setSelectedDiscussion(parseInt(selectedDiscussionId));
          } else if (discussionsData.length > 0 && !selectedDiscussion) {
            setSelectedDiscussion(discussionsData[0].id);
          }
        } else if (discussionsData.length > 0 && !selectedDiscussion) {
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
  }, [courseId, auth.token, API_URL]);

  // Fetch posts when a discussion is selected
  useEffect(() => {
    const fetchDiscussionPosts = async () => {
      if (!selectedDiscussion || !courseId) return;

      setIsPostsLoading(true);

      try {
        const validCourseId = parseInt(courseId);
        const validDiscussionId = parseInt(selectedDiscussion);

        // Fetch discussion details with posts
        const response = await axios.get(
          `${API_URL}/courses/${validCourseId}/discussions/${validDiscussionId}`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );

        setDiscussionDetail(response.data);
        setPosts(response.data.posts || []);
      } catch (error) {
        console.error('Error fetching discussion posts:', error);
        // Only show notification for non-404 errors to avoid spam
        if (error.response?.status !== 404) {
          notification.error('Failed to load discussion posts');
        }
      } finally {
        setIsPostsLoading(false);
      }
    };
    if (selectedDiscussion) {
      fetchDiscussionPosts();
    }
  }, [selectedDiscussion, courseId, auth.token, API_URL]);  // Handle selectedDiscussionId prop changes
  // Only respond to actual changes in the prop, not re-renders with the same value
  useEffect(() => {
    if (selectedDiscussionId && discussions.length > 0 && selectedDiscussionId !== lastSelectedDiscussionIdProp) {
      const discussionExists = discussions.find(d => d.id === parseInt(selectedDiscussionId));
      if (discussionExists) {
        setSelectedDiscussion(parseInt(selectedDiscussionId));
        setLastSelectedDiscussionIdProp(selectedDiscussionId); // Update the tracked prop value
      }
    }
  }, [selectedDiscussionId, discussions, lastSelectedDiscussionIdProp]);
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

    setIsLoading(true); try {
      const validCourseId = parseInt(courseId);
      const now = new Date().toISOString(); // Declare once here
      const userFullName = `${auth.user.firstName || ''} ${auth.user.lastName || ''}`.trim();
      const createdByName = userFullName || auth.user.email || 'You';

      const response = await axios.post(
        `${API_URL}/courses/${validCourseId}/discussions`,
        {
          title: formData.title.trim(),
          description: formData.description.trim() || null
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );      // Add the new discussion to the state using functional update to avoid race conditions
      // Create the discussion object in the same format as the backend returns      
      const newDiscussion = {
        id: response.data.discussionId,
        title: formData.title,
        description: formData.description,
        createdBy: auth.user.id, // This is the user ID (number)
        created_by: auth.user.id, // Include both naming conventions
        created_at: now,
        createdAt: now, // Include both for compatibility
        updatedAt: now,
        posts: [], // Initialize as empty array to match backend structure
        isLocked: false,
        isPinned: false,
        courseId: validCourseId,
        // Include creator relation to match backend structure
        creator: {
          id: auth.user.id,
          firstName: auth.user.firstName || '',
          lastName: auth.user.lastName || '',
          email: auth.user.email
        }
      }; setDiscussions(prevDiscussions => {
        // Check if discussion already exists to prevent duplicates
        const exists = prevDiscussions.find(d => d.id === newDiscussion.id);
        if (exists) {
          return prevDiscussions;
        }
        return [newDiscussion, ...prevDiscussions];
      });      // Set the new discussion as selected and initialize its detail
      const discussionId = response.data.discussionId;      // Initialize the discussion detail immediately to avoid loading issues
      // Use the same structure as we created for the discussion list
      const newDiscussionDetail = {
        ...newDiscussion, // Use the same structure
        posts: [] // Ensure posts array is empty for new discussion
      };

      console.log('Creating new discussion detail:', newDiscussionDetail); // Debug log

      setSelectedDiscussion(discussionId);
      setDiscussionDetail(newDiscussionDetail);

      // Initialize posts as empty for the new discussion
      setPosts([]);

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
      );      // Update posts state using functional updates to avoid race conditions
      if (replyTo) {
        // Find the parent post and add this reply
        const newReply = {
          ...response.data.post,
          // Ensure we have user information for display
          user: response.data.post.user || {
            id: auth.user.id,
            firstName: auth.user.firstName || '',
            lastName: auth.user.lastName || '',
            email: auth.user.email
          }
        };

        setPosts(prevPosts => {
          return prevPosts.map(post => {
            if (post.id === replyTo.id) {
              return {
                ...post,
                replies: [...(post.replies || []), newReply]
              };
            }
            return post;
          });
        });
      } else {
        // Add as a new top-level post
        const newPost = {
          ...response.data.post,
          replies: [],
          // Ensure we have user information for display
          user: response.data.post.user || {
            id: auth.user.id,
            firstName: auth.user.firstName || '',
            lastName: auth.user.lastName || '',
            email: auth.user.email
          }
        };
        setPosts(prevPosts => [...prevPosts, newPost]);
      }// Update post count in discussions list using functional update
      setDiscussions(prevDiscussions => {
        return prevDiscussions.map(discussion => {
          if (discussion.id === validDiscussionId) {
            return {
              ...discussion,
              posts: [...(discussion.posts || []), response.data.post] // Add the new post to the posts array
            };
          }
          return discussion;
        });
      });

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
  };  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) {
      return 'Just now';
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      // Show "Just now" for very recent posts (less than 1 minute)
      if (diffMinutes < 1) {
        return 'Just now';
      }

      // Show relative time for recent posts
      if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      }

      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      }

      // Show full date for older posts
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Unknown date';
    }
  };// Safely get creator name
  const getCreatorName = (discussion) => {
    if (!discussion) {
      return 'Unknown';
    }

    // Check if we have the creator relation from backend (for fetched discussions)
    if (discussion.creator) {
      const fullName = `${discussion.creator.firstName || ''} ${discussion.creator.lastName || ''}`.trim();
      if (fullName) {
        return fullName;
      }
      if (discussion.creator.email) {
        return discussion.creator.email;
      }
    }

    // Check for manually set createdBy field only if it's a string name (not an ID)
    if (discussion.createdBy && typeof discussion.createdBy === 'string' && discussion.createdBy !== 'Unknown') {
      return discussion.createdBy;
    }

    // Fallback: check for flat fields (for backwards compatibility)
    if (discussion.first_name || discussion.last_name) {
      const fullName = `${discussion.first_name || ''} ${discussion.last_name || ''}`.trim();
      if (fullName) {
        return fullName;
      }
    }

    // Check if this is the current user
    if (discussion.created_by === auth.user?.id || discussion.createdBy === auth.user?.id) {
      const userFullName = `${auth.user.firstName || ''} ${auth.user.lastName || ''}`.trim();
      if (userFullName) {
        return userFullName;
      }
      return auth.user.email || 'You';
    }

    return `User ${discussion.created_by || 'Unknown'}`;
  };

  // Safely get post author name
  const getPostAuthorName = (post) => {
    if (!post) {
      return 'Unknown';
    }

    // Check if we have the user relation from backend (for fetched posts)
    if (post.user) {
      const fullName = `${post.user.firstName || ''} ${post.user.lastName || ''}`.trim();
      if (fullName) {
        return fullName;
      }
      if (post.user.email) {
        return post.user.email;
      }
    }

    // Check for manually set authorName (for newly created posts)
    if (post.authorName && post.authorName !== 'Unknown') {
      return post.authorName;
    }

    // Check if this is the current user
    if (post.user_id === auth.user?.id || post.userId === auth.user?.id) {
      const userFullName = `${auth.user.firstName || ''} ${auth.user.lastName || ''}`.trim();
      if (userFullName) {
        return userFullName;
      }
      return auth.user.email || 'You';
    }

    return `User ${post.user_id || post.userId || 'Unknown'}`;
  };

  // Handle reply to post
  const handleReplyClick = (post) => {
    setReplyTo(post);
    setShowReplyModal(true);
  };
  // Render a single post with replies
  const renderPost = (post) => {
    const isCurrentUser = post.user_id === auth.user?.id || post.userId === auth.user?.id;

    return (
      <div
        key={post.id}
        className={`discussion-post ${isCurrentUser ? 'current-user-post' : ''}`}
      >
        <div className="post-header">
          <div className="post-author">{getPostAuthorName(post)}</div>
          <div className="post-date">{formatDate(post.created_at || post.createdAt)}</div>
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
                className={`post-reply ${reply.user_id === auth.user?.id || reply.userId === auth.user?.id ? 'current-user-post' : ''}`}
              >
                <div className="post-header">
                  <div className="post-author">{getPostAuthorName(reply)}</div>
                  <div className="post-date">{formatDate(reply.created_at || reply.createdAt)}</div>
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
                className={`discussion-item ${selectedDiscussion === discussion.id ? 'active' : ''}`}
                onClick={() => setSelectedDiscussion(discussion.id)}
              >
                <div className="discussion-item-title">{discussion.title}</div>                  <div className="discussion-item-meta">
                  <span>By {getCreatorName(discussion)}</span>
                  <span>{formatDate(discussion.created_at || discussion.createdAt)}</span>                    {/* Temporary debug info for testing - can be removed after verification */}
                  {false && process.env.NODE_ENV === 'development' && (
                    <div style={{ fontSize: '10px', color: 'red' }}>
                      DEBUG: ID={discussion.id}, created_by={discussion.created_by},
                      createdBy={discussion.createdBy},
                      creator={discussion.creator ? `${discussion.creator.firstName} ${discussion.creator.lastName}` : 'null'},
                      created_at={discussion.created_at}
                    </div>
                  )}
                </div>                  <div className="discussion-item-stats">
                  <span>{discussion.posts?.length || 0} posts</span>
                  {discussion.isLocked && <span className="locked-tag">Locked</span>}
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
                  {discussionDetail.isLocked && (
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
                    Started by {getCreatorName(discussionDetail)} · {formatDate(discussionDetail.created_at || discussionDetail.createdAt)}
                  </div>
                </div>

                {/* Post creation form */}
                {!discussionDetail.isLocked && (
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