// src/components/course/forms/QuizForm.js
import React, { useState } from 'react';
import notification from '../../../utils/notification';
import './QuizForm.css';

const QuizForm = ({ 
  onClose, 
  onSubmit, 
  courseId,
  modules = [],
  quiz = null, 
  isEdit = false 
}) => {
  const [formData, setFormData] = useState({
    title: quiz?.title || '',
    description: quiz?.description || '',
    lessonId: quiz?.lesson_id || '',
    timeLimitMinutes: quiz?.time_limit_minutes || 30,
    passingScore: quiz?.passing_score || 70,
    maxAttempts: quiz?.max_attempts || 1,
    isRandomized: quiz?.is_randomized || false,
    startDate: quiz?.start_date ? new Date(quiz.start_date).toISOString().slice(0, 16) : '',
    endDate: quiz?.end_date ? new Date(quiz.end_date).toISOString().slice(0, 16) : '',
    questions: quiz?.questions || []
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Get all lessons from all modules
  const getAllLessons = () => {
    const lessons = [];
    modules.forEach(module => {
      if (module.lessons) {
        module.lessons.forEach(lesson => {
          lessons.push({
            ...lesson,
            moduleTitle: module.title
          });
        });
      }
    });
    return lessons;
  };

  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True/False' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'essay', label: 'Essay' }
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Quiz title is required';
    }
    
    if (formData.timeLimitMinutes < 1 || formData.timeLimitMinutes > 300) {
      newErrors.timeLimitMinutes = 'Time limit must be between 1 and 300 minutes';
    }
    
    if (formData.passingScore < 0 || formData.passingScore > 100) {
      newErrors.passingScore = 'Passing score must be between 0 and 100';
    }
    
    if (formData.maxAttempts < 1 || formData.maxAttempts > 10) {
      newErrors.maxAttempts = 'Max attempts must be between 1 and 10';
    }
    
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (start >= end) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    
    if (formData.questions.length === 0) {
      newErrors.questions = 'At least one question is required';
    }
    
    // Validate questions
    formData.questions.forEach((question, index) => {
      if (!question.question_text.trim()) {
        newErrors[`question_${index}_text`] = 'Question text is required';
      }
      
      if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
        if (!question.options || question.options.length < 2) {
          newErrors[`question_${index}_options`] = 'At least 2 options are required';
        } else {
          const hasCorrectAnswer = question.options.some(option => option.is_correct);
          if (!hasCorrectAnswer) {
            newErrors[`question_${index}_correct`] = 'At least one correct answer is required';
          }
        }
      }
    });
    
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

  const addQuestion = () => {
    const newQuestion = {
      question_text: '',
      question_type: 'multiple_choice',
      points: 1,
      options: [
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ]
    };
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
    
    setActiveQuestionIndex(formData.questions.length);
  };

  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
    
    if (activeQuestionIndex >= formData.questions.length - 1) {
      setActiveQuestionIndex(Math.max(0, formData.questions.length - 2));
    }
  };

  const updateQuestion = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, i) => 
        i === index ? { ...question, [field]: value } : question
      )
    }));
  };

  const addOption = (questionIndex) => {
    const newOption = { text: '', is_correct: false };
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, i) => 
        i === questionIndex 
          ? { ...question, options: [...question.options, newOption] }
          : question
      )
    }));
  };

  const updateOption = (questionIndex, optionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, i) => 
        i === questionIndex 
          ? {
              ...question,
              options: question.options.map((option, j) => 
                j === optionIndex ? { ...option, [field]: value } : option
              )
            }
          : question
      )
    }));
  };

  const removeOption = (questionIndex, optionIndex) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, i) => 
        i === questionIndex 
          ? {
              ...question,
              options: question.options.filter((_, j) => j !== optionIndex)
            }
          : question
      )
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
        description: formData.description || null,
        lesson_id: formData.lessonId || null,
        time_limit_minutes: parseInt(formData.timeLimitMinutes),
        passing_score: parseInt(formData.passingScore),
        max_attempts: parseInt(formData.maxAttempts),
        is_randomized: formData.isRandomized,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        questions: formData.questions
      };

      await onSubmit(submitData);
      onClose();
      notification.success(
        isEdit ? 'Quiz updated successfully' : 'Quiz created successfully'
      );
    } catch (error) {
      console.error('Error submitting quiz:', error);
      notification.error(
        isEdit ? 'Failed to update quiz' : 'Failed to create quiz'
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

  const lessons = getAllLessons();
  const currentQuestion = formData.questions[activeQuestionIndex];

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="quiz-form-modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Quiz' : 'Create New Quiz'}</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="quiz-form">
          {/* Basic Quiz Information */}
          <div className="form-section">
            <h3>Quiz Information</h3>
            
            <div className="form-group">
              <label htmlFor="quiz-title">
                Quiz Title <span className="required">*</span>
              </label>
              <input
                type="text"
                id="quiz-title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter quiz title..."
                className={errors.title ? 'error' : ''}
                maxLength={255}
              />
              {errors.title && (
                <span className="error-message">{errors.title}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="quiz-description">
                Description
              </label>
              <textarea
                id="quiz-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter quiz description..."
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quiz-lesson">
                  Associated Lesson (Optional)
                </label>
                <select
                  id="quiz-lesson"
                  name="lessonId"
                  value={formData.lessonId}
                  onChange={handleInputChange}
                >
                  <option value="">No specific lesson</option>
                  {lessons.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.moduleTitle} - {lesson.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="time-limit">
                  Time Limit (minutes) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="time-limit"
                  name="timeLimitMinutes"
                  value={formData.timeLimitMinutes}
                  onChange={handleInputChange}
                  min="1"
                  max="300"
                  className={errors.timeLimitMinutes ? 'error' : ''}
                />
                {errors.timeLimitMinutes && (
                  <span className="error-message">{errors.timeLimitMinutes}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="passing-score">
                  Passing Score (%) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="passing-score"
                  name="passingScore"
                  value={formData.passingScore}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  className={errors.passingScore ? 'error' : ''}
                />
                {errors.passingScore && (
                  <span className="error-message">{errors.passingScore}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="max-attempts">
                  Max Attempts <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="max-attempts"
                  name="maxAttempts"
                  value={formData.maxAttempts}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  className={errors.maxAttempts ? 'error' : ''}
                />
                {errors.maxAttempts && (
                  <span className="error-message">{errors.maxAttempts}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start-date">
                  Start Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  id="start-date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="end-date">
                  End Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  id="end-date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={errors.endDate ? 'error' : ''}
                />
                {errors.endDate && (
                  <span className="error-message">{errors.endDate}</span>
                )}
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isRandomized"
                  checked={formData.isRandomized}
                  onChange={handleInputChange}
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-text">
                  Randomize question order
                  <small>Questions will appear in random order for each attempt</small>
                </span>
              </label>
            </div>
          </div>

          {/* Questions Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>Questions ({formData.questions.length})</h3>
              <button
                type="button"
                className="add-question-btn"
                onClick={addQuestion}
              >
                + Add Question
              </button>
            </div>

            {errors.questions && (
              <div className="error-message">{errors.questions}</div>
            )}

            {formData.questions.length > 0 && (
              <div className="questions-container">
                {/* Question Tabs */}
                <div className="question-tabs">
                  {formData.questions.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`question-tab ${activeQuestionIndex === index ? 'active' : ''}`}
                      onClick={() => setActiveQuestionIndex(index)}
                    >
                      Q{index + 1}
                    </button>
                  ))}
                </div>

                {/* Current Question Editor */}
                {currentQuestion && (
                  <div className="question-editor">
                    <div className="question-header">
                      <h4>Question {activeQuestionIndex + 1}</h4>
                      <button
                        type="button"
                        className="remove-question-btn"
                        onClick={() => removeQuestion(activeQuestionIndex)}
                        disabled={formData.questions.length === 1}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Question Type</label>
                        <select
                          value={currentQuestion.question_type}
                          onChange={(e) => updateQuestion(activeQuestionIndex, 'question_type', e.target.value)}
                        >
                          {questionTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Points</label>
                        <input
                          type="number"
                          value={currentQuestion.points}
                          onChange={(e) => updateQuestion(activeQuestionIndex, 'points', parseInt(e.target.value))}
                          min="1"
                          max="10"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Question Text</label>
                      <textarea
                        value={currentQuestion.question_text}
                        onChange={(e) => updateQuestion(activeQuestionIndex, 'question_text', e.target.value)}
                        placeholder="Enter your question..."
                        rows="3"
                        className={errors[`question_${activeQuestionIndex}_text`] ? 'error' : ''}
                      />
                      {errors[`question_${activeQuestionIndex}_text`] && (
                        <span className="error-message">{errors[`question_${activeQuestionIndex}_text`]}</span>
                      )}
                    </div>

                    {/* Options for multiple choice and true/false */}
                    {(currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'true_false') && (
                      <div className="options-section">
                        <div className="options-header">
                          <label>Answer Options</label>
                          {currentQuestion.question_type === 'multiple_choice' && (
                            <button
                              type="button"
                              className="add-option-btn"
                              onClick={() => addOption(activeQuestionIndex)}
                            >
                              + Add Option
                            </button>
                          )}
                        </div>

                        {errors[`question_${activeQuestionIndex}_options`] && (
                          <span className="error-message">{errors[`question_${activeQuestionIndex}_options`]}</span>
                        )}
                        {errors[`question_${activeQuestionIndex}_correct`] && (
                          <span className="error-message">{errors[`question_${activeQuestionIndex}_correct`]}</span>
                        )}

                        <div className="options-list">
                          {currentQuestion.options?.map((option, optionIndex) => (
                            <div key={optionIndex} className="option-item">
                              <div className="option-content">
                                <label className="option-correct">
                                  <input
                                    type={currentQuestion.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                                    name={`question_${activeQuestionIndex}_correct`}
                                    checked={option.is_correct}
                                    onChange={(e) => {
                                      if (currentQuestion.question_type === 'true_false') {
                                        // For true/false, only one can be correct
                                        const updatedOptions = currentQuestion.options.map((opt, i) => ({
                                          ...opt,
                                          is_correct: i === optionIndex
                                        }));
                                        updateQuestion(activeQuestionIndex, 'options', updatedOptions);
                                      } else {
                                        updateOption(activeQuestionIndex, optionIndex, 'is_correct', e.target.checked);
                                      }
                                    }}
                                  />
                                  <span>Correct</span>
                                </label>

                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => updateOption(activeQuestionIndex, optionIndex, 'text', e.target.value)}
                                  placeholder={
                                    currentQuestion.question_type === 'true_false' 
                                      ? (optionIndex === 0 ? 'True' : 'False')
                                      : `Option ${optionIndex + 1}...`
                                  }
                                  readOnly={currentQuestion.question_type === 'true_false'}
                                />

                                {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options.length > 2 && (
                                  <button
                                    type="button"
                                    className="remove-option-btn"
                                    onClick={() => removeOption(activeQuestionIndex, optionIndex)}
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
                                                  <div className="loading-spinner" style={{display: 'inline-block', width: '16px', height: '16px'}}>Loading...</div>
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEdit ? 'Update Quiz' : 'Create Quiz'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuizForm;