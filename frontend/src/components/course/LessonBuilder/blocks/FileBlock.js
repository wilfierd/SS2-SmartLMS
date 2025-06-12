import React, { useState, useRef } from 'react';
import './BlockStyles.css';

const FileBlock = ({
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
        files: block.data.files || [],
        description: block.data.description || '',
        newFiles: []
    });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const fileInputRef = useRef(null);

    const handleSave = async () => {
        if (localData.newFiles.length > 0) {
            await uploadFiles();
        } else {
            onUpdate({
                files: localData.files,
                description: localData.description
            });
            onStopEdit();
        }
    };

    const handleCancel = () => {
        setLocalData({
            files: block.data.files || [],
            description: block.data.description || '',
            newFiles: []
        });
        setUploadProgress({});
        setIsUploading(false);
        onStopEdit();
    };

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setLocalData(prev => ({
            ...prev,
            newFiles: [...prev.newFiles, ...selectedFiles]
        }));
    };

    const removeNewFile = (index) => {
        setLocalData(prev => ({
            ...prev,
            newFiles: prev.newFiles.filter((_, i) => i !== index)
        }));
    };

    const removeExistingFile = (index) => {
        setLocalData(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    const uploadFiles = async () => {
        if (localData.newFiles.length === 0) return;

        setIsUploading(true);

        try {
            const uploadedFiles = [];

            for (let i = 0; i < localData.newFiles.length; i++) {
                const file = localData.newFiles[i];
                const formData = new FormData();
                formData.append('file', file);

                // Simulate upload progress
                setUploadProgress(prev => ({ ...prev, [i]: 0 }));

                const progressInterval = setInterval(() => {
                    setUploadProgress(prev => ({
                        ...prev,
                        [i]: Math.min((prev[i] || 0) + 10, 90)
                    }));
                }, 100);

                try {
                    // TODO: Replace with actual upload API call
                    // const response = await uploadAPI.uploadLessonFile(formData);

                    // Simulate API response
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    clearInterval(progressInterval);
                    setUploadProgress(prev => ({ ...prev, [i]: 100 }));

                    // TODO: Use actual uploaded file data from API response
                    uploadedFiles.push({
                        id: `file_${Date.now()}_${i}`,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        url: URL.createObjectURL(file), // For now, use object URL
                        uploadedAt: new Date().toISOString()
                    });
                } catch (error) {
                    clearInterval(progressInterval);
                    console.error(`Failed to upload ${file.name}:`, error);
                }
            }

            onUpdate({
                files: [...localData.files, ...uploadedFiles],
                description: localData.description
            });

            onStopEdit();
        } catch (error) {
            console.error('File upload failed:', error);
            alert('Failed to upload files. Please try again.');
        } finally {
            setIsUploading(false);
            setUploadProgress({});
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileType) => {
        if (fileType.startsWith('image/')) return '🖼️';
        if (fileType.startsWith('video/')) return '🎥';
        if (fileType.startsWith('audio/')) return '🎵';
        if (fileType.includes('pdf')) return '📄';
        if (fileType.includes('word') || fileType.includes('document')) return '📝';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
        if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
        if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return '📦';
        return '📁';
    };

    const downloadFile = (file) => {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderFileList = (files, isNew = false) => {
        if (files.length === 0) return null;

        return (
            <div className="file-list">
                {files.map((file, index) => (
                    <div key={isNew ? `new-${index}` : file.id || index} className="file-item">
                        <div className="file-icon">
                            {getFileIcon(file.type)}
                        </div>
                        <div className="file-info">
                            <div className="file-name">{file.name}</div>
                            <div className="file-meta">
                                <span className="file-size">{formatFileSize(file.size)}</span>
                                {file.uploadedAt && (
                                    <span className="file-date">
                                        Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            {isUploading && isNew && uploadProgress[index] !== undefined && (
                                <div className="file-progress">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${uploadProgress[index]}%` }}
                                        ></div>
                                    </div>
                                    <span className="progress-text">{uploadProgress[index]}%</span>
                                </div>
                            )}
                        </div>
                        <div className="file-actions">
                            {!isNew && !isEditing && (
                                <button
                                    className="download-btn"
                                    onClick={() => downloadFile(file)}
                                    title="Download"
                                >
                                    ⬇️
                                </button>
                            )}
                            {isEditing && (
                                <button
                                    className="remove-btn"
                                    onClick={() => isNew ? removeNewFile(index) : removeExistingFile(index)}
                                    disabled={isUploading}
                                    title="Remove"
                                >
                                    ❌
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="content-block file-block">
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
                    <div className="file-editor">
                        <div className="editor-header">
                            <h4>📁 File Downloads</h4>
                            <div className="editor-actions">
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
                            <div className="form-group">
                                <label htmlFor="file-description">Description (Optional)</label>
                                <textarea
                                    id="file-description"
                                    value={localData.description}
                                    onChange={(e) => setLocalData({ ...localData, description: e.target.value })}
                                    placeholder="Describe these files and how students should use them..."
                                    rows="3"
                                    className="description-input"
                                    disabled={isUploading}
                                />
                            </div>

                            <div className="upload-section">
                                <button
                                    type="button"
                                    className="upload-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    📁 Add Files
                                </button>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.zip,.rar"
                                />

                                <small className="upload-help">
                                    Supported: Documents, Images, Videos, Audio, Archives
                                </small>
                            </div>
                        </div>

                        {/* Existing Files */}
                        {localData.files.length > 0 && (
                            <div className="files-section">
                                <h5>📋 Current Files:</h5>
                                {renderFileList(localData.files, false)}
                            </div>
                        )}

                        {/* New Files to Upload */}
                        {localData.newFiles.length > 0 && (
                            <div className="files-section">
                                <h5>📤 Files to Upload:</h5>
                                {renderFileList(localData.newFiles, true)}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="file-display">
                        {block.data.description && (
                            <div className="file-description">
                                <p>{block.data.description}</p>
                            </div>
                        )}

                        {block.data.files && block.data.files.length > 0 ? (
                            <>
                                <div className="files-header">
                                    <h4>📁 Download Files ({block.data.files.length})</h4>
                                </div>
                                {renderFileList(block.data.files, false)}
                            </>
                        ) : (
                            <div className="file-placeholder">
                                <div className="placeholder-icon">📁</div>
                                <p>No files available</p>
                                <button className="add-files-btn" onClick={onStartEdit}>
                                    Add Files
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Block Type Indicator */}
            <div className="block-type-indicator">
                📁 File Block
            </div>
        </div>
    );
};

export default FileBlock;
