import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import uploadService from '../../../services/uploadService';
import './BlockStyles.css';

const ImageBlock = ({
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
    const { courseId } = useParams();
    const [localData, setLocalData] = useState({
        url: block.data.url || '',
        alt: block.data.alt || '',
        caption: block.data.caption || '',
        alignment: block.data.alignment || 'center',
        file: null
    });
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    const alignmentOptions = [
        { value: 'left', label: 'Left', icon: '⬅️' },
        { value: 'center', label: 'Center', icon: '↔️' },
        { value: 'right', label: 'Right', icon: '➡️' },
        { value: 'full', label: 'Full Width', icon: '↕️' }
    ];

    const handleSave = () => {
        if (localData.file) {
            // Handle file upload
            uploadImage();
        } else {
            onUpdate({
                url: localData.url,
                alt: localData.alt,
                caption: localData.caption,
                alignment: localData.alignment
            });
            onStopEdit();
        }
    };

    const handleCancel = () => {
        // Clean up preview URL
        if (previewUrl) {
            uploadService.revokePreviewUrl(previewUrl);
            setPreviewUrl(null);
        }

        setLocalData({
            url: block.data.url || '',
            alt: block.data.alt || '',
            caption: block.data.caption || '',
            alignment: block.data.alignment || 'center',
            file: null
        });
        setUploadProgress(0);
        setIsUploading(false);
        onStopEdit();
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            // Clean up previous preview URL
            if (previewUrl) {
                uploadService.revokePreviewUrl(previewUrl);
            }

            // Create new preview URL
            const newPreviewUrl = uploadService.generatePreviewUrl(file);
            setPreviewUrl(newPreviewUrl);
            setLocalData({
                ...localData,
                file,
                url: newPreviewUrl // Show preview immediately
            });
        } else {
            alert('Please select a valid image file.');
        }
    };

    const uploadImage = async () => {
        if (!localData.file) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
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

            // Upload the image
            const uploadResponse = await uploadService.uploadImage(localData.file, courseId);

            clearInterval(progressInterval);
            setUploadProgress(100);

            // Clean up preview URL since we now have the real URL
            if (previewUrl) {
                uploadService.revokePreviewUrl(previewUrl);
                setPreviewUrl(null);
            }

            // Use the uploaded image URL from the response
            const uploadedImageUrl = uploadResponse.files?.[0]?.filePath || uploadResponse.filePath;

            if (!uploadedImageUrl) {
                throw new Error('No file path returned from upload');
            }

            // Convert relative path to full URL
            const fullImageUrl = uploadedImageUrl.startsWith('http')
                ? uploadedImageUrl
                : `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${uploadedImageUrl}`;

            onUpdate({
                url: fullImageUrl,
                alt: localData.alt,
                caption: localData.caption,
                alignment: localData.alignment
            });

            onStopEdit();
        } catch (error) {
            console.error('Image upload failed:', error);
            alert(`Failed to upload image: ${error.message}. Please try again.`);
            setUploadProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    const renderImagePreview = () => {
        if (!block.data.url) {
            return (
                <div className="image-placeholder">
                    <div className="placeholder-icon">🖼️</div>
                    <p>No image selected</p>
                    <button className="add-image-btn" onClick={onStartEdit}>
                        Add Image
                    </button>
                </div>
            );
        }

        return (
            <div className={`image-container align-${block.data.alignment}`}>
                <img
                    src={block.data.url}
                    alt={block.data.alt || 'Lesson image'}
                    className="lesson-image"
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                    }}
                />
                <div className="image-error" style={{ display: 'none' }}>
                    <p>Failed to load image</p>
                    <small>{block.data.url}</small>
                </div>
                {block.data.caption && (
                    <figcaption className="image-caption">
                        {block.data.caption}
                    </figcaption>
                )}
            </div>
        );
    };

    return (
        <div className="content-block image-block">
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
                    <div className="edit-form">
                        <div className="form-header">
                            <h3 className="form-title">🖼️ Edit Image</h3>
                            <div className="form-actions">
                                <button
                                    className="save-btn"
                                    onClick={handleSave}
                                    disabled={isUploading}
                                >
                                    {isUploading ? '⏳ Uploading...' : '✅ Save'}
                                </button>
                                <button
                                    className="cancel-btn"
                                    onClick={handleCancel}
                                    disabled={isUploading}
                                >
                                    ❌ Cancel
                                </button>
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="upload-section">
                                <div className="upload-options">
                                    <button
                                        type="button"
                                        className="upload-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        📁 Upload Image
                                    </button>
                                    <span className="option-separator">or</span>
                                    <input
                                        type="url"
                                        value={localData.url && !localData.file ? localData.url : ''}
                                        onChange={(e) => setLocalData({ ...localData, url: e.target.value, file: null })}
                                        placeholder="Enter image URL..."
                                        className="url-input"
                                        disabled={isUploading}
                                    />
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />

                                {isUploading && (
                                    <div className="upload-progress">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                        <span className="progress-text">{uploadProgress}%</span>
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="image-alt">Alt Text</label>
                                    <input
                                        id="image-alt"
                                        type="text"
                                        value={localData.alt}
                                        onChange={(e) => setLocalData({ ...localData, alt: e.target.value })}
                                        placeholder="Describe the image for accessibility..."
                                        disabled={isUploading}
                                    />
                                    <small className="input-help">
                                        Important for accessibility and SEO
                                    </small>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="image-caption">Caption (Optional)</label>
                                    <input
                                        id="image-caption"
                                        type="text"
                                        value={localData.caption}
                                        onChange={(e) => setLocalData({ ...localData, caption: e.target.value })}
                                        placeholder="Add a caption..."
                                        disabled={isUploading}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Alignment</label>
                                <div className="alignment-options">
                                    {alignmentOptions.map(option => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={`alignment-btn ${localData.alignment === option.value ? 'active' : ''}`}
                                            onClick={() => setLocalData({ ...localData, alignment: option.value })}
                                            disabled={isUploading}
                                        >
                                            <span className="alignment-icon">{option.icon}</span>
                                            <span className="alignment-label">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {localData.url && (
                            <div className="image-preview-section">
                                <h5>Preview:</h5>
                                <div className="image-preview">
                                    {renderImagePreview()}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="image-display">
                        {renderImagePreview()}
                    </div>
                )}
            </div>

            {/* Block Type Indicator */}
            <div className="block-type-indicator">
                🖼️ Image Block
            </div>
        </div>
    );
};

export default ImageBlock;
