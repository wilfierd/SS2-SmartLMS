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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Optional: Create a separate table for user sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Optional: Additional tables for course data
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id INT NOT NULL,
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
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, course_id)
);

-- Switch to the lms_db database
USE lms_db;

-- Clear existing data (if needed)
-- DELETE FROM enrollments;
-- DELETE FROM courses;
-- DELETE FROM users;

-- Insert Admin user
-- Password: admin123 (hashed)
INSERT INTO users (email, password, first_name, last_name, role, is_password_changed) 
VALUES ('admin@lms.com', 'admin123', 'Admin', 'User', 'admin', TRUE),
       ('admin2@lms.com', 'admin123', 'Admin', 'User', 'admin', TRUE);


-- Insert Instructor users
-- Password: instructor123 (hashed)
INSERT INTO users (email, password, first_name, last_name, role, is_password_changed) 
VALUES 
('john.smith@lms.com', 'instructor123', 'John', 'Smith', 'instructor', TRUE),
('sarah.johnson@lms.com', 'instructor123', 'Sarah', 'Johnson', 'instructor', TRUE);

-- Insert Student users
-- Password: 123456789 (hashed) - Default password for students
INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, google_id) 
VALUES 
('student1@example.com', '123456789', 'Alex', 'Wilson', 'student', FALSE, NULL),
('student2@example.com', '123456789', 'Maria', 'Garcia', 'student', TRUE, 'google123'),
('student3@example.com', '123456789', 'James', 'Taylor', 'student', FALSE, 'google456');

-- Insert Courses (using instructor IDs)
INSERT INTO courses (title, description, instructor_id) 
VALUES 
('Introduction to Programming', 'Learn the fundamentals of programming with JavaScript.', 
 (SELECT id FROM users WHERE email = 'john.smith@lms.com')),
 
('Web Development Basics', 'Introduction to HTML, CSS, and modern web development.', 
 (SELECT id FROM users WHERE email = 'john.smith@lms.com')),
 
('Database Design', 'Learn how to design and implement relational databases.', 
 (SELECT id FROM users WHERE email = 'sarah.johnson@lms.com')),
 
('Advanced JavaScript', 'Deep dive into JavaScript frameworks and modern practices.', 
 (SELECT id FROM users WHERE email = 'sarah.johnson@lms.com')),
 
('Mobile App Development', 'Introduction to building mobile applications with React Native.', 
 (SELECT id FROM users WHERE email = 'john.smith@lms.com'));

-- Insert Enrollments
INSERT INTO enrollments (student_id, course_id)
VALUES
-- Enroll student1 in 3 courses
((SELECT id FROM users WHERE email = 'student1@example.com'),
 (SELECT id FROM courses WHERE title = 'Introduction to Programming')),
 
((SELECT id FROM users WHERE email = 'student1@example.com'),
 (SELECT id FROM courses WHERE title = 'Web Development Basics')),
 
((SELECT id FROM users WHERE email = 'student1@example.com'),
 (SELECT id FROM courses WHERE title = 'Mobile App Development')),

-- Enroll student2 in 2 courses
((SELECT id FROM users WHERE email = 'student2@example.com'),
 (SELECT id FROM courses WHERE title = 'Database Design')),
 
((SELECT id FROM users WHERE email = 'student2@example.com'),
 (SELECT id FROM courses WHERE title = 'Advanced JavaScript')),

-- Enroll student3 in all courses
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE title = 'Introduction to Programming')),
 
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE title = 'Web Development Basics')),
 
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE title = 'Database Design')),
 
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE title = 'Advanced JavaScript')),
 
((SELECT id FROM users WHERE email = 'student3@example.com'),
 (SELECT id FROM courses WHERE title = 'Mobile App Development'));

-- You can verify the inserted data with these queries:
-- SELECT * FROM users;
-- SELECT * FROM courses;
-- SELECT * FROM enrollments;

-- More complex query to see which students are enrolled in which courses:
-- SELECT 
--     u.first_name, 
--     u.last_name, 
--     u.email, 
--     c.title AS course_title
-- FROM 
--     users u
-- JOIN 
--     enrollments e ON u.id = e.student_id
-- JOIN 
--     courses c ON e.course_id = c.id
-- WHERE 
--     u.role = 'student'
-- ORDER BY 
--     u.last_name, u.first_name, c.title;

-- Query to see which instructors are teaching which courses:
-- SELECT 
--     u.first_name, 
--     u.last_name, 
--     u.email, 
--     c.title AS course_title
-- FROM 
--     users u
-- JOIN 
--     courses c ON u.id = c.instructor_id
-- WHERE 
--     u.role = 'instructor'
-- ORDER BY 
--     u.last_name, u.first_name, c.title;

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