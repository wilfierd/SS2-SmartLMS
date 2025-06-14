import React, { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import { useParams } from 'react-router-dom';
import {
    MdEdit,
    MdContentCopy,
    MdDelete,
    MdKeyboardArrowUp,
    MdKeyboardArrowDown,
    MdSave,
    MdCancel,
    MdImage,
    MdAlignHorizontalLeft,
    MdAlignHorizontalCenter,
    MdAlignHorizontalRight,
    MdFullscreen,
    MdRefresh,
    MdCloudUpload,
    MdError,
    MdFlashOn,
    MdVisibilityOff
} from 'react-icons/md';
import uploadService from '../../../../services/uploadService';
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
    const [previewUrl, setPreviewUrl] = useState(null); const [imageLoaded, setImageLoaded] = useState(false); const [isScrolling, setIsScrolling] = useState(false);
    const fileInputRef = useRef(null);
    const scrollTimeout = useRef(null);
    const blockRef = useRef(null);

    // Optimized scroll detection using passive events and throttling
    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking && isEditing) {
                requestAnimationFrame(() => {
                    if (!isScrolling) {
                        setIsScrolling(true);
                    }

                    clearTimeout(scrollTimeout.current);
                    scrollTimeout.current = setTimeout(() => {
                        setIsScrolling(false);
                    }, 100); // Reduced timeout for faster response

                    ticking = false;
                });
                ticking = true;
            }
        };

        if (isEditing) {
            // Use passive listener for better performance
            const scrollContainer = document.querySelector('.lesson-builder-container') || window;
            scrollContainer.addEventListener('scroll', handleScroll, {
                passive: true,
                capture: false
            });

            return () => {
                scrollContainer.removeEventListener('scroll', handleScroll);
                clearTimeout(scrollTimeout.current);
            };
        }
    }, [isEditing, isScrolling]);// Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) {
                uploadService.revokePreviewUrl(previewUrl);
            }
            clearTimeout(scrollTimeout.current);
        };
    }, [previewUrl]);    // Memoize alignment options to prevent re-creation on every render
    const alignmentOptions = useMemo(() => [
        { value: 'left', label: 'Left', icon: <MdAlignHorizontalLeft /> },
        { value: 'center', label: 'Center', icon: <MdAlignHorizontalCenter /> },
        { value: 'right', label: 'Right', icon: <MdAlignHorizontalRight /> },
        { value: 'full', label: 'Full Width', icon: <MdFullscreen /> }
    ], []);// Memoize handlers to prevent unnecessary re-renders
    const handleSave = useCallback(() => {
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
    }, [localData, onUpdate, onStopEdit]);

    const handleCancel = useCallback(() => {
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
        setImageLoaded(false);
        onStopEdit();
    }, [previewUrl, block.data, onStopEdit]); const handleFileSelect = useCallback((e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            // Clean up previous preview URL
            if (previewUrl) {
                uploadService.revokePreviewUrl(previewUrl);
            }

            // Create new preview URL
            const newPreviewUrl = uploadService.generatePreviewUrl(file);
            setPreviewUrl(newPreviewUrl);
            setLocalData(prev => ({
                ...prev,
                file,
                url: newPreviewUrl // Show preview immediately
            }));
            setImageLoaded(false);
        } else {
            alert('Please select a valid image file.');
        }
    }, [previewUrl]);

    const handleUrlChange = useCallback((url) => {
        // Clean up preview URL when switching to URL input
        if (previewUrl) {
            uploadService.revokePreviewUrl(previewUrl);
            setPreviewUrl(null);
        }

        setLocalData(prev => ({
            ...prev,
            url: url,
            file: null
        }));
        setImageLoaded(false);
    }, [previewUrl]); const uploadImage = useCallback(async () => {
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

            // Get the uploaded image URL from the response
            console.log('Upload response:', uploadResponse);
            let uploadedImageUrl = null;

            // Handle different response structures
            if (uploadResponse.files && uploadResponse.files.length > 0) {
                uploadedImageUrl = uploadResponse.files[0].filePath;
            } else if (uploadResponse.filePath) {
                uploadedImageUrl = uploadResponse.filePath;
            }

            if (!uploadedImageUrl) {
                throw new Error('No file path returned from upload');
            }

            // Convert relative path to full URL  
            const fullImageUrl = uploadService.getFileUrl(uploadedImageUrl);

            console.log('Final image URL:', fullImageUrl);

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
    }, [localData, courseId, previewUrl, onUpdate, onStopEdit]);    // Memoize image preview to prevent unnecessary re-renders
    const renderImagePreview = useCallback(() => {
        if (!block.data.url) {
            return (
                <div className="image-placeholder">
                    <div className="placeholder-icon"><MdImage /></div>
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
                    loading="lazy"
                    onError={(e) => {
                        console.error('Failed to load image:', block.data.url);
                        e.target.style.display = 'none';
                        const errorDiv = e.target.nextSibling;
                        if (errorDiv) {
                            errorDiv.style.display = 'block';
                        }
                    }}
                    onLoad={(e) => {
                        console.log('Image loaded successfully:', block.data.url);
                        setImageLoaded(true);
                        // Hide error message if image loads successfully
                        const errorDiv = e.target.nextSibling;
                        if (errorDiv) {
                            errorDiv.style.display = 'none';
                        }
                    }}
                />
                <div className="image-error" style={{ display: 'none' }}>
                    <p><MdError /> Failed to load image</p>
                    <small style={{ wordBreak: 'break-all' }}>{block.data.url}</small>
                    <button
                        className="retry-btn"
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        <MdRefresh /> Retry
                    </button>
                </div>
                {block.data.caption && (
                    <figcaption className="image-caption">
                        {block.data.caption}
                    </figcaption>
                )}
            </div>
        );
    }, [block.data.url, block.data.alt, block.data.alignment, block.data.caption, onStartEdit]);    // Memoize the edit preview to prevent flicker - simplified version during scroll
    const renderEditPreview = useCallback(() => {
        if (!localData.url) return null;

        // Show simplified preview during scroll to improve performance
        if (isScrolling) {
            return (
                <div className="simplified-preview">
                    <div className="preview-placeholder">
                        <MdImage /> Image Preview (Scroll to see full preview)
                    </div>
                </div>
            );
        }

        return (
            <div className={`image-container align-${localData.alignment}`}>
                <img
                    src={localData.url}
                    alt={localData.alt || 'Image preview'}
                    className="lesson-image preview-image"
                    loading="lazy"
                    style={{
                        maxWidth: '300px',
                        maxHeight: '200px',
                        objectFit: 'contain',
                        border: '2px dashed #ccc'
                    }}
                    onLoad={() => setImageLoaded(true)}
                    onError={(e) => {
                        console.error('Preview image failed to load:', localData.url);
                        e.target.style.display = 'none';
                    }}
                />
                {localData.caption && (
                    <figcaption className="image-caption preview-caption">
                        {localData.caption}
                    </figcaption>
                )}
            </div>
        );
    }, [localData.url, localData.alt, localData.alignment, localData.caption, isScrolling]); return (
        <div
            ref={blockRef}
            className={`content-block image-block ${isScrolling ? 'scrolling' : ''}`}
        >
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
                                ↑
                            </button>
                        )}
                        {canMoveDown && (
                            <button className="control-btn move" onClick={onMoveDown} title="Move Down">
                                ↓
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
                    <div className="edit-form">
                        <div className="form-header">
                            <h3 className="form-title"><MdImage /> Edit Image</h3>
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
                        </div>                        {/* Conditional rendering - simplified form during scroll */}
                        {isScrolling ? (
                            <div className="form-simplified">
                                <div className="scroll-message">
                                    ⚡ Scroll mode - Form simplified for better performance
                                </div>
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
                        ) : (
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
                                            onChange={(e) => handleUrlChange(e.target.value)}
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
                                            onChange={(e) => setLocalData(prev => ({ ...prev, alt: e.target.value }))}
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
                                            onChange={(e) => setLocalData(prev => ({ ...prev, caption: e.target.value }))}
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
                                                onClick={() => setLocalData(prev => ({ ...prev, alignment: option.value }))}
                                                disabled={isUploading}
                                            >
                                                <span className="alignment-icon">{option.icon}</span>
                                                <span className="alignment-label">{option.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}                        {/* Conditional preview rendering */}
                        {localData.url && !isScrolling && (
                            <div className="image-preview-section">
                                <h5>Preview:</h5>
                                <div className="image-preview">
                                    {renderEditPreview()}
                                </div>
                            </div>
                        )}

                        {/* Simplified preview during scroll */}
                        {localData.url && isScrolling && (
                            <div className="simplified-preview-section">
                                <div className="preview-placeholder">
                                    🖼️ Preview hidden during scroll for better performance
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

export default memo(ImageBlock, (prevProps, nextProps) => {
    // Fast reference checks first
    if (prevProps.isEditing !== nextProps.isEditing) return false;
    if (prevProps.canMoveUp !== nextProps.canMoveUp) return false;
    if (prevProps.canMoveDown !== nextProps.canMoveDown) return false;
    if (prevProps.block === nextProps.block) return true; // Same reference

    // Only check data if blocks are different references
    const prevData = prevProps.block.data;
    const nextData = nextProps.block.data;

    return (
        prevData.url === nextData.url &&
        prevData.alt === nextData.alt &&
        prevData.caption === nextData.caption &&
        prevData.alignment === nextData.alignment
    );
});
