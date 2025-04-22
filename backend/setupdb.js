// setupdb.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'zzzNszzz19',
  multipleStatements: true
};

async function setupDatabase() {
  let connection;
  
  try {
    // Connect to MySQL server
    console.log('Attempting to connect to MySQL server...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL server');
    
    // Drop and recreate database
    console.log('Dropping existing database (if present)...');
    await connection.query('DROP DATABASE IF EXISTS lms_db');
    console.log('✅ Database dropped');
    
    console.log('Creating new database...');
    await connection.query('CREATE DATABASE IF NOT EXISTS lms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✅ Database lms_db created successfully');
    
    // Use the lms_db database
    await connection.query('USE lms_db');
    console.log('✅ Using lms_db database');
    
    // Read schema.sql file
    console.log('Reading schema.sql file...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sqlScript = await fs.readFile(schemaPath, 'utf8');
    
    // Extract and execute table creation statements
    console.log('Creating database tables...');
    await executeTableCreationStatements(connection, sqlScript);
    
    // Insert sample data separately
    console.log('Inserting sample data...');
    await insertSampleData(connection);
    
    // Update passwords with bcrypt hashed versions
    console.log('Updating passwords with bcrypt hashes...');
    await updatePasswords(connection);
    
    // Verify data
    console.log('\n--- Verification of inserted data ---');
    await verifyData(connection);
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('🔑 Login credentials:');
    console.log('   - Admin: admin@lms.com / admin123');
    console.log('   - Instructor: john.smith@lms.com / instructor123');
    console.log('   - Student: student1@example.com / 123456789');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

async function executeTableCreationStatements(connection, sqlScript) {
  // Extract only table creation and index statements
  const tableStatements = sqlScript.split(';')
    .map(statement => statement.trim())
    .filter(statement => {
      return statement.length > 0 && 
             (statement.toUpperCase().includes('CREATE TABLE') || 
              statement.toUpperCase().includes('CREATE INDEX')) &&
             !statement.toUpperCase().includes('DROP DATABASE') && 
             !statement.toUpperCase().includes('CREATE DATABASE') &&
             !statement.toUpperCase().includes('USE LMS_DB');
    });
  
  // Execute table creation statements in sequence
  for (let i = 0; i < tableStatements.length; i++) {
    try {
      await connection.query(tableStatements[i]);
      console.log(`✅ Table created: ${tableStatements[i].substring(0, 50)}...`);
    } catch (err) {
      console.error(`❌ Error creating table: ${tableStatements[i].substring(0, 50)}...`);
      console.error(err);
      throw err; // Rethrow as table creation is critical
    }
  }
}

async function insertSampleData(connection) {
  try {
    // Insert Admin users
    await connection.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, bio) 
      VALUES 
      ('admin@lms.com', 'temp_password', 'Admin', 'User', 'admin', TRUE, 'Main system administrator'),
      ('admin2@lms.com', 'temp_password', 'Secondary', 'Admin', 'admin', TRUE, 'Assistant system administrator')
    `);
    console.log('✅ Admin users created');
    
    // Insert Instructor users
    await connection.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, bio) 
      VALUES 
      ('john.smith@lms.com', 'temp_password', 'John', 'Smith', 'instructor', TRUE, 'Professor of Computer Science with 15 years of industry experience'),
      ('sarah.johnson@lms.com', 'temp_password', 'Sarah', 'Johnson', 'instructor', TRUE, 'Database specialist and former tech lead at Oracle'),
      ('michael.brown@lms.com', 'temp_password', 'Michael', 'Brown', 'instructor', TRUE, 'Mobile app developer and UX design expert'),
      ('lisa.wong@lms.com', 'temp_password', 'Lisa', 'Wong', 'instructor', TRUE, 'AI researcher and machine learning specialist')
    `);
    console.log('✅ Instructor users created');
    
    // Insert Student users
    await connection.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, google_id) 
      VALUES 
      ('student1@example.com', 'temp_password', 'Alex', 'Wilson', 'student', FALSE, NULL),
      ('student2@example.com', 'temp_password', 'Maria', 'Garcia', 'student', TRUE, 'google123'),
      ('student3@example.com', 'temp_password', 'James', 'Taylor', 'student', FALSE, 'google456'),
      ('student4@example.com', 'temp_password', 'Sophie', 'Chen', 'student', TRUE, NULL),
      ('student5@example.com', 'temp_password', 'Omar', 'Patel', 'student', TRUE, 'google789'),
      ('student6@example.com', 'temp_password', 'Emma', 'Johnson', 'student', FALSE, NULL)
    `);
    console.log('✅ Student users created');
    
    // Insert Courses
    await connection.query(`
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
       (SELECT id FROM users WHERE email = 'michael.brown@lms.com'), 'draft', '2023-04-01', '2023-07-01', FALSE)
    `);
    console.log('✅ Courses created');
    
    // Insert Enrollments
    await connection.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
      SELECT 
        (SELECT id FROM users WHERE email = 'student1@example.com'),
        (SELECT id FROM courses WHERE title = 'Introduction to Programming'),
        '2023-01-16', 'in_progress'
    `);
    
    await connection.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
      SELECT 
        (SELECT id FROM users WHERE email = 'student1@example.com'),
        (SELECT id FROM courses WHERE title = 'Web Development Basics'),
        '2023-02-02', 'not_started'
    `);
    
    await connection.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
      SELECT 
        (SELECT id FROM users WHERE email = 'student1@example.com'),
        (SELECT id FROM courses WHERE title = 'Mobile App Development'),
        '2023-02-16', 'not_started'
    `);
    
    await connection.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
      SELECT 
        (SELECT id FROM users WHERE email = 'student2@example.com'),
        (SELECT id FROM courses WHERE title = 'Database Design'),
        '2023-01-11', 'completed'
    `);
    
    await connection.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
      SELECT 
        (SELECT id FROM users WHERE email = 'student2@example.com'),
        (SELECT id FROM courses WHERE title = 'Advanced JavaScript'),
        '2023-03-02', 'in_progress'
    `);
    
    // Add more enrollments for other students
    await connection.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
      SELECT 
        (SELECT id FROM users WHERE email = 'student3@example.com'),
        (SELECT id FROM courses WHERE title = 'Introduction to Programming'),
        '2023-01-20', 'completed'
    `);
    
    await connection.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
      SELECT 
        (SELECT id FROM users WHERE email = 'student3@example.com'),
        (SELECT id FROM courses WHERE title = 'Web Development Basics'),
        '2023-02-05', 'in_progress'
    `);
    
    await connection.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
      SELECT 
        (SELECT id FROM users WHERE email = 'student3@example.com'),
        (SELECT id FROM courses WHERE title = 'Database Design'),
        '2023-01-15', 'in_progress'
    `);
    
    await connection.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
      SELECT 
        (SELECT id FROM users WHERE email = 'student4@example.com'),
        (SELECT id FROM courses WHERE title = 'Artificial Intelligence Fundamentals'),
        '2023-03-11', 'in_progress'
    `);
    
    await connection.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
      SELECT 
        (SELECT id FROM users WHERE email = 'student5@example.com'),
        (SELECT id FROM courses WHERE title = 'Database Design'),
        '2023-01-12', 'in_progress'
    `);
    
    await connection.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status)
      SELECT 
        (SELECT id FROM users WHERE email = 'student6@example.com'),
        (SELECT id FROM courses WHERE title = 'Introduction to Programming'),
        '2023-01-18', 'completed'
    `);
    console.log('✅ Enrollments created');
    
    // Insert Course Modules
    await connection.query(`
      INSERT INTO course_modules (course_id, title, description, order_index, is_published)
      VALUES
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
       
      ((SELECT id FROM courses WHERE title = 'Web Development Basics'),
       'HTML Essentials', 
       'Core HTML elements, document structure, and semantic markup.',
       1, TRUE),
       
      ((SELECT id FROM courses WHERE title = 'Web Development Basics'),
       'CSS Fundamentals', 
       'Styling web pages with CSS, selectors, and the box model.',
       2, TRUE),
       
      ((SELECT id FROM courses WHERE title = 'Database Design'),
       'Database Concepts', 
       'Introduction to databases, data models, and database management systems.',
       1, TRUE),
       
      ((SELECT id FROM courses WHERE title = 'Database Design'),
       'Entity-Relationship Modeling', 
       'Creating ER diagrams and designing database schemas.',
       2, TRUE)
    `);
    console.log('✅ Course modules created');
    
    // Insert Lessons
    await connection.query(`
      INSERT INTO lessons (module_id, title, description, content_type, content, duration_minutes, order_index, is_published)
      VALUES
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
       
      ((SELECT id FROM course_modules WHERE title = 'JavaScript Fundamentals' AND course_id = (SELECT id FROM courses WHERE title = 'Introduction to Programming')),
       'Variables and Data Types', 
       'Understanding how to store and manipulate data in JavaScript.',
       'document',
       'JavaScript has several data types: String, Number, Boolean, Object, Undefined, and Null. Variables are declared using let, const, or var keywords.',
       60, 1, TRUE),
       
      ((SELECT id FROM course_modules WHERE title = 'HTML Essentials' AND course_id = (SELECT id FROM courses WHERE title = 'Web Development Basics')),
       'Introduction to HTML', 
       'Understanding what HTML is and how it structures web content.',
       'document',
       'HTML (HyperText Markup Language) is the standard markup language for documents designed to be displayed in a web browser. It defines the structure and content of a web page.',
       30, 1, TRUE)
    `);
    console.log('✅ Lessons created');
    
    // Insert Assignments
    await connection.query(`
      INSERT INTO assignments (course_id, lesson_id, title, description, instructions, max_points, due_date, allow_late_submissions)
      VALUES
      ((SELECT id FROM courses WHERE title = 'Introduction to Programming'),
       (SELECT id FROM lessons WHERE title = 'Variables and Data Types'),
       'Variable Manipulation',
       'Create a program that demonstrates the use of different variable types.',
       'Write a JavaScript program that creates variables of different types (string, number, boolean, array, object) and performs operations on them. Include comments explaining each step.',
       20,
       '2023-02-15 23:59:59',
       FALSE),
     
      ((SELECT id FROM courses WHERE title = 'Web Development Basics'),
       (SELECT id FROM lessons WHERE title = 'Introduction to HTML'),
       'Personal Bio Page',
       'Create a simple personal biography page using HTML elements.',
       'Create an HTML page that includes your name, a brief bio, a list of hobbies, and links to at least 3 websites you frequently visit. Use appropriate heading levels, paragraphs, and list elements.',
       25,
       '2023-02-28 23:59:59',
       TRUE)
    `);
    console.log('✅ Assignments created');
    
    // Insert Quizzes
    await connection.query(`
      INSERT INTO quizzes (course_id, lesson_id, title, description, time_limit_minutes, passing_score, max_attempts, is_randomized, start_date, end_date)
      VALUES
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
     
      ((SELECT id FROM courses WHERE title = 'Web Development Basics'),
       (SELECT id FROM lessons WHERE title = 'Introduction to HTML'),
       'HTML Elements Quiz',
       'Test your understanding of HTML elements and their attributes.',
       20,
       75,
       3,
       FALSE,
       '2023-03-01 00:00:00',
       '2023-03-10 23:59:59')
    `);
    console.log('✅ Quizzes created');
    
    // Insert Discussions
    await connection.query(`
      INSERT INTO discussions (course_id, title, description, created_by, is_locked)
      VALUES
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
     
      ((SELECT id FROM courses WHERE title = 'Web Development Basics'),
       'Favorite Web Development Tools',
       'Share your favorite tools, extensions, and resources for web development.',
       (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
       FALSE),
       
      ((SELECT id FROM courses WHERE title = 'Database Design'),
       'SQL vs NoSQL',
       'When would you choose a SQL database over a NoSQL database? Share your thoughts and experiences.',
       (SELECT id FROM users WHERE email = 'sarah.johnson@lms.com'),
       FALSE)
    `);
    console.log('✅ Discussions created');
    
    // Insert Discussion Posts
    // First, insert main posts
    await connection.query(`
      INSERT INTO discussion_posts (discussion_id, user_id, parent_post_id, content)
      VALUES
      ((SELECT id FROM discussions WHERE title = 'Student Introductions'),
       (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
       NULL,
       'Welcome everyone! Please introduce yourself and share a bit about your background and what you hope to learn from this course.')
    `);
    
    await connection.query(`
      INSERT INTO discussion_posts (discussion_id, user_id, parent_post_id, content)
      VALUES
      ((SELECT id FROM discussions WHERE title = 'Student Introductions'),
       (SELECT id FROM users WHERE email = 'student1@example.com'),
       NULL,
       'Hi everyone! I\\'m Alex and I\\'m a marketing professional looking to learn programming to better understand our website development. I have no prior programming experience but I\\'m excited to learn!')
    `);
    
    // Get post ID for reply
    const [posts] = await connection.query(`
      SELECT id FROM discussion_posts 
      WHERE user_id = (SELECT id FROM users WHERE email = 'student1@example.com')
      AND content LIKE 'Hi everyone! I\\'m Alex%'
    `);
    
    if (posts.length > 0) {
      // Add reply to existing post
      await connection.query(`
        INSERT INTO discussion_posts (discussion_id, user_id, parent_post_id, content)
        VALUES
        ((SELECT id FROM discussions WHERE title = 'Student Introductions'),
         (SELECT id FROM users WHERE email = 'john.smith@lms.com'),
         ${posts[0].id},
         'Welcome, Alex! Great to have someone with a marketing background in the class. You\\'ll bring a valuable perspective!')
      `);
    }
    
    console.log('✅ Discussion posts created');
    
    // System Settings
    await connection.query(`
      INSERT INTO system_settings (setting_key, setting_value, setting_group, description)
      VALUES
      ('site_name', 'YourLMS', 'general', 'Name of the learning management system'),
      ('site_description', 'A modern learning platform for students and professionals', 'general', 'Site description used in metadata'),
      ('timezone', 'UTC', 'regional', 'Default timezone for the application'),
      ('enable_google_login', 'true', 'authentication', 'Enable Google OAuth login'),
      ('max_file_upload_size', '50', 'uploads', 'Maximum file upload size in MB')
    `);
    console.log('✅ System settings created');
    
  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
    throw error;
  }
}

async function updatePasswords(connection) {
  try {
    // Hash admin passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    await connection.query(
      'UPDATE users SET password = ? WHERE role = "admin"',
      [adminPassword]
    );
    console.log('✅ Admin passwords updated');
    
    // Hash instructor passwords
    const instructorPassword = await bcrypt.hash('instructor123', 10);
    await connection.query(
      'UPDATE users SET password = ? WHERE role = "instructor"',
      [instructorPassword]
    );
    console.log('✅ Instructor passwords updated');
    
    // Hash student passwords
    const studentPassword = await bcrypt.hash('123456789', 10);
    await connection.query(
      'UPDATE users SET password = ? WHERE role = "student"',
      [studentPassword]
    );
    console.log('✅ Student passwords updated');
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
    throw error;
  }
}

async function verifyData(connection) {
  try {
    // Check users
    const [users] = await connection.query('SELECT COUNT(*) as count, role FROM users GROUP BY role');
    users.forEach(row => {
      console.log(`✅ ${row.count} ${row.role}(s) inserted into the database`);
    });
    
    // Check courses
    const [courses] = await connection.query('SELECT COUNT(*) as count FROM courses');
    console.log(`✅ ${courses[0].count} courses inserted into the database`);
    
    // Check course modules
    const [modules] = await connection.query('SELECT COUNT(*) as count FROM course_modules');
    console.log(`✅ ${modules[0].count} course modules created`);
    
    // Check lessons
    const [lessons] = await connection.query('SELECT COUNT(*) as count FROM lessons');
    console.log(`✅ ${lessons[0].count} lessons created`);
    
    // Check enrollments
    const [enrollments] = await connection.query('SELECT COUNT(*) as count FROM enrollments');
    console.log(`✅ ${enrollments[0].count} course enrollments created`);
    
    // Check assignments and quizzes
    const [assignments] = await connection.query('SELECT COUNT(*) as count FROM assignments');
    const [quizzes] = await connection.query('SELECT COUNT(*) as count FROM quizzes');
    console.log(`✅ ${assignments[0].count} assignments and ${quizzes[0].count} quizzes created`);
    
    // Check discussions
    const [discussions] = await connection.query('SELECT COUNT(*) as count FROM discussions');
    console.log(`✅ ${discussions[0].count} discussion forums created`);
  } catch (error) {
    console.error('❌ Error verifying data:', error);
  }
}

// Run the setup
setupDatabase();