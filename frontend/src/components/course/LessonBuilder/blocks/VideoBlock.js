import React, { useState } from 'react';
import {
    MdEdit,
    MdContentCopy,
    MdDelete,
    MdKeyboardArrowUp,
    MdKeyboardArrowDown,
    MdSave,
    MdCancel,
    MdOndemandVideo,
    MdVideoSettings
} from 'react-icons/md';
import './BlockStyles.css';

const VideoBlock = ({
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
        autoplay: block.data.autoplay || false
    });

    const handleSave = () => {
        onUpdate(localData);
        onStopEdit();
    };

    const handleCancel = () => {
        setLocalData({
            url: block.data.url || '',
            title: block.data.title || '',
            autoplay: block.data.autoplay || false
        });
        onStopEdit();
    };

    const getVideoEmbedUrl = (url) => {
        if (!url) return null;

        // YouTube
        const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
        const youtubeMatch = url.match(youtubeRegex);
        if (youtubeMatch) {
            return `https://www.youtube.com/embed/${youtubeMatch[1]}${localData.autoplay ? '?autoplay=1' : ''}`;
        }

        // Vimeo
        const vimeoRegex = /vimeo\.com\/(\d+)/;
        const vimeoMatch = url.match(vimeoRegex);
        if (vimeoMatch) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}${localData.autoplay ? '?autoplay=1' : ''}`;
        }

        // Direct video URL
        if (url.match(/\.(mp4|webm|ogg)$/i)) {
            return url;
        }

        return url; // Fallback to original URL
    };

    const renderVideoPreview = () => {
        const embedUrl = getVideoEmbedUrl(block.data.url);

        if (!embedUrl) {
            return (
                <div className="video-placeholder">
                    <div className="placeholder-icon"><MdOndemandVideo /></div>
                    <p>No video URL provided</p>
                    <button className="add-video-btn" onClick={onStartEdit}>
                        Add Video
                    </button>
                </div>
            );
        }

        if (block.data.url.match(/\.(mp4|webm|ogg)$/i)) {
            return (
                <video
                    controls
                    autoPlay={block.data.autoplay}
                    className="video-player"
                    poster=""
                >
                    <source src={embedUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            );
        }

        return (
            <iframe
                src={embedUrl}
                title={block.data.title || 'Lesson Video'}
                className="video-iframe"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        );
    };

    return (
        <div className="content-block video-block">
            {/* Block Controls */}
            <div className="block-controls">
                {!isEditing && (
                    <>
                        <button className="control-btn edit" onClick={onStartEdit} title="Edit">
                            <MdEdit />
                        </button>
                        <button className="control-btn duplicate" onClick={onDuplicate} title="Duplicate">
                            <MdContentCopy />
                        </button>
                        {canMoveUp && (
                            <button className="control-btn move" onClick={onMoveUp} title="Move Up">
                                <MdKeyboardArrowUp />
                            </button>
                        )}
                        {canMoveDown && (
                            <button className="control-btn move" onClick={onMoveDown} title="Move Down">
                                <MdKeyboardArrowDown />
                            </button>
                        )}
                        <button className="control-btn delete" onClick={onDelete} title="Delete">
                            <MdDelete />
                        </button>
                    </>
                )}
            </div>

            {/* Block Content */}
            <div className="block-content">
                {isEditing ? (
                    <div className="video-editor">
                        <div className="editor-header">
                            <h4><MdVideoSettings /> Video Settings</h4>
                            <div className="editor-actions">
                                <button className="save-btn" onClick={handleSave}>
                                    <MdSave /> Save
                                </button>
                                <button className="cancel-btn" onClick={handleCancel}>
                                    <MdCancel /> Cancel
                                </button>
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="video-url">Video URL</label>
                                <input
                                    id="video-url"
                                    type="url"
                                    value={localData.url}
                                    onChange={(e) => setLocalData({ ...localData, url: e.target.value })}
                                    placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                                    className="video-url-input"
                                />
                                <small className="input-help">
                                    Supports YouTube, Vimeo, or direct video file URLs
                                </small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="video-title">Video Title (Optional)</label>
                                <input
                                    id="video-title"
                                    type="text"
                                    value={localData.title}
                                    onChange={(e) => setLocalData({ ...localData, title: e.target.value })}
                                    placeholder="Enter a descriptive title..."
                                    className="video-title-input"
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={localData.autoplay}
                                        onChange={(e) => setLocalData({ ...localData, autoplay: e.target.checked })}
                                    />
                                    <span className="checkmark"></span>
                                    Auto-play video when lesson loads
                                </label>
                            </div>
                        </div>

                        {localData.url && (
                            <div className="video-preview-section">
                                <h5>Preview:</h5>
                                <div className="video-preview">
                                    {renderVideoPreview()}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="video-display">
                        {block.data.title && (
                            <h4 className="video-title">{block.data.title}</h4>
                        )}
                        <div className="video-container">
                            {renderVideoPreview()}
                        </div>
                    </div>
                )}
            </div>

            {/* Block Type Indicator */}
            <div className="block-type-indicator">
                <MdOndemandVideo /> Video Block
            </div>
        </div>
    );
};

export default VideoBlock;
