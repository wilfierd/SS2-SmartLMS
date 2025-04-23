// File: server.js
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();
const fs = require('fs');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Parse JSON request body
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST ,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

// Check if database connection is successful
pool.getConnection()
  .then(connection => {
    console.log('Successfully connected to MySQL database');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_jwt_secret_for_development';
console.log(`JWT_SECRET ${JWT_SECRET ? 'is set' : 'is NOT set'}`);

// Google OAuth client
const keyFile = fs.readFileSync(path.join(__dirname, '..', 'key.json'));
const keyData = JSON.parse(keyFile);
const GOOGLE_CLIENT_ID = keyData.google_client_id;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access token required' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query('SELECT id, email, role, is_password_changed FROM users WHERE id = ?', [decoded.userId]);
    
    if (rows.length === 0) {
      return res.status(403).json({ message: 'Invalid user' });
    }
    
    req.user = rows[0];
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    next();
  };
};

// Server status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'API is running',
    time: new Date().toISOString()
  });
});

// Register a new admin or instructor (admin only)
// Register a new user (admin only)
app.post('/api/users/register', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
      const { email, password, firstName, lastName, role, bio, googleId } = req.body;
      
      // Validate required fields
      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({ message: 'Email, password, first name, last name, and role are required' });
      }
      
      // Validate role
      if (!['instructor', 'admin', 'student'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Must be: instructor, admin, or student' });
      }
      
      // Check if user already exists
      const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUsers.length > 0) {
        return res.status(409).json({ message: 'User already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Set appropriate fields based on role
      let query, params;
      
      if (role === 'student') {
        // Student user
        query = `INSERT INTO users 
                (email, password, first_name, last_name, role, is_password_changed, google_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        params = [
          email, 
          hashedPassword, 
          firstName, 
          lastName, 
          role, 
          false, // Students need to change password on first login
          googleId || null
        ];
      } else {
        // Admin or instructor user
        query = `INSERT INTO users 
                (email, password, first_name, last_name, role, is_password_changed, bio) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        params = [
          email, 
          hashedPassword, 
          firstName, 
          lastName, 
          role, 
          true, // Admins and instructors don't need to change password
          bio || null
        ];
      }
      
      // Create user
      const [result] = await pool.query(query, params);
      
      res.status(201).json({ 
        message: 'User created successfully', 
        userId: result.insertId,
        role: role
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

// Student registration with Google OAuth
app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    console.log('Attempting Google authentication');
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    console.log('Google auth successful for:', payload.email);
    
    const { email, given_name, family_name, sub } = payload;
    
    // Check if user exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      // User exists, authenticate them
      const user = existingUsers[0];
      console.log(`Existing user found: ${user.id} (${user.role})`);
      
      // Generate JWT token
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      return res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isPasswordChanged: user.is_password_changed
        },
        token: accessToken
      });
    } else {
      // Create new student account
      console.log(`Creating new student account for: ${email}`);
      const defaultPassword = await bcrypt.hash('123456789', 10);
      
      const [result] = await pool.query(
        'INSERT INTO users (email, password, first_name, last_name, role, is_password_changed, google_id) VALUES (?, ?, ?, ?, "student", FALSE, ?)',
        [email, defaultPassword, given_name, family_name, sub]
      );
      
      console.log(`New student account created with ID: ${result.insertId}`);
      
      // Generate JWT token
      const accessToken = jwt.sign(
        { userId: result.insertId, email, role: 'student' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      res.status(201).json({
        message: 'Account created successfully',
        user: {
          id: result.insertId,
          email,
          role: 'student',
          isPasswordChanged: false
        },
        token: accessToken
      });
    }
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`Login attempt for email: ${email}`);
    
    // Find user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      console.log(`No user found with email: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];
    console.log(`User found: ID ${user.id}, Role: ${user.role}`);
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    console.log(`Password validation result: ${validPassword}`);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log(`Login successful for user: ${user.id}`);
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isPasswordChanged: user.is_password_changed
      },
      token: accessToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change password
app.post('/api/users/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    console.log(`Password change attempt for user ID: ${userId}`);
    
    // Get user with password
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      console.log(`User not found for ID: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    console.log(`Current password validation: ${validPassword}`);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.query(
      'UPDATE users SET password = ?, is_password_changed = TRUE WHERE id = ?',
      [hashedPassword, userId]
    );
    
    console.log(`Password changed successfully for user: ${userId}`);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user profile
app.get('/api/users/me', authenticateToken, async (req, res) => {
  console.log(`Profile requested for user ID: ${req.user.id}`);
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    isPasswordChanged: req.user.is_password_changed
  });
});

// List all users (admin only)
app.get('/api/users', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_password_changed, created_at FROM users'
    );
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// For fixing login issues - update a password directly
app.post('/api/util/update-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );
    
    res.json({ 
      message: 'Password updated successfully',
      email: email,
      hashedPassword: hashedPassword
    });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password request
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Check if user exists
      const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      
      if (users.length === 0) {
        // Don't reveal if email exists or not for security
        return res.status(200).json({ 
          message: 'If an account with that email exists, a password reset link has been sent.' 
        });
      }
      
      const user = users[0];
      
      // Create a reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date();
      tokenExpires.setHours(tokenExpires.getHours() + 1); // Token valid for 1 hour
      
      // Save token to database
      await pool.query(
        'DELETE FROM password_reset_tokens WHERE user_id = ?',
        [user.id]
      );
      
      await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, resetToken, tokenExpires]
      );
      
      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      
      // Send email
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Password Reset Request',
        html: `
          <h1>Password Reset</h1>
          <p>You requested a password reset for your LMS account.</p>
          <p>Click the link below to reset your password. This link is valid for 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
      
      res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  // Verify reset token
  app.get('/api/auth/verify-reset-token/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ valid: false, message: 'Token is required' });
      }
      
      // Find token in database
      const [tokens] = await pool.query(
        'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
        [token]
      );
      
      if (tokens.length === 0) {
        return res.status(400).json({ valid: false, message: 'Invalid or expired token' });
      }
      
      // Get user info
      const [users] = await pool.query(
        'SELECT id, email FROM users WHERE id = ?',
        [tokens[0].user_id]
      );
      
      if (users.length === 0) {
        return res.status(400).json({ valid: false, message: 'User not found' });
      }
      
      res.json({ valid: true, user: { id: users[0].id, email: users[0].email } });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({ valid: false, message: 'Server error', error: error.message });
    }
  });
  
  // Reset password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }
      
      // Find token in database
      const [tokens] = await pool.query(
        'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
        [token]
      );
      
      if (tokens.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
      
      const userId = tokens[0].user_id;
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password and mark as changed
      await pool.query(
        'UPDATE users SET password = ?, is_password_changed = TRUE WHERE id = ?',
        [hashedPassword, userId]
      );

      // Delete token
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
    
    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//=======COURSES ENDPOINTS=========//

// Get all courses with instructor and department information
app.get('/api/courses', authenticateToken, async (req, res) => {
  try {
    console.log("Fetching courses...");
    const [courses] = await pool.query(`
      SELECT c.*, 
             u.first_name, u.last_name, 
             d.name as department_name
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      ORDER BY c.created_at DESC
    `);
    
    console.log(`Found ${courses.length} courses`);
    const baseUrl = `http://${req.hostname}:${PORT}`;
    // Format the response with null checks
    const formattedCourses = courses.map(course => ({
      id: course.id,
      code: course.code,
      title: course.title,
      instructor: course.first_name && course.last_name ? `${course.first_name} ${course.last_name}` : 'Unknown',
      instructorId: course.instructor_id,
      department: course.department_name,
      departmentId: course.department_id,
      description: course.description,
      startDate: course.start_date ? new Date(course.start_date).toISOString().split('T')[0] : null,
      endDate: course.end_date ? new Date(course.end_date).toISOString().split('T')[0] : null,
      status: course.status ? (course.status.charAt(0).toUpperCase() + course.status.slice(1)) : 'Draft',
      thumbnail: course.thumbnail_url ? 
        (course.thumbnail_url.startsWith('http') ? course.thumbnail_url : `${baseUrl}${course.thumbnail_url}`) 
        : null,
      isFeatured: course.is_featured === 1
    }));
    
    res.json(formattedCourses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single course by ID
app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const [courses] = await pool.query(`
      SELECT c.*, 
             u.first_name, u.last_name, 
             d.name as department_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.id = ?
    `, [req.params.id]);
    
    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const course = courses[0];
    
    res.json({
      id: course.id,
      code: course.code,
      title: course.title,
      instructor: `${course.first_name} ${course.last_name}`,
      instructorId: course.instructor_id,
      department: course.department_name,
      departmentId: course.department_id,
      description: course.description,
      startDate: course.start_date ? new Date(course.start_date).toISOString().split('T')[0] : null,
      endDate: course.end_date ? new Date(course.end_date).toISOString().split('T')[0] : null,
      status: course.status.charAt(0).toUpperCase() + course.status.slice(1), // Capitalize status
      thumbnail: course.thumbnail_url,
      isFeatured: course.is_featured === 1 // Convert to boolean
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new course
app.post('/api/courses', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { 
      title, 
      code, 
      instructorId, 
      departmentId, 
      description, 
      startDate, 
      endDate, 
      status, 
      thumbnailUrl,
      isFeatured
    } = req.body;
    
    // Validate required fields
    if (!title || !instructorId || !description || !code) {
      return res.status(400).json({ message: 'Title, code, instructor, and description are required' });
    }
    
    // Normalize status
    const normalizedStatus = status ? status.toLowerCase() : 'draft';
    
    const [result] = await pool.query(
      `INSERT INTO courses (
        title, 
        code,
        instructor_id, 
        department_id,
        description, 
        start_date, 
        end_date, 
        status, 
        thumbnail_url,
        is_featured
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, 
        code,
        instructorId, 
        departmentId || null,
        description, 
        startDate || null, 
        endDate || null, 
        normalizedStatus, 
        thumbnailUrl || null,
        isFeatured ? 1 : 0
      ]
    );
    
    res.status(201).json({ 
      message: 'Course created successfully', 
      courseId: result.insertId 
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a course
app.put('/api/courses/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const {
      title, 
      code, 
      instructorId, 
      departmentId, 
      description, 
      startDate, 
      endDate, 
      status, 
      thumbnailUrl,
      isFeatured
    } = req.body;
    
    // Validate required fields
    if (!title || !instructorId || !description || !code) {
      return res.status(400).json({ message: 'Title, code, instructor, and description are required' });
    }
    
    // Normalize status
    const normalizedStatus = status ? status.toLowerCase() : 'draft';
    
    await pool.query(
      `UPDATE courses 
       SET title = ?, 
           code = ?,
           instructor_id = ?, 
           department_id = ?,
           description = ?, 
           start_date = ?, 
           end_date = ?, 
           status = ?, 
           thumbnail_url = ?,
           is_featured = ?,
           updated_at = NOW() 
       WHERE id = ?`,
      [
        title, 
        code,
        instructorId, 
        departmentId || null,
        description, 
        startDate || null, 
        endDate || null, 
        normalizedStatus, 
        thumbnailUrl || null,
        isFeatured ? 1 : 0,
        req.params.id
      ]
    );
    
    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a course
app.delete('/api/courses/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Archive a course (update status to 'archived')
app.put('/api/courses/:id/archive', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    await pool.query(
      'UPDATE courses SET status = "archived", updated_at = NOW() WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Course archived successfully' });
  } catch (error) {
    console.error('Error archiving course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all instructors (for dropdown)
app.get('/api/instructors', authenticateToken, async (req, res) => {
  try {
    const [instructors] = await pool.query(`
      SELECT id, first_name, last_name, email 
      FROM users 
      WHERE role = 'instructor'
      ORDER BY first_name, last_name
    `);
    
    const formattedInstructors = instructors.map(instructor => ({
      id: instructor.id,
      name: `${instructor.first_name} ${instructor.last_name}`,
      email: instructor.email
    }));
    
    res.json(formattedInstructors);
  } catch (error) {
    console.error('Error fetching instructors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all departments (for dropdown)
app.get('/api/departments', authenticateToken, async (req, res) => {
  try {
    const [departments] = await pool.query(`
      SELECT id, name, description 
      FROM departments 
      ORDER BY name
    `);
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Batch delete courses
app.post('/api/courses/batch-delete', authenticateToken, authorize(['admin']), async (req, res) => {
  const { courseIds } = req.body;
  
  if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
    return res.status(400).json({ message: 'No course IDs provided' });
  }
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Delete related data first (this depends on your foreign key constraints)
    // If your database is set up with ON DELETE CASCADE, you may not need these
    /*
    for (const courseId of courseIds) {
      // Delete enrollments
      await connection.query('DELETE FROM enrollments WHERE course_id = ?', [courseId]);
      // Delete modules and related data
      const [modules] = await connection.query('SELECT id FROM course_modules WHERE course_id = ?', [courseId]);
      for (const module of modules) {
        await connection.query('DELETE FROM lessons WHERE module_id = ?', [module.id]);
      }
      await connection.query('DELETE FROM course_modules WHERE course_id = ?', [courseId]);
    }
    */
    
    // Delete the courses
    const placeholders = courseIds.map(() => '?').join(',');
    await connection.query(`DELETE FROM courses WHERE id IN (${placeholders})`, courseIds);
    
    await connection.commit();
    
    res.json({ message: `${courseIds.length} courses deleted successfully` });
  } catch (error) {
    await connection.rollback();
    console.error('Error batch deleting courses:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  } finally {
    connection.release();
  }
});

// File upload middleware
const multer = require('multer');
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Thumbnail upload endpoint
app.post('/api/upload/thumbnail', authenticateToken, upload.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Generate unique filename
    const filename = Date.now() + '-' + req.file.originalname;
    const newPath = path.join(uploadsDir, filename);
    
    // Move file to permanent location
    fs.renameSync(req.file.path, newPath);
    
    // Create FULL URL path for the file (with server address)
    const baseUrl = `http://${req.hostname}:${PORT}`;
    const thumbnailUrl = `${baseUrl}/uploads/${filename}`;
    
    res.json({ 
      message: 'File uploaded successfully',
      thumbnailUrl 
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Thêm các route này vào file server.js

// ============ USER MANAGEMENT ROUTES ============

// Get all users (admin only)
app.get('/api/users', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
      // Add pagination support
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 0; // 0 means no limit
      const offset = (page - 1) * limit;
      
      // Add search and filter support
      const searchQuery = req.query.search ? `%${req.query.search}%` : null;
      const roleFilter = req.query.role && ['admin', 'instructor', 'student'].includes(req.query.role.toLowerCase()) 
                         ? req.query.role.toLowerCase() 
                         : null;
      
      // Build base query
      let query = 'SELECT id, email, first_name, last_name, role, google_id, is_password_changed, created_at, updated_at FROM users';
      const queryParams = [];
      
      // Add WHERE conditions if needed
      if (searchQuery || roleFilter) {
        query += ' WHERE';
        
        if (searchQuery) {
          query += ' (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
          queryParams.push(searchQuery, searchQuery, searchQuery);
        }
        
        if (roleFilter) {
          if (searchQuery) query += ' AND';
          query += ' role = ?';
          queryParams.push(roleFilter);
        }
      }
      
      // Add pagination if limit is set
      if (limit > 0) {
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);
      } else {
        query += ' ORDER BY created_at DESC';
      }
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) AS total FROM users';
      const countParams = [];
      
      if (searchQuery || roleFilter) {
        countQuery += ' WHERE';
        
        if (searchQuery) {
          countQuery += ' (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
          countParams.push(searchQuery, searchQuery, searchQuery);
        }
        
        if (roleFilter) {
          if (searchQuery) countQuery += ' AND';
          countQuery += ' role = ?';
          countParams.push(roleFilter);
        }
      }
      
      // Execute queries
      const [users] = await pool.query(query, queryParams);
      const [countResult] = await pool.query(countQuery, countParams);
      
      // Return data with pagination info if requested
      if (limit > 0) {
        res.json({
          users,
          pagination: {
            total: countResult[0].total,
            page,
            limit,
            totalPages: Math.ceil(countResult[0].total / limit)
          }
        });
      } else {
        res.json(users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get single user by ID (admin only)
  app.get('/api/users/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
      const [users] = await pool.query(
        'SELECT id, email, first_name, last_name, role, google_id, is_password_changed, created_at, updated_at FROM users WHERE id = ?',
        [req.params.id]
      );
      
      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(users[0]);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Register/Create user - already exists in your code: 
  // app.post('/api/users/register', authenticateToken, authorize(['admin']), async...)
  
  // Update user (admin only)
  // Update user (admin only)
app.put('/api/users/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
      const { email, firstName, lastName, role, password, bio, googleId } = req.body;
      const userId = req.params.id;
      
      // Check if user exists
      const [existingUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (existingUsers.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const existingUser = existingUsers[0];
      
      // Validate role if provided
      if (role && !['admin', 'instructor', 'student'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      
      // Check if attempting to modify the last admin
      if (existingUser.role === 'admin' && role && role !== 'admin') {
        const [adminCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
        if (adminCount[0].count <= 1) {
          return res.status(400).json({ message: 'Cannot change the last admin user\'s role' });
        }
      }
      
      // Start a transaction to handle potentially complex updates
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        // Build update query based on provided fields
        const updates = {};
        
        if (firstName !== undefined) {
          updates.first_name = firstName;
        }
        
        if (lastName !== undefined) {
          updates.last_name = lastName;
        }
        
        if (role !== undefined) {
          updates.role = role;
        }
        
        // Handle password update if provided
        if (password) {
          // Hash the new password
          const hashedPassword = await bcrypt.hash(password, 10);
          updates.password = hashedPassword;
          
          // Reset password changed flag for students, mark as changed for others
          const newRole = role || existingUser.role;
          updates.is_password_changed = newRole !== 'student';
        }
        
        // Handle role-specific fields
        const newRole = role || existingUser.role;
        const isRoleChanged = role && role !== existingUser.role;
        
        if (newRole === 'student') {
          // For students
          if (googleId !== undefined) {
            updates.google_id = googleId;
          }
          
          // If changing to student, set bio to NULL
          if (isRoleChanged && existingUser.role !== 'student') {
            updates.bio = null;
          }
        } else {
          // For admin or instructor
          if (bio !== undefined) {
            updates.bio = bio;
          }
          
          // If changing to admin or instructor, set google_id to NULL
          if (isRoleChanged && existingUser.role === 'student') {
            updates.google_id = null;
          }
        }
        
        // Add updated_at timestamp
        updates.updated_at = new Date();
        
        // Generate SQL query and params from updates object
        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ message: 'No fields to update' });
        }
        
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        
        const query = `UPDATE users SET ${fields} WHERE id = ?`;
        values.push(userId);
        
        // Execute the update
        await connection.query(query, values);
        await connection.commit();
        
        res.json({ 
          message: 'User updated successfully',
          role: updates.role || existingUser.role
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  // Delete user (admin only)
  app.delete('/api/users/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Don't allow deleting yourself
      if (req.user.id === parseInt(userId)) {
        return res.status(400).json({ message: 'You cannot delete your own account' });
      }
      
      // Check if user exists
      const [existingUsers] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
      if (existingUsers.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if attempting to delete the last admin
      if (existingUsers[0].role === 'admin') {
        const [adminCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
        if (adminCount[0].count <= 1) {
          return res.status(400).json({ message: 'Cannot delete the last admin user' });
        }
      }
      
      // Delete the user
      await pool.query('DELETE FROM users WHERE id = ?', [userId]);
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  // Batch delete users (admin only)
  app.post('/api/users/batch-delete', authenticateToken, authorize(['admin']), async (req, res) => {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'No user IDs provided' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Check if current user is in the list
      if (userIds.includes(req.user.id)) {
        throw new Error('You cannot delete your own account');
      }
      
      // Check for the last admin
      const [adminUsers] = await connection.query('SELECT id FROM users WHERE role = "admin"');
      const adminIds = adminUsers.map(admin => admin.id);
      
      // If all admins are being deleted, prevent it
      if (adminIds.length <= userIds.filter(id => adminIds.includes(parseInt(id))).length) {
        throw new Error('Cannot delete all admin users');
      }
      
      // Delete the users
      const placeholders = userIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM users WHERE id IN (${placeholders})`, userIds);
      
      await connection.commit();
      
      res.json({ message: `${userIds.length} users deleted successfully` });
    } catch (error) {
      await connection.rollback();
      console.error('Error batch deleting users:', error);
      res.status(500).json({ message: 'Server error', details: error.message });
    } finally {
      connection.release();
    }
  });

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origins: ${corsOptions.origin.join(', ')}`);
});