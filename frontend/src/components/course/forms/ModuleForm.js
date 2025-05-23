// src/components/course/forms/ModuleForm.js
import React, { useState } from 'react';
import notification from '../../../utils/notification';
import './ModuleForm.css';

const ModuleForm = ({ 
  onClose, 
  onSubmit, 
  module = null, // For editing existing module
  isEdit = false 
}) => {
  const [formData, setFormData] = useState({
    title: module?.title || '',
    description: module?.description || '',
    isPublished: module?.is_published !== undefined ? module.is_published : true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Module title is required';
    }
    
    if (formData.title.length > 255) {
      newErrors.title = 'Title must be less than 255 characters';
    }
    
    if (formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      onClose();
      notification.success(
        isEdit ? 'Module updated successfully' : 'Module created successfully'
      );
    } catch (error) {
      console.error('Error submitting module:', error);
      notification.error(
        isEdit ? 'Failed to update module' : 'Failed to create module'
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
      <div className="module-form-modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Module' : 'Create New Module'}</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="module-form">
          <div className="form-group">
            <label htmlFor="module-title">
              Module Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="module-title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter module title..."
              className={errors.title ? 'error' : ''}
              maxLength={255}
            />
            {errors.title && (
              <span className="error-message">{errors.title}</span>
            )}
            <div className="character-count">
              {formData.title.length}/255
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="module-description">
              Description
            </label>
            <textarea
              id="module-description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter module description (optional)..."
              rows="4"
              className={errors.description ? 'error' : ''}
              maxLength={1000}
            />
            {errors.description && (
              <span className="error-message">{errors.description}</span>
            )}
            <div className="character-count">
              {formData.description.length}/1000
            </div>
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
                <small>Students can access this module once published</small>
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
                isEdit ? 'Update Module' : 'Create Module'
              )}
            </button>
          </div>
        </form>
        
        <div className="form-help">
          <h4>Tips for creating effective modules:</h4>
          <ul>
            <li>Use clear, descriptive titles that indicate the learning objectives</li>
            <li>Keep modules focused on a single topic or concept</li>
            <li>Consider the logical sequence of learning when ordering modules</li>
            <li>Use descriptions to explain what students will learn in this module</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ModuleForm;