// Inline Lesson Content Component - View and Edit Mode
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import courseService from '../../../services/courseService';
import notification from '../../../utils/notification';
import VideoPlayer from '../VideoPlayer';

// Content Block Components
import TextBlock from '../LessonBuilder/blocks/TextBlock';
import VideoBlock from '../LessonBuilder/blocks/VideoBlock';
import ImageBlock from '../LessonBuilder/blocks/ImageBlock';
import FileBlock from '../LessonBuilder/blocks/FileBlock';
import QuizBlock from '../LessonBuilder/blocks/QuizBlock';
import EmbedBlock from '../LessonBuilder/blocks/EmbedBlock';

import './LessonContent.css';

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
            {...listeners}
            className={isDragging ? 'is-dragging' : ''}
        >
            {children}
        </div>
    );
};

const LessonContent = ({
    lesson,
    selectedModule,
    isInstructor,
    onLessonUpdate,
    isCreatingLesson,
    onLessonCreated,
    onCancelCreate,
    modules
}) => {
    const { courseId } = useParams();
    const [isEditing, setIsEditing] = useState(false);
    const [contentBlocks, setContentBlocks] = useState([]);
    const [editingBlock, setEditingBlock] = useState(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Lesson creation form state
    const [lessonForm, setLessonForm] = useState({
        title: '',
        description: '',
        moduleId: selectedModule || ''
    });

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
    ];    // Initialize content blocks from lesson
    useEffect(() => {
        if (lesson?.content) {
            try {
                // Try to parse as JSON (new format)
                const blocks = JSON.parse(lesson.content);
                setContentBlocks(Array.isArray(blocks) ? blocks : []);
            } catch (error) {
                // If parsing fails, it's old format (plain text/HTML) - convert it
                console.log('Converting legacy content to block format');
                const legacyBlock = {
                    id: `legacy_${Date.now()}`,
                    type: 'text',
                    data: { 
                        content: lesson.content, 
                        style: 'paragraph' 
                    },
                    order: 0
                };
                setContentBlocks([legacyBlock]);
            }
        } else {
            setContentBlocks([]);
        }
    }, [lesson]);

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
    };    // Save lesson content
    const handleSaveContent = async () => {
        setIsSubmitting(true);

        try {
            const submitData = {
                title: lesson.title,
                description: lesson.description,
                moduleId: lesson.moduleId || selectedModule, // Use lesson's moduleId or fall back to selected module
                durationMinutes: lesson.durationMinutes,
                isPublished: lesson.isPublished,
                contentType: 'rich_content',
                content: JSON.stringify(contentBlocks.map((block, index) => ({ ...block, order: index })))
            };

            await courseService.updateLesson(courseId, lesson.id, submitData);
            setIsEditing(false);
            setEditingBlock(null);
            onLessonUpdate();
            notification.success('Lesson content updated successfully');
        } catch (error) {
            console.error('Error updating lesson:', error);
            notification.error('Failed to update lesson content');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cancel editing
    const handleCancelEdit = () => {
        // Reset content blocks to original state
        if (lesson?.content) {
            try {
                const blocks = JSON.parse(lesson.content);
                setContentBlocks(Array.isArray(blocks) ? blocks : []);
            } catch (error) {
                setContentBlocks([]);
            }
        } else {
            setContentBlocks([]);
        } setIsEditing(false);
        setEditingBlock(null);
        setShowAddMenu(false);
    };

    // Create new lesson
    const handleCreateLesson = async () => {
        if (!lessonForm.title.trim()) {
            notification.error('Please enter a lesson title');
            return;
        }

        if (!lessonForm.moduleId) {
            notification.error('Please select a module');
            return;
        }

        setIsSubmitting(true);

        try {
            const submitData = {
                title: lessonForm.title,
                description: lessonForm.description,
                moduleId: parseInt(lessonForm.moduleId),
                durationMinutes: 0,
                isPublished: true,
                contentType: 'rich_content',
                content: JSON.stringify(contentBlocks.map((block, index) => ({ ...block, order: index })))
            };

            await courseService.createLesson(courseId, submitData);
            notification.success('Lesson created successfully');
            onLessonCreated();

            // Reset form
            setLessonForm({
                title: '',
                description: '',
                moduleId: selectedModule || ''
            });
            setContentBlocks([]);
        } catch (error) {
            console.error('Error creating lesson:', error);
            notification.error('Failed to create lesson');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render content block
    const renderBlock = (block, index, isEditMode = false) => {
        const isBlockEditing = isEditMode && editingBlock === block.id;

        const blockProps = {
            block,
            isEditing: isBlockEditing,
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

        // In view mode, render read-only version
        if (!isEditMode) {
            return (
                <div key={block.id} className="content-block-readonly">
                    {renderReadOnlyBlock(block)}
                </div>
            );
        }

        // In edit mode, render editable blocks
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
    };

    // Render read-only block for view mode
    const renderReadOnlyBlock = (block) => {
        switch (block.type) {
            case 'text':
                return (
                    <div className={`text-content text-${block.data.style}`}>
                        <div dangerouslySetInnerHTML={{ __html: block.data.content }} />
                    </div>
                );
            case 'video':
                return (
                    <div className="video-content">
                        {block.data.title && <h4>{block.data.title}</h4>}
                        <VideoPlayer videoUrl={block.data.url} title={block.data.title} />
                    </div>
                );
            case 'image':
                return (
                    <div className={`image-content align-${block.data.alignment}`}>
                        <img src={block.data.url} alt={block.data.alt} />
                        {block.data.caption && <figcaption>{block.data.caption}</figcaption>}
                    </div>
                );
            case 'file':
                return (
                    <div className="file-content">
                        {block.data.description && <p>{block.data.description}</p>}
                        <div className="files-list">
                            {block.data.files.map((file, index) => (
                                <a key={index} href={file.url} download className="file-download">
                                    📁 {file.name}
                                </a>
                            ))}
                        </div>
                    </div>
                );
            case 'quiz':
                return (
                    <div className="quiz-content">
                        <h4>{block.data.question}</h4>
                        <div className="quiz-options">
                            {block.data.options.map((option, index) => (
                                <div key={index} className="quiz-option">
                                    <input type="radio" name={`quiz_${block.id}`} />
                                    <label>{option}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'embed':
                return (
                    <div className="embed-content">
                        {block.data.title && <h4>{block.data.title}</h4>}
                        <iframe
                            src={block.data.url}
                            height={block.data.height}
                            width="100%"
                            frameBorder="0"
                        />
                    </div>
                );
            default:
                return <div>Unknown content type</div>;
        }
    }; return (
        <div className="lesson-content-container">
            {/* If creating a new lesson, show the creation form */}
            {isCreatingLesson ? (
                <div className="lesson-creation-form">
                    <div className="lesson-form-header">
                        <h2>Create New Lesson</h2>
                        <p>Build your lesson with a simple form and dynamic content blocks</p>
                    </div>

                    <div className="lesson-basic-info">
                        <div className="form-group">
                            <label>Lesson Title *</label>
                            <input
                                type="text"
                                value={lessonForm.title}
                                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                                placeholder="Enter lesson title..."
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Module *</label>
                            <select
                                value={lessonForm.moduleId}
                                onChange={(e) => setLessonForm({ ...lessonForm, moduleId: e.target.value })}
                                className="form-select"
                            >
                                <option value="">Select a module</option>
                                {modules.map(module => (
                                    <option key={module.id} value={module.id}>
                                        {module.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={lessonForm.description}
                                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                                placeholder="Brief description of the lesson..."
                                className="form-textarea"
                                rows="3"
                            />
                        </div>
                    </div>

                    {/* Content Blocks for New Lesson */}
                    <div className="lesson-content-builder">
                        <h3>Lesson Content</h3>
                        {contentBlocks.length === 0 ? (
                            <div className="empty-content-builder">
                                <div className="empty-icon">📋</div>
                                <p>Add content blocks to make your lesson engaging</p>
                                <button
                                    className="add-first-block-btn"
                                    onClick={() => setShowAddMenu(true)}
                                >
                                    + Add Your First Content Block
                                </button>
                            </div>
                        ) : (
                            <div className="content-blocks-editor">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={contentBlocks.map(block => block.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {contentBlocks.map((block, index) => (
                                            <SortableItem key={block.id} id={block.id}>
                                                {renderBlock(block, index, true)}
                                            </SortableItem>
                                        ))}
                                    </SortableContext>
                                </DndContext>

                                <button
                                    className="add-block-btn"
                                    onClick={() => setShowAddMenu(true)}
                                >
                                    + Add Another Block
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Form Actions */}
                    <div className="lesson-form-actions">
                        <button
                            className="create-lesson-btn"
                            onClick={handleCreateLesson}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '🔄 Creating...' : '✨ Create Lesson'}
                        </button>
                        <button
                            className="cancel-lesson-btn"
                            onClick={onCancelCreate}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                // Regular lesson view/edit mode
                <>
                    {/* Lesson Header */}
                    <div className="lesson-content-header">
                        <div className="lesson-info">
                            <h2>{lesson.title}</h2>
                            <div className="lesson-meta">
                                <span className="duration">Duration: {lesson.durationMinutes || 0} minutes</span>
                                {lesson.description && (
                                    <p className="lesson-description">{lesson.description}</p>
                                )}
                            </div>
                        </div>

                        {/* Edit Controls for Instructors */}
                        {isInstructor && (
                            <div className="lesson-controls">
                                {!isEditing ? (
                                    <button
                                        className="edit-lesson-btn"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        ✏️ Edit Lesson
                                    </button>
                                ) : (
                                    <div className="edit-controls">
                                        <button
                                            className="save-btn"
                                            onClick={handleSaveContent}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? '💾 Saving...' : '💾 Save'}
                                        </button>
                                        <button
                                            className="cancel-btn"
                                            onClick={handleCancelEdit}
                                        >
                                            ❌ Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="lesson-content-body">
                        {contentBlocks.length === 0 ? (
                            // Empty state
                            <div className="empty-lesson-content">
                                {isEditing ? (
                                    <div className="empty-edit-state">
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
                                ) : (
                                    <div className="empty-view-state">
                                        <p>This lesson doesn't have any content yet.</p>
                                        {isInstructor && (
                                            <button
                                                className="edit-lesson-btn"
                                                onClick={() => setIsEditing(true)}
                                            >
                                                ✏️ Add Content
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Content blocks
                            <div className="lesson-content-blocks">
                                {isEditing ? (
                                    // Edit mode with drag and drop
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
                                                        {renderBlock(block, index, true)}
                                                    </SortableItem>
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                ) : (
                                    // View mode
                                    <div className="content-blocks-readonly">
                                        {contentBlocks.map((block, index) =>
                                            renderBlock(block, index, false)
                                        )}
                                    </div>
                                )}

                                {/* Add Block Button in Edit Mode */}
                                {isEditing && (
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
                        )}            </div>

                    {/* Add Block Menu */}
                    {(isEditing || isCreatingLesson) && showAddMenu && (
                        <div className="add-block-menu-overlay" onClick={() => setShowAddMenu(false)}>
                            <div className="add-block-menu" onClick={(e) => e.stopPropagation()}>
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
                </>
            )}
        </div>
    );
};

export default LessonContent;
