import React, { useState } from 'react';
import VideoPlayer from '../../VideoPlayer';
import './BlockStyles.css';

const EmbedBlock = ({
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
        height: block.data.height || '400',
        allowFullscreen: block.data.allowFullscreen || true
    });    const handleSave = () => {
        if (!localData.url.trim()) {
            alert('Please enter a valid URL');
            return;
        }

        // Convert YouTube URLs to embed format to avoid "refused to connect" errors
        const processedUrl = isYouTubeUrl(localData.url) ? convertToEmbedUrl(localData.url) : localData.url;
        
        onUpdate({
            ...localData,
            url: processedUrl
        });
        onStopEdit();
    };

    const handleCancel = () => {
        setLocalData({
            url: block.data.url || '',
            title: block.data.title || '',
            height: block.data.height || '400',
            allowFullscreen: block.data.allowFullscreen || true
        });
        onStopEdit();
    }; const isValidUrl = (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    // Check if URL is a YouTube URL
    const isYouTubeUrl = (url) => {
        return url && (url.includes('youtube.com') || url.includes('youtu.be'));
    };

    // Check if URL is a video URL that should use VideoPlayer
    const isVideoUrl = (url) => {
        if (!url) return false;

        const videoStreamingDomains = [
            'youtube.com',
            'youtu.be',
            'vimeo.com',
            'dailymotion.com'
        ];

        return videoStreamingDomains.some(domain => url.toLowerCase().includes(domain));
    };

    // Convert YouTube URLs to embed format
    const convertToEmbedUrl = (url) => {
        if (!url) return url;
        
        // If it's already an embed URL, return as is
        if (url.includes('youtube.com/embed/')) {
            return url;
        }
        
        // Extract video ID and convert to embed URL
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/v\/)([^#&?]*)/,
            /youtube\.com\/watch\?.*v=([^#&?]*)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1] && match[1].length === 11) {
                return `https://www.youtube.com/embed/${match[1]}`;
            }
        }
        
        return url; // Return original URL if not YouTube
    };

    const renderEmbedPreview = () => {
        if (!block.data.url || !isValidUrl(block.data.url)) {
            return (
                <div className="embed-placeholder">
                    <div className="placeholder-icon">🔗</div>
                    <p>No valid embed URL provided</p>
                    <button className="add-embed-btn" onClick={onStartEdit}>
                        Add Embed Content
                    </button>
                </div>
            );
        }        // If it's a video URL (YouTube, Vimeo, etc.), use VideoPlayer component (no CAPTCHA!)
        if (isVideoUrl(block.data.url)) {
            return (
                <div className="embed-container video-embed">
                    {block.data.title && (
                        <h4 className="embed-title">{block.data.title}</h4>
                    )}                    <div className="video-wrapper">
                        <VideoPlayer
                            videoUrl={isYouTubeUrl(block.data.url) ? convertToEmbedUrl(block.data.url) : block.data.url}
                            title={block.data.title || 'Embedded Video'}
                            containerMode="fixed"
                        />                    </div>
                </div>
            );
        }

        // For non-video content, use simplified iframe
        return (
            <div className="embed-container">
                {block.data.title && (
                    <h4 className="embed-title">{block.data.title}</h4>
                )}
                <iframe
                    src={block.data.url}
                    title={block.data.title || 'Embedded Content'}
                    width="100%"
                    height={`${block.data.height}px`}
                    frameBorder="0"
                    allowFullScreen={block.data.allowFullscreen}
                    className="embed-iframe"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
            </div>
        );
    };

    return (
        <div className="content-block embed-block">
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
                    <div className="embed-editor">
                        <div className="editor-header">
                            <h4>🔗 Embed Settings</h4>
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
                                <label htmlFor="embed-url">Embed URL *</label>
                                <input
                                    id="embed-url"
                                    type="url"
                                    value={localData.url}
                                    onChange={(e) => setLocalData({ ...localData, url: e.target.value })}
                                    placeholder="https://example.com/embed..."
                                    className="embed-url-input"
                                />                                <small className="input-help">
                                    Enter any URL to embed. YouTube/Vimeo URLs will use our optimized player (no CAPTCHA issues!)
                                </small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="embed-title">Title (Optional)</label>
                                <input
                                    id="embed-title"
                                    type="text"
                                    value={localData.title}
                                    onChange={(e) => setLocalData({ ...localData, title: e.target.value })}
                                    placeholder="Enter a descriptive title..."
                                    className="embed-title-input"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="embed-height">Height (px)</label>
                                    <input
                                        id="embed-height"
                                        type="number"
                                        value={localData.height}
                                        onChange={(e) => setLocalData({ ...localData, height: e.target.value })}
                                        min="200"
                                        max="1000"
                                        className="embed-height-input"
                                    />
                                </div>

                                <div className="form-group checkbox-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={localData.allowFullscreen}
                                            onChange={(e) => setLocalData({ ...localData, allowFullscreen: e.target.checked })}
                                        />
                                        <span className="checkmark"></span>
                                        Allow fullscreen
                                    </label>
                                </div>
                            </div>
                        </div>                        {localData.url && isValidUrl(localData.url) && (
                            <div className="embed-preview-section">
                                <h5>Preview:</h5>
                                <div className="embed-preview">
                                    {isVideoUrl(localData.url) ? (                                        <div className="video-preview">
                                            <VideoPlayer
                                                videoUrl={isYouTubeUrl(localData.url) ? convertToEmbedUrl(localData.url) : localData.url}
                                                title="Preview"
                                                containerMode="fixed"
                                            />
                                            {isYouTubeUrl(localData.url) && (
                                                <div className="preview-info">
                                                    ✅ This YouTube URL will load without CAPTCHA issues!
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <iframe
                                            src={localData.url}
                                            title="Preview"
                                            width="100%"
                                            height="200px"
                                            frameBorder="0"
                                            className="embed-preview-iframe"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="embed-display">
                        {renderEmbedPreview()}
                    </div>
                )}
            </div>

            {/* Block Type Indicator */}
            <div className="block-type-indicator">
                🔗 Embed Block
            </div>
        </div>
    );
};

export default EmbedBlock;
