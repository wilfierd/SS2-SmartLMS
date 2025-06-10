-- Migration to add video_url column to lessons table
-- This script should be run only once on existing databases
USE lms_db;
-- Add video_url column to lessons table if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'lessons'
    AND COLUMN_NAME = 'video_url'
    AND TABLE_SCHEMA = 'lms_db';
SET @sql = IF(
        @col_exists = 0,
        'ALTER TABLE lessons ADD COLUMN video_url VARCHAR(512) NULL AFTER content;',
        'SELECT "Column video_url already exists" as message;'
    );
PREPARE stmt
FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- Update content_type enum to include rich_content if not exists
SET @enum_exists = 0;
SELECT COUNT(*) INTO @enum_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'lessons'
    AND COLUMN_NAME = 'content_type'
    AND COLUMN_TYPE LIKE '%rich_content%'
    AND TABLE_SCHEMA = 'lms_db';
SET @sql = IF(
        @enum_exists = 0,
        'ALTER TABLE lessons MODIFY COLUMN content_type ENUM(''video'', ''document'', ''quiz'', ''assignment'', ''live_session'', ''rich_content'') NOT NULL;',
        'SELECT "Enum rich_content already exists" as message;'
    );
PREPARE stmt
FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- Create a sample rich content lesson
INSERT INTO lessons (
        module_id,
        title,
        description,
        content_type,
        content,
        video_url,
        duration_minutes,
        order_index,
        is_published
    )
VALUES (
        (
            SELECT id
            FROM course_modules
            WHERE title = 'Getting Started with Programming'
            LIMIT 1
        ), 'Rich Content Demo: Programming Fundamentals', 'A comprehensive lesson combining text, video, and images to demonstrate the unified rich content approach.', 'rich_content', '<h3>Welcome to Programming Fundamentals</h3>
<p>This lesson combines multiple content types to give you a complete learning experience:</p>
<ul>
<li><strong>Text Content:</strong> Written explanations and code examples</li>
<li><strong>Video Content:</strong> Visual demonstrations and tutorials</li>
<li><strong>Images:</strong> Diagrams, screenshots, and illustrations</li>
</ul>
<h4>What You''ll Learn</h4>
<p>In this lesson, you will understand the basic concepts of programming including:</p>
<ol>
<li>What is programming and why it matters</li>
<li>Basic programming concepts like variables and functions</li>
<li>How to write your first program</li>
</ol>
<p>Make sure to watch the accompanying video and review the example images below!</p>', 'https://www.youtube.com/watch?v=zOjov-2OZ0E', 45, 10, TRUE
    ) ON DUPLICATE KEY
UPDATE title =
VALUES(title),
    description =
VALUES(description),
    content =
VALUES(content),
    video_url =
VALUES(video_url);
SELECT 'Migration completed successfully!' as message;