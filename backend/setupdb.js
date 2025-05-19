// setupdb.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt'); // Re-added bcrypt

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function setupDatabase() {
  let connection;
  
  try {
    // Connect to MySQL server
    console.log('Attempting to connect to MySQL server...');
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      multipleStatements: true
    });
    console.log('✅ Connected to MySQL server');
    
    // Drop existing database if it exists
    console.log('Dropping existing database (if present)...');
    await connection.query('DROP DATABASE IF EXISTS lms_db');
    console.log('✅ Database dropped');
    
    // Create the database
    console.log('Creating new database...');
    await connection.query('CREATE DATABASE IF NOT EXISTS lms_db');
    console.log('✅ Database lms_db created successfully');
    
    // Use the database
    await connection.query('USE lms_db');
    console.log('✅ Using lms_db database');
    
    // Read schema.sql
    console.log('Reading schema.sql file...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    let sqlScript = await fs.readFile(schemaPath, 'utf8');
    
    // Execute only the table creation part of schema.sql
    console.log('Creating database tables...');
    // Use the refined function to get only structure statements
    const createStructureScript = extractStructureStatements(sqlScript); 
    await connection.query(createStructureScript);
    console.log('✅ Database tables created successfully');
    
    // Generate bcrypt hashes and insert users MANUALLY
    console.log('Inserting users with newly hashed passwords...');
    const saltRounds = 10;
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const instructorPassword = await bcrypt.hash('instructor123', saltRounds);
    const studentPassword = await bcrypt.hash('123456789', saltRounds);
    
    // Insert Admin users with NEW hashes
    await connection.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, bio) 
      VALUES 
      ('admin@lms.com', ?, 'Admin', 'User', 'admin', TRUE, 'Main system administrator'),
      ('admin2@lms.com', ?, 'Secondary', 'Admin', 'admin', TRUE, 'Assistant system administrator')
    `, [adminPassword, adminPassword]); // Use hashed passwords
    console.log('✅ Admin users created');
    
    // Insert Instructor users with NEW hashes
    await connection.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, bio) 
      VALUES 
      ('john.smith@lms.com', ?, 'John', 'Smith', 'instructor', TRUE, 'Professor of Computer Science with 15 years of industry experience'),
      ('sarah.johnson@lms.com', ?, 'Sarah', 'Johnson', 'instructor', TRUE, 'Database specialist and former tech lead at Oracle'),
      ('michael.brown@lms.com', ?, 'Michael', 'Brown', 'instructor', TRUE, 'Mobile app developer and UX design expert'),
      ('lisa.wong@lms.com', ?, 'Lisa', 'Wong', 'instructor', TRUE, 'AI researcher and machine learning specialist'),
      ('david.clark@lms.com', ?, 'David', 'Clark', 'instructor', TRUE, 'Frontend development specialist with expertise in React and Vue'),
      ('anna.lee@lms.com', ?, 'Anna', 'Lee', 'instructor', TRUE, 'Graphic design professional with 10+ years experience in the industry')
    `, [instructorPassword, instructorPassword, instructorPassword, instructorPassword, instructorPassword, instructorPassword]); // Use hashed passwords
    console.log('✅ Instructor users created');
    
    // Insert Student users with NEW hashes
    await connection.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, google_id) 
      VALUES 
      ('student1@example.com', ?, 'Alex', 'Wilson', 'student', FALSE, NULL),
      ('student2@example.com', ?, 'Maria', 'Garcia', 'student', TRUE, 'google123'),
      ('student3@example.com', ?, 'James', 'Taylor', 'student', FALSE, 'google456'),
      ('student4@example.com', ?, 'Sophie', 'Chen', 'student', TRUE, NULL),
      ('student5@example.com', ?, 'Omar', 'Patel', 'student', TRUE, 'google789'),
      ('student6@example.com', ?, 'Emma', 'Johnson', 'student', FALSE, NULL)
    `, [studentPassword, studentPassword, studentPassword, studentPassword, studentPassword, studentPassword]); // Use hashed passwords
    console.log('✅ Student users created');
    
    // Insert the rest of the data from schema.sql (departments, courses, etc., skipping users)
    console.log('Inserting other data from schema.sql...');
    // Use the refined function to get non-user INSERTs
    const remainingDataScript = extractNonUserInsertStatements(sqlScript); 
    if (remainingDataScript.trim()) {
        await connection.query(remainingDataScript);
        console.log('✅ Other data inserted successfully');
    } else {
        console.log('ℹ️ No other data found in schema.sql to insert.');
    }
    
    // Execute ALTER TABLE statements separately to ensure they're processed
    console.log('Applying schema alterations...');
    const alterTableStatements = extractAlterTableStatements(sqlScript);
    if (alterTableStatements.trim()) {
        await connection.query(alterTableStatements);
        console.log('✅ ALTER TABLE statements executed successfully');
    } else {
        console.log('ℹ️ No ALTER TABLE statements found in schema.sql.');
    }
    
    // Verify data
    console.log('\n--- Verification of database setup ---');
    await verifyData(connection);
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('🔑 Login credentials:');
    console.log('   - Admin: admin@lms.com / admin123');
    console.log('   - Instructor: john.smith@lms.com / instructor123');
    console.log('   - Student: student1@example.com / 123456789');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    console.error('Error details:', error.message);
    if (error.sqlMessage) {
      console.error('SQL error:', error.sqlMessage);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Helper function to extract only structure-related statements
function extractStructureStatements(sqlScript) {
  // Remove comments first to simplify parsing
  const uncommentedScript = sqlScript.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const statements = uncommentedScript.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  const structureKeywords = ['CREATE TABLE', 'CREATE INDEX', 'DROP DATABASE', 'CREATE DATABASE', 'USE ', 'DROP INDEX'];
  
  const structureStatements = statements.filter(stmt => {
    const upperStmt = stmt.toUpperCase();
    // Check if the statement starts with any of the structure keywords
    return structureKeywords.some(keyword => upperStmt.startsWith(keyword));
  });
  
  // Re-add USE lms_db if it was filtered out but necessary
  if (!structureStatements.some(s => s.toUpperCase().startsWith('USE '))) {
      const useStatement = statements.find(s => s.toUpperCase().startsWith('USE '));
      if (useStatement) {
          structureStatements.unshift(useStatement); // Add it to the beginning
      }
  }
   // Re-add DROP/CREATE DB if necessary
  const dropDb = statements.find(s => s.toUpperCase().startsWith('DROP DATABASE'));
  if (dropDb && !structureStatements.includes(dropDb)) structureStatements.unshift(dropDb);
  const createDb = statements.find(s => s.toUpperCase().startsWith('CREATE DATABASE'));
   if (createDb && !structureStatements.includes(createDb)) structureStatements.unshift(createDb);

  return structureStatements.join(';') + ';';
}

// Helper function to extract only ALTER TABLE statements
function extractAlterTableStatements(sqlScript) {
  // Remove comments first to simplify parsing
  const uncommentedScript = sqlScript.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const statements = uncommentedScript.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  const alterStatements = statements.filter(stmt => {
    const upperStmt = stmt.toUpperCase();
    return upperStmt.startsWith('ALTER TABLE');
  });
  
  return alterStatements.join(';') + ';';
}

// Helper function to extract only non-user INSERT statements
function extractNonUserInsertStatements(sqlScript) {
    // Remove comments first
  const uncommentedScript = sqlScript.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const statements = uncommentedScript.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  const dataStatements = statements.filter(stmt => {
    const upperStmt = stmt.toUpperCase();
    // Include INSERTs but explicitly exclude INSERT INTO USERS
    return upperStmt.startsWith('INSERT INTO') && !upperStmt.startsWith('INSERT INTO USERS');
  });
  
  return dataStatements.join(';') + ';';
}

async function verifyData(connection) {
  try {
    // Check users
    const [users] = await connection.query('SELECT COUNT(*) as count, role FROM lms_db.users GROUP BY role');
    if (users.length > 0) {
      users.forEach(row => {
        console.log(`✅ ${row.count} ${row.role}(s) inserted into the database`);
      });
    } else {
      console.log('⚠️ No users found in the database');
    }
    
    // Check courses
    const [courses] = await connection.query('SELECT COUNT(*) as count FROM lms_db.courses');
    console.log(`✅ ${courses[0].count} courses inserted into the database`);
    
    // Check departments
    const [departments] = await connection.query('SELECT COUNT(*) as count FROM lms_db.departments');
    console.log(`✅ ${departments[0].count} departments created`);
    
    // Verify that the ALTER TABLE changes were applied
    try {
      // Check if is_test column exists in quizzes table
      const [quizColumns] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'quizzes' AND COLUMN_NAME = 'is_test'
      `);
      console.log(`✅ is_test column in quizzes table: ${quizColumns.length > 0 ? 'Created' : 'Not found'}`);
      
      // Check if image_data column exists in quiz_questions table
      const [questionColumns] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'quiz_questions' AND COLUMN_NAME = 'image_data'
      `);
      console.log(`✅ image_data column in quiz_questions table: ${questionColumns.length > 0 ? 'Created' : 'Not found'}`);
      
      // Check assignments table columns
      const [assignmentColumns] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'assignments' 
        AND (COLUMN_NAME = 'allowed_file_types' OR COLUMN_NAME = 'max_file_size')
      `);
      console.log(`✅ New columns in assignments table: ${assignmentColumns.length} of 2 created`);
      
    } catch (error) {
      console.error('⚠️ Error verifying column changes:', error.message);
    }
  } catch (error) {
    console.error('❌ Error verifying data:', error);
  }
}

// Run the setup
setupDatabase();