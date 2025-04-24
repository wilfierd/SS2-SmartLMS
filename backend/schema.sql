DROP DATABASE IF EXISTS lms_db;
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

-- Note: We're removing the explicit index creation for email since it's already indexed by UNIQUE constraint
-- Create index for role
-- DROP INDEX IF EXISTS idx_users_role ON users;
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

-- Create index for token
-- DROP INDEX IF EXISTS idx_password_reset_tokens_token ON password_reset_tokens;
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NULL,
  enrollment_key VARCHAR(255) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id INT NOT NULL,
  department_id INT,
  thumbnail_url VARCHAR(255),
  status ENUM('draft', 'published', 'upcoming', 'archived') DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  enrollment_limit INT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Create indexes for courses
-- DROP INDEX IF EXISTS idx_courses_code ON courses;
CREATE INDEX idx_courses_code ON courses(code);

-- DROP INDEX IF EXISTS idx_courses_department ON courses;
CREATE INDEX idx_courses_department ON courses(department_id);

-- DROP INDEX IF EXISTS idx_courses_status ON courses;
CREATE INDEX idx_courses_status ON courses(status);

-- Student enrollment table
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

-- ============================================
-- SAMPLE DATA INSERTS
-- ============================================

-- Insert Admin users
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
('lisa.wong@lms.com', '$2a$10$t1rZxY0wNLZNWH3m6ZYnmuGsAVgPEKYODAjKrpOg0ZCw5HBQXnGqq', 'Lisa', 'Wong', 'instructor', TRUE, 'AI researcher and machine learning specialist'),
('david.clark@lms.com', '$2a$10$t1rZxY0wNLZNWH3m6ZYnmuGsAVgPEKYODAjKrpOg0ZCw5HBQXnGqq', 'David', 'Clark', 'instructor', TRUE, 'Frontend development specialist with expertise in React and Vue'),
('anna.lee@lms.com', '$2a$10$t1rZxY0wNLZNWH3m6ZYnmuGsAVgPEKYODAjKrpOg0ZCw5HBQXnGqq', 'Anna', 'Lee', 'instructor', TRUE, 'Graphic design professional with 10+ years experience in the industry');

-- Insert Student users
INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, google_id) 
VALUES 
('student1@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'Alex', 'Wilson', 'student', FALSE, NULL),
('student2@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'Maria', 'Garcia', 'student', TRUE, 'google123'),
('student3@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'James', 'Taylor', 'student', FALSE, 'google456'),
('student4@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'Sophie', 'Chen', 'student', TRUE, NULL),
('student5@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'Omar', 'Patel', 'student', TRUE, 'google789'),
('student6@example.com', '$2a$10$DEv1Oe5LhAJXkqp.w1PrN.3iLQC6weGsRb7QAxH7FlrcjMTe1.MRu', 'Emma', 'Johnson', 'student', FALSE, NULL);

-- Insert Departments
INSERT INTO departments (name, description) 
VALUES 
('Computer Science', 'Courses related to computer programming, algorithms, and software development'),
('Mathematics', 'Courses covering various fields of mathematics including calculus, algebra, and statistics'),
('Business', 'Business administration, management, and entrepreneurship courses'),
('Arts & Design', 'Courses focused on graphic design, digital arts, and creative disciplines'),
('Data Science', 'Courses on data analysis, machine learning, and statistical methods'),
('Web Development', 'Courses specifically focused on web technologies and development'),
('Mobile Development', 'Courses related to mobile app development for iOS and Android');

-- Insert Courses
INSERT INTO courses (code, title, description, instructor_id, department_id, status, start_date, end_date, is_featured)
VALUES
('CS101', 'Introduction to Programming', 'Learn the fundamentals of programming with JavaScript. This course covers variables, control structures, functions, and basic DOM manipulation.', 
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'), 
 (SELECT id FROM departments WHERE name = 'Computer Science'),
 'published', '2023-01-15', '2023-04-15', TRUE),
 
('WD101', 'Web Development Basics', 'Introduction to HTML, CSS, and modern web development. Build responsive websites from scratch and learn about web standards.', 
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'), 
 (SELECT id FROM departments WHERE name = 'Web Development'),
 'published', '2023-02-01', '2023-05-01', TRUE),
 
('DB101', 'Database Design', 'Learn how to design and implement relational databases. Topics include ER diagrams, normalization, SQL, and database optimization.', 
 (SELECT id FROM users WHERE email = 'sarah.johnson@lms.com'), 
 (SELECT id FROM departments WHERE name = 'Computer Science'),
 'published', '2023-01-10', '2023-04-10', FALSE),
 
('JS201', 'Advanced JavaScript', 'Deep dive into JavaScript frameworks and modern practices. Learn about closures, async programming, and front-end frameworks.', 
 (SELECT id FROM users WHERE email = 'sarah.johnson@lms.com'), 
 (SELECT id FROM departments WHERE name = 'Web Development'),
 'published', '2023-03-01', '2023-06-01', TRUE),
 
('MD101', 'Mobile App Development', 'Introduction to building mobile applications with React Native. Create cross-platform mobile apps with JavaScript.', 
 (SELECT id FROM users WHERE email = 'michael.brown@lms.com'), 
 (SELECT id FROM departments WHERE name = 'Mobile Development'),
 'published', '2023-02-15', '2023-05-15', FALSE),
 
('AI101', 'Artificial Intelligence Fundamentals', 'Understand the core concepts of AI including machine learning, neural networks, and natural language processing.', 
 (SELECT id FROM users WHERE email = 'lisa.wong@lms.com'), 
 (SELECT id FROM departments WHERE name = 'Data Science'),
 'published', '2023-03-10', '2023-06-10', TRUE),
 
('DEV101', 'DevOps Practices', 'Learn about continuous integration, delivery, and deployment. Includes Docker, Jenkins, and cloud deployment strategies.', 
 (SELECT id FROM users WHERE email = 'michael.brown@lms.com'), 
 (SELECT id FROM departments WHERE name = 'Computer Science'),
 'draft', '2023-04-01', '2023-07-01', FALSE);

-- Insert Enrollments
INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
VALUES
-- Enroll student1 in 3 courses
((SELECT id FROM users WHERE email = 'student1@example.com'),
 (SELECT id FROM courses WHERE code = 'CS101'),
 '2023-01-16', 'in_progress'),
 
((SELECT id FROM users WHERE email = 'student1@example.com'),
 (SELECT id FROM courses WHERE code = 'WD101'),
 '2023-02-02', 'not_started'),
 
((SELECT id FROM users WHERE email = 'student1@example.com'),
 (SELECT id FROM courses WHERE code = 'MD101'),
 '2023-02-16', 'not_started'),

-- Enroll student2 in 2 courses
((SELECT id FROM users WHERE email = 'student2@example.com'),
 (SELECT id FROM courses WHERE code = 'DB101'),
 '2023-01-11', 'completed'),
 
((SELECT id FROM users WHERE email = 'student2@example.com'),
 (SELECT id FROM courses WHERE code = 'JS201'),
 '2023-03-02', 'in_progress'),

-- Enroll student3 in courses
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE code = 'CS101'),
 '2023-01-20', 'completed'),
 
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE code = 'WD101'),
 '2023-02-05', 'in_progress'),
 
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE code = 'DB101'),
 '2023-01-15', 'in_progress');

-- Insert Course Modules
INSERT INTO course_modules (course_id, title, description, order_index, is_published)
VALUES
-- Introduction to Programming Modules
((SELECT id FROM courses WHERE code = 'CS101'),
 'Getting Started with Programming', 
 'Introduction to basic programming concepts and setting up your development environment.',
 1, TRUE),
 
((SELECT id FROM courses WHERE code = 'CS101'),
 'JavaScript Fundamentals', 
 'Core JavaScript concepts including variables, data types, and operators.',
 2, TRUE),
 
((SELECT id FROM courses WHERE code = 'CS101'),
 'Control Structures', 
 'Conditional statements, loops, and flow control in JavaScript.',
 3, TRUE),
 
((SELECT id FROM courses WHERE code = 'CS101'),
 'Functions and Objects', 
 'Creating and using functions, introduction to object-oriented programming.',
 4, TRUE),

-- Web Development Basics Modules
((SELECT id FROM courses WHERE code = 'WD101'),
 'HTML Essentials', 
 'Core HTML elements, document structure, and semantic markup.',
 1, TRUE),
 
((SELECT id FROM courses WHERE code = 'WD101'),
 'CSS Fundamentals', 
 'Styling web pages with CSS, selectors, and the box model.',
 2, TRUE),
 
((SELECT id FROM courses WHERE code = 'WD101'),
 'Responsive Design', 
 'Making websites that work on any device size using responsive techniques.',
 3, TRUE),
 
((SELECT id FROM courses WHERE code = 'WD101'),
 'Introduction to JavaScript for the Web', 
 'Using JavaScript to add interactivity to web pages.',
 4, FALSE);

-- Insert Lessons
INSERT INTO lessons (module_id, title, description, content_type, content, duration_minutes, order_index, is_published)
VALUES
-- Getting Started with Programming Lessons
((SELECT id FROM course_modules WHERE title = 'Getting Started with Programming' AND course_id = (SELECT id FROM courses WHERE code = 'CS101')),
 'What is Programming?', 
 'An introduction to computer programming and why it matters.',
 'document',
 'Programming is the process of creating a set of instructions that tell a computer how to perform a task. Programming can be done using a variety of computer programming languages, such as JavaScript, Python, and C++.',
 30, 1, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'Getting Started with Programming' AND course_id = (SELECT id FROM courses WHERE code = 'CS101')),
 'Setting Up Your Development Environment', 
 'Installing and configuring the tools you need to start programming.',
 'document',
 'In this lesson, we will install Visual Studio Code, Node.js, and set up our first JavaScript project. We will also discuss various extensions that can help make development easier.',
 45, 2, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'Getting Started with Programming' AND course_id = (SELECT id FROM courses WHERE code = 'CS101')),
 'Writing Your First Program', 
 'Creating and running a simple "Hello World" program.',
 'video',
 'https://example.com/videos/first-program.mp4',
 20, 3, TRUE),

-- JavaScript Fundamentals Lessons
((SELECT id FROM course_modules WHERE title = 'JavaScript Fundamentals' AND course_id = (SELECT id FROM courses WHERE code = 'CS101')),
 'Variables and Data Types', 
 'Understanding how to store and manipulate data in JavaScript.',
 'document',
 'JavaScript has several data types: String, Number, Boolean, Object, Undefined, and Null. Variables are declared using let, const, or var keywords.',
 60, 1, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'JavaScript Fundamentals' AND course_id = (SELECT id FROM courses WHERE code = 'CS101')),
 'Operators and Expressions', 
 'Using operators to perform operations on variables and values.',
 'video',
 'https://example.com/videos/operators.mp4',
 45, 2, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'JavaScript Fundamentals' AND course_id = (SELECT id FROM courses WHERE code = 'CS101')),
 'Basic Input and Output', 
 'Getting input from users and displaying output.',
 'document',
 'In a web browser, you can use prompt() to get input and console.log() or document.write() to display output. In Node.js, you can use the readline module.',
 30, 3, TRUE),
 
-- HTML Essentials Lessons
((SELECT id FROM course_modules WHERE title = 'HTML Essentials' AND course_id = (SELECT id FROM courses WHERE code = 'WD101')),
 'Introduction to HTML', 
 'Understanding what HTML is and how it structures web content.',
 'document',
 'HTML (HyperText Markup Language) is the standard markup language for documents designed to be displayed in a web browser. It defines the structure and content of a web page.',
 30, 1, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'HTML Essentials' AND course_id = (SELECT id FROM courses WHERE code = 'WD101')),
 'HTML Document Structure', 
 'Creating properly structured HTML documents with all necessary elements.',
 'video',
 'https://example.com/videos/html-structure.mp4',
 45, 2, TRUE),
 
((SELECT id FROM course_modules WHERE title = 'HTML Essentials' AND course_id = (SELECT id FROM courses WHERE code = 'WD101')),
 'Text Elements and Links', 
 'Working with headings, paragraphs, lists, and hyperlinks.',
 'assignment',
 'Create a simple web page with headings, paragraphs, lists, and links to other websites.',
 60, 3, TRUE);

-- Insert Assignments
INSERT INTO assignments (course_id, lesson_id, title, description, instructions, max_points, due_date, allow_late_submissions)
VALUES
-- Assignments for Introduction to Programming
((SELECT id FROM courses WHERE code = 'CS101'),
 (SELECT id FROM lessons WHERE title = 'Writing Your First Program'),
 'Hello World Program',
 'Create a JavaScript program that displays "Hello, World!" in the console.',
 'Write a JavaScript program that uses console.log() to display the message "Hello, World!" when executed. Submit your .js file.',
 10,
 '2023-01-30 23:59:59',
 TRUE),

((SELECT id FROM courses WHERE code = 'CS101'),
 (SELECT id FROM lessons WHERE title = 'Variables and Data Types'),
 'Variable Manipulation',
 'Create a program that demonstrates the use of different variable types.',
 'Write a JavaScript program that creates variables of different types (string, number, boolean, array, object) and performs operations on them. Include comments explaining each step.',
 20,
 '2023-02-15 23:59:59',
 FALSE),

-- Assignments for Web Development Basics
((SELECT id FROM courses WHERE code = 'WD101'),
 (SELECT id FROM lessons WHERE title = 'Text Elements and Links'),
 'Personal Bio Page',
 'Create a simple personal biography page using HTML elements.',
 'Create an HTML page that includes your name, a brief bio, a list of hobbies, and links to at least 3 websites you frequently visit. Use appropriate heading levels, paragraphs, and list elements.',
 25,
 '2023-02-28 23:59:59',
 TRUE);

-- Insert Discussions
INSERT INTO discussions (course_id, title, description, created_by, is_locked)
VALUES
-- Discussions for Introduction to Programming
((SELECT id FROM courses WHERE code = 'CS101'),
 'Student Introductions',
 'Introduce yourself to your fellow classmates and share your programming experience.',
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 FALSE),
 
((SELECT id FROM courses WHERE code = 'CS101'),
 'JavaScript vs Python - Pros and Cons',
 'Discuss the advantages and disadvantages of JavaScript compared to Python for beginners.',
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 FALSE),

-- Discussions for Web Development Basics
((SELECT id FROM courses WHERE code = 'WD101'),
 'Favorite Web Development Tools',
 'Share your favorite tools, extensions, and resources for web development.',
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 FALSE);

-- Insert Discussion Posts
INSERT INTO discussion_posts (discussion_id, user_id, parent_post_id, content)
VALUES
-- Posts in Student Introductions
((SELECT id FROM discussions WHERE title = 'Student Introductions' AND course_id = (SELECT id FROM courses WHERE code = 'CS101')),
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
 NULL,
 'Welcome everyone! Please introduce yourself and share a bit about your background and what you hope to learn from this course.');

-- Insert System Settings
INSERT INTO system_settings (setting_key, setting_value, setting_group, description)
VALUES
('site_name', 'LMS Hub', 'general', 'Name of the learning management system'),
('site_description', 'A modern learning platform for students and professionals', 'general', 'Site description used in metadata'),
('timezone', 'UTC', 'regional', 'Default timezone for the application'),
('enable_google_login', 'true', 'authentication', 'Enable Google OAuth login'),
('max_file_upload_size', '50', 'uploads', 'Maximum file upload size in MB');