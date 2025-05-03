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
const { v4: uuidv4 } = require('uuid');

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
      isFeatured,
      enrollmentKey
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
        is_featured,
        enrollment_key
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        enrollmentKey || null
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
app.put('/api/courses/:id', authenticateToken, authorize(['admin', 'instructor']), async (req, res) => {
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
      isFeatured,
      enrollmentKey // New field
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !code) {
      return res.status(400).json({ message: 'Title, code, and description are required' });
    }
    
    // For instructors, verify they own this course
    if (req.user.role === 'instructor') {
      const [courses] = await pool.query(
        'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
        [req.params.id, req.user.id]
      );
      
      if (courses.length === 0) {
        return res.status(403).json({ message: 'You can only update your own courses' });
      }
    }
    
    // Normalize status
    const normalizedStatus = status ? status.toLowerCase() : 'draft';
    
    const updateFields = [
      title, 
      code,
      req.user.role === 'instructor' ? req.user.id : instructorId,
      departmentId || null,
      description, 
      startDate || null, 
      endDate || null, 
      normalizedStatus, 
      thumbnailUrl || null,
      isFeatured ? 1 : 0,
      enrollmentKey || null, // Update enrollment key
      req.params.id
    ];
    
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
           enrollment_key = ?,
           updated_at = NOW() 
       WHERE id = ?`,
      updateFields
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
const e = require('express');
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


// ===============STUDENT COURSE ENDPOINT================= //

// Fetch enrolled courses for current student
app.get('/api/enrollments/my-courses', authenticateToken, authorize(['student']), async (req, res) => {
  try {
    const [enrollments] = await pool.query(`
      SELECT c.*, u.first_name, u.last_name, e.enrollment_date, e.completion_status
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE e.student_id = ?
      ORDER BY e.enrollment_date DESC
    `, [req.user.id]);
    
    // Format response
    const formattedCourses = enrollments.map(course => ({
      id: course.id,
      code: course.code,
      title: course.title,
      instructor: `${course.first_name} ${course.last_name}`,
      instructorId: course.instructor_id,
      department: course.department_id,
      description: course.description,
      startDate: course.start_date ? new Date(course.start_date).toISOString().split('T')[0] : null,
      endDate: course.end_date ? new Date(course.end_date).toISOString().split('T')[0] : null,
      status: course.status.charAt(0).toUpperCase() + course.status.slice(1),
      thumbnail: course.thumbnail_url,
      enrollmentDate: course.enrollment_date,
      completionStatus: course.completion_status
    }));
    
    res.json(formattedCourses);
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enroll in a course with optional enrollment key
app.post('/api/enrollments/enroll', authenticateToken, authorize(['student']), async (req, res) => {
  try {
    const { courseId, enrollmentKey } = req.body;
    const studentId = req.user.id;
    
    // Validate courseId
    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }
    
    // Check if course exists and get its details
    const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    
    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const course = courses[0];
    
    // Check if student is already enrolled
    const [existingEnrollments] = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );
    
    if (existingEnrollments.length > 0) {
      return res.status(400).json({ message: 'You are already enrolled in this course' });
    }
    
    // Check if course requires enrollment key
    if (course.enrollment_key && course.enrollment_key !== enrollmentKey) {
      return res.status(403).json({ message: 'Invalid enrollment key' });
    }
    
    // Enroll the student
    await pool.query(
      'INSERT INTO enrollments (student_id, course_id, enrollment_date, completion_status) VALUES (?, ?, NOW(), "not_started")',
      [studentId, courseId]
    );
    
    res.status(201).json({ message: 'Successfully enrolled in course' });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Leave/unenroll from a course
app.delete('/api/enrollments/leave/:courseId', authenticateToken, authorize(['student']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;
    
    // Check if student is enrolled in the course
    const [enrollments] = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );
    
    if (enrollments.length === 0) {
      return res.status(404).json({ message: 'You are not enrolled in this course' });
    }
    
    // Remove enrollment
    await pool.query(
      'DELETE FROM enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );
    
    res.json({ message: 'Successfully left the course' });
  } catch (error) {
    console.error('Error leaving course:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// VIRTUAL SESSIONS ROUTES

// Add these routes to your server.js file, using the same pattern as your other API endpoints
// Replace the router.get('/virtual-sessions'...) routes with these app.get versions

/**
 * @route GET /api/virtual-sessions
 * @desc Get virtual sessions with filtering
 * @access Private
 */
app.get('/api/virtual-sessions', authenticateToken, async (req, res) => {
    try {
      const {
        upcoming,
        past,
        status,
        courseId,
        instructorId,
        startDate,
        endDate,
        search
      } = req.query;
  
      let query = `
        SELECT vs.*, 
          c.title as courseTitle, 
          CONCAT(u.first_name, ' ', u.last_name) as instructorName,
          (SELECT COUNT(*) FROM session_registrations 
            WHERE session_id = vs.id AND status IN ('registered', 'attended')) as participantCount
      `;
      
      // For students, include their enrollment status
      if (req.user.role === 'student') {
        query += `,
          (SELECT status FROM session_registrations 
           WHERE session_id = vs.id AND user_id = ?) as enrollmentStatus
        `;
      }
      
      query += `
        FROM virtual_sessions vs
        JOIN courses c ON vs.course_id = c.id
        JOIN users u ON vs.instructor_id = u.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      
      // Add student user_id if student
      if (req.user.role === 'student') {
        queryParams.push(req.user.id);
      }
      
      // Apply filters
      if (status) {
        query += ` AND vs.status = ?`;
        queryParams.push(status);
      }
      
      if (upcoming === 'true') {
        query += ` AND ((vs.session_date > CURDATE()) OR 
                       (vs.session_date = CURDATE() AND vs.start_time > CURTIME()))`;
      }
      
      if (past === 'true') {
        query += ` AND ((vs.session_date < CURDATE()) OR 
                       (vs.session_date = CURDATE() AND vs.end_time < CURTIME()))`;
      }
      
      if (courseId) {
        query += ` AND vs.course_id = ?`;
        queryParams.push(courseId);
      }
      
      if (instructorId) {
        query += ` AND vs.instructor_id = ?`;
        queryParams.push(instructorId);
      }
      
      if (startDate) {
        query += ` AND vs.session_date >= ?`;
        queryParams.push(startDate);
      }
      
      if (endDate) {
        query += ` AND vs.session_date <= ?`;
        queryParams.push(endDate);
      }
      
      if (search) {
        query += ` AND (vs.title LIKE ? OR c.title LIKE ? OR 
                       CONCAT(u.first_name, ' ', u.last_name) LIKE ?)`;
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }
      
      // For students, filter by enrolled courses
      if (req.user.role === 'student') {
        query += `
          AND (
            vs.course_id IN (SELECT course_id FROM enrollments WHERE student_id = ?) OR
            vs.id IN (SELECT session_id FROM session_registrations WHERE user_id = ?)
          )
        `;
        queryParams.push(req.user.id, req.user.id);
      }
      
      // For instructors, filter by their courses
      if (req.user.role === 'instructor' && !instructorId) {
        query += ` AND vs.instructor_id = ?`;
        queryParams.push(req.user.id);
      }
      
      // Sort accordingly to request
      if (upcoming === 'true') {
        query += ` ORDER BY vs.session_date ASC, vs.start_time ASC`;
      } else if (past === 'true') {
        query += ` ORDER BY vs.session_date DESC, vs.start_time DESC`;
      } else if (status === 'active') {
        query += ` ORDER BY vs.actual_start_time ASC`;
      } else {
        query += ` ORDER BY vs.created_at DESC`;
      }
      
      const [sessions] = await pool.query(query, queryParams);
      
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching virtual sessions:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  /**
   * @route GET /api/virtual-sessions/:id
   * @desc Get a virtual session by ID
   * @access Private
   */
  app.get('/api/virtual-sessions/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      let query = `
        SELECT vs.*, 
          c.title as courseTitle, 
          CONCAT(u.first_name, ' ', u.last_name) as instructorName,
          (SELECT COUNT(*) FROM session_registrations 
           WHERE session_id = vs.id AND status IN ('registered', 'attended')) as participantCount,
          (SELECT COUNT(*) FROM session_activities 
           WHERE session_id = vs.id AND action = 'join') as joinCount
      `;
      
      // For students, include their enrollment status
      if (req.user.role === 'student') {
        query += `,
          (SELECT status FROM session_registrations 
           WHERE session_id = vs.id AND user_id = ?) as enrollmentStatus
        `;
      }
      
      query += `
        FROM virtual_sessions vs
        JOIN courses c ON vs.course_id = c.id
        JOIN users u ON vs.instructor_id = u.id
        WHERE vs.id = ?
      `;
      
      const queryParams = [];
      
      // Add student user_id if student
      if (req.user.role === 'student') {
        queryParams.push(req.user.id);
      }
      
      queryParams.push(id);
      
      const [sessions] = await pool.query(query, queryParams);
      
      if (sessions.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Get session settings
      const [settings] = await pool.query(
        `SELECT * FROM session_settings WHERE session_id = ?`,
        [id]
      );
      
      // Get registered participants
      const [participants] = await pool.query(
        `SELECT sr.*, CONCAT(u.first_name, ' ', u.last_name) as participantName, u.email 
         FROM session_registrations sr
         JOIN users u ON sr.user_id = u.id
         WHERE sr.session_id = ?`,
        [id]
      );
      
      // Combine data
      const sessionData = {
        ...sessions[0],
        settings: settings[0] || {},
        participants
      };
      
      // If instructor or admin, add additional data
      if (req.user.role === 'instructor' || req.user.role === 'admin') {
        // Get activity stats
        const [activityStats] = await pool.query(
          `SELECT 
            COUNT(DISTINCT user_id) as uniqueParticipants,
            AVG(duration_seconds) as averageDuration,
            MAX(duration_seconds) as maxDuration
           FROM session_activities
           WHERE session_id = ? AND action = 'leave' AND duration_seconds IS NOT NULL`,
          [id]
        );
        
        sessionData.analytics = activityStats[0] || {};
      }
      
      res.json(sessionData);
    } catch (error) {
      console.error('Error fetching virtual session:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  /**
   * @route POST /api/virtual-sessions
   * @desc Create a new virtual session
   * @access Private (Instructors only)
   */
  app.post('/api/virtual-sessions', authenticateToken, authorize(['instructor', 'admin']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const {
        title,
        courseId,
        description,
        sessionDate,
        startTime,
        endTime,
        password,
        maxParticipants,
        isRecorded,
        startNow,
        recurrence,
        settings
      } = req.body;
      
      // Validate required fields
      if (!title || !courseId) {
        return res.status(400).json({ message: 'Title and course are required' });
      }
      
      // If not starting now, validate date and time
      if (!startNow && (!sessionDate || !startTime)) {
        return res.status(400).json({ message: 'Session date and start time are required' });
      }
      
      // Create room ID (UUID)
      const roomId = uuidv4().replace(/-/g, '').substring(0, 12);
      
      // Hash password if provided
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
      
      // Prepare session data
      const sessionData = {
        title,
        room_id: roomId,
        course_id: courseId,
        instructor_id: req.user.id,
        description: description || null,
        max_participants: maxParticipants || 30,
        is_recorded: isRecorded !== undefined ? isRecorded : true,
        password: hashedPassword
      };
      
      // Handle start now vs. scheduled
      if (startNow) {
        sessionData.status = 'active';
        sessionData.actual_start_time = new Date();
        // Set session_date to today
        sessionData.session_date = new Date().toISOString().split('T')[0];
        sessionData.start_time = new Date().toTimeString().split(' ')[0];
      } else {
        sessionData.status = 'scheduled';
        sessionData.session_date = sessionDate;
        sessionData.start_time = startTime;
        sessionData.end_time = endTime || null;
      }
      
      // Insert the session
      const [result] = await connection.query(
        'INSERT INTO virtual_sessions SET ?',
        sessionData
      );
      
      const sessionId = result.insertId;
      
      // If there are custom settings, save them
      if (settings) {
        await connection.query(
          'INSERT INTO session_settings SET ?',
          { session_id: sessionId, ...settings }
        );
      } else {
        // Insert default settings
        await connection.query(
          'INSERT INTO session_settings (session_id) VALUES (?)',
          [sessionId]
        );
      }
      
      // Handle recurring sessions
      if (recurrence && !startNow) {
        const seriesId = uuidv4();
        
        await connection.query(
          'INSERT INTO recurring_sessions SET ?',
          {
            parent_session_id: sessionId,
            recurrence_type: recurrence.type,
            day_of_week: recurrence.dayOfWeek || null,
            week_of_month: recurrence.weekOfMonth || null,
            start_date: sessionDate,
            end_date: recurrence.endDate || null,
            series_id: seriesId
          }
        );
        
        // Generate the recurring sessions
        await generateRecurringSessions(connection, sessionId, recurrence, seriesId);
      }
      
      await connection.commit();
      
      // Fetch the created session with additional info
      const [sessions] = await pool.query(
        `SELECT vs.*, c.title as courseTitle, CONCAT(u.first_name, ' ', u.last_name) as instructorName
         FROM virtual_sessions vs
         JOIN courses c ON vs.course_id = c.id
         JOIN users u ON vs.instructor_id = u.id
         WHERE vs.id = ?`,
        [sessionId]
      );
      
      res.status(201).json({
        message: 'Session created successfully',
        session: sessions[0]
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating virtual session:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
      connection.release();
    }
  });
  
  /**
   * @route PUT /api/virtual-sessions/:id
   * @desc Update a virtual session
   * @access Private (Session instructor or admin only)
   */
  app.put('/api/virtual-sessions/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const {
        title,
        courseId,
        description,
        sessionDate,
        startTime,
        endTime,
        password,
        maxParticipants,
        isRecorded,
        recordingUrl,
        status,
        settings
      } = req.body;
      
      // Verify session exists and user has permission
      const [sessions] = await connection.query(
        'SELECT * FROM virtual_sessions WHERE id = ?',
        [id]
      );
      
      if (sessions.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const session = sessions[0];
      
      // Check permissions (must be instructor of the session or admin)
      if (req.user.role !== 'admin' && session.instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to update this session' });
      }
      
      // Prepare update data
      const updateData = {};
      
      // Only update provided fields
      if (title) updateData.title = title;
      if (courseId) updateData.course_id = courseId;
      if (description !== undefined) updateData.description = description;
      if (sessionDate) updateData.session_date = sessionDate;
      if (startTime) updateData.start_time = startTime;
      if (endTime !== undefined) updateData.end_time = endTime;
      if (maxParticipants) updateData.max_participants = maxParticipants;
      if (isRecorded !== undefined) updateData.is_recorded = isRecorded;
      if (recordingUrl !== undefined) updateData.recording_url = recordingUrl;
      if (status) updateData.status = status;
      
      // Update password if provided
      if (password !== undefined) {
        if (password) {
          updateData.password = await bcrypt.hash(password, 10);
        } else {
          updateData.password = null;
        }
      }
      
      // Only proceed if there are fields to update
      if (Object.keys(updateData).length > 0) {
        await connection.query(
          'UPDATE virtual_sessions SET ? WHERE id = ?',
          [updateData, id]
        );
      }
      
      // Update settings if provided
      if (settings) {
        // Check if settings exist
        const [existingSettings] = await connection.query(
          'SELECT id FROM session_settings WHERE session_id = ?',
          [id]
        );
        
        if (existingSettings.length > 0) {
          await connection.query(
            'UPDATE session_settings SET ? WHERE session_id = ?',
            [settings, id]
          );
        } else {
          await connection.query(
            'INSERT INTO session_settings SET ?',
            { session_id: id, ...settings }
          );
        }
      }
      
      await connection.commit();
      
      res.json({ message: 'Session updated successfully' });
    } catch (error) {
      await connection.rollback();
      console.error('Error updating virtual session:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
      connection.release();
    }
  });
  
  /**
   * @route DELETE /api/virtual-sessions/:id
   * @desc Delete a virtual session
   * @access Private (Session instructor or admin only)
   */
  app.delete('/api/virtual-sessions/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify session exists and user has permission
      const [sessions] = await pool.query(
        'SELECT * FROM virtual_sessions WHERE id = ?',
        [id]
      );
      
      if (sessions.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const session = sessions[0];
      
      // Check permissions (must be instructor of the session or admin)
      if (req.user.role !== 'admin' && session.instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to delete this session' });
      }
      
      // Don't allow deletion of active or completed sessions
      if (session.status === 'active' || session.status === 'completed') {
        return res.status(400).json({ 
          message: `Cannot delete a session that is ${session.status}. You can only delete scheduled sessions.` 
        });
      }
      
      // Delete the session (cascade will handle related records)
      await pool.query('DELETE FROM virtual_sessions WHERE id = ?', [id]);
      
      res.json({ message: 'Session deleted successfully' });
    } catch (error) {
      console.error('Error deleting virtual session:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  /**
   * @route POST /api/virtual-sessions/:id/end
   * @desc End an active session
   * @access Private (Session instructor only)
   */
  app.post('/api/virtual-sessions/:id/end', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify session exists and user has permission
      const [sessions] = await pool.query(
        'SELECT * FROM virtual_sessions WHERE id = ?',
        [id]
      );
      
      if (sessions.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const session = sessions[0];
      
      // Check permissions (must be instructor of the session)
      if (session.instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Only the session instructor can end the session' });
      }
      
      // Ensure the session is active
      if (session.status !== 'active') {
        return res.status(400).json({ message: `Cannot end a session that is not active (current status: ${session.status})` });
      }
      
      // Update the session status and end time
      await pool.query(
        'UPDATE virtual_sessions SET status = ?, actual_end_time = NOW() WHERE id = ?',
        ['completed', id]
      );
      
      // Calculate duration for all participants who haven't left
      await pool.query(`
        INSERT INTO session_activities (session_id, user_id, action, duration_seconds)
        SELECT 
          ?, 
          user_id, 
          'leave', 
          TIMESTAMPDIFF(SECOND, MAX(timestamp), NOW())
        FROM session_activities
        WHERE session_id = ? AND action = 'join' AND user_id NOT IN (
          SELECT user_id 
          FROM session_activities 
          WHERE session_id = ? AND action = 'leave' AND timestamp > (
            SELECT MAX(timestamp) 
            FROM session_activities 
            WHERE session_id = ? AND action = 'join' AND user_id = session_activities.user_id
          )
        )
        GROUP BY user_id
      `, [id, id, id, id]);
      
      // Update participant statistics
      await pool.query(`
        UPDATE session_registrations
        SET status = 'attended'
        WHERE session_id = ? AND user_id IN (
          SELECT DISTINCT user_id FROM session_activities 
          WHERE session_id = ? AND action = 'join'
        )
      `, [id, id]);
      
      res.json({ message: 'Session ended successfully' });
    } catch (error) {
      console.error('Error ending virtual session:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  /**
   * @route GET /api/virtual-sessions/update-status
   * @desc Update status of all sessions
   * @access Private
   */
  app.get('/api/virtual-sessions/update-status', authenticateToken, async (req, res) => {
    try {
      // Call the stored procedure
      await pool.query('CALL update_session_statuses()');
      
      res.json({ message: 'Session statuses updated successfully' });
    } catch (error) {
      console.error('Error updating session statuses:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  /**
   * @route POST /api/virtual-sessions/:id/poll
   * @desc Create a poll in a session
   * @access Private (Instructors only)
   */
  app.post('/api/virtual-sessions/:id/poll', authenticateToken, authorize(['instructor']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { question, options, isAnonymous, isMultipleChoice } = req.body;
      
      // Validate request
      if (!question || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: 'Question and at least two options are required' });
      }
      
      // Verify session exists and is active
      const [sessions] = await connection.query(
        'SELECT * FROM virtual_sessions WHERE id = ?',
        [id]
      );
      
      if (sessions.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const session = sessions[0];
      
      // Check permissions (must be instructor of the session)
      if (session.instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Only the session instructor can create polls' });
      }
      
      // Ensure the session is active
      if (session.status !== 'active') {
        return res.status(400).json({ message: 'Can only create polls in active sessions' });
      }
      
      // Create the poll
      const [pollResult] = await connection.query(
        `INSERT INTO session_polls 
         (session_id, creator_id, question, is_anonymous, is_multiple_choice)
         VALUES (?, ?, ?, ?, ?)`,
        [id, req.user.id, question, isAnonymous || false, isMultipleChoice !== false]
      );
      
      const pollId = pollResult.insertId;
      
      // Add poll options
      for (const option of options) {
        await connection.query(
          'INSERT INTO poll_options (poll_id, option_text) VALUES (?, ?)',
          [pollId, option]
        );
      }
      
      await connection.commit();
      
      // Fetch the created poll with options
      const [polls] = await pool.query(
        'SELECT * FROM session_polls WHERE id = ?',
        [pollId]
      );
      
      const [pollOptions] = await pool.query(
        'SELECT * FROM poll_options WHERE poll_id = ?',
        [pollId]
      );
      
      res.status(201).json({
        message: 'Poll created successfully',
        poll: {
          ...polls[0],
          options: pollOptions
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating poll:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
      connection.release();
    }
  });
  
  /**
   * @route GET /api/virtual-sessions/:id/polls
   * @desc Get polls for a session
   * @access Private
   */
  app.get('/api/virtual-sessions/:id/polls', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify session exists
      const [sessions] = await pool.query(
        'SELECT * FROM virtual_sessions WHERE id = ?',
        [id]
      );
      
      if (sessions.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Get all polls for the session
      const [polls] = await pool.query(
        'SELECT * FROM session_polls WHERE session_id = ? ORDER BY created_at DESC',
        [id]
      );
      
      // For each poll, get the options and responses
      const pollsWithDetails = await Promise.all(polls.map(async (poll) => {
        // Get options
        const [options] = await pool.query(
          'SELECT * FROM poll_options WHERE poll_id = ?',
          [poll.id]
        );
        
        // Get response counts
        const [responseCounts] = await pool.query(
          `SELECT option_id, COUNT(*) as count
           FROM poll_responses
           WHERE poll_id = ?
           GROUP BY option_id`,
          [poll.id]
        );
        
        // Calculate response percentages
        const totalResponses = responseCounts.reduce((sum, item) => sum + item.count, 0);
        const optionsWithCounts = options.map(option => {
          const responseCount = responseCounts.find(r => r.option_id === option.id);
          const count = responseCount ? responseCount.count : 0;
          const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
          
          return {
            ...option,
            count,
            percentage: Math.round(percentage * 10) / 10 // Round to 1 decimal place
          };
        });
        
        // Check if current user has responded
        const [userResponses] = await pool.query(
          'SELECT option_id FROM poll_responses WHERE poll_id = ? AND user_id = ?',
          [poll.id, req.user.id]
        );
        
        const userResponseIds = userResponses.map(r => r.option_id);
        
        return {
          ...poll,
          options: optionsWithCounts,
          totalResponses,
          userResponseIds
        };
      }));
      
      res.json(pollsWithDetails);
    } catch (error) {
      console.error('Error fetching polls:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  /**
   * @route POST /api/virtual-sessions/:id/poll/:pollId/respond
   * @desc Respond to a poll
   * @access Private
   */
  app.post('/api/virtual-sessions/:id/poll/:pollId/respond', authenticateToken, async (req, res) => {
    try {
      const { id, pollId } = req.params;
      const { optionId } = req.body;
      
      // Validate request
      if (!optionId) {
        return res.status(400).json({ message: 'Option ID is required' });
      }
      
      // Verify poll exists and belongs to the session
      const [polls] = await pool.query(
        'SELECT * FROM session_polls WHERE id = ? AND session_id = ?',
        [pollId, id]
      );
      
      if (polls.length === 0) {
        return res.status(404).json({ message: 'Poll not found' });
      }
      
      const poll = polls[0];
      
      // Check if poll is still active
      if (poll.ended_at) {
        return res.status(400).json({ message: 'This poll has ended' });
      }
      
      // Verify option belongs to the poll
      const [options] = await pool.query(
        'SELECT * FROM poll_options WHERE id = ? AND poll_id = ?',
        [optionId, pollId]
      );
      
      if (options.length === 0) {
        return res.status(404).json({ message: 'Option not found' });
      }
      
      // Check if user has already responded to this poll
      const [existingResponses] = await pool.query(
        'SELECT * FROM poll_responses WHERE poll_id = ? AND user_id = ?',
        [pollId, req.user.id]
      );
      
      if (existingResponses.length > 0 && !poll.is_multiple_choice) {
        return res.status(400).json({ message: 'You have already responded to this poll' });
      }
      
      // Record the response
      await pool.query(
        'INSERT INTO poll_responses (poll_id, user_id, option_id) VALUES (?, ?, ?)',
        [pollId, req.user.id, optionId]
      );
      
      res.json({ message: 'Response recorded successfully' });
    } catch (error) {
      console.error('Error responding to poll:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  /**
   * @route POST /api/virtual-sessions/:id/activity
   * @desc Record user activity in a session
   * @access Private
   */
  app.post('/api/virtual-sessions/:id/activity', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { action, actionValue, deviceInfo } = req.body;
      
      // Validate action
      const validActions = ['join', 'leave', 'screenShare', 'chat', 'hand_raise', 'microphone', 'camera'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
      }
      
      // Verify session exists
      const [sessions] = await pool.query(
        'SELECT * FROM virtual_sessions WHERE id = ?',
        [id]
      );
      
      if (sessions.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Get user's IP address
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      
      // If action is 'leave', calculate duration from last join
      let durationSeconds = null;
      if (action === 'leave') {
        const [joinActivity] = await pool.query(
          `SELECT timestamp FROM session_activities 
           WHERE session_id = ? AND user_id = ? AND action = 'join'
           ORDER BY timestamp DESC LIMIT 1`,
          [id, req.user.id]
        );
        
        if (joinActivity.length > 0) {
          const joinTime = new Date(joinActivity[0].timestamp);
          const leaveTime = new Date();
          durationSeconds = Math.floor((leaveTime - joinTime) / 1000);
        }
      }
      
      // Record the activity
      await pool.query(
        `INSERT INTO session_activities 
         (session_id, user_id, action, action_value, duration_seconds, device_info, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, req.user.id, action, actionValue, durationSeconds, deviceInfo, ipAddress]
      );
      
      // If action is 'join', update registration status
      if (action === 'join') {
        await pool.query(
          `INSERT INTO session_registrations (session_id, user_id, status)
           VALUES (?, ?, 'attended')
           ON DUPLICATE KEY UPDATE status = 'attended'`,
          [id, req.user.id]
        );
      }
      
      res.json({ message: 'Activity recorded successfully' });
    } catch (error) {
      console.error('Error recording session activity:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  /**
   * @route GET /api/virtual-sessions/:id/activities
   * @desc Get activities for a session (instructors and admins only)
   * @access Private
   */
  app.get('/api/virtual-sessions/:id/activities', authenticateToken, authorize(['instructor', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify session exists and user has permission
      const [sessions] = await pool.query(
        'SELECT * FROM virtual_sessions WHERE id = ?',
        [id]
      );
      
      if (sessions.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const session = sessions[0];
      
      // If instructor, ensure they own the session
      if (req.user.role === 'instructor' && session.instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to view this session\'s activities' });
      }
      
      // Get activities with user information
      const [activities] = await pool.query(
        `SELECT sa.*, CONCAT(u.first_name, ' ', u.last_name) as userName, u.email
         FROM session_activities sa
         JOIN users u ON sa.user_id = u.id
         WHERE sa.session_id = ?
         ORDER BY sa.timestamp DESC`,
        [id]
      );
      
      // Calculate attendance metrics
      const [attendanceMetrics] = await pool.query(
        `SELECT 
          COUNT(DISTINCT user_id) as uniqueParticipants,
          COUNT(CASE WHEN action = 'join' THEN 1 END) as totalJoins,
          COUNT(CASE WHEN action = 'leave' THEN 1 END) as totalLeaves,
          AVG(CASE WHEN action = 'leave' THEN duration_seconds END) as avgDurationSeconds,
          MAX(CASE WHEN action = 'leave' THEN duration_seconds END) as maxDurationSeconds
         FROM session_activities
         WHERE session_id = ?`,
        [id]
      );
      
      // Get participant presence timeline
      const [presenceTimeline] = await pool.query(
        `SELECT 
          user_id, 
          CONCAT(u.first_name, ' ', u.last_name) as userName,
          action,
          timestamp
         FROM session_activities sa
         JOIN users u ON sa.user_id = u.id
         WHERE session_id = ? AND (action = 'join' OR action = 'leave')
         ORDER BY user_id, timestamp`,
        [id]
      );
      
      res.json({
        activities,
        metrics: attendanceMetrics[0],
        presenceTimeline
      });
    } catch (error) {
      console.error('Error fetching session activities:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  /**
   * @route POST /api/virtual-sessions/:id/breakout
   * @desc Create breakout rooms
   * @access Private (Instructors only)
   */
  app.post('/api/virtual-sessions/:id/breakout', authenticateToken, authorize(['instructor']), async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { roomCount, participantAssignments, autoAssign, roomNames } = req.body;
      
      // Validate request
      if (!roomCount || roomCount < 1) {
        return res.status(400).json({ message: 'Valid room count is required' });
      }
      
      // Verify session exists and is active
      const [sessions] = await connection.query(
        'SELECT * FROM virtual_sessions WHERE id = ?',
        [id]
      );
      
      if (sessions.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const session = sessions[0];
      
      // Check permissions (must be instructor of the session)
      if (session.instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Only the session instructor can create breakout rooms' });
      }
      
      // Ensure the session is active
      if (session.status !== 'active') {
        return res.status(400).json({ message: 'Can only create breakout rooms in active sessions' });
      }
      
      // Get all participants currently in the session
      const [participants] = await connection.query(
        `SELECT DISTINCT user_id
         FROM session_activities
         WHERE session_id = ? AND action = 'join' AND user_id NOT IN (
           SELECT user_id
           FROM session_activities
           WHERE session_id = ? AND action = 'leave' AND timestamp > (
             SELECT MAX(timestamp)
             FROM session_activities
             WHERE session_id = ? AND action = 'join' AND user_id = session_activities.user_id
           )
         )`,
        [id, id, id]
      );
      
      const participantIds = participants.map(p => p.user_id);
      
      // Create breakout rooms
      const createdRooms = [];
      for (let i = 0; i < roomCount; i++) {
        const roomName = roomNames && roomNames[i] ? roomNames[i] : `Breakout Room ${i + 1}`;
        
        const [roomResult] = await connection.query(
          'INSERT INTO breakout_rooms (session_id, name) VALUES (?, ?)',
          [id, roomName]
        );
        
        createdRooms.push({
          id: roomResult.insertId,
          name: roomName
        });
      }
      
      // Assign participants to rooms
      if (participantAssignments) {
        // Manual assignment
        for (const [roomIndex, userIds] of Object.entries(participantAssignments)) {
          if (roomIndex >= createdRooms.length) continue;
          
          const roomId = createdRooms[roomIndex].id;
          
          for (const userId of userIds) {
            if (participantIds.includes(userId)) {
              await connection.query(
                'INSERT INTO breakout_room_participants (breakout_room_id, user_id) VALUES (?, ?)',
                [roomId, userId]
              );
            }
          }
        }
      } else if (autoAssign) {
        // Auto-assignment (round-robin)
        for (let i = 0; i < participantIds.length; i++) {
          const roomIndex = i % roomCount;
          const roomId = createdRooms[roomIndex].id;
          
          await connection.query(
            'INSERT INTO breakout_room_participants (breakout_room_id, user_id) VALUES (?, ?)',
            [roomId, participantIds[i]]
          );
        }
      }
      
      await connection.commit();
      
      // Get the created rooms with participants
      const roomsWithParticipants = await Promise.all(createdRooms.map(async (room) => {
        const [roomParticipants] = await pool.query(
          `SELECT brp.*, CONCAT(u.first_name, ' ', u.last_name) as participantName
           FROM breakout_room_participants brp
           JOIN users u ON brp.user_id = u.id
           WHERE brp.breakout_room_id = ?`,
          [room.id]
        );
        
        return {
          ...room,
          participants: roomParticipants
        };
      }));
      
      res.status(201).json({
        message: 'Breakout rooms created successfully',
        rooms: roomsWithParticipants
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating breakout rooms:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
      connection.release();
    }
  });
  
  /**
   * @route GET /api/virtual-sessions/:id/breakout
   * @desc Get breakout rooms for a session
   * @access Private
   */
  app.get('/api/virtual-sessions/:id/breakout', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify session exists
      const [sessions] = await pool.query(
        'SELECT * FROM virtual_sessions WHERE id = ?',
        [id]
      );
      
      if (sessions.length === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Get all active breakout rooms for the session
      const [rooms] = await pool.query(
        'SELECT * FROM breakout_rooms WHERE session_id = ? AND ended_at IS NULL',
        [id]
      );
      
      // For each room, get the participants
      const roomsWithParticipants = await Promise.all(rooms.map(async (room) => {
        const [participants] = await pool.query(
          `SELECT brp.*, CONCAT(u.first_name, ' ', u.last_name) as participantName
           FROM breakout_room_participants brp
           JOIN users u ON brp.user_id = u.id
           WHERE brp.breakout_room_id = ? AND brp.left_at IS NULL`,
          [room.id]
        );
        
        return {
          ...room,
          participants
        };
      }));
      
      // For student, find their assigned room
      if (req.user.role === 'student') {
        const userRoom = roomsWithParticipants.find(room => 
          room.participants.some(p => p.user_id === req.user.id)
        );
        
        res.json({
          userRoom,
          isInRoom: !!userRoom
        });
      } else {
        // For instructor, return all rooms
        res.json(roomsWithParticipants);
      }
    } catch (error) {
      console.error('Error fetching breakout rooms:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origins: ${corsOptions.origin.join(', ')}`);
});