import React, { useState } from 'react';
import './BlockStyles.css';

const YouTubeLinkBlock = ({
    block,
    isEditing,
    onUpdate,
    onStartEdit,
    onStopEdit,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown
}) => {
    const [localData, setLocalData] = useState({
        url: block.data.url || '',
        title: block.data.title || '',
        description: block.data.description || ''
    });

    const handleSave = () => {
        if (!localData.url.trim()) {
            alert('Please enter a valid YouTube URL');
            return;
        }

        onUpdate(localData);
        onStopEdit();
    };

    const handleCancel = () => {
        setLocalData({
            url: block.data.url || '',
            title: block.data.title || '',
            description: block.data.description || ''
        });
        onStopEdit();
    };

    const isYouTubeUrl = (url) => {
        return url && (url.includes('youtube.com') || url.includes('youtu.be'));
    };

    const getYouTubeThumbnail = (url) => {
        if (!url) return null;

        // Extract video ID
        const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
        const match = url.match(youtubeRegex);

        if (match && match[1]) {
            return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
        }

        return null;
    };

    const renderYouTubeLink = () => {
        if (!block.data.url || !isYouTubeUrl(block.data.url)) {
            return (
                <div className="youtube-placeholder">
                    <div className="placeholder-icon">🎬</div>
                    <p>No YouTube URL provided</p>
                    <button className="add-youtube-btn" onClick={onStartEdit}>
                        Add YouTube Video
                    </button>
                </div>
            );
        }

        const thumbnail = getYouTubeThumbnail(block.data.url);

        return (
            <div className="youtube-link-container">
                {block.data.title && (
                    <h4 className="youtube-title">{block.data.title}</h4>
                )}

                <div className="youtube-card">
                    {thumbnail && (
                        <div className="youtube-thumbnail">
                            <img src={thumbnail} alt="YouTube Video Thumbnail" />
                            <div className="play-overlay">
                                <div className="play-button">▶</div>
                            </div>
                        </div>
                    )}

                    <div className="youtube-info">
                        {block.data.description && (
                            <p className="youtube-description">{block.data.description}</p>
                        )}

                        <a
                            href={block.data.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="youtube-link-btn"
                        >
                            🎬 Watch on YouTube
                        </a>

                        <div className="youtube-url">
                            <small>{block.data.url}</small>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="content-block youtube-link-block">
            {/* Block Controls */}
            <div className="block-controls">
                {!isEditing && (
                    <>
                        <button className="control-btn edit" onClick={onStartEdit} title="Edit">
                            ✏️
                        </button>
                        <button className="control-btn duplicate" onClick={onDuplicate} title="Duplicate">
                            📋
                        </button>
                        {canMoveUp && (
                            <button className="control-btn move" onClick={onMoveUp} title="Move Up">
                                ↑
                            </button>
                        )}
                        {canMoveDown && (
                            <button className="control-btn move" onClick={onMoveDown} title="Move Down">
                                ↓
                            </button>
                        )}
                        <button className="control-btn delete" onClick={onDelete} title="Delete">
                            🗑️
                        </button>
                    </>
                )}
            </div>

            {/* Block Content */}
            <div className="block-content">
                {isEditing ? (
                    <div className="youtube-editor">
                        <div className="editor-header">
                            <h4>🎬 YouTube Link Settings</h4>
                            <div className="editor-actions">
                                <button className="save-btn" onClick={handleSave}>
                                    ✅ Save
                                </button>
                                <button className="cancel-btn" onClick={handleCancel}>
                                    ❌ Cancel
                                </button>
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="youtube-url">YouTube URL *</label>
                                <input
                                    id="youtube-url"
                                    type="url"
                                    value={localData.url}
                                    onChange={(e) => setLocalData({ ...localData, url: e.target.value })}
                                    placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                                    className="youtube-url-input"
                                />
                                <small className="input-help">
                                    Simple YouTube link without complex embedding - no CAPTCHA issues!
                                </small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="youtube-title">Title (Optional)</label>
                                <input
                                    id="youtube-title"
                                    type="text"
                                    value={localData.title}
                                    onChange={(e) => setLocalData({ ...localData, title: e.target.value })}
                                    placeholder="Enter a descriptive title..."
                                    className="youtube-title-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="youtube-description">Description (Optional)</label>
                                <textarea
                                    id="youtube-description"
                                    value={localData.description}
                                    onChange={(e) => setLocalData({ ...localData, description: e.target.value })}
                                    placeholder="Brief description of the video content..."
                                    rows="3"
                                    className="youtube-description-input"
                                />
                            </div>
                        </div>

                        {localData.url && isYouTubeUrl(localData.url) && (
                            <div className="youtube-preview-section">
                                <h5>Preview:</h5>
                                <div className="youtube-preview">
                                    <div className="youtube-card">
                                        {getYouTubeThumbnail(localData.url) && (
                                            <div className="youtube-thumbnail">
                                                <img src={getYouTubeThumbnail(localData.url)} alt="YouTube Thumbnail" />
                                                <div className="play-overlay">
                                                    <div className="play-button">▶</div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="youtube-info">
                                            {localData.description && (
                                                <p className="youtube-description">{localData.description}</p>
                                            )}
                                            <div className="youtube-link-btn">🎬 Watch on YouTube</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="youtube-display">
                        {renderYouTubeLink()}
                    </div>
                )}
            </div>

            {/* Block Type Indicator */}
            <div className="block-type-indicator">
                🎬 YouTube Link Block
            </div>
        </div>
    );
};

export default YouTubeLinkBlock;
