// Dynamic Lesson Builder Component
import React, { useState, useRef } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useParams } from 'react-router-dom';
import courseService from '../../../services/courseService';
import notification from '../../../utils/notification';
import './LessonBuilder.css';

// Content Block Components
import TextBlock from './blocks/TextBlock';
import VideoBlock from './blocks/VideoBlock';
import ImageBlock from './blocks/ImageBlock';
import FileBlock from './blocks/FileBlock';
import QuizBlock from './blocks/QuizBlock';
import EmbedBlock from './blocks/EmbedBlock';

// Sortable Item Component for drag and drop
const SortableItem = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`content-block-wrapper ${isDragging ? 'is-dragging' : ''}`}
        >
            {/* Drag Handle */}
            <div
                className="drag-handle"
                {...listeners}
                title="Drag to reorder"
            >
                ⋮⋮
            </div>
            {children}
        </div>
    );
};

const LessonBuilder = ({ onClose, onSubmit, modules = [], lesson = null, isEdit = false }) => {
    const { courseId } = useParams();
    const [lessonData, setLessonData] = useState({
        title: lesson?.title || '',
        description: lesson?.description || '',
        moduleId: lesson?.module_id || (modules.length > 0 ? modules[0].id : ''),
        durationMinutes: lesson?.duration_minutes || 30,
        isPublished: lesson?.is_published !== undefined ? lesson.is_published : true
    });

    const [contentBlocks, setContentBlocks] = useState(
        lesson?.content_blocks || []
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [editingBlock, setEditingBlock] = useState(null);
    const addMenuRef = useRef(null);

    // Track the editing state separately
    const [isInEditMode, setIsInEditMode] = useState(isEdit);
    const [currentLesson, setCurrentLesson] = useState(lesson);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Available block types
    const blockTypes = [
        { type: 'text', icon: '📝', label: 'Text Block', description: 'Add rich text content' },
        { type: 'video', icon: '🎥', label: 'Video', description: 'YouTube, Vimeo or upload' },
        { type: 'image', icon: '🖼️', label: 'Image', description: 'Upload or link images' },
        { type: 'file', icon: '📁', label: 'Files', description: 'Documents and downloads' },
        { type: 'quiz', icon: '🧩', label: 'Mini Quiz', description: 'Quick knowledge check' },
        { type: 'embed', icon: '🔗', label: 'Embed', description: 'External content (iframe)' }
    ];
    // Handle drag and drop reordering
    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setContentBlocks((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Add new content block
    const addBlock = (type) => {
        const newBlock = {
            id: `block_${Date.now()}`,
            type,
            data: getDefaultBlockData(type),
            order: contentBlocks.length
        };

        setContentBlocks([...contentBlocks, newBlock]);
        setShowAddMenu(false);
        setEditingBlock(newBlock.id);
    };

    // Get default data for block type
    const getDefaultBlockData = (type) => {
        switch (type) {
            case 'text':
                return { content: '', style: 'paragraph' };
            case 'video':
                return { url: '', title: '', autoplay: false };
            case 'image':
                return { url: '', alt: '', caption: '', alignment: 'center' };
            case 'file':
                return { files: [], description: '' };
            case 'quiz':
                return { question: '', options: ['', ''], correctAnswer: 0, explanation: '' };
            case 'embed':
                return { url: '', height: 400, title: '' };
            default:
                return {};
        }
    };

    // Update block data
    const updateBlock = (blockId, newData) => {
        setContentBlocks(contentBlocks.map(block =>
            block.id === blockId ? { ...block, data: { ...block.data, ...newData } } : block
        ));
    };

    // Delete block
    const deleteBlock = (blockId) => {
        setContentBlocks(contentBlocks.filter(block => block.id !== blockId));
        setEditingBlock(null);
    };

    // Duplicate block
    const duplicateBlock = (blockId) => {
        const blockToDuplicate = contentBlocks.find(block => block.id === blockId);
        if (blockToDuplicate) {
            const newBlock = {
                ...blockToDuplicate,
                id: `block_${Date.now()}`,
                order: contentBlocks.length
            };
            setContentBlocks([...contentBlocks, newBlock]);
        }
    };

    // Move block up/down
    const moveBlock = (blockId, direction) => {
        const currentIndex = contentBlocks.findIndex(block => block.id === blockId);
        if (
            (direction === 'up' && currentIndex === 0) ||
            (direction === 'down' && currentIndex === contentBlocks.length - 1)
        ) {
            return;
        }

        const newBlocks = [...contentBlocks];
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        [newBlocks[currentIndex], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[currentIndex]];

        setContentBlocks(newBlocks);
    };

    // Render content block
    const renderBlock = (block, index) => {
        const isEditing = editingBlock === block.id;

        const blockProps = {
            block,
            isEditing,
            onUpdate: (data) => updateBlock(block.id, data),
            onStartEdit: () => setEditingBlock(block.id),
            onStopEdit: () => setEditingBlock(null),
            onDelete: () => deleteBlock(block.id),
            onDuplicate: () => duplicateBlock(block.id),
            onMoveUp: () => moveBlock(block.id, 'up'),
            onMoveDown: () => moveBlock(block.id, 'down'),
            canMoveUp: index > 0,
            canMoveDown: index < contentBlocks.length - 1
        };

        switch (block.type) {
            case 'text':
                return <TextBlock {...blockProps} />;
            case 'video':
                return <VideoBlock {...blockProps} />;
            case 'image':
                return <ImageBlock {...blockProps} />;
            case 'file':
                return <FileBlock {...blockProps} />;
            case 'quiz':
                return <QuizBlock {...blockProps} />;
            case 'embed':
                return <EmbedBlock {...blockProps} />;
            default:
                return <div>Unknown block type: {block.type}</div>;
        }
    };    // Create initial lesson (simple form)
    const handleCreateLesson = async () => {
        if (!lessonData.title.trim()) {
            notification.error('Please enter a lesson title');
            return;
        }

        if (!lessonData.moduleId) {
            notification.error('Please select a module');
            return;
        }

        setIsSubmitting(true); try {
            const submitData = {
                title: lessonData.title,
                description: lessonData.description,
                moduleId: parseInt(lessonData.moduleId),
                durationMinutes: lessonData.durationMinutes,
                isPublished: lessonData.isPublished,
                contentType: 'rich_content',
                content: JSON.stringify([]), // Store content blocks as JSON string
                contentBlocks: [] // Start with empty content blocks
            };

            console.log('Creating lesson with data:', submitData);
            const result = await courseService.createLesson(courseId, submitData);

            // Switch to edit mode with the created lesson
            setCurrentLesson({ ...submitData, id: result.lessonId });
            setIsInEditMode(true);

            notification.success('Lesson created! Now add your content blocks.');
        } catch (error) {
            console.error('Error creating lesson:', error);
            notification.error('Failed to create lesson');
        } finally {
            setIsSubmitting(false);
        }
    };    // Save lesson content (when editing)
    const handleSaveContent = async () => {
        setIsSubmitting(true); try {
            const submitData = {
                title: lessonData.title,
                description: lessonData.description,
                moduleId: parseInt(lessonData.moduleId),
                durationMinutes: lessonData.durationMinutes,
                isPublished: lessonData.isPublished,
                contentType: 'rich_content',
                content: JSON.stringify(contentBlocks.map((block, index) => ({ ...block, order: index }))),
                contentBlocks: contentBlocks.map((block, index) => ({ ...block, order: index }))
            };

            await courseService.updateLesson(courseId, currentLesson.id, submitData);

            onSubmit();
            onClose();
            notification.success('Lesson updated successfully');
        } catch (error) {
            console.error('Error updating lesson:', error);
            notification.error('Failed to update lesson');
        } finally {
            setIsSubmitting(false);
        }
    }; return (
        <div className="lesson-builder-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>            <div className="lesson-builder-container">
            {!isInEditMode ? (
                // Simple Lesson Creation Form
                <div className="lesson-creation-form">
                    <div className="form-header">
                        <h2>Create New Lesson</h2>
                        <button className="close-btn" onClick={onClose}>✕</button>
                    </div>

                    <div className="form-content">
                        <div className="form-group">
                            <label>Lesson Title *</label>
                            <input
                                type="text"
                                value={lessonData.title}
                                onChange={(e) => setLessonData({ ...lessonData, title: e.target.value })}
                                placeholder="Enter lesson title..."
                                className="lesson-title-input"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Module *</label>
                                <select
                                    value={lessonData.moduleId}
                                    onChange={(e) => setLessonData({ ...lessonData, moduleId: e.target.value })}
                                    className="module-select"
                                >
                                    <option value="">Select module...</option>
                                    {modules.map(module => (
                                        <option key={module.id} value={module.id}>{module.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Duration (minutes)</label>
                                <input
                                    type="number"
                                    value={lessonData.durationMinutes}
                                    onChange={(e) => setLessonData({ ...lessonData, durationMinutes: parseInt(e.target.value) })}
                                    min="1"
                                    max="300"
                                    className="duration-input"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={lessonData.description}
                                onChange={(e) => setLessonData({ ...lessonData, description: e.target.value })}
                                placeholder="Brief description of this lesson..."
                                rows="3"
                                className="description-textarea"
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                className="cancel-btn"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="create-btn"
                                onClick={handleCreateLesson}
                                disabled={isSubmitting || !lessonData.title.trim() || !lessonData.moduleId}
                            >
                                {isSubmitting ? 'Creating...' : 'Create & Start Building'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // Lesson Content Builder
                <>
                    {/* Header */}
                    <div className="lesson-builder-header">
                        <div className="header-content">
                            <div className="lesson-info">
                                <h2>{lessonData.title}</h2>
                                <span className="lesson-module">
                                    {modules.find(m => m.id == lessonData.moduleId)?.title}
                                </span>
                            </div>
                            <div className="header-actions">
                                <button
                                    className="preview-btn"
                                    onClick={() => setEditingBlock(null)}
                                >
                                    👁️ Preview
                                </button>
                                <button
                                    className="save-btn"
                                    onClick={handleSaveContent}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? '💾 Saving...' : '💾 Save Lesson'}
                                </button>
                                <button className="close-btn" onClick={onClose}>✕</button>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="lesson-builder-content">
                        <div className="content-canvas">
                            {contentBlocks.length === 0 ? (
                                // Empty state
                                <div className="empty-canvas">
                                    <div className="empty-state">
                                        <div className="empty-icon">📋</div>
                                        <h3>Start Building Your Lesson</h3>
                                        <p>Add content blocks to create an engaging lesson experience</p>
                                        <button
                                            className="add-first-block-btn"
                                            onClick={() => setShowAddMenu(true)}
                                        >
                                            + Add Your First Block
                                        </button>
                                    </div>
                                </div>) : (
                                // Content blocks
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={contentBlocks.map(block => block.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="content-blocks-container">
                                            {contentBlocks.map((block, index) => (
                                                <SortableItem key={block.id} id={block.id}>
                                                    {renderBlock(block, index)}
                                                </SortableItem>
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}

                            {/* Add Block Button */}
                            {contentBlocks.length > 0 && (
                                <div className="add-block-section">
                                    <button
                                        className="add-block-btn"
                                        onClick={() => setShowAddMenu(true)}
                                    >
                                        + Add Content Block
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Publishing Toggle */}
                    <div className="publishing-section">
                        <label className="publish-toggle">
                            <input
                                type="checkbox"
                                checked={lessonData.isPublished}
                                onChange={(e) => setLessonData({ ...lessonData, isPublished: e.target.checked })}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">
                                {lessonData.isPublished ? 'Published - Students can access' : 'Draft - Only visible to you'}
                            </span>
                        </label>
                    </div>
                </>
            )}                {/* Add Block Menu (only in edit mode) */}
            {isInEditMode && showAddMenu && (
                <div className="add-block-menu-overlay" onClick={() => setShowAddMenu(false)}>
                    <div className="add-block-menu" ref={addMenuRef} onClick={(e) => e.stopPropagation()}>
                        <div className="menu-header">
                            <h3>Add Content Block</h3>
                            <button onClick={() => setShowAddMenu(false)}>✕</button>
                        </div>
                        <div className="block-types-grid">
                            {blockTypes.map(blockType => (
                                <div
                                    key={blockType.type}
                                    className="block-type-card"
                                    onClick={() => addBlock(blockType.type)}
                                >
                                    <div className="block-icon">{blockType.icon}</div>
                                    <div className="block-info">
                                        <h4>{blockType.label}</h4>
                                        <p>{blockType.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
};

export default LessonBuilder;
