// src/components/course/forms/LessonForm.js
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import courseService from '../../../services/courseService';
import notification from '../../../utils/notification';
import './LessonForm.css';

const LessonForm = ({ 
  onClose, 
  onSubmit, 
  modules = [],
  lesson = null, 
  isEdit = false 
}) => {
  const { courseId } = useParams();
  
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    moduleId: lesson?.module_id || (modules.length > 0 ? modules[0].id : ''),
    contentType: lesson?.content_type || 'document',
    content: lesson?.content || '',
    videoUrl: '',
    durationMinutes: lesson?.duration_minutes || 30,
    materials: null,
    isPublished: lesson?.is_published !== undefined ? lesson.is_published : true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);

  const contentTypes = [
    { value: 'document', label: 'Document/Text Content' },
    { value: 'video', label: 'Video Lesson' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'live_session', label: 'Live Session' }
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Lesson title is required';
    }
    
    if (!formData.moduleId) {
      newErrors.moduleId = 'Please select a module';
    }
    
    if (formData.contentType === 'video' && formData.videoUrl && !isValidUrl(formData.videoUrl)) {
      newErrors.videoUrl = 'Please enter a valid URL';
    }
    
    if (formData.durationMinutes < 1 || formData.durationMinutes > 300) {
      newErrors.durationMinutes = 'Duration must be between 1 and 300 minutes';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setFormData(prev => ({
      ...prev,
      materials: e.target.files
    }));
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    
    // Create a new FileList
    const dt = new DataTransfer();
    newFiles.forEach(file => dt.items.add(file));
    
    setFormData(prev => ({
      ...prev,
      materials: dt.files
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const submitData = {
        title: formData.title,
        description: formData.description,
        moduleId: formData.moduleId,
        contentType: formData.contentType,
        content: formData.contentType === 'video' ? formData.videoUrl : formData.content,
        videoUrl: formData.contentType !== 'video' ? formData.videoUrl : null,
        materials: formData.materials
      };

      if (isEdit) {
        await courseService.updateLesson(courseId, lesson.id, submitData);
      } else {
        await courseService.createLesson(courseId, submitData);
      }
      
      onSubmit(); // Refresh parent component
      onClose();
      notification.success(
        isEdit ? 'Lesson updated successfully' : 'Lesson created successfully'
      );
    } catch (error) {
      console.error('Error submitting lesson:', error);
      notification.error(
        isEdit ? 'Failed to update lesson' : 'Failed to create lesson'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="lesson-form-modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Lesson' : 'Create New Lesson'}</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="lesson-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="lesson-title">
                Lesson Title <span className="required">*</span>
              </label>
              <input
                type="text"
                id="lesson-title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter lesson title..."
                className={errors.title ? 'error' : ''}
                maxLength={255}
              />
              {errors.title && (
                <span className="error-message">{errors.title}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lesson-module">
                Module <span className="required">*</span>
              </label>
              <select
                id="lesson-module"
                name="moduleId"
                value={formData.moduleId}
                onChange={handleInputChange}
                className={errors.moduleId ? 'error' : ''}
              >
                <option value="">Select a module...</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
              {errors.moduleId && (
                <span className="error-message">{errors.moduleId}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="lesson-description">
              Description
            </label>
            <textarea
              id="lesson-description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter lesson description (optional)..."
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="content-type">
                Content Type <span className="required">*</span>
              </label>
              <select
                id="content-type"
                name="contentType"
                value={formData.contentType}
                onChange={handleInputChange}
              >
                {contentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="duration">
                Duration (minutes)
              </label>
              <input
                type="number"
                id="duration"
                name="durationMinutes"
                value={formData.durationMinutes}
                onChange={handleInputChange}
                min="1"
                max="300"
                className={errors.durationMinutes ? 'error' : ''}
              />
              {errors.durationMinutes && (
                <span className="error-message">{errors.durationMinutes}</span>
              )}
            </div>
          </div>

          {/* Content Section */}
          {formData.contentType === 'video' ? (
            <div className="form-group">
              <label htmlFor="video-url">
                Video URL <span className="required">*</span>
              </label>
              <input
                type="url"
                id="video-url"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleInputChange}
                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                className={errors.videoUrl ? 'error' : ''}
              />
              {errors.videoUrl && (
                <span className="error-message">{errors.videoUrl}</span>
              )}
              <small className="form-help">
                Supports YouTube, Vimeo, and direct video links
              </small>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="lesson-content">
                Content
              </label>
              <textarea
                id="lesson-content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Enter lesson content..."
                rows="6"
              />
              <small className="form-help">
                You can use HTML formatting for rich text content
              </small>
            </div>
          )}

          {/* Additional Video URL for non-video content types */}
          {formData.contentType !== 'video' && (
            <div className="form-group">
              <label htmlFor="additional-video">
                Additional Video URL (Optional)
              </label>
              <input
                type="url"
                id="additional-video"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleInputChange}
                placeholder="https://youtube.com/watch?v=..."
              />
              <small className="form-help">
                Add a supplementary video for this lesson
              </small>
            </div>
          )}

          {/* File Materials */}
          <div className="form-group">
            <label htmlFor="lesson-materials">
              Lesson Materials
            </label>
            <input
              type="file"
              id="lesson-materials"
              name="materials"
              onChange={handleFileChange}
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.zip,.rar"
            />
            <small className="form-help">
              Upload supporting materials (documents, images, videos, etc.)
            </small>
            
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                <h4>Selected Files:</h4>
                <ul>
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="file-item">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={() => removeFile(index)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isPublished"
                checked={formData.isPublished}
                onChange={handleInputChange}
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">
                Publish immediately
                <small>Students can access this lesson once published</small>
              </span>
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEdit ? 'Update Lesson' : 'Create Lesson'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LessonForm;