// setupdb.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

async function setupDatabase() {
  let connection;
  
  try {
    // First connect without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'zzzNszzz19',
    });
    
    console.log('Connected to MySQL server');
    
    // Drop database if exists and create a new one
    await connection.query('DROP DATABASE IF EXISTS lms_db');
    console.log('Dropped existing database (if it existed)');
    
    await connection.query('CREATE DATABASE IF NOT EXISTS lms_db');
    console.log('Database created successfully');
    
    // Use the lms_db database
    await connection.query('USE lms_db');
    console.log('Using lms_db database');
    
    // Read SQL script (excluding DROP/CREATE DATABASE commands since we already did those)
    const sqlScript = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlScript
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && 
              !statement.toUpperCase().includes('DROP DATABASE') && 
              !statement.toUpperCase().includes('CREATE DATABASE'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.toUpperCase().includes('USE LMS_DB')) {
        console.log('Skipping USE statement as we already selected the database');
        continue;
      }
      
      try {
        await connection.query(statement);
        console.log(`Executed: ${statement.substring(0, 50)}...`);
      } catch (err) {
        console.error(`Error executing statement: ${statement.substring(0, 100)}`);
        console.error(err);
      }
    }
    
    // Update passwords with bcrypt hashed versions
    console.log('Updating passwords with bcrypt hashed versions...');
    
    // Hash admin passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    await connection.query(
      'UPDATE users SET password = ? WHERE role = "admin"',
      [adminPassword]
    );
    console.log('Admin passwords updated with bcrypt hash');
    
    // Hash instructor passwords
    const instructorPassword = await bcrypt.hash('instructor123', 10);
    await connection.query(
      'UPDATE users SET password = ? WHERE role = "instructor"',
      [instructorPassword]
    );
    console.log('Instructor passwords updated with bcrypt hash');
    
    // Hash student passwords
    const studentPassword = await bcrypt.hash('123456789', 10);
    await connection.query(
      'UPDATE users SET password = ? WHERE role = "student"',
      [studentPassword]
    );
    console.log('Student passwords updated with bcrypt hash');
    
    console.log('Database setup completed successfully');
    
    // Verify data was inserted
    const [users] = await connection.query('SELECT COUNT(*) as count, role FROM users GROUP BY role');
    users.forEach(row => {
      console.log(`Inserted ${row.count} ${row.role}s into the database`);
    });
    
    const [courses] = await connection.query('SELECT COUNT(*) as count FROM courses');
    console.log(`Inserted ${courses[0].count} courses into the database`);
    
    const [enrollments] = await connection.query('SELECT COUNT(*) as count FROM enrollments');
    console.log(`Created ${enrollments[0].count} course enrollments`);
    
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the setup
setupDatabase();