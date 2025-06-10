// src/components/course/forms/AssignmentForm.js
import React, { useState } from 'react';
import notification from '../../../utils/notification';
import './AssignmentForm.css';

const AssignmentForm = ({ 
  onClose, 
  onSubmit, 
  courseId,
  modules = [],
  assignment = null, 
  isEdit = false 
}) => {
  const [formData, setFormData] = useState({
    title: assignment?.title || '',
    description: assignment?.description || '',
    instructions: assignment?.instructions || '',
    lessonId: assignment?.lesson_id || '',
    maxPoints: assignment?.max_points || 100,
    dueDate: assignment?.due_date ? new Date(assignment.due_date).toISOString().slice(0, 16) : '',
    allowLateSubmissions: assignment?.allow_late_submissions || false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Get all modules for assignment association
  const getAllModules = () => {
    return modules.map(module => ({
      id: module.id,
      title: module.title,
      description: module.description
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Assignment title is required';
    }
    
    if (formData.title.length > 255) {
      newErrors.title = 'Title must be less than 255 characters';
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const dueDate = new Date(formData.dueDate);
      const now = new Date();
      if (dueDate <= now) {
        newErrors.dueDate = 'Due date must be in the future';
      }
    }
    
    if (formData.maxPoints < 1 || formData.maxPoints > 1000) {
      newErrors.maxPoints = 'Points must be between 1 and 1000';
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
      const submitData = {
        title: formData.title,
        description: formData.description || null,
        instructions: formData.instructions || null,
        lesson_id: formData.lessonId || null,
        max_points: parseInt(formData.maxPoints),
        due_date: formData.dueDate,
        allow_late_submissions: formData.allowLateSubmissions
      };

      await onSubmit(submitData);
      onClose();
      notification.success(
        isEdit ? 'Assignment updated successfully' : 'Assignment created successfully'
      );
    } catch (error) {
      console.error('Error submitting assignment:', error);
      notification.error(
        isEdit ? 'Failed to update assignment' : 'Failed to create assignment'
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
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().slice(0, 16);
  };

  const availableModules = getAllModules();

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="assignment-form-modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Assignment' : 'Create New Assignment'}</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="assignment-form">
          <div className="form-group">
            <label htmlFor="assignment-title">
              Assignment Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="assignment-title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter assignment title..."
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
            <label htmlFor="assignment-description">
              Description
            </label>
            <textarea
              id="assignment-description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter assignment description..."
              rows="3"
            />
            <small className="form-help">
              Brief overview of what this assignment is about
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="assignment-instructions">
              Instructions
            </label>
            <textarea
              id="assignment-instructions"
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              placeholder="Enter detailed instructions for completing this assignment..."
              rows="6"
            />
            <small className="form-help">
              Detailed instructions on how students should complete this assignment
            </small>
          </div>          <div className="form-row">
            <div className="form-group">
              <label htmlFor="assignment-module">
                Associated Module (Optional)
              </label>
              <select
                id="assignment-module"
                name="lessonId"
                value={formData.lessonId}
                onChange={handleInputChange}
              >
                <option value="">No specific module</option>
                {getAllModules().map(module => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
              <small className="form-help">
                Link this assignment to a specific module
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="max-points">
                Maximum Points <span className="required">*</span>
              </label>
              <input
                type="number"
                id="max-points"
                name="maxPoints"
                value={formData.maxPoints}
                onChange={handleInputChange}
                min="1"
                max="1000"
                className={errors.maxPoints ? 'error' : ''}
              />
              {errors.maxPoints && (
                <span className="error-message">{errors.maxPoints}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="due-date">
              Due Date <span className="required">*</span>
            </label>
            <input
              type="datetime-local"
              id="due-date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className={errors.dueDate ? 'error' : ''}
              min={new Date().toISOString().slice(0, 16)}
            />
            {errors.dueDate && (
              <span className="error-message">{errors.dueDate}</span>
            )}
            <small className="form-help">
              When should students submit this assignment by?
            </small>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="allowLateSubmissions"
                checked={formData.allowLateSubmissions}
                onChange={handleInputChange}
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">
                Allow late submissions
                <small>Students can submit after the due date</small>
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
                isEdit ? 'Update Assignment' : 'Create Assignment'
              )}
            </button>
          </div>
        </form>
        
        <div className="form-help">
          <h4>Assignment Tips:</h4>
          <ul>
            <li>Provide clear, specific instructions for what students need to do</li>
            <li>Include evaluation criteria or rubrics in the instructions</li>
            <li>Set realistic due dates that give students enough time to complete the work</li>
            <li>Consider allowing late submissions with point deductions if appropriate</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssignmentForm;