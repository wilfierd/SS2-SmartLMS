// Isolated Lesson Creation Modal Component
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    MdDescription,
    MdImage,
    MdFolder,
    MdQuiz,
    MdLink,
    MdClose,
    MdContentCopy,
    MdRefresh,
    MdAutoAwesome,
    MdAttachFile
} from 'react-icons/md';
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

// Content Block Components
import TextBlock from '../LessonBuilder/blocks/TextBlock';
import ImageBlock from '../LessonBuilder/blocks/ImageBlock';
import FileBlock from '../LessonBuilder/blocks/FileBlock';
import QuizBlock from '../LessonBuilder/blocks/QuizBlock';
import EmbedBlock from '../LessonBuilder/blocks/EmbedBlock';

import './LessonCreationModal.css';

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

const LessonCreationModal = ({ isOpen, onClose, onLessonCreated, modules, selectedModule }) => {
    const { courseId } = useParams();
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
        { type: 'text', icon: <MdDescription />, label: 'Text Block', description: 'Add rich text content' },
        { type: 'image', icon: <MdImage />, label: 'Image', description: 'Upload or link images' },
        { type: 'file', icon: <MdFolder />, label: 'Files', description: 'Documents and downloads' },
        { type: 'quiz', icon: <MdQuiz />, label: 'Mini Quiz', description: 'Quick knowledge check' },
        { type: 'embed', icon: <MdLink />, label: 'Embed/Video', description: 'YouTube, video uploads (max 10MB), or any URL' }
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

    // Get default data for block type
    const getDefaultBlockData = (type) => {
        switch (type) {
            case 'text':
                return { content: '', style: 'paragraph' };
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

            // Reset form and close modal
            setLessonForm({
                title: '',
                description: '',
                moduleId: selectedModule || ''
            });
            setContentBlocks([]);
            setEditingBlock(null);
            setShowAddMenu(false);

            onLessonCreated();
            onClose();
        } catch (error) {
            console.error('Error creating lesson:', error);
            notification.error('Failed to create lesson');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle modal close
    const handleClose = () => {
        // Reset form
        setLessonForm({
            title: '',
            description: '',
            moduleId: selectedModule || ''
        });
        setContentBlocks([]);
        setEditingBlock(null);
        setShowAddMenu(false);
        onClose();
    };

    // Render content block
    const renderBlock = (block, index) => {
        const isBlockEditing = editingBlock === block.id;

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

        switch (block.type) {
            case 'text':
                return <TextBlock {...blockProps} />;
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

    if (!isOpen) return null;

    return (
        <div className="lesson-creation-modal-overlay" onClick={handleClose}>
            <div className="lesson-creation-modal" onClick={(e) => e.stopPropagation()}>
                <div className="lesson-form-header">
                    <h2>Create New Lesson</h2>
                    <p>Build your lesson with a simple form and dynamic content blocks</p>
                    <button className="close-btn" onClick={handleClose}>
                        <MdClose />
                    </button>
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
                            <div className="empty-icon"><MdContentCopy /></div>
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
                                            {renderBlock(block, index)}
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
                        {isSubmitting ? <><MdRefresh /> Creating...</> : <><MdAutoAwesome /> Create Lesson</>}
                    </button>
                    <button
                        className="cancel-lesson-btn"
                        onClick={handleClose}
                    >
                        Cancel
                    </button>
                </div>

                {/* Add Block Menu */}
                {showAddMenu && (
                    <div className="add-block-menu-overlay" onClick={() => setShowAddMenu(false)}>
                        <div className="add-block-menu" onClick={(e) => e.stopPropagation()}>
                            <div className="menu-header">
                                <h3>Add Content Block</h3>
                                <button onClick={() => setShowAddMenu(false)}><MdClose /></button>
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

export default LessonCreationModal;
