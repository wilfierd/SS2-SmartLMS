import React, { useState, useRef } from 'react';
import VideoPlayer from '../../VideoPlayer';
import uploadService from '../../../../services/uploadService';
import { useParams } from 'react-router-dom';
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
    });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedFile, setUploadedFile] = useState(null);
    const fileInputRef = useRef(null);
    const { courseId } = useParams();const handleSave = () => {
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
    };    const handleCancel = () => {
        setLocalData({
            url: block.data.url || '',
            title: block.data.title || '',
            height: block.data.height || '400',
            allowFullscreen: block.data.allowFullscreen || true
        });
        setIsUploading(false);
        setUploadProgress(0);
        setUploadedFile(null);
        onStopEdit();
    };

    const handleVideoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Progress simulation for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 100);

            // Upload the video
            const uploadResponse = await uploadService.uploadVideo(file, courseId);
            
            clearInterval(progressInterval);
            setUploadProgress(100);

            // Get the uploaded video URL
            let uploadedVideoUrl = null;
            if (uploadResponse.files && uploadResponse.files.length > 0) {
                uploadedVideoUrl = uploadResponse.files[0].filePath;
            } else if (uploadResponse.filePath) {
                uploadedVideoUrl = uploadResponse.filePath;
            }

            if (!uploadedVideoUrl) {
                throw new Error('No file path returned from upload');
            }

            // Convert relative path to full URL
            const fullVideoUrl = uploadService.getFileUrl(uploadedVideoUrl);
            
            setLocalData(prev => ({
                ...prev,
                url: fullVideoUrl
            }));
            setUploadedFile(file);

        } catch (error) {
            console.error('Video upload failed:', error);
            alert(`Failed to upload video: ${error.message}`);
            setUploadProgress(0);
        } finally {
            setIsUploading(false);
        }
    };const isValidUrl = (url) => {
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
    };    // Check if URL is a video URL that should use VideoPlayer
    const isVideoUrl = (url) => {
        if (!url) return false;

        const videoStreamingDomains = [
            'youtube.com',
            'youtu.be',
            'vimeo.com',
            'dailymotion.com'
        ];

        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];

        const hasVideoExtension = videoExtensions.some(ext =>
            url.toLowerCase().includes(ext)
        );

        const isStreamingUrl = videoStreamingDomains.some(domain => 
            url.toLowerCase().includes(domain)
        );

        return hasVideoExtension || isStreamingUrl;
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
        }        // For non-video content, use simplified iframe
        return (
            <div className="embed-container">
                {block.data.title && (
                    <h4 className="embed-title">{block.data.title}</h4>
                )}
                <div className="embed-iframe-wrapper">
                    <iframe
                        src={block.data.url}
                        title={block.data.title || 'Embedded Content'}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        allowFullScreen={block.data.allowFullscreen}
                        className="embed-iframe"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                </div>
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
                    <div className="embed-editor">                        <div className="editor-header">
                            <h4>🔗 Embed Content / Upload Video</h4>
                            <div className="editor-actions">
                                <button className="save-btn" onClick={handleSave}>
                                    ✅ Save
                                </button>
                                <button className="cancel-btn" onClick={handleCancel}>
                                    ❌ Cancel
                                </button>
                            </div>
                        </div>                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="embed-url">Embed URL or Upload Video</label>
                                <input
                                    id="embed-url"
                                    type="url"
                                    value={localData.url}
                                    onChange={(e) => setLocalData({ ...localData, url: e.target.value })}
                                    placeholder="https://youtube.com/watch?v=... or paste any URL"
                                    className="embed-url-input"
                                    disabled={isUploading}
                                />
                                <small className="input-help">
                                    Enter any URL to embed, or upload a video file (Max 10MB)
                                </small>
                                
                                <div className="upload-section" style={{ marginTop: '12px' }}>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/mp4,video/webm,video/ogg,video/mov,video/avi"
                                        onChange={handleVideoUpload}
                                        style={{ display: 'none' }}
                                        disabled={isUploading}
                                    />
                                    <button
                                        type="button"
                                        className="upload-video-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? '⏳ Uploading...' : '🎥 Upload Video (Max 10MB)'}
                                    </button>
                                    
                                    {isUploading && (
                                        <div className="upload-progress" style={{ marginTop: '8px' }}>
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${uploadProgress}%` }}
                                                ></div>
                                            </div>
                                            <span className="progress-text">{uploadProgress}%</span>
                                        </div>
                                    )}
                                    
                                    {uploadedFile && (
                                        <div className="upload-success" style={{ marginTop: '8px' }}>
                                            ✅ {uploadedFile.name} uploaded successfully
                                        </div>
                                    )}
                                </div>
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
            </div>            {/* Block Type Indicator */}
            <div className="block-type-indicator">
                🔗 Embed/Video Block
            </div>
        </div>
    );
};

export default EmbedBlock;
