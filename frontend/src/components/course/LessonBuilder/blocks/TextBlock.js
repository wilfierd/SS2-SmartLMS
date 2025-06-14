import React, { useState, useRef } from 'react';
import {
    MdEdit,
    MdContentCopy,
    MdDelete,
    MdKeyboardArrowUp,
    MdKeyboardArrowDown,
    MdSave,
    MdCancel,
    MdLightbulb,
    MdTextFields
} from 'react-icons/md';
import './BlockStyles.css';

const TextBlock = ({
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
    const [localContent, setLocalContent] = useState(block.data.content || '');
    const [localStyle, setLocalStyle] = useState(block.data.style || 'paragraph');
    const textareaRef = useRef(null);

    const textStyles = [
        { value: 'paragraph', label: 'Paragraph', tag: 'p' },
        { value: 'heading1', label: 'Heading 1', tag: 'h1' },
        { value: 'heading2', label: 'Heading 2', tag: 'h2' },
        { value: 'heading3', label: 'Heading 3', tag: 'h3' },
        { value: 'quote', label: 'Quote', tag: 'blockquote' },
        { value: 'code', label: 'Code', tag: 'pre' }
    ];

    const handleSave = () => {
        onUpdate({
            content: localContent,
            style: localStyle
        });
        onStopEdit();
    };

    const handleCancel = () => {
        setLocalContent(block.data.content || '');
        setLocalStyle(block.data.style || 'paragraph');
        onStopEdit();
    };

    const renderPreview = () => {
        const content = block.data.content || 'Click to add text...';
        const style = block.data.style || 'paragraph';

        const className = `text-preview text-${style}`;

        switch (style) {
            case 'heading1':
                return <h1 className={className}>{content}</h1>;
            case 'heading2':
                return <h2 className={className}>{content}</h2>;
            case 'heading3':
                return <h3 className={className}>{content}</h3>;
            case 'quote':
                return <blockquote className={className}>"{content}"</blockquote>;
            case 'code':
                return <pre className={className}><code>{content}</code></pre>;
            default:
                return <p className={className}>{content}</p>;
        }
    };

    const autoResize = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    return (
        <div className="content-block text-block">
            {/* Block Controls */}
            <div className="block-controls">
                {!isEditing && (
                    <>                        <button className="control-btn edit" onClick={onStartEdit} title="Edit">
                        <MdEdit />
                    </button>
                        <button className="control-btn duplicate" onClick={onDuplicate} title="Duplicate">
                            <MdContentCopy />
                        </button>
                        {canMoveUp && (
                            <button className="control-btn move" onClick={onMoveUp} title="Move Up">
                                <MdKeyboardArrowUp />
                            </button>
                        )}
                        {canMoveDown && (
                            <button className="control-btn move" onClick={onMoveDown} title="Move Down">
                                <MdKeyboardArrowDown />
                            </button>
                        )}
                        <button className="control-btn delete" onClick={onDelete} title="Delete">
                            <MdDelete />
                        </button>
                    </>
                )}
            </div>

            {/* Block Content */}
            <div className="block-content">
                {isEditing ? (
                    <div className="text-editor">
                        <div className="editor-toolbar">
                            <select
                                value={localStyle}
                                onChange={(e) => setLocalStyle(e.target.value)}
                                className="style-selector"
                            >
                                {textStyles.map(style => (
                                    <option key={style.value} value={style.value}>
                                        {style.label}
                                    </option>
                                ))}
                            </select>

                            <div className="editor-actions">                                <button className="save-btn" onClick={handleSave}>
                                <MdSave /> Save
                            </button>
                                <button className="cancel-btn" onClick={handleCancel}>
                                    <MdCancel /> Cancel
                                </button>
                            </div>
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={localContent}
                            onChange={(e) => {
                                setLocalContent(e.target.value);
                                autoResize();
                            }}
                            placeholder={`Enter your ${textStyles.find(s => s.value === localStyle)?.label.toLowerCase() || 'text'}...`}
                            className={`text-input text-input-${localStyle}`}
                            autoFocus
                            onInput={autoResize}
                        />                        <div className="editor-help">
                            <small><MdLightbulb /> Tip: You can use basic HTML tags for formatting</small>
                        </div>
                    </div>
                ) : (
                    <div
                        className="text-preview-container"
                        onClick={onStartEdit}
                    >
                        {renderPreview()}
                        {!block.data.content && (
                            <div className="empty-text-hint">
                                Click to add text content
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Block Type Indicator */}            <div className="block-type-indicator">
                <MdTextFields /> Text Block
            </div>
        </div>
    );
};

export default TextBlock;
