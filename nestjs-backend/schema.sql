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
-- User activities table
CREATE TABLE IF NOT EXISTS user_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM(
    'login',
    'logout',
    'course_access',
    'module_complete',
    'assignment_submit',
    'quiz_complete',
    'session_join',
    'session_leave',
    'profile_update',
    'password_change'
  ) NOT NULL,
  description TEXT,
  metadata JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Create index for user activities
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_type ON user_activities(type);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);
-- User sessions table for tracking login sessions
CREATE TABLE IF NOT EXISTS user_sessions_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Create indexes for user sessions tracking
CREATE INDEX idx_user_sessions_tracking_user_id ON user_sessions_tracking(user_id);
CREATE INDEX idx_user_sessions_tracking_session_id ON user_sessions_tracking(session_id);
CREATE INDEX idx_user_sessions_tracking_login_time ON user_sessions_tracking(login_time);
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
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE
  SET NULL
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
  content_type ENUM(
    'rich_content',
    'quiz',
    'assignment',
    'live_session'
  ) NOT NULL,
  content TEXT,
  video_url VARCHAR(512),
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
  file_type VARCHAR(100),
  file_size INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
  allowed_file_types VARCHAR(255) DEFAULT 'pdf,docx,doc,txt',
  max_file_size INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES course_modules(id) ON DELETE
  SET NULL
);
-- Assignment submissions
CREATE TABLE IF NOT EXISTS submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  submission_text TEXT,
  file_path VARCHAR(512),
  submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  grade DECIMAL(5, 2),
  feedback TEXT,
  is_graded BOOLEAN DEFAULT FALSE,
  graded_by INT,
  graded_at TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE
  SET NULL
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
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE
  SET NULL
);
-- Quiz questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM(
    'multiple_choice',
    'true_false',
    'short_answer',
    'essay'
  ) NOT NULL,
  points INT NOT NULL DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);
-- Quiz options (answers)
CREATE TABLE IF NOT EXISTS quiz_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INT NOT NULL DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);
-- Discussion forums
CREATE TABLE IF NOT EXISTS discussions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
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
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE
  SET NULL
);
-- ============================================
-- SAMPLE DATA INSERTS
-- ============================================
-- Insert Admin users
INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    role,
    is_password_changed,
    bio
  )
VALUES (
    'admin@lms.com',
    '$2b$12$Fn0QOsa4ssM1zG.QXoFz3.AirzMpArC/iJ4PgaLeRok6uR4p6RYQW',
    'Admin',
    'User',
    'admin',
    TRUE,
    'Main system administrator'
  ),
  (
    'admin2@lms.com',
    '$2b$12$Fn0QOsa4ssM1zG.QXoFz3.AirzMpArC/iJ4PgaLeRok6uR4p6RYQW',
    'Secondary',
    'Admin',
    'admin',
    TRUE,
    'Assistant system administrator'
  );
-- Insert Instructor users
INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    role,
    is_password_changed,
    bio
  )
VALUES (
    'john.smith@lms.com',
    '$2b$12$l0zkpTW47nVBmTHPyQNLJeDveMs0y2U3l6GzY1w1meTKweHr8k83y',
    'John',
    'Smith',
    'instructor',
    TRUE,
    'Professor of Computer Science with 15 years of industry experience'
  ),
  (
    'sarah.johnson@lms.com',
    '$2b$12$l0zkpTW47nVBmTHPyQNLJeDveMs0y2U3l6GzY1w1meTKweHr8k83y',
    'Sarah',
    'Johnson',
    'instructor',
    TRUE,
    'Database specialist and former tech lead at Oracle'
  ),
  (
    'michael.brown@lms.com',
    '$2b$12$l0zkpTW47nVBmTHPyQNLJeDveMs0y2U3l6GzY1w1meTKweHr8k83y',
    'Michael',
    'Brown',
    'instructor',
    TRUE,
    'Mobile app developer and UX design expert'
  ),
  (
    'lisa.wong@lms.com',
    '$2b$12$l0zkpTW47nVBmTHPyQNLJeDveMs0y2U3l6GzY1w1meTKweHr8k83y',
    'Lisa',
    'Wong',
    'instructor',
    TRUE,
    'AI researcher and machine learning specialist'
  ),
  (
    'david.clark@lms.com',
    '$2b$12$l0zkpTW47nVBmTHPyQNLJeDveMs0y2U3l6GzY1w1meTKweHr8k83y',
    'David',
    'Clark',
    'instructor',
    TRUE,
    'Frontend development specialist with expertise in React and Vue'
  ),
  (
    'anna.lee@lms.com',
    '$2b$12$l0zkpTW47nVBmTHPyQNLJeDveMs0y2U3l6GzY1w1meTKweHr8k83y',
    'Anna',
    'Lee',
    'instructor',
    TRUE,
    'Graphic design professional with 10+ years experience in the industry'
  );
-- Insert Student users
INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    role,
    is_password_changed,
    google_id
  )
VALUES (
    'student1@example.com',
    '$2b$12$7nKOCz9SrHaitqxHr0/KE.WFhz0a00X7A/UF5VZQ/2CMxWhRDBuCK',
    'Alex',
    'Wilson',
    'student',
    FALSE,
    NULL
  ),
  (
    'student2@example.com',
    '$2b$12$7nKOCz9SrHaitqxHr0/KE.WFhz0a00X7A/UF5VZQ/2CMxWhRDBuCK',
    'Maria',
    'Garcia',
    'student',
    TRUE,
    'google123'
  ),
  (
    'student3@example.com',
    '$2b$12$7nKOCz9SrHaitqxHr0/KE.WFhz0a00X7A/UF5VZQ/2CMxWhRDBuCK',
    'James',
    'Taylor',
    'student',
    FALSE,
    'google456'
  ),
  (
    'student4@example.com',
    '$2b$12$7nKOCz9SrHaitqxHr0/KE.WFhz0a00X7A/UF5VZQ/2CMxWhRDBuCK',
    'Sophie',
    'Chen',
    'student',
    TRUE,
    NULL
  ),
  (
    'student5@example.com',
    '$2b$12$7nKOCz9SrHaitqxHr0/KE.WFhz0a00X7A/UF5VZQ/2CMxWhRDBuCK',
    'Omar',
    'Patel',
    'student',
    TRUE,
    'google789'
  ),
  (
    'student6@example.com',
    '$2b$12$7nKOCz9SrHaitqxHr0/KE.WFhz0a00X7A/UF5VZQ/2CMxWhRDBuCK',
    'Emma',
    'Johnson',
    'student',
    FALSE,
    NULL
  );
-- Insert Departments
INSERT INTO departments (name, description)
VALUES (
    'Computer Science',
    'Courses related to computer programming, algorithms, and software development'
  ),
  (
    'Mathematics',
    'Courses covering various fields of mathematics including calculus, algebra, and statistics'
  ),
  (
    'Business',
    'Business administration, management, and entrepreneurship courses'
  ),
  (
    'Arts & Design',
    'Courses focused on graphic design, digital arts, and creative disciplines'
  ),
  (
    'Data Science',
    'Courses on data analysis, machine learning, and statistical methods'
  ),
  (
    'Web Development',
    'Courses specifically focused on web technologies and development'
  ),
  (
    'Mobile Development',
    'Courses related to mobile app development for iOS and Android'
  );
-- Insert Courses
INSERT INTO courses (
    code,
    enrollment_key,
    title,
    description,
    instructor_id,
    department_id,
    status,
    start_date,
    end_date,
    is_featured
  )
VALUES (
    'CS101',
    'enrollment_key_1',
    'Introduction to Programming',
    'Learn the fundamentals of programming with JavaScript. This course covers variables, control structures, functions, and basic DOM manipulation.',
    (
      SELECT id
      FROM users
      WHERE email = 'john.smith@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Computer Science'
    ),
    'published',
    '2023-01-15',
    '2023-04-15',
    TRUE
  ),
  (
    'WD101',
    'enrollment_key_2',
    'Web Development Basics',
    'Introduction to HTML, CSS, and modern web development. Build responsive websites from scratch and learn about web standards.',
    (
      SELECT id
      FROM users
      WHERE email = 'john.smith@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Web Development'
    ),
    'published',
    '2023-02-01',
    '2023-05-01',
    TRUE
  ),
  (
    'DB101',
    'enrollment_key_3',
    'Database Design',
    'Learn how to design and implement relational databases. Topics include ER diagrams, normalization, SQL, and database optimization.',
    (
      SELECT id
      FROM users
      WHERE email = 'sarah.johnson@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Computer Science'
    ),
    'published',
    '2023-01-10',
    '2023-04-10',
    FALSE
  ),
  (
    'JS201',
    'enrollment_key_4',
    'Advanced JavaScript',
    'Deep dive into JavaScript frameworks and modern practices. Learn about closures, async programming, and front-end frameworks.',
    (
      SELECT id
      FROM users
      WHERE email = 'sarah.johnson@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Web Development'
    ),
    'published',
    '2023-03-01',
    '2023-06-01',
    TRUE
  ),
  (
    'MD101',
    'enrollment_key_5',
    'Mobile App Development',
    'Introduction to building mobile applications with React Native. Create cross-platform mobile apps with JavaScript.',
    (
      SELECT id
      FROM users
      WHERE email = 'michael.brown@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Mobile Development'
    ),
    'published',
    '2023-02-15',
    '2023-05-15',
    FALSE
  ),
  (
    'AI101',
    'enrollment_key_6',
    'Artificial Intelligence Fundamentals',
    'Understand the core concepts of AI including machine learning, neural networks, and natural language processing.',
    (
      SELECT id
      FROM users
      WHERE email = 'lisa.wong@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Data Science'
    ),
    'published',
    '2023-03-10',
    '2023-06-10',
    TRUE
  ),
  (
    'DEV101',
    'enrollment_key_7',
    'DevOps Practices',
    'Learn about continuous integration, delivery, and deployment. Includes Docker, Jenkins, and cloud deployment strategies.',
    (
      SELECT id
      FROM users
      WHERE email = 'michael.brown@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Computer Science'
    ),
    'draft',
    '2023-04-01',
    '2023-07-01',
    FALSE
  ),
  (
    'PY101',
    'enrollment_key_8',
    'Python Programming Fundamentals',
    'Learn Python programming from basics to advanced concepts. Cover data structures, file handling, and object-oriented programming.',
    (
      SELECT id
      FROM users
      WHERE email = 'lisa.wong@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Computer Science'
    ),
    'published',
    '2023-03-15',
    '2023-06-15',
    TRUE
  ),
  (
    'DS201',
    'enrollment_key_9',
    'Data Structures and Algorithms',
    'Master fundamental data structures and algorithms. Learn about arrays, linked lists, trees, graphs, sorting, and searching algorithms.',
    (
      SELECT id
      FROM users
      WHERE email = 'sarah.johnson@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Computer Science'
    ),
    'published',
    '2023-04-01',
    '2023-07-01',
    TRUE
  ),
  (
    'ML101',
    'enrollment_key_10',
    'Machine Learning Basics',
    'Introduction to machine learning concepts, supervised and unsupervised learning, and popular ML algorithms.',
    (
      SELECT id
      FROM users
      WHERE email = 'lisa.wong@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Data Science'
    ),
    'published',
    '2023-05-01',
    '2023-08-01',
    TRUE
  ),
  (
    'REACT101',
    'enrollment_key_11',
    'React.js Development',
    'Build modern web applications with React.js. Learn components, state management, hooks, and best practices.',
    (
      SELECT id
      FROM users
      WHERE email = 'david.clark@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Web Development'
    ),
    'published',
    '2023-04-15',
    '2023-07-15',
    TRUE
  ),
  (
    'UX101',
    'enrollment_key_12',
    'User Experience Design',
    'Learn the principles of UX design, user research, wireframing, prototyping, and usability testing.',
    (
      SELECT id
      FROM users
      WHERE email = 'anna.lee@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Arts & Design'
    ),
    'published',
    '2023-03-01',
    '2023-06-01',
    FALSE
  ),
  (
    'GD101',
    'enrollment_key_13',
    'Graphic Design Fundamentals',
    'Master the basics of graphic design including typography, color theory, composition, and design software.',
    (
      SELECT id
      FROM users
      WHERE email = 'anna.lee@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Arts & Design'
    ),
    'published',
    '2023-02-15',
    '2023-05-15',
    TRUE
  ),
  (
    'CYBER101',
    'enrollment_key_14',
    'Cybersecurity Fundamentals',
    'Learn essential cybersecurity concepts, threat assessment, network security, and ethical hacking basics.',
    (
      SELECT id
      FROM users
      WHERE email = 'michael.brown@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Computer Science'
    ),
    'published',
    '2023-06-01',
    '2023-09-01',
    FALSE
  ),
  (
    'STAT101',
    'enrollment_key_15',
    'Statistics for Data Science',
    'Essential statistics concepts for data analysis, probability, hypothesis testing, and statistical inference.',
    (
      SELECT id
      FROM users
      WHERE email = 'lisa.wong@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Mathematics'
    ),
    'published',
    '2023-05-15',
    '2023-08-15',
    TRUE
  ),
  (
    'CLOUD101',
    'enrollment_key_16',
    'Cloud Computing Essentials',
    'Introduction to cloud computing platforms, services, and deployment models. Focus on AWS, Azure, and GCP.',
    (
      SELECT id
      FROM users
      WHERE email = 'michael.brown@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Computer Science'
    ),
    'published',
    '2023-07-01',
    '2023-10-01',
    FALSE
  ),
  (
    'BIZ101',
    'enrollment_key_17',
    'Digital Marketing Fundamentals',
    'Learn digital marketing strategies, social media marketing, SEO, content marketing, and analytics.',
    (
      SELECT id
      FROM users
      WHERE email = 'david.clark@lms.com'
    ),
    (
      SELECT id
      FROM departments
      WHERE name = 'Business'
    ),
    'published',
    '2023-06-15',
    '2023-09-15',
    TRUE
  );
-- Insert Enrollments
INSERT INTO enrollments (
    student_id,
    course_id,
    enrollment_date,
    completion_status
  )
VALUES -- Enroll student1 in 3 courses
  (
    (
      SELECT id
      FROM users
      WHERE email = 'student1@example.com'
    ),
    (
      SELECT id
      FROM courses
      WHERE code = 'CS101'
    ),
    '2023-01-16',
    'in_progress'
  ),
  (
    (
      SELECT id
      FROM users
      WHERE email = 'student1@example.com'
    ),
    (
      SELECT id
      FROM courses
      WHERE code = 'WD101'
    ),
    '2023-02-02',
    'not_started'
  ),
  (
    (
      SELECT id
      FROM users
      WHERE email = 'student1@example.com'
    ),
    (
      SELECT id
      FROM courses
      WHERE code = 'MD101'
    ),
    '2023-02-16',
    'not_started'
  ),
  -- Enroll student2 in 2 courses
  (
    (
      SELECT id
      FROM users
      WHERE email = 'student2@example.com'
    ),
    (
      SELECT id
      FROM courses
      WHERE code = 'DB101'
    ),
    '2023-01-11',
    'completed'
  ),
  (
    (
      SELECT id
      FROM users
      WHERE email = 'student2@example.com'
    ),
    (
      SELECT id
      FROM courses
      WHERE code = 'JS201'
    ),
    '2023-03-02',
    'in_progress'
  ),
  -- Enroll student3 in courses
  (
    (
      SELECT id
      FROM users
      WHERE email = 'student3@example.com'
    ),
    (
      SELECT id
      FROM courses
      WHERE code = 'CS101'
    ),
    '2023-01-20',
    'completed'
  ),
  (
    (
      SELECT id
      FROM users
      WHERE email = 'student3@example.com'
    ),
    (
      SELECT id
      FROM courses
      WHERE code = 'WD101'
    ),
    '2023-02-05',
    'in_progress'
  ),
  (
    (
      SELECT id
      FROM users
      WHERE email = 'student3@example.com'
    ),
    (
      SELECT id
      FROM courses
      WHERE code = 'DB101'
    ),
    '2023-01-15',
    'in_progress'
  );
-- Insert Course Modules
INSERT INTO course_modules (
    course_id,
    title,
    description,
    order_index,
    is_published
  )
VALUES -- Introduction to Programming Modules
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CS101'
    ),
    'Getting Started with Programming',
    'Introduction to basic programming concepts and setting up your development environment.',
    1,
    TRUE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CS101'
    ),
    'JavaScript Fundamentals',
    'Core JavaScript concepts including variables, data types, and operators.',
    2,
    TRUE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CS101'
    ),
    'Control Structures',
    'Conditional statements, loops, and flow control in JavaScript.',
    3,
    TRUE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CS101'
    ),
    'Functions and Objects',
    'Creating and using functions, introduction to object-oriented programming.',
    4,
    TRUE
  ),
  -- Web Development Basics Modules
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'WD101'
    ),
    'HTML Essentials',
    'Core HTML elements, document structure, and semantic markup.',
    1,
    TRUE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'WD101'
    ),
    'CSS Fundamentals',
    'Styling web pages with CSS, selectors, and the box model.',
    2,
    TRUE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'WD101'
    ),
    'Responsive Design',
    'Making websites that work on any device size using responsive techniques.',
    3,
    TRUE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'WD101'
    ),
    'Introduction to JavaScript for the Web',
    'Using JavaScript to add interactivity to web pages.',
    4,
    FALSE
  );
-- Insert Lessons
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
VALUES -- Getting Started with Programming Lessons
  (
    (
      SELECT id
      FROM course_modules
      WHERE title = 'Getting Started with Programming'
        AND course_id = (
          SELECT id
          FROM courses
          WHERE code = 'CS101'
        )
    ),
    'What is Programming?',
    'An introduction to computer programming and why it matters.',
    'rich_content',
    'Programming is the process of creating a set of instructions that tell a computer how to perform a task. Programming can be done using a variety of computer programming languages, such as JavaScript, Python, and C++.',
    NULL,
    30,
    1,
    TRUE
  ),
  (
    (
      SELECT id
      FROM course_modules
      WHERE title = 'Getting Started with Programming'
        AND course_id = (
          SELECT id
          FROM courses
          WHERE code = 'CS101'
        )
    ),
    'Setting Up Your Development Environment',
    'Installing and configuring the tools you need to start programming.',
    'rich_content',
    'In this lesson, we will install Visual Studio Code, Node.js, and set up our first JavaScript project. We will also discuss various extensions that can help make development easier.',
    NULL,
    45,
    2,
    TRUE
  ),
  (
    (
      SELECT id
      FROM course_modules
      WHERE title = 'Getting Started with Programming'
        AND course_id = (
          SELECT id
          FROM courses
          WHERE code = 'CS101'
        )
    ),
    'Writing Your First Program',
    'Creating and running a simple "Hello World" program.',
    'rich_content',
    'In this lesson, you will create and run your first JavaScript program. This is an exciting milestone in your programming journey!',
    'https://example.com/videos/first-program.mp4',
    20,
    3,
    TRUE
  ),
  -- JavaScript Fundamentals Lessons
  (
    (
      SELECT id
      FROM course_modules
      WHERE title = 'JavaScript Fundamentals'
        AND course_id = (
          SELECT id
          FROM courses
          WHERE code = 'CS101'
        )
    ),
    'Variables and Data Types',
    'Understanding how to store and manipulate data in JavaScript.',
    'rich_content',
    'JavaScript has several data types: String, Number, Boolean, Object, Undefined, and Null. Variables are declared using let, const, or var keywords.',
    NULL,
    60,
    1,
    TRUE
  ),
  (
    (
      SELECT id
      FROM course_modules
      WHERE title = 'JavaScript Fundamentals'
        AND course_id = (
          SELECT id
          FROM courses
          WHERE code = 'CS101'
        )
    ),
    'Operators and Expressions',
    'Using operators to perform operations on variables and values.',
    'rich_content',
    'This lesson covers arithmetic, comparison, logical, and assignment operators in JavaScript.',
    'https://example.com/videos/operators.mp4',
    45,
    2,
    TRUE
  ),
  (
    (
      SELECT id
      FROM course_modules
      WHERE title = 'JavaScript Fundamentals'
        AND course_id = (
          SELECT id
          FROM courses
          WHERE code = 'CS101'
        )
    ),
    'Basic Input and Output',
    'Getting input from users and displaying output.',
    'rich_content',
    'In a web browser, you can use prompt() to get input and console.log() or document.write() to display output. In Node.js, you can use the readline module.',
    NULL,
    30,
    3,
    TRUE
  ),
  -- HTML Essentials Lessons
  (
    (
      SELECT id
      FROM course_modules
      WHERE title = 'HTML Essentials'
        AND course_id = (
          SELECT id
          FROM courses
          WHERE code = 'WD101'
        )
    ),
    'Introduction to HTML',
    'Understanding what HTML is and how it structures web content.',
    'rich_content',
    'HTML (HyperText Markup Language) is the standard markup language for documents designed to be displayed in a web browser. It defines the structure and content of a web page.',
    NULL,
    30,
    1,
    TRUE
  ),
  (
    (
      SELECT id
      FROM course_modules
      WHERE title = 'HTML Essentials'
        AND course_id = (
          SELECT id
          FROM courses
          WHERE code = 'WD101'
        )
    ),
    'HTML Document Structure',
    'Creating properly structured HTML documents with all necessary elements.',
    'rich_content',
    'Learn how to create a complete HTML document with DOCTYPE, html, head, and body elements.',
    'https://example.com/videos/html-structure.mp4',
    45,
    2,
    TRUE
  ),
  (
    (
      SELECT id
      FROM course_modules
      WHERE title = 'HTML Essentials'
        AND course_id = (
          SELECT id
          FROM courses
          WHERE code = 'WD101'
        )
    ),
    'Text Elements and Links',
    'Working with headings, paragraphs, lists, and hyperlinks.',
    'assignment',
    'Create a simple web page with headings, paragraphs, lists, and links to other websites.',
    NULL,
    60,
    3,
    TRUE
  );
-- Insert Assignments
INSERT INTO assignments (
    course_id,
    lesson_id,
    title,
    description,
    instructions,
    max_points,
    due_date,
    allow_late_submissions
  )
VALUES -- Assignments for Introduction to Programming
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CS101'
    ),
    (
      SELECT id
      FROM course_modules
      WHERE title = 'Programming Fundamentals' AND course_id = (SELECT id FROM courses WHERE code = 'CS101')
    ),
    'Hello World Program',
    'Create a JavaScript program that displays "Hello, World!" in the console.',
    'Write a JavaScript program that uses console.log() to display the message "Hello, World!" when executed. Submit your .js file.',
    10,
    '2023-01-30 23:59:59',
    TRUE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CS101'
    ),
    (
      SELECT id
      FROM course_modules
      WHERE title = 'Programming Fundamentals' AND course_id = (SELECT id FROM courses WHERE code = 'CS101')
    ),
    'Variable Manipulation',
    'Create a program that demonstrates the use of different variable types.',
    'Write a JavaScript program that creates variables of different types (string, number, boolean, array, object) and performs operations on them. Include comments explaining each step.',
    20,
    '2023-02-15 23:59:59',
    FALSE
  ),  -- Assignments for Web Development Basics
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'WD101'
    ),
    (
      SELECT id
      FROM course_modules
      WHERE title = 'HTML Fundamentals' AND course_id = (SELECT id FROM courses WHERE code = 'WD101')
    ),
    'Personal Bio Page',
    'Create a simple personal biography page using HTML elements.',
    'Create an HTML page that includes your name, a brief bio, a list of hobbies, and links to at least 3 websites you frequently visit. Use appropriate heading levels, paragraphs, and list elements.',
    25,
    '2023-02-28 23:59:59',
    TRUE
  );
-- Insert Discussions
INSERT INTO discussions (
    course_id,
    title,
    description,
    created_by,
    is_locked
  )
VALUES -- Discussions for Introduction to Programming
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CS101'
    ),
    'Student Introductions',
    'Introduce yourself to your fellow classmates and share your programming experience.',
    (
      SELECT id
      FROM users
      WHERE email = 'john.smith@lms.com'
    ),
    FALSE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CS101'
    ),
    'JavaScript vs Python - Pros and Cons',
    'Discuss the advantages and disadvantages of JavaScript compared to Python for beginners.',
    (
      SELECT id
      FROM users
      WHERE email = 'john.smith@lms.com'
    ),
    FALSE
  ),
  -- Discussions for Web Development Basics
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'WD101'
    ),
    'Favorite Web Development Tools',
    'Share your favorite tools, extensions, and resources for web development.',
    (
      SELECT id
      FROM users
      WHERE email = 'john.smith@lms.com'
    ),
    FALSE
  ),
  -- Discussions for Python Programming Fundamentals
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'PY101'
    ),
    'Python vs Other Languages',
    'Compare Python with other programming languages. What makes Python special for beginners?',
    (
      SELECT id
      FROM users
      WHERE email = 'lisa.wong@lms.com'
    ),
    FALSE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'PY101'
    ),
    'Practical Python Projects',
    'Share ideas for beginner-friendly Python projects and discuss implementation strategies.',
    (
      SELECT id
      FROM users
      WHERE email = 'lisa.wong@lms.com'
    ),
    FALSE
  ),
  -- Discussions for Data Structures and Algorithms
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'DS201'
    ),
    'Algorithm Complexity Discussion',
    'Discuss time and space complexity of different algorithms. Share your analysis approaches.',
    (
      SELECT id
      FROM users
      WHERE email = 'sarah.johnson@lms.com'
    ),
    FALSE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'DS201'
    ),
    'Real-world Data Structure Applications',
    'Where do you see data structures being used in real-world applications?',
    (
      SELECT id
      FROM users
      WHERE email = 'sarah.johnson@lms.com'
    ),
    FALSE
  ),
  -- Discussions for Machine Learning Basics
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'ML101'
    ),
    'ML in Daily Life',
    'Discuss how machine learning impacts our daily lives. Share examples you have encountered.',
    (
      SELECT id
      FROM users
      WHERE email = 'lisa.wong@lms.com'
    ),
    FALSE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'ML101'
    ),
    'Supervised vs Unsupervised Learning',
    'Compare different learning paradigms and discuss when to use each approach.',
    (
      SELECT id
      FROM users
      WHERE email = 'lisa.wong@lms.com'
    ),
    FALSE
  ),
  -- Discussions for React.js Development
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'REACT101'
    ),
    'React vs Other Frameworks',
    'Compare React with Vue, Angular, and other front-end frameworks. Share your experiences.',
    (
      SELECT id
      FROM users
      WHERE email = 'david.clark@lms.com'
    ),
    FALSE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'REACT101'
    ),
    'State Management Solutions',
    'Discuss different state management approaches in React: Context, Redux, Zustand, etc.',
    (
      SELECT id
      FROM users
      WHERE email = 'david.clark@lms.com'
    ),
    FALSE
  ),
  -- Discussions for User Experience Design
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'UX101'
    ),
    'UX Design Tools and Resources',
    'Share your favorite UX design tools, prototyping software, and learning resources.',
    (
      SELECT id
      FROM users
      WHERE email = 'anna.lee@lms.com'
    ),
    FALSE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'UX101'
    ),
    'User Research Methods',
    'Discuss different user research techniques and when to apply them in your design process.',
    (
      SELECT id
      FROM users
      WHERE email = 'anna.lee@lms.com'
    ),
    FALSE
  ),
  -- Discussions for Graphic Design Fundamentals
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'GD101'
    ),
    'Typography Best Practices',
    'Share tips and discuss best practices for typography in graphic design.',
    (
      SELECT id
      FROM users
      WHERE email = 'anna.lee@lms.com'
    ),
    FALSE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'GD101'
    ),
    'Color Theory in Practice',
    'Discuss how color theory applies to real design projects. Share your color palette strategies.',
    (
      SELECT id
      FROM users
      WHERE email = 'anna.lee@lms.com'
    ),
    FALSE
  ),
  -- Discussions for Cybersecurity Fundamentals
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CYBER101'
    ),
    'Current Cybersecurity Threats',
    'Discuss current cybersecurity threats and how to protect against them.',
    (
      SELECT id
      FROM users
      WHERE email = 'michael.brown@lms.com'
    ),
    FALSE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CYBER101'
    ),
    'Ethical Hacking vs Malicious Hacking',
    'Discuss the differences between ethical hacking and malicious activities in cybersecurity.',
    (
      SELECT id
      FROM users
      WHERE email = 'michael.brown@lms.com'
    ),
    FALSE
  ),
  -- Discussions for Statistics for Data Science
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'STAT101'
    ),
    'Statistics in Data Science Projects',
    'Share how statistical concepts apply to real data science projects and analysis.',
    (
      SELECT id
      FROM users
      WHERE email = 'lisa.wong@lms.com'
    ),
    FALSE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'STAT101'
    ),
    'Hypothesis Testing Examples',
    'Discuss real-world examples of hypothesis testing and statistical inference.',
    (
      SELECT id
      FROM users
      WHERE email = 'lisa.wong@lms.com'
    ),
    FALSE
  ),
  -- Discussions for Cloud Computing Essentials
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CLOUD101'
    ),
    'AWS vs Azure vs GCP',
    'Compare the major cloud platforms and discuss their strengths and use cases.',
    (
      SELECT id
      FROM users
      WHERE email = 'michael.brown@lms.com'
    ),
    FALSE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'CLOUD101'
    ),
    'Cloud Migration Strategies',
    'Discuss strategies for migrating applications and data to the cloud.',
    (
      SELECT id
      FROM users
      WHERE email = 'michael.brown@lms.com'
    ),
    FALSE
  ),
  -- Discussions for Digital Marketing Fundamentals
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'BIZ101'
    ),
    'Social Media Marketing Trends',
    'Discuss current trends in social media marketing and effective strategies.',
    (
      SELECT id
      FROM users
      WHERE email = 'david.clark@lms.com'
    ),
    FALSE
  ),
  (
    (
      SELECT id
      FROM courses
      WHERE code = 'BIZ101'
    ),
    'SEO Best Practices',
    'Share your experiences with SEO and discuss effective optimization techniques.',
    (
      SELECT id
      FROM users
      WHERE email = 'david.clark@lms.com'
    ),
    FALSE
  );
-- Insert Discussion Posts
INSERT INTO discussion_posts (discussion_id, user_id, parent_post_id, content)
VALUES -- Posts in Student Introductions
  (
    (
      SELECT id
      FROM discussions
      WHERE title = 'Student Introductions'
        AND course_id = (
          SELECT id
          FROM courses
          WHERE code = 'CS101'
        )
    ),
    (
      SELECT id
      FROM users
      WHERE email = 'john.smith@lms.com'
    ),
    NULL,
    'Welcome everyone! Please introduce yourself and share a bit about your background and what you hope to learn from this course.'
  );
-- Insert System Settings
INSERT INTO system_settings (
    setting_key,
    setting_value,
    setting_group,
    description
  )
VALUES (
    'site_name',
    'LMS Hub',
    'general',
    'Name of the learning management system'
  ),
  (
    'site_description',
    'A modern learning platform for students and professionals',
    'general',
    'Site description used in metadata'
  ),
  (
    'timezone',
    'UTC',
    'regional',
    'Default timezone for the application'
  ),
  (
    'enable_google_login',
    'true',
    'authentication',
    'Enable Google OAuth login'
  ),
  (
    'max_file_upload_size',
    '50',
    'uploads',
    'Maximum file upload size in MB'
  );
-- Virtual Classroom Tables
-- Virtual Sessions Tables
-- Main sessions table
CREATE TABLE virtual_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  room_id VARCHAR(255) NOT NULL UNIQUE,
  course_id INT NOT NULL,
  instructor_id INT NOT NULL,
  description TEXT,
  session_date DATE,
  start_time TIME,
  end_time TIME,
  actual_start_time DATETIME,
  actual_end_time DATETIME,
  status ENUM('scheduled', 'active', 'completed', 'cancelled') DEFAULT 'scheduled',
  password VARCHAR(255),
  max_participants INT DEFAULT 30,
  is_recorded BOOLEAN DEFAULT TRUE,
  recording_url VARCHAR(512),
  analytics_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Create indexes for sessions
CREATE INDEX idx_virtual_sessions_status ON virtual_sessions(status);
CREATE INDEX idx_virtual_sessions_course ON virtual_sessions(course_id);
CREATE INDEX idx_virtual_sessions_instructor ON virtual_sessions(instructor_id);
CREATE INDEX idx_virtual_sessions_date ON virtual_sessions(session_date);
-- Recurring sessions configuration
CREATE TABLE recurring_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_session_id INT NOT NULL,
  recurrence_type ENUM('daily', 'weekly', 'biweekly', 'monthly') NOT NULL,
  day_of_week INT,
  -- For weekly/biweekly (1=Monday, 7=Sunday)
  week_of_month INT,
  -- For monthly (1-5)
  start_date DATE NOT NULL,
  end_date DATE,
  series_id VARCHAR(255) NOT NULL,
  -- To group sessions in a series
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_session_id) REFERENCES virtual_sessions(id) ON DELETE CASCADE
);
-- Session registration (for password-protected or confirmation-required sessions)
CREATE TABLE session_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('registered', 'attended', 'no_show') DEFAULT 'registered',
  FOREIGN KEY (session_id) REFERENCES virtual_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_registration (session_id, user_id)
);
-- Session activity log - tracks joins, leaves, actions during session
CREATE TABLE session_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  action ENUM(
    'join',
    'leave',
    'screenShare',
    'chat',
    'hand_raise',
    'microphone',
    'camera'
  ) NOT NULL,
  action_value BOOLEAN,
  -- For toggleable actions like mic/camera
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INT,
  -- For tracking time in session (calculated on leave)
  device_info VARCHAR(255),
  -- Browser/OS info
  ip_address VARCHAR(50),
  FOREIGN KEY (session_id) REFERENCES virtual_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- In-session chat messages
CREATE TABLE session_chats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  recipient_id INT,
  -- If private message, who it's to
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES virtual_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE
  SET NULL
);
-- Breakout rooms
CREATE TABLE breakout_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (session_id) REFERENCES virtual_sessions(id) ON DELETE CASCADE
);
-- Breakout room participants
CREATE TABLE breakout_room_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  breakout_room_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP NULL,
  FOREIGN KEY (breakout_room_id) REFERENCES breakout_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Polls created during sessions
CREATE TABLE session_polls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  creator_id INT NOT NULL,
  question TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_multiple_choice BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (session_id) REFERENCES virtual_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Poll options
CREATE TABLE poll_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poll_id INT NOT NULL,
  option_text TEXT NOT NULL,
  FOREIGN KEY (poll_id) REFERENCES session_polls(id) ON DELETE CASCADE
);
-- Poll responses
CREATE TABLE poll_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poll_id INT NOT NULL,
  user_id INT NOT NULL,
  option_id INT NOT NULL,
  responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poll_id) REFERENCES session_polls(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
  UNIQUE KEY unique_response (poll_id, user_id, option_id)
);
-- Session recordings
CREATE TABLE session_recordings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  storage_path VARCHAR(512) NOT NULL,
  recording_url VARCHAR(512),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  size_bytes BIGINT,
  status ENUM('processing', 'ready', 'failed') DEFAULT 'processing',
  is_downloadable BOOLEAN DEFAULT FALSE,
  is_editable BOOLEAN DEFAULT FALSE,
  access_count INT DEFAULT 0,
  transcript TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES virtual_sessions(id) ON DELETE CASCADE
);
-- Recording access permissions
CREATE TABLE recording_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recording_id INT NOT NULL,
  user_id INT,
  -- NULL means course-wide permission
  course_id INT,
  -- NULL means specific user permission
  can_view BOOLEAN DEFAULT TRUE,
  can_download BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT NOT NULL,
  FOREIGN KEY (recording_id) REFERENCES session_recordings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
-- Session feedback
CREATE TABLE session_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL,
  -- 1-5 scale
  comments TEXT,
  audio_quality_rating INT,
  -- 1-5 scale
  video_quality_rating INT,
  -- 1-5 scale
  content_rating INT,
  -- 1-5 scale
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES virtual_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_feedback (session_id, user_id)
);
-- Calendar integration 
CREATE TABLE session_calendar_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  calendar_provider ENUM('google', 'microsoft', 'apple') NOT NULL,
  external_event_id VARCHAR(255) NOT NULL,
  organizer_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES virtual_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Session settings
CREATE TABLE session_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  waiting_room_enabled BOOLEAN DEFAULT FALSE,
  auto_recording BOOLEAN DEFAULT TRUE,
  participants_can_share BOOLEAN DEFAULT TRUE,
  chat_enabled BOOLEAN DEFAULT TRUE,
  private_chat_enabled BOOLEAN DEFAULT TRUE,
  participants_can_unmute BOOLEAN DEFAULT TRUE,
  participants_video_on_join BOOLEAN DEFAULT FALSE,
  participants_audio_on_join BOOLEAN DEFAULT FALSE,
  allow_anonymous_users BOOLEAN DEFAULT FALSE,
  only_authenticated_users BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES virtual_sessions(id) ON DELETE CASCADE
);
-- User preferences for virtual sessions
CREATE TABLE user_session_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  default_video_on BOOLEAN DEFAULT TRUE,
  default_audio_on BOOLEAN DEFAULT TRUE,
  preferred_view ENUM('grid', 'speaker', 'sidebar') DEFAULT 'grid',
  bandwidth_preference ENUM('low', 'medium', 'high') DEFAULT 'high',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Room templates for quick setup
CREATE TABLE room_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  creator_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  settings JSON NOT NULL,
  -- Stores all configurable session settings
  is_public BOOLEAN DEFAULT FALSE,
  -- If true, available to all instructors
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Stored procedures for automatic processes
-- Procedure to update session statuses
DELIMITER // CREATE PROCEDURE update_session_statuses() BEGIN -- Set sessions to active if current time is between start and end times
UPDATE virtual_sessions
SET status = 'active',
  actual_start_time = IFNULL(actual_start_time, NOW())
WHERE status = 'scheduled'
  AND (
    (
      session_date = CURDATE()
      AND start_time <= CURTIME()
      AND (
        end_time IS NULL
        OR end_time > CURTIME()
      )
    )
    OR (
      session_date < CURDATE()
      AND actual_end_time IS NULL
    )
  );
-- Set sessions to completed if end time has passed
UPDATE virtual_sessions
SET status = 'completed',
  actual_end_time = IFNULL(actual_end_time, NOW())
WHERE status = 'active'
  AND (
    (
      session_date = CURDATE()
      AND end_time IS NOT NULL
      AND end_time <= CURTIME()
    )
    OR (session_date < CURDATE())
  );
-- Mark no-shows in registrations
UPDATE session_registrations sr
  JOIN virtual_sessions vs ON sr.session_id = vs.id
SET sr.status = 'no_show'
WHERE vs.status = 'completed'
  AND sr.status = 'registered';
END // DELIMITER;
-- Function to generate a unique room ID
DELIMITER // CREATE FUNCTION generate_room_id() RETURNS VARCHAR(255) DETERMINISTIC BEGIN
DECLARE room_id VARCHAR(255);
DECLARE is_unique BOOLEAN DEFAULT FALSE;
WHILE NOT is_unique DO -- Generate a random room ID (using alphanumeric characters)
SET room_id = CONCAT(
    SUBSTRING(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      RAND() * 62 + 1,
      1
    ),
    SUBSTRING(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      RAND() * 62 + 1,
      1
    ),
    SUBSTRING(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      RAND() * 62 + 1,
      1
    ),
    '-',
    SUBSTRING(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      RAND() * 62 + 1,
      1
    ),
    SUBSTRING(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      RAND() * 62 + 1,
      1
    ),
    SUBSTRING(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      RAND() * 62 + 1,
      1
    ),
    '-',
    SUBSTRING(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      RAND() * 62 + 1,
      1
    ),
    SUBSTRING(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      RAND() * 62 + 1,
      1
    ),
    SUBSTRING(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      RAND() * 62 + 1,
      1
    )
  );
-- Check if the room ID already exists
IF NOT EXISTS (
  SELECT 1
  FROM virtual_sessions
  WHERE room_id = room_id
) THEN
SET is_unique = TRUE;
END IF;
END WHILE;
RETURN room_id;
END // DELIMITER;
-- Trigger to automatically set room_id when creating a new session
DELIMITER // CREATE TRIGGER before_session_insert BEFORE
INSERT ON virtual_sessions FOR EACH ROW BEGIN IF NEW.room_id IS NULL
  OR NEW.room_id = '' THEN
SET NEW.room_id = generate_room_id();
END IF;
END // DELIMITER;
-- Event to automatically update session statuses every minute
CREATE EVENT update_session_statuses_event ON SCHEDULE EVERY 1 MINUTE DO CALL update_session_statuses();
-- =============== ASSESSMENT TABLES ===============
-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  lesson_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  max_points INT NOT NULL DEFAULT 100,
  due_date DATETIME NOT NULL,
  allowed_file_types VARCHAR(255) NOT NULL DEFAULT 'pdf,docx',
  max_file_size INT NOT NULL DEFAULT 5,
  -- in MB
  allow_late_submissions BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES course_modules(id) ON DELETE CASCADE
);
-- Assignment submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INT NOT NULL,
  -- in KB
  submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  comments TEXT,
  is_late BOOLEAN DEFAULT FALSE,
  grade DECIMAL(5, 2) DEFAULT NULL,
  feedback TEXT,
  graded_by INT DEFAULT NULL,
  graded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE
  SET NULL
);
-- Quizzes and Tests
CREATE TABLE IF NOT EXISTS quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  lesson_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  time_limit_minutes INT NOT NULL DEFAULT 30,
  passing_score DECIMAL(5, 2) NOT NULL DEFAULT 70.00,
  is_test BOOLEAN DEFAULT FALSE,
  -- FALSE for practice quiz, TRUE for graded test
  allow_multiple_attempts BOOLEAN DEFAULT TRUE,
  show_answers BOOLEAN DEFAULT TRUE,
  -- Show correct answers after completion
  randomize_questions BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES course_modules(id) ON DELETE CASCADE
);
-- Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('multiple_choice', 'fill_in_blank') NOT NULL,
  image_data LONGTEXT,
  -- Base64 encoded image or NULL
  points INT NOT NULL DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);
-- Question Options (for multiple choice)
CREATE TABLE IF NOT EXISTS question_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);
-- Fill-in-blank correct answers
CREATE TABLE IF NOT EXISTS fill_in_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  answer_text VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);
-- Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  student_id INT NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  score DECIMAL(5, 2) NULL,
  is_passing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_quiz_attempts_quiz (quiz_id),
  INDEX idx_quiz_attempts_student (student_id),
  INDEX idx_quiz_attempts_score (score)
);
-- Quiz answer records table
CREATE TABLE IF NOT EXISTS quiz_answer_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_option_id INT NULL,
  text_answer TEXT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_option_id) REFERENCES quiz_options(id) ON DELETE
  SET NULL,
    INDEX idx_answer_records_attempt (attempt_id),
    INDEX idx_answer_records_question (question_id)
);
-- Student notes table (for instructor notes about students)
CREATE TABLE IF NOT EXISTS student_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  student_id INT NOT NULL,
  notes TEXT,
  created_by INT NOT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE
  SET NULL,
    UNIQUE KEY unique_student_notes (course_id, student_id),
    INDEX idx_student_notes_course (course_id),
    INDEX idx_student_notes_student (student_id)
);
-- Virtual sessions table (if you plan to use virtual classroom features)
CREATE TABLE IF NOT EXISTS virtual_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id INT NOT NULL,
  session_url VARCHAR(512),
  session_id VARCHAR(255),
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  actual_start TIMESTAMP NULL,
  actual_end TIMESTAMP NULL,
  status ENUM('scheduled', 'live', 'ended', 'cancelled') DEFAULT 'scheduled',
  max_participants INT DEFAULT 50,
  is_recorded BOOLEAN DEFAULT FALSE,
  recording_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_virtual_sessions_course (course_id),
  INDEX idx_virtual_sessions_instructor (instructor_id),
  INDEX idx_virtual_sessions_status (status),
  INDEX idx_virtual_sessions_start (scheduled_start)
);
-- Session participants table
CREATE TABLE IF NOT EXISTS session_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP NULL,
  left_at TIMESTAMP NULL,
  duration_minutes INT DEFAULT 0,
  is_present BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES virtual_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_session_participant (session_id, user_id),
  INDEX idx_session_participants_session (session_id),
  INDEX idx_session_participants_user (user_id)
);
-- Notifications table (for assignment due, test due, messages, etc.)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,  type ENUM(
    'assignment_due',
    'test_due',
    'message_received',
    'course_update',
    'grade_posted',
    'announcement',
    'discussion_reply'
  ) NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  isRead BOOLEAN NOT NULL DEFAULT FALSE,
  dueDate DATETIME NULL,
  metadata JSON NULL,
  actionUrl VARCHAR(500) NULL,
  userId INT NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deletedAt DATETIME NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_userId (userId),
  INDEX idx_notifications_type (type),
  INDEX idx_notifications_isRead (isRead),
  INDEX idx_notifications_createdAt (createdAt),
  INDEX idx_notifications_deletedAt (deletedAt),
  INDEX idx_notifications_user_unread (userId, isRead, deletedAt),
  INDEX idx_notifications_user_type (userId, type, deletedAt),
  INDEX idx_notifications_due_date (dueDate)
);
-- Course analytics table (for tracking course metrics)
CREATE TABLE IF NOT EXISTS course_analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10, 2) NOT NULL,
  metric_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_course_metric_date (course_id, metric_name, metric_date),
  INDEX idx_course_analytics_course (course_id),
  INDEX idx_course_analytics_date (metric_date)
);
-- User activity log table (for tracking user engagement)
CREATE TABLE IF NOT EXISTS user_activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  activity_description VARCHAR(255),
  course_id INT NULL,
  lesson_id INT NULL,
  assignment_id INT NULL,
  quiz_id INT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE
  SET NULL,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE
  SET NULL,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE
  SET NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE
  SET NULL,
    INDEX idx_activity_log_user (user_id),
    INDEX idx_activity_log_type (activity_type),
    INDEX idx_activity_log_created (created_at)
);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  content TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
-- ALTER TABLE messages CHANGE created_at createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
