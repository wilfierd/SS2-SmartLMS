import React, { useState } from 'react';
import './BlockStyles.css';

const QuizBlock = ({
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
        question: block.data.question || '',
        options: block.data.options || ['', ''],
        correctAnswer: block.data.correctAnswer || 0,
        explanation: block.data.explanation || '',
        showExplanation: false
    });
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showResult, setShowResult] = useState(false);

    const handleSave = () => {
        // Validate quiz data
        if (!localData.question.trim()) {
            alert('Please enter a question');
            return;
        }

        const validOptions = localData.options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
            alert('Please provide at least 2 options');
            return;
        }

        onUpdate({
            question: localData.question,
            options: localData.options,
            correctAnswer: localData.correctAnswer,
            explanation: localData.explanation
        });
        onStopEdit();
    };

    const handleCancel = () => {
        setLocalData({
            question: block.data.question || '',
            options: block.data.options || ['', ''],
            correctAnswer: block.data.correctAnswer || 0,
            explanation: block.data.explanation || '',
            showExplanation: false
        });
        onStopEdit();
    };

    const addOption = () => {
        setLocalData(prev => ({
            ...prev,
            options: [...prev.options, '']
        }));
    };

    const removeOption = (index) => {
        if (localData.options.length <= 2) return; // Keep at least 2 options

        setLocalData(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index),
            correctAnswer: prev.correctAnswer >= index && prev.correctAnswer > 0
                ? prev.correctAnswer - 1
                : prev.correctAnswer
        }));
    };

    const updateOption = (index, value) => {
        setLocalData(prev => ({
            ...prev,
            options: prev.options.map((opt, i) => i === index ? value : opt)
        }));
    };

    const handleAnswerSelect = (answerIndex) => {
        setSelectedAnswer(answerIndex);
        setShowResult(true);

        // Auto-hide result after 3 seconds
        setTimeout(() => {
            setShowResult(false);
            setSelectedAnswer(null);
        }, 3000);
    };

    const resetQuiz = () => {
        setSelectedAnswer(null);
        setShowResult(false);
    };

    const renderQuizPreview = () => {
        if (!block.data.question) {
            return (
                <div className="quiz-placeholder">
                    <div className="placeholder-icon">🧩</div>
                    <p>No quiz question created</p>
                    <button className="add-quiz-btn" onClick={onStartEdit}>
                        Create Quiz
                    </button>
                </div>
            );
        }

        return (
            <div className="quiz-container">
                <div className="quiz-question">
                    <h4>{block.data.question}</h4>
                </div>

                <div className="quiz-options">
                    {block.data.options.filter(opt => opt.trim()).map((option, index) => (
                        <button
                            key={index}
                            className={`quiz-option ${showResult
                                    ? index === block.data.correctAnswer
                                        ? 'correct'
                                        : index === selectedAnswer
                                            ? 'incorrect'
                                            : ''
                                    : selectedAnswer === index
                                        ? 'selected'
                                        : ''
                                }`}
                            onClick={() => !showResult && handleAnswerSelect(index)}
                            disabled={showResult}
                        >
                            <span className="option-letter">
                                {String.fromCharCode(65 + index)}
                            </span>
                            <span className="option-text">{option}</span>
                            {showResult && index === block.data.correctAnswer && (
                                <span className="option-indicator">✅</span>
                            )}
                            {showResult && index === selectedAnswer && index !== block.data.correctAnswer && (
                                <span className="option-indicator">❌</span>
                            )}
                        </button>
                    ))}
                </div>

                {showResult && (
                    <div className={`quiz-result ${selectedAnswer === block.data.correctAnswer ? 'correct' : 'incorrect'}`}>
                        <div className="result-header">
                            {selectedAnswer === block.data.correctAnswer ? (
                                <>
                                    <span className="result-icon">🎉</span>
                                    <span className="result-text">Correct!</span>
                                </>
                            ) : (
                                <>
                                    <span className="result-icon">💭</span>
                                    <span className="result-text">Not quite right</span>
                                </>
                            )}
                        </div>

                        {block.data.explanation && (
                            <div className="quiz-explanation">
                                <p>{block.data.explanation}</p>
                            </div>
                        )}
                    </div>
                )}

                {showResult && (
                    <button className="try-again-btn" onClick={resetQuiz}>
                        🔄 Try Again
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="content-block quiz-block">
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
                    <div className="quiz-editor">
                        <div className="editor-header">
                            <h4>🧩 Mini Quiz</h4>
                            <div className="editor-actions">
                                <button className="save-btn" onClick={handleSave}>
                                    ✅ Save
                                </button>
                                <button className="cancel-btn" onClick={handleCancel}>
                                    ❌ Cancel
                                </button>
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="quiz-question">Question</label>
                                <textarea
                                    id="quiz-question"
                                    value={localData.question}
                                    onChange={(e) => setLocalData({ ...localData, question: e.target.value })}
                                    placeholder="Enter your quiz question..."
                                    rows="3"
                                    className="question-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Answer Options</label>
                                <div className="options-editor">
                                    {localData.options.map((option, index) => (
                                        <div key={index} className="option-editor">
                                            <div className="option-header">
                                                <span className="option-letter">
                                                    {String.fromCharCode(65 + index)}
                                                </span>
                                                <input
                                                    type="radio"
                                                    name="correctAnswer"
                                                    checked={localData.correctAnswer === index}
                                                    onChange={() => setLocalData({ ...localData, correctAnswer: index })}
                                                    title="Mark as correct answer"
                                                />
                                                <label className="correct-label">Correct</label>
                                            </div>

                                            <div className="option-input-group">
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(e) => updateOption(index, e.target.value)}
                                                    placeholder={`Option ${String.fromCharCode(65 + index)}...`}
                                                    className="option-input"
                                                />
                                                {localData.options.length > 2 && (
                                                    <button
                                                        type="button"
                                                        className="remove-option-btn"
                                                        onClick={() => removeOption(index)}
                                                        title="Remove option"
                                                    >
                                                        ❌
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {localData.options.length < 6 && (
                                        <button
                                            type="button"
                                            className="add-option-btn"
                                            onClick={addOption}
                                        >
                                            ➕ Add Option
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="quiz-explanation">Explanation (Optional)</label>
                                <textarea
                                    id="quiz-explanation"
                                    value={localData.explanation}
                                    onChange={(e) => setLocalData({ ...localData, explanation: e.target.value })}
                                    placeholder="Explain why this is the correct answer..."
                                    rows="3"
                                    className="explanation-input"
                                />
                                <small className="input-help">
                                    This will be shown after the student answers
                                </small>
                            </div>
                        </div>

                        {/* Preview */}
                        {localData.question && localData.options.some(opt => opt.trim()) && (
                            <div className="quiz-preview-section">
                                <h5>Preview:</h5>
                                <div className="quiz-preview">
                                    {renderQuizPreview()}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="quiz-display">
                        {renderQuizPreview()}
                    </div>
                )}
            </div>

            {/* Block Type Indicator */}
            <div className="block-type-indicator">
                🧩 Quiz Block
            </div>
        </div>
    );
};

export default QuizBlock;
