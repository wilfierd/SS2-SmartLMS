-- Create the database
CREATE DATABASE IF NOT EXISTS lms_db;
USE lms_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role ENUM('student', 'instructor', 'admin') NOT NULL,
  is_password_changed BOOLEAN DEFAULT FALSE,
  google_id VARCHAR(255),
  profile_image VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster token lookup
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id INT NOT NULL,
  thumbnail_url VARCHAR(255),
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  enrollment_limit INT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Student enrollment table (many-to-many relationship between students and courses)
CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  completion_date TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, course_id)
);

-- Course modules
CREATE TABLE IF NOT EXISTS course_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INT NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Lessons within modules
CREATE TABLE IF NOT EXISTS lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_type ENUM('video', 'document', 'quiz', 'assignment', 'live_session') NOT NULL,
  content TEXT,
  duration_minutes INT,
  order_index INT NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE
);

-- Lesson materials
CREATE TABLE IF NOT EXISTS lesson_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_path VARCHAR(512),
  external_url VARCHAR(512),
  material_type ENUM('video', 'document', 'audio', 'image', 'link') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  lesson_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  max_points INT NOT NULL,
  due_date TIMESTAMP,
  allow_late_submissions BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

-- Assignment submissions
CREATE TABLE IF NOT EXISTS submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  submission_text TEXT,
  file_path VARCHAR(512),
  submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  grade DECIMAL(5,2),
  feedback TEXT,
  is_graded BOOLEAN DEFAULT FALSE,
  graded_by INT,
  graded_at TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  lesson_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  time_limit_minutes INT,
  passing_score INT,
  max_attempts INT DEFAULT 1,
  is_randomized BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

-- Quiz questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('multiple_choice', 'true_false', 'short_answer', 'essay') NOT NULL,
  points INT NOT NULL DEFAULT 1,
  order_index INT NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Quiz options (answers)
CREATE TABLE IF NOT EXISTS quiz_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  student_id INT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  score DECIMAL(5,2),
  is_completed BOOLEAN DEFAULT FALSE,
  attempt_number INT NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Quiz responses (student answers)
CREATE TABLE IF NOT EXISTS quiz_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_option_id INT,
  text_response TEXT,
  is_correct BOOLEAN,
  points_earned DECIMAL(5,2),
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_option_id) REFERENCES quiz_options(id) ON DELETE SET NULL
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Discussion forums
CREATE TABLE IF NOT EXISTS discussions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Discussion posts
CREATE TABLE IF NOT EXISTS discussion_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  discussion_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_post_id INT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_post_id) REFERENCES discussion_posts(id) ON DELETE CASCADE
);

-- Private messages
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Live online class sessions
CREATE TABLE IF NOT EXISTS live_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  lesson_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  platform ENUM('zoom', 'google_meet', 'microsoft_teams', 'other') NOT NULL,
  meeting_url VARCHAR(512) NOT NULL,
  meeting_id VARCHAR(255),
  meeting_password VARCHAR(255),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Session attendance
CREATE TABLE IF NOT EXISTS session_attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  student_id INT NOT NULL,
  join_time TIMESTAMP,
  leave_time TIMESTAMP,
  attendance_status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'absent',
  FOREIGN KEY (session_id) REFERENCES live_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- AI integration
CREATE TABLE IF NOT EXISTS ai_interactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT,
  interaction_type ENUM('question', 'content_generation', 'feedback', 'grading', 'recommendation') NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

-- AI-generated content
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  lesson_id INT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_type ENUM('lecture', 'exercise', 'quiz', 'summary', 'other') NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lesson_id INT NOT NULL,
  completion_status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  last_accessed TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_lesson (user_id, lesson_id)
);

-- Grades
CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  assessment_type ENUM('assignment', 'quiz', 'exam', 'project', 'participation') NOT NULL,
  assessment_id INT NOT NULL, 
  grade DECIMAL(5,2) NOT NULL,
  max_grade DECIMAL(5,2) NOT NULL,
  comments TEXT,
  graded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_group VARCHAR(255),
  description TEXT,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(255),
  entity_id INT,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- SAMPLE DATA INSERTS
-- ============================================

-- Clear existing data (if needed)
-- Uncomment these if you want to clear data before inserting
/*
DELETE FROM audit_logs;
DELETE FROM system_settings;
DELETE FROM grades;
DELETE FROM user_progress;
DELETE FROM ai_generated_content;
DELETE FROM ai_interactions;
DELETE FROM session_attendance;
DELETE FROM live_sessions;
DELETE FROM messages;
DELETE FROM discussion_posts;
DELETE FROM discussions;
DELETE FROM announcements;
DELETE FROM quiz_responses;
DELETE FROM quiz_attempts;
DELETE FROM quiz_options;
DELETE FROM quiz_questions;
DELETE FROM quizzes;
DELETE FROM submissions;
DELETE FROM assignments;
DELETE FROM lesson_materials;
DELETE FROM lessons;
DELETE FROM course_modules;
DELETE FROM enrollments;
DELETE FROM courses;
DELETE FROM password_reset_tokens;
DELETE FROM user_sessions;
DELETE FROM users;
*/

-- Insert Admin users (password hashes would be properly generated with bcrypt in production)
INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, bio) 
VALUES 
('admin@lms.com', '$2a$10$XVR4O8KMgynj.hnMUdxg8.A7D5C5SOD5mJBTmYxS9kZl8GEFGFbU6', 'Admin', 'User', 'admin', TRUE, 'Main system administrator'),
('admin2@lms.com', '$2a$10$XVR4O8KMgynj.hnMUdxg8.A7D5C5SOD5mJBTmYxS9kZl8GEFGFbU6', 'Secondary', 'Admin', 'admin', TRUE, 'Assistant system administrator');

-- Insert Instructor users
INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, bio) 
VALUES 
('john.smith@lms.com', '$2a$10$t1rZxY0wNLZNWH3m6ZYnmuGsAVgPEKYODAjKrpOg0ZCw5HBQXnGqq', 'John', 'Smith', 'instructor', TRUE, 'Professor of Computer Science with 15 years of industry experience'),
('sarah.johnson@lms.com', '$2a$10$t1rZxY0wNLZNWH3m6ZYnmuGsAVgPEKYODAjKrpOg0ZCw5HBQXnGqq', 'Sarah', 'Johnson', 'instructor', TRUE, 'Database specialist and former tech lead at Oracle'),
('michael.brown@lms.com', '$2a$10$t1rZxY0wNLZNWH3m6ZYnmuGsAVgPEKYODAjKrpOg0ZCw5HBQXnGqq', 'Michael', 'Brown', 'instructor', TRUE, 'Mobile app developer and UX design expert'),
('lisa.wong@lms.com', '$2a$10$t1rZxY0wNLZNWH3m6ZYnmuGsAVgPEKYODAjKrpOg0ZCw5HBQXnGqq', 'Lisa', 'Wong', 'instructor', TRUE, 'AI researcher and machine learning specialist');

-- Insert Student users
INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, google_id) 
VALUES 
('student1@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'Alex', 'Wilson', 'student', FALSE, NULL),
('student2@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'Maria', 'Garcia', 'student', TRUE, 'google123'),
('student3@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'James', 'Taylor', 'student', FALSE, 'google456'),
('student4@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'Sophie', 'Chen', 'student', TRUE, NULL),
('student5@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'Omar', 'Patel', 'student', TRUE, 'google789'),
('student6@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'Emma', 'Johnson', 'student', FALSE, NULL);

-- Insert Courses
INSERT INTO courses (title, description, instructor_id, status, start_date, end_date, is_featured) 
VALUES 
('Introduction to Programming', 'Learn the fundamentals of programming with JavaScript. This course covers variables, control structures, functions, and basic DOM manipulation.', 
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'), 'published', '2023-01-15', '2023-04-15', TRUE),
 
('Web Development Basics', 'Introduction to HTML, CSS, and modern web development. Build responsive websites from scratch and learn about web standards.', 
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'), 'published', '2023-02-01', '2023-05-01', TRUE),
 
('Database Design', 'Learn how to design and implement relational databases. Topics include ER diagrams, normalization, SQL, and database optimization.', 
 (SELECT id FROM users WHERE email = 'sarah.johnson@lms.com'), 'published', '2023-01-10', '2023-04-10', FALSE),
 
('Advanced JavaScript', 'Deep dive into JavaScript frameworks and modern practices. Learn about closures, async programming, and front-end frameworks.', 
 (SELECT id FROM users WHERE email = 'sarah.johnson@lms.com'), 'published', '2023-03-01', '2023-06-01', TRUE),
 
('Mobile App Development', 'Introduction to building mobile applications with React Native. Create cross-platform mobile apps with JavaScript.', 
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'), 'published', '2023-02-15', '2023-05-15', FALSE),
 
('Artificial Intelligence Fundamentals', 'Understand the core concepts of AI including machine learning, neural networks, and natural language processing.', 
 (SELECT id FROM users WHERE email = 'lisa.wong@lms.com'), 'published', '2023-03-10', '2023-06-10', TRUE),
 
('DevOps Practices', 'Learn about continuous integration, delivery, and deployment. Includes Docker, Jenkins, and cloud deployment strategies.', 
 (SELECT id FROM users WHERE email = 'michael.brown@lms.com'), 'draft', '2023-04-01', '2023-07-01', FALSE);

-- Insert Enrollments
INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
VALUES
-- Enroll student1 in 3 courses
((SELECT id FROM users WHERE email = 'student1@example.com'),
 (SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 '2023-01-16', 'in_progress'),
 
((SELECT id FROM users WHERE email = 'student1@example.com'),
 (SELECT id FROM courses WHERE title = 'Web Development Basics'),
 '2023-02-02', 'not_started'),
 
((SELECT id FROM users WHERE email = 'student1@example.com'),
 (SELECT id FROM courses WHERE title = 'Mobile App Development'),
 '2023-02-16', 'not_started'),

-- Enroll student2 in 2 courses
((SELECT id FROM users WHERE email = 'student2@example.com'),
 (SELECT id FROM courses WHERE title = 'Database Design'),
 '2023-01-11', 'completed'),
 
((SELECT id FROM users WHERE email = 'student2@example.com'),
 (SELECT id FROM courses WHERE title = 'Advanced JavaScript'),
 '2023-03-02', 'in_progress'),

-- Enroll student3 in all courses
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 '2023-01-20', 'completed'),
 
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE title = 'Web Development Basics'),
 '2023-02-05', 'in_progress'),
 
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE title = 'Database Design'),
 '2023-01-15', 'in_progress'),
 
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE title = 'Advanced JavaScript'),
 '2023-03-05', 'not_started'),
 
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE title = 'Mobile App Development'),
 '2023-02-20', 'not_started'),
 
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE title = 'Artificial Intelligence Fundamentals'),
 '2023-03-12', 'not_started'),

-- Additional student enrollments
((SELECT id FROM users WHERE email = 'student4@example.com'),
 (SELECT id FROM courses WHERE title = 'Artificial Intelligence Fundamentals'),
 '2023-03-11', 'in_progress'),
 
((SELECT id FROM users WHERE email = 'student5@example.com'),
 (SELECT id FROM courses WHERE title = 'Database Design'),
 '2023-01-12', 'in_progress'),
 
((SELECT id FROM users WHERE email = 'student5@example.com'),
 (SELECT id FROM courses WHERE title = 'Advanced JavaScript'),
 '2023-03-03', 'not_started'),
 
((SELECT id FROM users WHERE email = 'student6@example.com'),
 (SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 '2023-01-18', 'completed'),
 
((SELECT id FROM users WHERE email = 'student6@example.com'),
 (SELECT id FROM courses WHERE title = 'Web Development Basics'),
 '2023-02-03', 'in_progress');

-- Insert Course Modules
INSERT INTO course_modules (course_id, title, description, order_index, is_published)
VALUES
-- Introduction to Programming Modules
((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 'Getting Started with Programming', 
 'Introduction to basic programming concepts and setting up your development environment.',
 1, TRUE),
 
((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 'JavaScript Fundamentals', 
 'Core JavaScript concepts including variables, data types, and operators.',
 2, TRUE),
 
((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 'Control Structures', 
 'Conditional statements, loops, and flow control in JavaScript.',
 3, TRUE),
 
((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 'Functions and Objects', 
 'Creating and using functions, introduction to object-oriented programming.',
 4, TRUE),

-- Web Development Basics Modules
((SELECT id FROM courses WHERE title = 'Web Development Basics'),
 'HTML Essentials', 
 'Core HTML elements, document structure, and semantic markup.',
 1, TRUE),
 
((SELECT id FROM courses WHERE title = 'Web Development Basics'),
 'CSS Fundamentals', 
 'Styling web pages with CSS, selectors, and the box model.',
 2, TRUE),
 
((SELECT id FROM courses WHERE title = 'Web Development Basics'),
 'Responsive Design', 
 'Making websites that work on any device size using responsive techniques.',
 3, TRUE),
 
((SELECT id FROM courses WHERE title = 'Web Development Basics'),
 'Introduction to JavaScript for the Web', 
 'Using JavaScript to add interactivity to web pages.',
 4, FALSE),

-- Database Design Modules
((SELECT id FROM courses WHERE title = 'Database Design'),
 'Database Concepts', 
 'Introduction to databases, data models, and database management systems.',
 1, TRUE),
 
((SELECT id FROM courses WHERE title = 'Database Design'),
 'Entity-Relationship Modeling', 
 'Creating ER diagrams and designing database schemas.',
 2, TRUE),
 
((SELECT id FROM courses WHERE title = 'Database Design'),
 'SQL Fundamentals', 
 'Basic SQL commands for creating, querying, and manipulating databases.',
 3, TRUE),
 
((SELECT id FROM courses WHERE title = 'Database Design'),
 'Database Normalization', 
 'Principles of normalization and designing efficient database structures.',
 4, TRUE),
 
((SELECT id FROM courses WHERE title = 'Database Design'),
 'Advanced SQL and Optimization', 
 'Complex queries, transactions, and performance optimization.',
 5, FALSE);

-- Insert Lessons
INSERT INTO lessons (module_id, title, description, content_type, content, duration_minutes, order_index, is_published)
VALUES
-- Getting Started with Programming Lessons
((SELECT id FROM course_modules WHERE title = 'Getting Started with Programming' AND course_id = (SELECT id FROM courses WHERE title = 'Introduction to Programming')),
 'What is Programming?', 
 'An introduction to computer programming and why it matters.',
 'document',
 'Programming is the process of creating a set of instructions that tell a computer how to perform a task. Programming can be done using a variety of computer programming languages, such as JavaScript, Python, and C++.',
 30, 1, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'Getting Started with Programming' AND course_id = (SELECT id FROM courses WHERE title = 'Introduction to Programming')),
 'Setting Up Your Development Environment', 
 'Installing and configuring the tools you need to start programming.',
 'document',
 'In this lesson, we will install Visual Studio Code, Node.js, and set up our first JavaScript project. We will also discuss various extensions that can help make development easier.',
 45, 2, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'Getting Started with Programming' AND course_id = (SELECT id FROM courses WHERE title = 'Introduction to Programming')),
 'Writing Your First Program', 
 'Creating and running a simple "Hello World" program.',
 'video',
 'https://example.com/videos/first-program.mp4',
 20, 3, TRUE),

-- JavaScript Fundamentals Lessons
((SELECT id FROM course_modules WHERE title = 'JavaScript Fundamentals' AND course_id = (SELECT id FROM courses WHERE title = 'Introduction to Programming')),
 'Variables and Data Types', 
 'Understanding how to store and manipulate data in JavaScript.',
 'document',
 'JavaScript has several data types: String, Number, Boolean, Object, Undefined, and Null. Variables are declared using let, const, or var keywords.',
 60, 1, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'JavaScript Fundamentals' AND course_id = (SELECT id FROM courses WHERE title = 'Introduction to Programming')),
 'Operators and Expressions', 
 'Using operators to perform operations on variables and values.',
 'video',
 'https://example.com/videos/operators.mp4',
 45, 2, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'JavaScript Fundamentals' AND course_id = (SELECT id FROM courses WHERE title = 'Introduction to Programming')),
 'Basic Input and Output', 
 'Getting input from users and displaying output.',
 'document',
 'In a web browser, you can use prompt() to get input and console.log() or document.write() to display output. In Node.js, you can use the readline module.',
 30, 3, TRUE),
 
-- HTML Essentials Lessons
((SELECT id FROM course_modules WHERE title = 'HTML Essentials' AND course_id = (SELECT id FROM courses WHERE title = 'Web Development Basics')),
 'Introduction to HTML', 
 'Understanding what HTML is and how it structures web content.',
 'document',
 'HTML (HyperText Markup Language) is the standard markup language for documents designed to be displayed in a web browser. It defines the structure and content of a web page.',
 30, 1, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'HTML Essentials' AND course_id = (SELECT id FROM courses WHERE title = 'Web Development Basics')),
 'HTML Document Structure', 
 'Creating properly structured HTML documents with all necessary elements.',
 'video',
 'https://example.com/videos/html-structure.mp4',
 45, 2, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'HTML Essentials' AND course_id = (SELECT id FROM courses WHERE title = 'Web Development Basics')),
 'Text Elements and Links', 
 'Working with headings, paragraphs, lists, and hyperlinks.',
 'assignment',
 'Create a simple web page with headings, paragraphs, lists, and links to other websites.',
 60, 3, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'HTML Essentials' AND course_id = (SELECT id FROM courses WHERE title = 'Web Development Basics')),
 'Images and Multimedia', 
 'Embedding images, audio, and video in your web pages.',
 'quiz',
 NULL,
 30, 4, TRUE);

-- Insert Lesson Materials
INSERT INTO lesson_materials (lesson_id, title, file_path, external_url, material_type)
VALUES
-- Materials for "What is Programming?"
((SELECT id FROM lessons WHERE title = 'What is Programming?'),
 'Introduction to Programming Concepts',
 '/materials/intro-programming.pdf',
 NULL,
 'document'),
 
((SELECT id FROM lessons WHERE title = 'What is Programming?'),
 'Programming History Timeline',
 '/materials/programming-timeline.pdf',
 NULL,
 'document'),

-- Materials for "Setting Up Your Development Environment"
((SELECT id FROM lessons WHERE title = 'Setting Up Your Development Environment'),
 'VS Code Installation Guide',
 '/materials/vscode-install-guide.pdf',
 NULL,
 'document'),
 
((SELECT id FROM lessons WHERE title = 'Setting Up Your Development Environment'),
 'Node.js Installation Video',
 NULL,
 'https://example.com/videos/nodejs-install.mp4',
 'video'),

-- Materials for "Variables and Data Types"
((SELECT id FROM lessons WHERE title = 'Variables and Data Types'),
 'JavaScript Data Types Cheat Sheet',
 '/materials/js-data-types.pdf',
 NULL,
 'document'),
 
((SELECT id FROM lessons WHERE title = 'Variables and Data Types'),
 'Variable Declaration Examples',
 '/materials/variable-examples.js',
 NULL,
 'document'),

-- Materials for "Introduction to HTML"
((SELECT id FROM lessons WHERE title = 'Introduction to HTML'),
 'HTML Basics Slide Deck',
 '/materials/html-basics-slides.pdf',
 NULL,
 'document'),
 
((SELECT id FROM lessons WHERE title = 'Introduction to HTML'),
 'History of HTML Video',
 NULL,
 'https://example.com/videos/html-history.mp4',
 'video');

-- Insert Assignments
INSERT INTO assignments (course_id, lesson_id, title, description, instructions, max_points, due_date, allow_late_submissions)
VALUES
-- Assignments for Introduction to Programming
((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 (SELECT id FROM lessons WHERE title = 'Writing Your First Program'),
 'Hello World Program',
 'Create a JavaScript program that displays "Hello, World!" in the console.',
 'Write a JavaScript program that uses console.log() to display the message "Hello, World!" when executed. Submit your .js file.',
 10,
 '2023-01-30 23:59:59',
 TRUE),

((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 (SELECT id FROM lessons WHERE title = 'Variables and Data Types'),
 'Variable Manipulation',
 'Create a program that demonstrates the use of different variable types.',
 'Write a JavaScript program that creates variables of different types (string, number, boolean, array, object) and performs operations on them. Include comments explaining each step.',
 20,
 '2023-02-15 23:59:59',
 FALSE),

-- Assignments for Web Development Basics
((SELECT id FROM courses WHERE title = 'Web Development Basics'),
 (SELECT id FROM lessons WHERE title = 'Text Elements and Links'),
 'Personal Bio Page',
 'Create a simple personal biography page using HTML elements.',
 'Create an HTML page that includes your name, a brief bio, a list of hobbies, and links to at least 3 websites you frequently visit. Use appropriate heading levels, paragraphs, and list elements.',
 25,
 '2023-02-28 23:59:59',
 TRUE),

-- Assignments for Database Design
((SELECT id FROM courses WHERE title = 'Database Design'),
 NULL,
 'ER Diagram Design',
 'Create an entity-relationship diagram for a simple database system.',
 'Design an ER diagram for a library management system. Include entities for Books, Authors, Members, and Loans. Specify attributes and relationships between entities.',
 30,
 '2023-02-10 23:59:59',
 FALSE);

-- Insert Quizzes
INSERT INTO quizzes (course_id, lesson_id, title, description, time_limit_minutes, passing_score, max_attempts, is_randomized, start_date, end_date)
VALUES
-- Quiz for Introduction to Programming
((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 NULL,
 'JavaScript Basics Quiz',
 'Test your knowledge of basic JavaScript concepts.',
 30,
 70,
 2,
 TRUE,
 '2023-02-01 00:00:00',
 '2023-02-10 23:59:59'),

-- Quiz for Web Development Basics 
((SELECT id FROM courses WHERE title = 'Web Development Basics'),
 (SELECT id FROM lessons WHERE title = 'Images and Multimedia'),
 'HTML Elements Quiz',
 'Test your understanding of HTML elements and their attributes.',
 20,
 75,
 3,
 FALSE,
 '2023-03-01 00:00:00',
 '2023-03-10 23:59:59'),

-- Quiz for Database Design
((SELECT id FROM courses WHERE title = 'Database Design'),
 NULL,
 'SQL Fundamentals Quiz',
 'Test your knowledge of basic SQL commands and syntax.',
 45,
 80,
 1,
 FALSE,
 '2023-02-15 00:00:00',
 '2023-02-25 23:59:59');

-- Insert Quiz Questions
INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index)
VALUES
-- Questions for JavaScript Basics Quiz
((SELECT id FROM quizzes WHERE title = 'JavaScript Basics Quiz'),
 'Which of the following is not a JavaScript data type?',
 'multiple_choice',
 2,
 1),
 
((SELECT id FROM quizzes WHERE title = 'JavaScript Basics Quiz'),
 'What will the following code output? console.log(10 + "20");',
 'multiple_choice',
 2,
 2),
 
((SELECT id FROM quizzes WHERE title = 'JavaScript Basics Quiz'),
 'JavaScript is a case-sensitive language.',
 'true_false',
 1,
 3),
 
((SELECT id FROM quizzes WHERE title = 'JavaScript Basics Quiz'),
 'Explain the difference between let, const, and var in JavaScript.',
 'essay',
 5,
 4),

-- Questions for HTML Elements Quiz
((SELECT id FROM quizzes WHERE title = 'HTML Elements Quiz'),
 'Which HTML element is used to define an unordered list?',
 'multiple_choice',
 1,
 1),
 
((SELECT id FROM quizzes WHERE title = 'HTML Elements Quiz'),
 'The HTML <img> element requires a closing tag.',
 'true_false',
 1,
 2),
 
((SELECT id FROM quizzes WHERE title = 'HTML Elements Quiz'),
 'Which attribute is required in the <img> element?',
 'multiple_choice',
 2,
 3),
 
((SELECT id FROM quizzes WHERE title = 'HTML Elements Quiz'),
 'What is the purpose of the HTML <head> element?',
 'short_answer',
 3,
 4);

-- Insert Quiz Options
INSERT INTO quiz_options (question_id, option_text, is_correct, order_index)
VALUES
-- Options for "Which of the following is not a JavaScript data type?"
((SELECT id FROM quiz_questions WHERE question_text = 'Which of the following is not a JavaScript data type?'),
 'String',
 FALSE,
 1),
 
((SELECT id FROM quiz_questions WHERE question_text = 'Which of the following is not a JavaScript data type?'),
 'Number',
 FALSE,
 2),
 
((SELECT id FROM quiz_questions WHERE question_text = 'Which of the following is not a JavaScript data type?'),
 'Float',
 TRUE,
 3),
 
((SELECT id FROM quiz_questions WHERE question_text = 'Which of the following is not a JavaScript data type?'),
 'Boolean',
 FALSE,
 4),

-- Options for "What will the following code output? console.log(10 + "20");"
((SELECT id FROM quiz_questions WHERE question_text = 'What will the following code output? console.log(10 + "20");'),
 '30',
 FALSE,
 1),
 
((SELECT id FROM quiz_questions WHERE question_text = 'What will the following code output? console.log(10 + "20");'),
 '1020',
 TRUE,
 2),
 
((SELECT id FROM quiz_questions WHERE question_text = 'What will the following code output? console.log(10 + "20");'),
 'Error',
 FALSE,
 3),
 
((SELECT id FROM quiz_questions WHERE question_text = 'What will the following code output? console.log(10 + "20");'),
 'undefined',
 FALSE,
 4),

-- Options for "JavaScript is a case-sensitive language."
((SELECT id FROM quiz_questions WHERE question_text = 'JavaScript is a case-sensitive language.'),
 'True',
 TRUE,
 1),
 
((SELECT id FROM quiz_questions WHERE question_text = 'JavaScript is a case-sensitive language.'),
 'False',
 FALSE,
 2),

-- Options for "Which HTML element is used to define an unordered list?"
((SELECT id FROM quiz_questions WHERE question_text = 'Which HTML element is used to define an unordered list?'),
 '<ul>',
 TRUE,
 1),
 
((SELECT id FROM quiz_questions WHERE question_text = 'Which HTML element is used to define an unordered list?'),
 '<ol>',
 FALSE,
 2),
 
((SELECT id FROM quiz_questions WHERE question_text = 'Which HTML element is used to define an unordered list?'),
 '<li>',
 FALSE,
 3),
 
((SELECT id FROM quiz_questions WHERE question_text = 'Which HTML element is used to define an unordered list?'),
 '<list>',
 FALSE,
 4),

-- Options for "The HTML <img> element requires a closing tag."
((SELECT id FROM quiz_questions WHERE question_text = 'The HTML <img> element requires a closing tag.'),
 'True',
 FALSE,
 1),
 
((SELECT id FROM quiz_questions WHERE question_text = 'The HTML <img> element requires a closing tag.'),
 'False',
 TRUE,
 2),

-- Options for "Which attribute is required in the <img> element?"
((SELECT id FROM quiz_questions WHERE question_text = 'Which attribute is required in the <img> element?'),
 'src',
 TRUE,
 1),
 
((SELECT id FROM quiz_questions WHERE question_text = 'Which attribute is required in the <img> element?'),
 'alt',
 FALSE,
 2),
 
((SELECT id FROM quiz_questions WHERE question_text = 'Which attribute is required in the <img> element?'),
 'width',
 FALSE,
 3),
 
((SELECT id FROM quiz_questions WHERE question_text = 'Which attribute is required in the <img> element?'),
 'height',
 FALSE,
 4);

-- Insert Announcements
INSERT INTO announcements (course_id, user_id, title, content, is_global)
VALUES
-- Global announcements
(NULL,
 (SELECT id FROM users WHERE email = 'admin@lms.com'),
 'Welcome to Our New Learning Platform',
 'We are excited to launch our new learning management system. Explore the courses and start learning today!',
 TRUE),
 
(NULL,
 (SELECT id FROM users WHERE email = 'admin@lms.com'),
 'System Maintenance Scheduled',
 'The system will be undergoing maintenance on Sunday, July 10, from 2:00 AM to 4:00 AM EST. During this time, the platform may be unavailable.',
 TRUE),

-- Course-specific announcements
((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 'Welcome to Introduction to Programming',
 'Welcome to the course! Please review the syllabus and introduce yourself in the discussion forum.',
 FALSE),
 
((SELECT id FROM courses WHERE title = 'Web Development Basics'),
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 'Project Deadline Extended',
 'Due to numerous requests, the deadline for the final project has been extended by one week. The new due date is May 8.',
 FALSE),
 
((SELECT id FROM courses WHERE title = 'Database Design'),
 (SELECT id FROM users WHERE email = 'sarah.johnson@lms.com'),
 'Guest Lecturer Next Week',
 'We will have a guest lecture from a senior database architect at Oracle next Tuesday. Attendance is highly recommended.',
 FALSE);

-- Insert Discussions
INSERT INTO discussions (course_id, title, description, created_by, is_locked)
VALUES
-- Discussions for Introduction to Programming
((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 'Student Introductions',
 'Introduce yourself to your fellow classmates and share your programming experience.',
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 FALSE),
 
((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 'JavaScript vs Python - Pros and Cons',
 'Discuss the advantages and disadvantages of JavaScript compared to Python for beginners.',
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 FALSE),

-- Discussions for Web Development Basics
((SELECT id FROM courses WHERE title = 'Web Development Basics'),
 'Favorite Web Development Tools',
 'Share your favorite tools, extensions, and resources for web development.',
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 FALSE),
 
-- Discussions for Database Design
((SELECT id FROM courses WHERE title = 'Database Design'),
 'SQL vs NoSQL',
 'When would you choose a SQL database over a NoSQL database? Share your thoughts and experiences.',
 (SELECT id FROM users WHERE email = 'sarah.johnson@lms.com'),
 FALSE);

-- Insert Discussion Posts
INSERT INTO discussion_posts (discussion_id, user_id, parent_post_id, content)
VALUES
-- Posts in Student Introductions
((SELECT id FROM discussions WHERE title = 'Student Introductions'),
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 NULL,
 'Welcome everyone! Please introduce yourself and share a bit about your background and what you hope to learn from this course.'),
 
((SELECT id FROM discussions WHERE title = 'Student Introductions'),
 (SELECT id FROM users WHERE email = 'student1@example.com'),
 NULL,
 'Hi everyone! I''m Alex and I''m a marketing professional looking to learn programming to better understand our website development. I have no prior programming experience but I''m excited to learn!'),
 
((SELECT id FROM discussions WHERE title = 'Student Introductions'),
 (SELECT id FROM users WHERE email = 'student3@example.com'),
 NULL,
 'Hello! I''m James and I''m a computer science student. I''ve done some Python but want to learn JavaScript for web development.'),

-- Add a reply to a post
((SELECT id FROM discussions WHERE title = 'Student Introductions'),
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 (SELECT id FROM discussion_posts WHERE content LIKE 'Hi everyone! I''m Alex%'),
 'Welcome, Alex! Great to have someone with a marketing background in the class. You''ll bring a valuable perspective!'),

-- Posts in JavaScript vs Python discussion
((SELECT id FROM discussions WHERE title = 'JavaScript vs Python - Pros and Cons'),
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 NULL,
 'Let''s discuss the advantages and disadvantages of JavaScript and Python for beginners. Which do you think is easier to learn and why?'),
 
((SELECT id FROM discussions WHERE title = 'JavaScript vs Python - Pros and Cons'),
 (SELECT id FROM users WHERE email = 'student6@example.com'),
 NULL,
 'I started with Python and found it very beginner-friendly. The syntax is clean and reads almost like English. JavaScript has more quirks that can confuse beginners.');

-- Insert Live Sessions
INSERT INTO live_sessions (course_id, lesson_id, title, description, platform, meeting_url, meeting_id, meeting_password, start_time, end_time, created_by)
VALUES
-- Live session for Introduction to Programming
((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
 NULL,
 'JavaScript Debugging Workshop',
 'A hands-on workshop about debugging techniques in JavaScript. Bring your own code or use our examples.',
 'zoom',
 'https://zoom.us/j/example',
 '123456789',
 'debug123',
 '2023-02-15 18:00:00',
 '2023-02-15 19:30:00',
 (SELECT id FROM users WHERE email = 'john.smith@lms.com')),

-- Live session for Database Design
((SELECT id FROM courses WHERE title = 'Database Design'),
 NULL,
 'Database Optimization Techniques',
 'Learn practical techniques for optimizing database performance in production environments.',
 'google_meet',
 'https://meet.google.com/example',
 'abc-defg-hij',
 NULL,
 '2023-02-20 17:00:00',
 '2023-02-20 18:30:00',
 (SELECT id FROM users WHERE email = 'sarah.johnson@lms.com'));

-- Insert System Settings
INSERT INTO system_settings (setting_key, setting_value, setting_group, description)
VALUES
('site_name', 'YourLMS', 'general', 'Name of the learning management system'),
('site_description', 'A modern learning platform for students and professionals', 'general', 'Site description used in metadata'),
('timezone', 'UTC', 'regional', 'Default timezone for the application'),
('enable_google_login', 'true', 'authentication', 'Enable Google OAuth login'),
('max_file_upload_size', '50', 'uploads', 'Maximum file upload size in MB'),
('default_user_role', 'student', 'users', 'Default role assigned to new user registrations'),
('footer_text', '© 2023 YourLMS. All rights reserved.', 'appearance', 'Text displayed in the site footer'),
('primary_color', '#3498db', 'appearance', 'Primary color used in the UI'),
('email_from', 'noreply@yourlms.com', 'email', 'Default from email address');

-- You can verify the inserted data with these queries:
-- SELECT * FROM users;
-- SELECT * FROM courses;
-- SELECT * FROM enrollments;
-- SELECT * FROM course_modules;
-- SELECT * FROM lessons;