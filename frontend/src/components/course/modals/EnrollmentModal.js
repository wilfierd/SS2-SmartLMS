// src/components/course/modals/EnrollmentModal.js
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import notification from '../../../utils/notification';
import './EnrollmentModal.css';

const EnrollmentModal = ({ onClose, onEnroll }) => {
  const { courseId } = useParams();
  const [enrollmentKey, setEnrollmentKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleEnroll = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onEnroll(enrollmentKey || null);
      onClose();
      notification.success('Successfully enrolled in the course!');
    } catch (error) {
      console.error('Error enrolling in course:', error);
      
      // Check if error is related to enrollment key
      if (error.message.includes('enrollment key') || error.message.includes('key required')) {
        setShowKeyInput(true);
        notification.error('This course requires an enrollment key. Please enter the key provided by your instructor.');
      } else {
        notification.error(error.message || 'Failed to enroll in course');
      }
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
      <div className="enrollment-modal">
        <div className="modal-header">
          <h2>Enroll in Course</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        
        <div className="modal-content">
          <div className="enrollment-info">
            <div className="enrollment-icon">
              🎓
            </div>
            <h3>Ready to start learning?</h3>
            <p>
              You're about to enroll in this course. Once enrolled, you'll have access to 
              all course materials, assignments, and quizzes.
            </p>
          </div>

          <form onSubmit={handleEnroll} className="enrollment-form">
            {showKeyInput && (
              <div className="form-group">
                <label htmlFor="enrollment-key">
                  Enrollment Key <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="enrollment-key"
                  value={enrollmentKey}
                  onChange={(e) => setEnrollmentKey(e.target.value)}
                  placeholder="Enter the enrollment key provided by your instructor"
                  required={showKeyInput}
                  autoFocus
                />
                <small className="form-help">
                  Ask your instructor for the enrollment key if you don't have it.
                </small>
              </div>
            )}

            <div className="enrollment-benefits">
              <h4>What you'll get:</h4>
              <ul>
                <li>
                  <span className="benefit-icon">📚</span>
                  Access to all course materials and lessons
                </li>
                <li>
                  <span className="benefit-icon">📝</span>
                  Ability to submit assignments and take quizzes
                </li>
                <li>
                  <span className="benefit-icon">💬</span>
                  Participate in course discussions
                </li>
                <li>
                  <span className="benefit-icon">📊</span>
                  Track your progress and grades
                </li>
                <li>
                  <span className="benefit-icon">🎯</span>
                  Receive feedback from instructors
                </li>
              </ul>
            </div>

            <div className="enrollment-actions">
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
                className="enroll-btn"
                disabled={isSubmitting || (showKeyInput && !enrollmentKey.trim())}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Enrolling...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">✅</span>
                    Enroll Now
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="enrollment-terms">
            <p>
              <small>
                By enrolling, you agree to participate actively in the course and 
                follow the course guidelines set by the instructor.
              </small>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentModal;