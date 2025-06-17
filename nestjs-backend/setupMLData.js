// setupMLData.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lms_db',
  multipleStatements: true
};

async function setupMLData() {
  let connection;
  
  try {
    // Connect to MySQL database
    console.log('Attempting to connect to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database');
    
    // Read the ML data file
    console.log('Reading ML training data file...');
    const mlDataPath = path.join(__dirname, '..', 'ml-service', 'Huongdansudung.txt');
    let sqlScript = await fs.readFile(mlDataPath, 'utf8');
    console.log('✅ ML data file loaded successfully');
    
    // Extract and process INSERT statements
    console.log('Processing INSERT statements...');
    const insertStatements = extractInsertStatements(sqlScript);
    
    if (insertStatements.length === 0) {
      console.log('⚠️ No INSERT statements found in the file');
      return;
    }
    
    console.log(`Found ${insertStatements.length} INSERT statement blocks to execute`);
    
    // Process user INSERT statements with password hashing
    console.log('Processing user data with password hashing...');
    const { userInserts, otherInserts } = separateUserInserts(insertStatements);
    
    // Execute user inserts with proper password hashing
    if (userInserts.length > 0) {
      await executeUserInserts(connection, userInserts);
      console.log('✅ User data inserted with hashed passwords');
    }
    
    // Execute other INSERT statements
    if (otherInserts.length > 0) {
      console.log('Executing other INSERT statements...');
      for (let i = 0; i < otherInserts.length; i++) {
        try {
          await connection.query(otherInserts[i]);
          console.log(`✅ Executed INSERT block ${i + 1}/${otherInserts.length}`);
        } catch (error) {
          console.error(`❌ Error executing INSERT block ${i + 1}:`, error.message);
          // Continue with other inserts even if one fails
        }
      }
      console.log('✅ All other INSERT statements processed');
    }
    
    // Verify the inserted data
    console.log('\n--- Verification of ML data setup ---');
    await verifyMLData(connection);
    
    console.log('\n✅ ML training data setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up ML data:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Function to extract INSERT statements from the SQL script
function extractInsertStatements(sqlScript) {
  // Remove comments
  const uncommentedScript = sqlScript.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Split by semicolons and filter for INSERT statements
  const statements = uncommentedScript.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  const insertStatements = statements.filter(stmt => {
    const upperStmt = stmt.toUpperCase();
    return upperStmt.startsWith('INSERT INTO');
  });
  
  return insertStatements;
}

// Function to separate user INSERT statements from others
function separateUserInserts(insertStatements) {
  const userInserts = [];
  const otherInserts = [];
  
  insertStatements.forEach(stmt => {
    const upperStmt = stmt.toUpperCase();
    if (upperStmt.includes('INSERT INTO USERS')) {
      userInserts.push(stmt);
    } else {
      otherInserts.push(stmt);
    }
  });
  
  return { userInserts, otherInserts };
}

// Function to execute user INSERT statements with proper password hashing
async function executeUserInserts(connection, userInserts) {
  const saltRounds = 10;
  
  for (const stmt of userInserts) {
    try {
      // Extract values from INSERT statement
      const valuesMatch = stmt.match(/VALUES\s*\((.*)\)/is);
      if (!valuesMatch) {
        console.log('⚠️ Could not parse VALUES from user INSERT statement');
        continue;
      }
      
      // Parse the values - this is a simplified parser
      // For production, you might want a more robust SQL parser
      const valuesSection = valuesMatch[1];
      
      // Split by '),(' to get individual value sets
      const valuesSets = valuesSection.split(/\),\s*\(/);
      
      // Process each set of values
      for (let i = 0; i < valuesSets.length; i++) {
        let valueSet = valuesSets[i];
        
        // Clean up the value set
        valueSet = valueSet.replace(/^\(/, '').replace(/\)$/, '');
        
        // Split by comma to get individual values
        const values = valueSet.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/);
        
        // Hash the password (assuming it's the second value after email)
        if (values.length >= 2) {
          const email = values[0].replace(/'/g, '');
          const originalPassword = values[1].replace(/'/g, '').replace(/\$2b\$10\$hash\d+/, 'defaultPassword123');
          const hashedPassword = await bcrypt.hash(originalPassword, saltRounds);
          
          // Create individual INSERT statement
          const individualInsert = `
            INSERT INTO users (email, password, first_name, last_name, role, is_password_changed) 
            VALUES (${values[0]}, '${hashedPassword}', ${values[2]}, ${values[3]}, ${values[4]}, ${values[5] || 'TRUE'})
          `;
          
          await connection.query(individualInsert);
        }
      }
      
    } catch (error) {
      console.error('❌ Error processing user INSERT:', error.message);
      // Try to execute the original statement as fallback
      try {
        await connection.query(stmt);
      } catch (fallbackError) {
        console.error('❌ Fallback execution also failed:', fallbackError.message);
      }
    }
  }
}

// Function to verify the inserted ML data
async function verifyMLData(connection) {
  try {
    // Check total users
    const [totalUsers] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Total users in database: ${totalUsers[0].count}`);
    
    // Check users by role
    const [usersByRole] = await connection.query('SELECT COUNT(*) as count, role FROM users GROUP BY role');
    usersByRole.forEach(row => {
      console.log(`   - ${row.count} ${row.role}(s)`);
    });
    
    // Check courses
    const [courses] = await connection.query('SELECT COUNT(*) as count FROM courses');
    console.log(`✅ Total courses: ${courses[0].count}`);
    
    // Check departments
    const [departments] = await connection.query('SELECT COUNT(*) as count FROM departments');
    console.log(`✅ Total departments: ${departments[0].count}`);
    
    // Check enrollments if table exists
    try {
      const [enrollments] = await connection.query('SELECT COUNT(*) as count FROM enrollments');
      console.log(`✅ Total enrollments: ${enrollments[0].count}`);
    } catch (error) {
      console.log('ℹ️ Enrollments table not found or empty');
    }
    
    // Check quiz results if table exists
    try {
      const [quizResults] = await connection.query('SELECT COUNT(*) as count  FROM user_activities WHERE TYPE ="quiz_complete"');
      console.log(`✅ Total quiz results: ${quizResults[0].count}`);
    } catch (error) {
      console.log('ℹ️ Quiz results table not found or empty');
    }
    
  } catch (error) {
    console.error('❌ Error verifying ML data:', error);
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupMLData();
}

module.exports = { setupMLData }; 