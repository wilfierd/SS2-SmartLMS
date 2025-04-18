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
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'zzzNszzz19',
  database: process.env.DB_NAME || 'lms_db',
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
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
console.log(`Google Client ID ${GOOGLE_CLIENT_ID ? 'is set' : 'is NOT set'}`);
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
app.post('/api/users/register', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    
    if (!email || !password || !role || !['instructor', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid user data' });
    }
    
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, is_password_changed) VALUES (?, ?, ?, ?, ?, TRUE)',
      [email, hashedPassword, firstName, lastName, role]
    );
    
    res.status(201).json({ message: 'User created successfully', userId: result.insertId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
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

// ======================================================
// COURSE MANAGEMENT ROUTES
// ======================================================

// Get all courses (with optional filters)
app.get('/api/courses', async (req, res) => {
    try {
      const { title, instructor, status, featured } = req.query;
      
      let sql = `
        SELECT c.*, 
          u.first_name AS instructor_first_name, 
          u.last_name AS instructor_last_name,
          (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) AS enrollment_count
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (title) {
        sql += ` AND c.title LIKE ?`;
        params.push(`%${title}%`);
      }
      
      if (instructor) {
        sql += ` AND c.instructor_id = ?`;
        params.push(instructor);
      }
      
      if (status) {
        sql += ` AND c.status = ?`;
        params.push(status);
      }
      
      if (featured) {
        sql += ` AND c.is_featured = ?`;
        params.push(featured === 'true' ? 1 : 0);
      }
      
      sql += ` ORDER BY c.created_at DESC`;
      
      const [courses] = await pool.query(sql, params);
      
      res.json(courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific course by ID with detailed information
  app.get('/api/courses/:id', async (req, res) => {
    try {
      const courseId = req.params.id;
      
      // Get course details
      const [courses] = await pool.query(`
        SELECT c.*, 
          u.first_name AS instructor_first_name, 
          u.last_name AS instructor_last_name,
          u.email AS instructor_email,
          (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) AS enrollment_count
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.id = ?
      `, [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      const course = courses[0];
      
      // Get course modules with lessons
      const [modules] = await pool.query(`
        SELECT * FROM course_modules 
        WHERE course_id = ? 
        ORDER BY order_index
      `, [courseId]);
      
      // For each module, get its lessons
      for (const module of modules) {
        const [lessons] = await pool.query(`
          SELECT * FROM lessons 
          WHERE module_id = ? 
          ORDER BY order_index
        `, [module.id]);
        
        module.lessons = lessons;
      }
      
      course.modules = modules;
      
      res.json(course);
    } catch (error) {
      console.error('Error fetching course details:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create a new course (instructor, admin)
  app.post('/api/courses', authenticateToken, authorize(['instructor', 'admin']), async (req, res) => {
    try {
      const { title, description, thumbnail_url, status, start_date, end_date, enrollment_limit, is_featured } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: 'Course title is required' });
      }
      
      // Create course
      const [result] = await pool.query(`
        INSERT INTO courses (
          title, description, instructor_id, thumbnail_url, status, 
          start_date, end_date, enrollment_limit, is_featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title, 
        description || null, 
        req.user.id, 
        thumbnail_url || null, 
        status || 'draft',
        start_date || null, 
        end_date || null, 
        enrollment_limit || null, 
        is_featured || false
      ]);
      
      // Log audit
      await pool.query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        req.user.id,
        'create',
        'course',
        result.insertId,
        JSON.stringify(req.body),
        req.ip
      ]);
      
      res.status(201).json({ 
        message: 'Course created successfully', 
        courseId: result.insertId 
      });
    } catch (error) {
      console.error('Error creating course:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update a course (instructor who owns the course, admin)
  app.put('/api/courses/:id', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.id;
      const { title, description, thumbnail_url, status, start_date, end_date, enrollment_limit, is_featured } = req.body;
      
      // Check if user is allowed to update this course
      const [courses] = await pool.query(
        'SELECT * FROM courses WHERE id = ?', 
        [courseId]
      );
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      const course = courses[0];
      
      // Only allow the instructor who owns the course or an admin to update it
      if (req.user.role !== 'admin' && course.instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this course' });
      }
      
      // Update course
      await pool.query(`
        UPDATE courses SET
          title = ?,
          description = ?,
          thumbnail_url = ?,
          status = ?,
          start_date = ?,
          end_date = ?,
          enrollment_limit = ?,
          is_featured = ?
        WHERE id = ?
      `, [
        title || course.title,
        description !== undefined ? description : course.description,
        thumbnail_url !== undefined ? thumbnail_url : course.thumbnail_url,
        status || course.status,
        start_date || course.start_date,
        end_date || course.end_date,
        enrollment_limit !== undefined ? enrollment_limit : course.enrollment_limit,
        is_featured !== undefined ? is_featured : course.is_featured,
        courseId
      ]);
      
      // Log audit
      await pool.query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        req.user.id,
        'update',
        'course',
        courseId,
        JSON.stringify(req.body),
        req.ip
      ]);
      
      res.json({ message: 'Course updated successfully' });
    } catch (error) {
      console.error('Error updating course:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete a course (admin only)
  app.delete('/api/courses/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
      const courseId = req.params.id;
      
      // Check if course exists
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Delete course (cascade will handle related records)
      await pool.query('DELETE FROM courses WHERE id = ?', [courseId]);
      
      // Log audit
      await pool.query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        req.user.id,
        'delete',
        'course',
        courseId,
        JSON.stringify({ id: courseId }),
        req.ip
      ]);
      
      res.json({ message: 'Course deleted successfully' });
    } catch (error) {
      console.error('Error deleting course:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ======================================================
  // COURSE MODULES AND LESSONS ROUTES
  // ======================================================
  
  // Create a module in a course
  app.post('/api/courses/:courseId/modules', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const { title, description, order_index, is_published } = req.body;
      
      // Validate required fields
      if (!title || order_index === undefined) {
        return res.status(400).json({ message: 'Title and order index are required' });
      }
      
      // Check course ownership
      const [courses] = await pool.query(
        'SELECT * FROM courses WHERE id = ?', 
        [courseId]
      );
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Only allow the instructor who owns the course or an admin to add modules
      if (req.user.role !== 'admin' && courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to add modules to this course' });
      }
      
      // Create module
      const [result] = await pool.query(`
        INSERT INTO course_modules (course_id, title, description, order_index, is_published)
        VALUES (?, ?, ?, ?, ?)
      `, [
        courseId,
        title,
        description || null,
        order_index,
        is_published || false
      ]);
      
      res.status(201).json({ 
        message: 'Module created successfully', 
        moduleId: result.insertId 
      });
    } catch (error) {
      console.error('Error creating module:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update a module
  app.put('/api/modules/:id', authenticateToken, async (req, res) => {
    try {
      const moduleId = req.params.id;
      const { title, description, order_index, is_published } = req.body;
      
      // Get module with course info to check permissions
      const [modules] = await pool.query(`
        SELECT m.*, c.instructor_id 
        FROM course_modules m
        JOIN courses c ON m.course_id = c.id
        WHERE m.id = ?
      `, [moduleId]);
      
      if (modules.length === 0) {
        return res.status(404).json({ message: 'Module not found' });
      }
      
      const module = modules[0];
      
      // Only allow the instructor who owns the course or an admin to update modules
      if (req.user.role !== 'admin' && module.instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this module' });
      }
      
      // Update module
      await pool.query(`
        UPDATE course_modules SET
          title = ?,
          description = ?,
          order_index = ?,
          is_published = ?
        WHERE id = ?
      `, [
        title || module.title,
        description !== undefined ? description : module.description,
        order_index !== undefined ? order_index : module.order_index,
        is_published !== undefined ? is_published : module.is_published,
        moduleId
      ]);
      
      res.json({ message: 'Module updated successfully' });
    } catch (error) {
      console.error('Error updating module:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete a module
  app.delete('/api/modules/:id', authenticateToken, async (req, res) => {
    try {
      const moduleId = req.params.id;
      
      // Get module with course info to check permissions
      const [modules] = await pool.query(`
        SELECT m.*, c.instructor_id 
        FROM course_modules m
        JOIN courses c ON m.course_id = c.id
        WHERE m.id = ?
      `, [moduleId]);
      
      if (modules.length === 0) {
        return res.status(404).json({ message: 'Module not found' });
      }
      
      // Only allow the instructor who owns the course or an admin to delete modules
      if (req.user.role !== 'admin' && modules[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this module' });
      }
      
      // Delete module (cascade will handle lessons)
      await pool.query('DELETE FROM course_modules WHERE id = ?', [moduleId]);
      
      res.json({ message: 'Module deleted successfully' });
    } catch (error) {
      console.error('Error deleting module:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create a lesson in a module
  app.post('/api/modules/:moduleId/lessons', authenticateToken, async (req, res) => {
    try {
      const moduleId = req.params.moduleId;
      const { 
        title, description, content_type, content, 
        duration_minutes, order_index, is_published 
      } = req.body;
      
      // Validate required fields
      if (!title || !content_type || order_index === undefined) {
        return res.status(400).json({ 
          message: 'Title, content type, and order index are required' 
        });
      }
      
      // Check module exists and get course info to check permissions
      const [modules] = await pool.query(`
        SELECT m.*, c.instructor_id 
        FROM course_modules m
        JOIN courses c ON m.course_id = c.id
        WHERE m.id = ?
      `, [moduleId]);
      
      if (modules.length === 0) {
        return res.status(404).json({ message: 'Module not found' });
      }
      
      // Only allow the instructor who owns the course or an admin to add lessons
      if (req.user.role !== 'admin' && modules[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to add lessons to this module' });
      }
      
      // Create lesson
      const [result] = await pool.query(`
        INSERT INTO lessons (
          module_id, title, description, content_type, 
          content, duration_minutes, order_index, is_published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        moduleId,
        title,
        description || null,
        content_type,
        content || null,
        duration_minutes || null,
        order_index,
        is_published || false
      ]);
      
      res.status(201).json({ 
        message: 'Lesson created successfully', 
        lessonId: result.insertId 
      });
    } catch (error) {
      console.error('Error creating lesson:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update a lesson
  app.put('/api/lessons/:id', authenticateToken, async (req, res) => {
    try {
      const lessonId = req.params.id;
      const { 
        title, description, content_type, content, 
        duration_minutes, order_index, is_published 
      } = req.body;
      
      // Get lesson with module and course info to check permissions
      const [lessons] = await pool.query(`
        SELECT l.*, c.instructor_id 
        FROM lessons l
        JOIN course_modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE l.id = ?
      `, [lessonId]);
      
      if (lessons.length === 0) {
        return res.status(404).json({ message: 'Lesson not found' });
      }
      
      const lesson = lessons[0];
      
      // Only allow the instructor who owns the course or an admin to update lessons
      if (req.user.role !== 'admin' && lesson.instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this lesson' });
      }
      
      // Update lesson
      await pool.query(`
        UPDATE lessons SET
          title = ?,
          description = ?,
          content_type = ?,
          content = ?,
          duration_minutes = ?,
          order_index = ?,
          is_published = ?
        WHERE id = ?
      `, [
        title || lesson.title,
        description !== undefined ? description : lesson.description,
        content_type || lesson.content_type,
        content !== undefined ? content : lesson.content,
        duration_minutes !== undefined ? duration_minutes : lesson.duration_minutes,
        order_index !== undefined ? order_index : lesson.order_index,
        is_published !== undefined ? is_published : lesson.is_published,
        lessonId
      ]);
      
      res.json({ message: 'Lesson updated successfully' });
    } catch (error) {
      console.error('Error updating lesson:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete a lesson
  app.delete('/api/lessons/:id', authenticateToken, async (req, res) => {
    try {
      const lessonId = req.params.id;
      
      // Get lesson with module and course info to check permissions
      const [lessons] = await pool.query(`
        SELECT l.*, c.instructor_id 
        FROM lessons l
        JOIN course_modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE l.id = ?
      `, [lessonId]);
      
      if (lessons.length === 0) {
        return res.status(404).json({ message: 'Lesson not found' });
      }
      
      // Only allow the instructor who owns the course or an admin to delete lessons
      if (req.user.role !== 'admin' && lessons[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this lesson' });
      }
      
      // Delete lesson (cascade will handle materials)
      await pool.query('DELETE FROM lessons WHERE id = ?', [lessonId]);
      
      res.json({ message: 'Lesson deleted successfully' });
    } catch (error) {
      console.error('Error deleting lesson:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ======================================================
  // ENROLLMENT ROUTES
  // ======================================================
  
  // Enroll a student in a course (admin, instructor)
  app.post('/api/courses/:courseId/enrollments', authenticateToken, authorize(['admin', 'instructor']), async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const { studentId } = req.body;
      
      if (!studentId) {
        return res.status(400).json({ message: 'Student ID is required' });
      }
      
      // Check if course exists
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // If user is instructor (not admin), check if they own the course
      if (req.user.role === 'instructor' && courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to enroll students in this course' });
      }
      
      // Check if student exists
      const [students] = await pool.query(
        'SELECT * FROM users WHERE id = ? AND role = "student"',
        [studentId]
      );
      
      if (students.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      
      // Check if student is already enrolled
      const [enrollments] = await pool.query(
        'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
        [courseId, studentId]
      );
      
      if (enrollments.length > 0) {
        return res.status(409).json({ message: 'Student is already enrolled in this course' });
      }
      
      // Enroll student
      await pool.query(
        'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
        [studentId, courseId]
      );
      
      res.status(201).json({ message: 'Student enrolled successfully' });
    } catch (error) {
      console.error('Error enrolling student:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Student self-enrollment in a course
  app.post('/api/courses/:courseId/self-enroll', authenticateToken, authorize(['student']), async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const studentId = req.user.id;
      
      // Check if course exists and is published
      const [courses] = await pool.query(
        'SELECT * FROM courses WHERE id = ? AND status = "published"', 
        [courseId]
      );
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found or not available for enrollment' });
      }
      
      // Check if enrollment limit is reached
      if (courses[0].enrollment_limit) {
        const [countResult] = await pool.query(
          'SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?',
          [courseId]
        );
        
        if (countResult[0].count >= courses[0].enrollment_limit) {
          return res.status(400).json({ message: 'Course enrollment limit has been reached' });
        }
      }
      
      // Check if student is already enrolled
      const [enrollments] = await pool.query(
        'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
        [courseId, studentId]
      );
      
      if (enrollments.length > 0) {
        return res.status(409).json({ message: 'You are already enrolled in this course' });
      }
      
      // Enroll student
      await pool.query(
        'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
        [studentId, courseId]
      );
      
      res.status(201).json({ message: 'You have successfully enrolled in the course' });
    } catch (error) {
      console.error('Error self-enrolling:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Remove a student enrollment (admin, instructor, or student unenrolling themselves)
  app.delete('/api/courses/:courseId/enrollments/:studentId', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const studentId = req.params.studentId;
      
      // Check if enrollment exists
      const [enrollments] = await pool.query(
        'SELECT e.*, c.instructor_id FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.course_id = ? AND e.student_id = ?',
        [courseId, studentId]
      );
      
      if (enrollments.length === 0) {
        return res.status(404).json({ message: 'Enrollment not found' });
      }
      
      // Check authorization:
      // - Admin can unenroll anyone
      // - Instructor can unenroll from their own courses
      // - Student can only unenroll themselves
      if (
        req.user.role === 'admin' || 
        (req.user.role === 'instructor' && enrollments[0].instructor_id === req.user.id) ||
        (req.user.role === 'student' && parseInt(studentId) === req.user.id)
      ) {
        // Remove enrollment
        await pool.query(
          'DELETE FROM enrollments WHERE course_id = ? AND student_id = ?',
          [courseId, studentId]
        );
        
        res.json({ message: 'Enrollment removed successfully' });
      } else {
        return res.status(403).json({ message: 'Not authorized to remove this enrollment' });
      }
    } catch (error) {
      console.error('Error removing enrollment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get enrollments for a course (admin, course instructor)
  app.get('/api/courses/:courseId/enrollments', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      
      // Check if course exists and verify permissions
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Only allow the instructor who owns the course or an admin to view all enrollments
      if (req.user.role !== 'admin' && courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view enrollments for this course' });
      }
      
      // Get enrollments with student info
      const [enrollments] = await pool.query(`
        SELECT e.*, 
          u.first_name, u.last_name, u.email,
          u.profile_image
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        WHERE e.course_id = ?
        ORDER BY e.enrollment_date DESC
      `, [courseId]);
      
      res.json(enrollments);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get courses a student is enrolled in
  app.get('/api/students/:id/enrollments', authenticateToken, async (req, res) => {
    try {
      const studentId = req.params.id;
      
      // Students can only view their own enrollments
      // Instructors can view enrollments for students in their courses
      // Admins can view any student's enrollments
      if (req.user.role === 'student' && parseInt(studentId) !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view other students\' enrollments' });
      }
      
      // For instructors, check if they teach any courses the student is enrolled in
      if (req.user.role === 'instructor') {
        const [instructorCourses] = await pool.query(`
          SELECT e.* FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          WHERE e.student_id = ? AND c.instructor_id = ?
        `, [studentId, req.user.id]);
        
        if (instructorCourses.length === 0) {
          return res.status(403).json({ message: 'Not authorized to view this student\'s enrollments' });
        }
      }
      
      // Get enrollments with course info
      const [enrollments] = await pool.query(`
        SELECT e.*, 
          c.title, c.description, c.thumbnail_url, c.status,
          u.first_name AS instructor_first_name, u.last_name AS instructor_last_name
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        WHERE e.student_id = ?
        ORDER BY e.enrollment_date DESC
      `, [studentId]);
      
      res.json(enrollments);
    } catch (error) {
      console.error('Error fetching student enrollments:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ======================================================
  // ASSIGNMENT ROUTES
  // ======================================================
  
  // Create an assignment
  app.post('/api/courses/:courseId/assignments', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const { 
        lessonId, title, description, instructions,
        max_points, due_date, allow_late_submissions 
      } = req.body;
      
      // Validate required fields
      if (!title || !max_points) {
        return res.status(400).json({ message: 'Title and max points are required' });
      }
      
      // Check course ownership
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Only allow the instructor who owns the course or an admin to create assignments
      if (req.user.role !== 'admin' && courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to create assignments for this course' });
      }
      
      // If lessonId is provided, check if it exists and belongs to this course
      if (lessonId) {
        const [lessons] = await pool.query(`
          SELECT l.* FROM lessons l
          JOIN course_modules m ON l.module_id = m.id
          WHERE l.id = ? AND m.course_id = ?
        `, [lessonId, courseId]);
        
        if (lessons.length === 0) {
          return res.status(404).json({ message: 'Lesson not found or not part of this course' });
        }
      }
      
      // Create assignment
      const [result] = await pool.query(`
        INSERT INTO assignments (
          course_id, lesson_id, title, description, instructions,
          max_points, due_date, allow_late_submissions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        courseId,
        lessonId || null,
        title,
        description || null,
        instructions || null,
        max_points,
        due_date || null,
        allow_late_submissions || false
      ]);
      
      res.status(201).json({ 
        message: 'Assignment created successfully', 
        assignmentId: result.insertId 
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get all assignments for a course
  app.get('/api/courses/:courseId/assignments', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      
      // Check if course exists
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Check if user has access to this course
      if (req.user.role === 'student') {
        // Students must be enrolled
        const [enrollments] = await pool.query(
          'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
          [courseId, req.user.id]
        );
        
        if (enrollments.length === 0) {
          return res.status(403).json({ message: 'You are not enrolled in this course' });
        }
      } else if (req.user.role === 'instructor' && courses[0].instructor_id !== req.user.id) {
        // Instructors must own the course
        return res.status(403).json({ message: 'Not authorized to view assignments for this course' });
      }
      
      // Get assignments
      const [assignments] = await pool.query(`
        SELECT a.*, 
          l.title AS lesson_title,
          m.title AS module_title
        FROM assignments a
        LEFT JOIN lessons l ON a.lesson_id = l.id
        LEFT JOIN course_modules m ON l.module_id = m.id
        WHERE a.course_id = ?
        ORDER BY a.due_date ASC
      `, [courseId]);
      
      // If user is a student, include their submission status for each assignment
      if (req.user.role === 'student') {
        for (const assignment of assignments) {
          const [submissions] = await pool.query(`
            SELECT * FROM submissions 
            WHERE assignment_id = ? AND student_id = ?
          `, [assignment.id, req.user.id]);
          
          assignment.submission = submissions.length > 0 ? submissions[0] : null;
        }
      }
      
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Submit an assignment (student)
  app.post('/api/assignments/:id/submissions', authenticateToken, authorize(['student']), async (req, res) => {
    try {
      const assignmentId = req.params.id;
      const studentId = req.user.id;
      const { submission_text, file_path } = req.body;
      
      if (!submission_text && !file_path) {
        return res.status(400).json({ message: 'Submission text or file path is required' });
      }
      
      // Check if assignment exists and is part of a course the student is enrolled in
      const [assignments] = await pool.query(`
        SELECT a.*, c.id AS course_id, a.due_date, a.allow_late_submissions
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id AND e.student_id = ?
        WHERE a.id = ?
      `, [studentId, assignmentId]);
      
      if (assignments.length === 0) {
        return res.status(404).json({ 
          message: 'Assignment not found or you are not enrolled in the course' 
        });
      }
      
      const assignment = assignments[0];
      
      // Check if past due date and late submissions not allowed
      const now = new Date();
      if (
        assignment.due_date && 
        new Date(assignment.due_date) < now && 
        !assignment.allow_late_submissions
      ) {
        return res.status(400).json({ message: 'Assignment is past due and late submissions are not allowed' });
      }
      
      // Check if already submitted
      const [existingSubmissions] = await pool.query(
        'SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?',
        [assignmentId, studentId]
      );
      
      if (existingSubmissions.length > 0) {
        // Update existing submission
        await pool.query(`
          UPDATE submissions SET
            submission_text = ?,
            file_path = ?,
            submission_date = CURRENT_TIMESTAMP,
            is_graded = FALSE,
            grade = NULL,
            feedback = NULL,
            graded_by = NULL,
            graded_at = NULL
          WHERE assignment_id = ? AND student_id = ?
        `, [
          submission_text || null,
          file_path || null,
          assignmentId,
          studentId
        ]);
        
        res.json({ message: 'Submission updated successfully' });
      } else {
        // Create new submission
        await pool.query(`
          INSERT INTO submissions (
            assignment_id, student_id, submission_text, file_path
          ) VALUES (?, ?, ?, ?)
        `, [
          assignmentId,
          studentId,
          submission_text || null,
          file_path || null
        ]);
        
        res.status(201).json({ message: 'Assignment submitted successfully' });
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Grade a submission (instructor, admin)
  app.put('/api/submissions/:id/grade', authenticateToken, authorize(['instructor', 'admin']), async (req, res) => {
    try {
      const submissionId = req.params.id;
      const { grade, feedback } = req.body;
      
      if (grade === undefined) {
        return res.status(400).json({ message: 'Grade is required' });
      }
      
      // Get submission with assignment and course info
      const [submissions] = await pool.query(`
        SELECT s.*, a.max_points, a.course_id, c.instructor_id
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE s.id = ?
      `, [submissionId]);
      
      if (submissions.length === 0) {
        return res.status(404).json({ message: 'Submission not found' });
      }
      
      const submission = submissions[0];
      
      // Instructors can only grade submissions for their courses
      if (req.user.role === 'instructor' && submission.instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to grade this submission' });
      }
      
      // Validate grade
      if (grade < 0 || grade > submission.max_points) {
        return res.status(400).json({ 
          message: `Grade must be between 0 and ${submission.max_points}` 
        });
      }
      
      // Update submission with grade
      await pool.query(`
        UPDATE submissions SET
          grade = ?,
          feedback = ?,
          is_graded = TRUE,
          graded_by = ?,
          graded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        grade,
        feedback || null,
        req.user.id,
        submissionId
      ]);
      
      // Insert or update grade record
      await pool.query(`
        INSERT INTO grades (
          student_id, course_id, assessment_type, assessment_id, grade, max_grade, comments, graded_by
        ) VALUES (?, ?, 'assignment', ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          grade = VALUES(grade),
          comments = VALUES(comments),
          graded_by = VALUES(graded_by),
          updated_at = CURRENT_TIMESTAMP
      `, [
        submission.student_id,
        submission.course_id,
        submission.assignment_id,
        grade,
        submission.max_points,
        feedback || null,
        req.user.id
      ]);
      
      res.json({ message: 'Submission graded successfully' });
    } catch (error) {
      console.error('Error grading submission:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ======================================================
  // QUIZ ROUTES
  // ======================================================
  
  // Create a quiz
  app.post('/api/courses/:courseId/quizzes', authenticateToken, authorize(['instructor', 'admin']), async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const { 
        lessonId, title, description, time_limit_minutes,
        passing_score, max_attempts, is_randomized, start_date, end_date 
      } = req.body;
      
      // Validate required fields
      if (!title) {
        return res.status(400).json({ message: 'Quiz title is required' });
      }
      
      // Check course ownership
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Only allow the instructor who owns the course or an admin to create quizzes
      if (req.user.role === 'instructor' && courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to create quizzes for this course' });
      }
      
      // If lessonId is provided, check if it exists and belongs to this course
      if (lessonId) {
        const [lessons] = await pool.query(`
          SELECT l.* FROM lessons l
          JOIN course_modules m ON l.module_id = m.id
          WHERE l.id = ? AND m.course_id = ?
        `, [lessonId, courseId]);
        
        if (lessons.length === 0) {
          return res.status(404).json({ message: 'Lesson not found or not part of this course' });
        }
      }
      
      // Create quiz
      const [result] = await pool.query(`
        INSERT INTO quizzes (
          course_id, lesson_id, title, description, time_limit_minutes,
          passing_score, max_attempts, is_randomized, start_date, end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        courseId,
        lessonId || null,
        title,
        description || null,
        time_limit_minutes || null,
        passing_score || null,
        max_attempts || 1,
        is_randomized || false,
        start_date || null,
        end_date || null
      ]);
      
      res.status(201).json({ 
        message: 'Quiz created successfully', 
        quizId: result.insertId 
      });
    } catch (error) {
      console.error('Error creating quiz:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Add a question to a quiz
  app.post('/api/quizzes/:quizId/questions', authenticateToken, authorize(['instructor', 'admin']), async (req, res) => {
    try {
      const quizId = req.params.quizId;
      const { 
        question_text, question_type, points, order_index, options 
      } = req.body;
      
      // Validate required fields
      if (!question_text || !question_type || !order_index) {
        return res.status(400).json({ 
          message: 'Question text, type, and order index are required' 
        });
      }
      
      // Validate multiple choice questions have options
      if (
        (question_type === 'multiple_choice' || question_type === 'true_false') && 
        (!options || !Array.isArray(options) || options.length === 0)
      ) {
        return res.status(400).json({ 
          message: 'Multiple choice and true/false questions must have options' 
        });
      }
      
      // Check quiz exists and get course info for authorization
      const [quizzes] = await pool.query(`
        SELECT q.*, c.instructor_id 
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        WHERE q.id = ?
      `, [quizId]);
      
      if (quizzes.length === 0) {
        return res.status(404).json({ message: 'Quiz not found' });
      }
      
      // Only allow the instructor who owns the course or an admin to add questions
      if (req.user.role === 'instructor' && quizzes[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to add questions to this quiz' });
      }
      
      // Start a transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Create question
        const [questionResult] = await connection.query(`
          INSERT INTO quiz_questions (
            quiz_id, question_text, question_type, points, order_index
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          quizId,
          question_text,
          question_type,
          points || 1,
          order_index
        ]);
        
        const questionId = questionResult.insertId;
        
        // Add options if provided
        if (options && Array.isArray(options) && options.length > 0) {
          for (const option of options) {
            if (!option.option_text || option.order_index === undefined) {
              throw new Error('Option text and order index are required for each option');
            }
            
            await connection.query(`
              INSERT INTO quiz_options (
                question_id, option_text, is_correct, order_index
              ) VALUES (?, ?, ?, ?)
            `, [
              questionId,
              option.option_text,
              option.is_correct || false,
              option.order_index
            ]);
          }
        }
        
        await connection.commit();
        
        res.status(201).json({ 
          message: 'Question added successfully', 
          questionId 
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error adding question:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  // Start a quiz attempt (student)
  app.post('/api/quizzes/:quizId/attempts', authenticateToken, authorize(['student']), async (req, res) => {
    try {
      const quizId = req.params.quizId;
      const studentId = req.user.id;
      
      // Check if quiz exists and is available
      const [quizzes] = await pool.query(`
        SELECT q.*, c.id AS course_id 
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        WHERE q.id = ?
      `, [quizId]);
      
      if (quizzes.length === 0) {
        return res.status(404).json({ message: 'Quiz not found' });
      }
      
      const quiz = quizzes[0];
      
      // Check if student is enrolled in the course
      const [enrollments] = await pool.query(
        'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
        [quiz.course_id, studentId]
      );
      
      if (enrollments.length === 0) {
        return res.status(403).json({ message: 'You are not enrolled in this course' });
      }
      
      // Check if quiz is available based on dates
      const now = new Date();
      if (quiz.start_date && new Date(quiz.start_date) > now) {
        return res.status(400).json({ message: 'Quiz is not yet available' });
      }
      
      if (quiz.end_date && new Date(quiz.end_date) < now) {
        return res.status(400).json({ message: 'Quiz is no longer available' });
      }
      
      // Check attempt limit
      const [attempts] = await pool.query(
        'SELECT * FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?',
        [quizId, studentId]
      );
      
      if (attempts.length >= quiz.max_attempts) {
        return res.status(400).json({ message: 'Maximum number of attempts reached' });
      }
      
      // Check if there's an incomplete attempt
      const incompleteAttempt = attempts.find(attempt => !attempt.is_completed);
      if (incompleteAttempt) {
        return res.status(400).json({ 
          message: 'You have an incomplete attempt. Please complete or cancel it first.',
          attemptId: incompleteAttempt.id
        });
      }
      
      // Create a new attempt
      const attemptNumber = attempts.length + 1;
      const [result] = await pool.query(`
        INSERT INTO quiz_attempts (
          quiz_id, student_id, start_time, attempt_number, is_completed
        ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, FALSE)
      `, [
        quizId,
        studentId,
        attemptNumber
      ]);
      
      // Get quiz questions
      const [questions] = await pool.query(`
        SELECT q.*, GROUP_CONCAT(o.id) as option_ids 
        FROM quiz_questions q
        LEFT JOIN quiz_options o ON q.id = o.question_id
        WHERE q.quiz_id = ?
        GROUP BY q.id
        ORDER BY ${quiz.is_randomized ? 'RAND()' : 'q.order_index'}
      `, [quizId]);
      
      // For each question, get its options
      for (const question of questions) {
        if (question.option_ids) {
          const [options] = await pool.query(`
            SELECT id, option_text, order_index 
            FROM quiz_options 
            WHERE question_id = ?
            ORDER BY ${quiz.is_randomized ? 'RAND()' : 'order_index'}
          `, [question.id]);
          
          // Remove correct answer flags for student view
          question.options = options;
        } else {
          question.options = [];
        }
        
        // Remove points info for student view
        delete question.points;
      }
      
      res.status(201).json({
        message: 'Quiz attempt started',
        attemptId: result.insertId,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          time_limit_minutes: quiz.time_limit_minutes,
          questions
        }
      });
    } catch (error) {
      console.error('Error starting quiz attempt:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Submit answers for a quiz attempt
  app.post('/api/quiz-attempts/:attemptId/submit', authenticateToken, authorize(['student']), async (req, res) => {
    try {
      const attemptId = req.params.attemptId;
      const studentId = req.user.id;
      const { responses } = req.body;
      
      if (!responses || !Array.isArray(responses)) {
        return res.status(400).json({ message: 'Responses are required' });
      }
      
      // Check if attempt exists and belongs to the student
      const [attempts] = await pool.query(`
        SELECT a.*, q.passing_score, q.id as quiz_id
        FROM quiz_attempts a
        JOIN quizzes q ON a.quiz_id = q.id
        WHERE a.id = ? AND a.student_id = ?
      `, [attemptId, studentId]);
      
      if (attempts.length === 0) {
        return res.status(404).json({ message: 'Quiz attempt not found or not yours' });
      }
      
      const attempt = attempts[0];
      
      if (attempt.is_completed) {
        return res.status(400).json({ message: 'This attempt has already been submitted' });
      }
      
      // Start a transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        let totalPoints = 0;
        let earnedPoints = 0;
        
        // Process each response
        for (const response of responses) {
          const { question_id, selected_option_id, text_response } = response;
          
          // Get question details
          const [questions] = await connection.query(
            'SELECT * FROM quiz_questions WHERE id = ?',
            [question_id]
          );
          
          if (questions.length === 0) {
            throw new Error(`Question ${question_id} not found`);
          }
          
          const question = questions[0];
          totalPoints += question.points;
          
          let isCorrect = false;
          let pointsEarned = 0;
          
          // For multiple choice and true/false, check if selected option is correct
          if (
            (question.question_type === 'multiple_choice' || question.question_type === 'true_false') && 
            selected_option_id
          ) {
            const [options] = await connection.query(
              'SELECT * FROM quiz_options WHERE id = ? AND question_id = ?',
              [selected_option_id, question_id]
            );
            
            if (options.length > 0 && options[0].is_correct) {
              isCorrect = true;
              pointsEarned = question.points;
              earnedPoints += pointsEarned;
            }
          }
          // For short answer/essay, store response for manual grading
          else if (
            (question.question_type === 'short_answer' || question.question_type === 'essay') && 
            text_response
          ) {
            // These will be graded later, so don't mark as correct/incorrect yet
            isCorrect = null;
            pointsEarned = null;
          }
          
          // Store the response
          await connection.query(`
            INSERT INTO quiz_responses (
              attempt_id, question_id, selected_option_id, text_response, is_correct, points_earned
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            attemptId,
            question_id,
            selected_option_id || null,
            text_response || null,
            isCorrect,
            pointsEarned
          ]);
        }
        
        // Calculate score as percentage
        const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
        
        // Update attempt as completed
        await connection.query(`
          UPDATE quiz_attempts SET
            end_time = CURRENT_TIMESTAMP,
            score = ?,
            is_completed = TRUE
          WHERE id = ?
        `, [
          score,
          attemptId
        ]);
        
        // Insert grade record
        await connection.query(`
          INSERT INTO grades (
            student_id, course_id, assessment_type, assessment_id, 
            grade, max_grade, graded_by
          ) 
          SELECT ?, c.id, 'quiz', ?, ?, 100, ?
          FROM quizzes q
          JOIN courses c ON q.course_id = c.id
          WHERE q.id = ?
        `, [
          studentId,
          attempt.quiz_id,
          score,
          studentId, // Self-graded for auto-graded portions
          attempt.quiz_id
        ]);
        
        await connection.commit();
        
        res.json({ 
          message: 'Quiz submitted successfully', 
          score,
          passed: attempt.passing_score ? score >= attempt.passing_score : null
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  // ======================================================
  // DISCUSSION ROUTES
  // ======================================================
  
  // Create a discussion
  app.post('/api/courses/:courseId/discussions', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const { title, description } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: 'Discussion title is required' });
      }
      
      // Check if course exists and user has access
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Instructors can create discussions for their courses
      // Students can only create discussions if enrolled
      // Admins can create discussions for any course
      if (req.user.role === 'instructor' && courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to create discussions for this course' });
      } else if (req.user.role === 'student') {
        // Check if student is enrolled
        const [enrollments] = await pool.query(
          'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
          [courseId, req.user.id]
        );
        
        if (enrollments.length === 0) {
          return res.status(403).json({ message: 'You must be enrolled in this course to create discussions' });
        }
      }
      
      // Create discussion
      const [result] = await pool.query(`
        INSERT INTO discussions (course_id, title, description, created_by)
        VALUES (?, ?, ?, ?)
      `, [
        courseId,
        title,
        description || null,
        req.user.id
      ]);
      
      res.status(201).json({ 
        message: 'Discussion created successfully', 
        discussionId: result.insertId 
      });
    } catch (error) {
      console.error('Error creating discussion:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get discussions for a course
  app.get('/api/courses/:courseId/discussions', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      
      // Check if course exists and user has access
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Check access for students (must be enrolled)
      if (req.user.role === 'student') {
        const [enrollments] = await pool.query(
          'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
          [courseId, req.user.id]
        );
        
        if (enrollments.length === 0) {
          return res.status(403).json({ message: 'You are not enrolled in this course' });
        }
      } else if (req.user.role === 'instructor' && courses[0].instructor_id !== req.user.id) {
        // Instructors can only view discussions for their courses
        return res.status(403).json({ message: 'Not authorized to view discussions for this course' });
      }
      
      // Get discussions with creator info and post count
      const [discussions] = await pool.query(`
        SELECT d.*,
          u.first_name, u.last_name,
          (SELECT COUNT(*) FROM discussion_posts WHERE discussion_id = d.id) AS post_count
        FROM discussions d
        JOIN users u ON d.created_by = u.id
        WHERE d.course_id = ?
        ORDER BY d.updated_at DESC
      `, [courseId]);
      
      res.json(discussions);
    } catch (error) {
      console.error('Error fetching discussions:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Add a post to a discussion
  app.post('/api/discussions/:discussionId/posts', authenticateToken, async (req, res) => {
    try {
      const discussionId = req.params.discussionId;
      const { content, parent_post_id } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: 'Post content is required' });
      }
      
      // Check if discussion exists and user has access
      const [discussions] = await pool.query(`
        SELECT d.*, c.id AS course_id, c.instructor_id
        FROM discussions d
        JOIN courses c ON d.course_id = c.id
        WHERE d.id = ?
      `, [discussionId]);
      
      if (discussions.length === 0) {
        return res.status(404).json({ message: 'Discussion not found' });
      }
      
      const discussion = discussions[0];
      
      // Check if discussion is locked
      if (discussion.is_locked) {
        return res.status(403).json({ message: 'This discussion is locked and cannot be replied to' });
      }
      
      // Check access for students (must be enrolled)
      if (req.user.role === 'student') {
        const [enrollments] = await pool.query(
          'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
          [discussion.course_id, req.user.id]
        );
        
        if (enrollments.length === 0) {
          return res.status(403).json({ message: 'You are not enrolled in this course' });
        }
      } else if (req.user.role === 'instructor' && discussion.instructor_id !== req.user.id) {
        // Instructors can only post in discussions for their courses
        return res.status(403).json({ message: 'Not authorized to post in this discussion' });
      }
      
      // If parent post ID is provided, check if it exists in this discussion
      if (parent_post_id) {
        const [parentPosts] = await pool.query(
          'SELECT * FROM discussion_posts WHERE id = ? AND discussion_id = ?',
          [parent_post_id, discussionId]
        );
        
        if (parentPosts.length === 0) {
          return res.status(404).json({ message: 'Parent post not found in this discussion' });
        }
      }
      
      // Create post
      const [result] = await pool.query(`
        INSERT INTO discussion_posts (discussion_id, user_id, parent_post_id, content)
        VALUES (?, ?, ?, ?)
      `, [
        discussionId,
        req.user.id,
        parent_post_id || null,
        content
      ]);
      
      // Update discussion updated_at timestamp
      await pool.query(
        'UPDATE discussions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [discussionId]
      );
      
      res.status(201).json({ 
        message: 'Post added successfully', 
        postId: result.insertId 
      });
    } catch (error) {
      console.error('Error adding post:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get posts for a discussion
  app.get('/api/discussions/:discussionId/posts', authenticateToken, async (req, res) => {
    try {
      const discussionId = req.params.discussionId;
      
      // Check if discussion exists and user has access
      const [discussions] = await pool.query(`
        SELECT d.*, c.id AS course_id, c.instructor_id
        FROM discussions d
        JOIN courses c ON d.course_id = c.id
        WHERE d.id = ?
      `, [discussionId]);
      
      if (discussions.length === 0) {
        return res.status(404).json({ message: 'Discussion not found' });
      }
      
      const discussion = discussions[0];
      
      // Check access for students (must be enrolled)
      if (req.user.role === 'student') {
        const [enrollments] = await pool.query(
          'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
          [discussion.course_id, req.user.id]
        );
        
        if (enrollments.length === 0) {
          return res.status(403).json({ message: 'You are not enrolled in this course' });
        }
      } else if (req.user.role === 'instructor' && discussion.instructor_id !== req.user.id) {
        // Instructors can only view discussions for their courses
        return res.status(403).json({ message: 'Not authorized to view this discussion' });
      }
      
      // Get posts with user info
      const [posts] = await pool.query(`
        SELECT p.*,
          u.first_name, u.last_name, u.email, u.role, u.profile_image
        FROM discussion_posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.discussion_id = ?
        ORDER BY 
          CASE WHEN p.parent_post_id IS NULL THEN p.created_at ELSE NULL END ASC,
          p.parent_post_id ASC,
          p.created_at ASC
      `, [discussionId]);
      
      // Organize posts into threads
      const threadsMap = {};
      const rootPosts = [];
      
      posts.forEach(post => {
        // Clean up sensitive info
        delete post.password;
        
        if (!post.parent_post_id) {
          // This is a root post
          post.replies = [];
          rootPosts.push(post);
          threadsMap[post.id] = post;
        } else {
          // This is a reply
          const parent = threadsMap[post.parent_post_id];
          if (parent) {
            if (!parent.replies) {
              parent.replies = [];
            }
            parent.replies.push(post);
          } else {
            // Orphaned reply (parent was deleted), treat as root
            post.replies = [];
            rootPosts.push(post);
          }
        }
      });
      
      res.json({
        discussion: {
          id: discussion.id,
          title: discussion.title,
          description: discussion.description,
          is_locked: discussion.is_locked,
          created_at: discussion.created_at,
          updated_at: discussion.updated_at
        },
        posts: rootPosts
      });
    } catch (error) {
      console.error('Error fetching discussion posts:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ======================================================
  // ANNOUNCEMENT ROUTES
  // ======================================================
  
  // Create an announcement
  app.post('/api/announcements', authenticateToken, authorize(['admin', 'instructor']), async (req, res) => {
    try {
      const { course_id, title, content, is_global } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
      }
      
      // If course-specific, check if course exists and instructor owns it
      if (course_id) {
        const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [course_id]);
        
        if (courses.length === 0) {
          return res.status(404).json({ message: 'Course not found' });
        }
        
        // Only allow the instructor who owns the course or an admin to create course announcements
        if (req.user.role === 'instructor' && courses[0].instructor_id !== req.user.id) {
          return res.status(403).json({ message: 'Not authorized to create announcements for this course' });
        }
      } else if (is_global && req.user.role !== 'admin') {
        // Only admins can create global announcements
        return res.status(403).json({ message: 'Only administrators can create global announcements' });
      }
      
      // Create announcement
      const [result] = await pool.query(`
        INSERT INTO announcements (course_id, user_id, title, content, is_global)
        VALUES (?, ?, ?, ?, ?)
      `, [
        course_id || null,
        req.user.id,
        title,
        content,
        is_global || false
      ]);
      
      res.status(201).json({ 
        message: 'Announcement created successfully', 
        announcementId: result.insertId 
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get announcements (global ones + specific to courses user is enrolled in)
  app.get('/api/announcements', authenticateToken, async (req, res) => {
    try {
      let query;
      let params = [];
      
      if (req.user.role === 'admin') {
        // Admins see all announcements
        query = `
          SELECT a.*, 
            u.first_name, u.last_name, u.role,
            c.title as course_title
          FROM announcements a
          LEFT JOIN courses c ON a.course_id = c.id
          JOIN users u ON a.user_id = u.id
          ORDER BY a.created_at DESC
        `;
      } else if (req.user.role === 'instructor') {
        // Instructors see global announcements + their courses
        query = `
          SELECT a.*, 
            u.first_name, u.last_name, u.role,
            c.title as course_title
          FROM announcements a
          LEFT JOIN courses c ON a.course_id = c.id
          JOIN users u ON a.user_id = u.id
          WHERE a.is_global = TRUE 
            OR c.instructor_id = ?
          ORDER BY a.created_at DESC
        `;
        params.push(req.user.id);
      } else {
        // Students see global announcements + courses they're enrolled in
        query = `
          SELECT a.*, 
            u.first_name, u.last_name, u.role,
            c.title as course_title
          FROM announcements a
          LEFT JOIN courses c ON a.course_id = c.id
          JOIN users u ON a.user_id = u.id
          WHERE a.is_global = TRUE 
            OR a.course_id IN (
              SELECT course_id FROM enrollments 
              WHERE student_id = ?
            )
          ORDER BY a.created_at DESC
        `;
        params.push(req.user.id);
      }
      
      const [announcements] = await pool.query(query, params);
      
      res.json(announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ======================================================
  // MESSAGING ROUTES
  // ======================================================
  
  // Send a message
  app.post('/api/messages', authenticateToken, async (req, res) => {
    try {
      const { recipient_id, subject, content } = req.body;
      
      if (!recipient_id || !content) {
        return res.status(400).json({ message: 'Recipient and content are required' });
      }
      
      // Check if recipient exists
      const [recipients] = await pool.query('SELECT * FROM users WHERE id = ?', [recipient_id]);
      
      if (recipients.length === 0) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
      
      // Students can only message instructors of courses they're enrolled in
      if (req.user.role === 'student') {
        const [instructors] = await pool.query(`
          SELECT DISTINCT c.instructor_id 
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          WHERE e.student_id = ? AND c.instructor_id = ?
        `, [req.user.id, recipient_id]);
        
        if (instructors.length === 0) {
          return res.status(403).json({ message: 'You can only message instructors of courses you are enrolled in' });
        }
      }
      
      // Send message
      const [result] = await pool.query(`
        INSERT INTO messages (sender_id, recipient_id, subject, content)
        VALUES (?, ?, ?, ?)
      `, [
        req.user.id,
        recipient_id,
        subject || null,
        content
      ]);
      
      res.status(201).json({ 
        message: 'Message sent successfully', 
        messageId: result.insertId 
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get inbox messages (received by the user)
  app.get('/api/messages/inbox', authenticateToken, async (req, res) => {
    try {
      // Get messages with sender info
      const [messages] = await pool.query(`
        SELECT m.*,
          u.first_name as sender_first_name, u.last_name as sender_last_name,
          u.email as sender_email, u.role as sender_role, u.profile_image as sender_profile_image
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.recipient_id = ?
        ORDER BY m.created_at DESC
      `, [req.user.id]);
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching inbox messages:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get sent messages (sent by the user)
  app.get('/api/messages/sent', authenticateToken, async (req, res) => {
    try {
      // Get messages with recipient info
      const [messages] = await pool.query(`
        SELECT m.*,
          u.first_name as recipient_first_name, u.last_name as recipient_last_name,
          u.email as recipient_email, u.role as recipient_role, u.profile_image as recipient_profile_image
        FROM messages m
        JOIN users u ON m.recipient_id = u.id
        WHERE m.sender_id = ?
        ORDER BY m.created_at DESC
      `, [req.user.id]);
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching sent messages:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Mark a message as read
  app.put('/api/messages/:id/read', authenticateToken, async (req, res) => {
    try {
      const messageId = req.params.id;
      
      // Ensure the message belongs to this user
      const [messages] = await pool.query(
        'SELECT * FROM messages WHERE id = ? AND recipient_id = ?',
        [messageId, req.user.id]
      );
      
      if (messages.length === 0) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Mark as read
      await pool.query(
        'UPDATE messages SET is_read = TRUE WHERE id = ?',
        [messageId]
      );
      
      res.json({ message: 'Message marked as read' });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ======================================================
  // LIVE SESSION ROUTES
  // ======================================================
  
  // Create a live session
  app.post('/api/courses/:courseId/live-sessions', authenticateToken, authorize(['instructor', 'admin']), async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const { 
        lesson_id, title, description, platform, meeting_url, 
        meeting_id, meeting_password, start_time, end_time 
      } = req.body;
      
      // Validate required fields
      if (!title || !platform || !meeting_url || !start_time || !end_time) {
        return res.status(400).json({ 
          message: 'Title, platform, meeting URL, start time, and end time are required' 
        });
      }
      
      // Check course ownership
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Only allow the instructor who owns the course or an admin to create live sessions
      if (req.user.role === 'instructor' && courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to create live sessions for this course' });
      }
      
      // Create live session
      const [result] = await pool.query(`
        INSERT INTO live_sessions (
          course_id, lesson_id, title, description, platform, 
          meeting_url, meeting_id, meeting_password, start_time, end_time, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        courseId,
        lesson_id || null,
        title,
        description || null,
        platform,
        meeting_url,
        meeting_id || null,
        meeting_password || null,
        start_time,
        end_time,
        req.user.id
      ]);
      
      res.status(201).json({ 
        message: 'Live session created successfully', 
        sessionId: result.insertId 
      });
    } catch (error) {
      console.error('Error creating live session:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get upcoming live sessions for a course
  app.get('/api/courses/:courseId/live-sessions', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const { include_past } = req.query;
      
      // Check if course exists
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Check access for students (must be enrolled)
      if (req.user.role === 'student') {
        const [enrollments] = await pool.query(
          'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
          [courseId, req.user.id]
        );
        
        if (enrollments.length === 0) {
          return res.status(403).json({ message: 'You are not enrolled in this course' });
        }
      } else if (req.user.role === 'instructor' && courses[0].instructor_id !== req.user.id) {
        // Instructors can only view sessions for their courses
        return res.status(403).json({ message: 'Not authorized to view live sessions for this course' });
      }
      
      // Get sessions
      let query = `
        SELECT ls.*, 
          u.first_name as creator_first_name, u.last_name as creator_last_name,
          l.title as lesson_title
        FROM live_sessions ls
        JOIN users u ON ls.created_by = u.id
        LEFT JOIN lessons l ON ls.lesson_id = l.id
        WHERE ls.course_id = ?
      `;
      
      if (!include_past || include_past !== 'true') {
        query += ` AND ls.end_time >= NOW()`;
      }
      
      query += ` ORDER BY ls.start_time ASC`;
      
      const [sessions] = await pool.query(query, [courseId]);
      
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching live sessions:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Record attendance for a live session
  app.post('/api/live-sessions/:sessionId/attendance', authenticateToken, authorize(['student']), async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const studentId = req.user.id;
      const { join_time } = req.body;
      
      // Check if session exists and student is enrolled in the course
      const [sessions] = await pool.query(`
        SELECT ls.*, c.id as course_id
        FROM live_sessions ls
        JOIN courses c ON ls.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id AND e.student_id = ?
        WHERE ls.id = ?
      `, [studentId, sessionId]);
      
      if (sessions.length === 0) {
        return res.status(404).json({ 
          message: 'Session not found or you are not enrolled in the course' 
        });
      }
      
      // Record attendance
      await pool.query(`
        INSERT INTO session_attendance (session_id, student_id, join_time, attendance_status)
        VALUES (?, ?, ?, 'present')
        ON DUPLICATE KEY UPDATE 
          join_time = VALUES(join_time),
          attendance_status = 'present'
      `, [
        sessionId,
        studentId,
        join_time || new Date()
      ]);
      
      res.json({ message: 'Attendance recorded successfully' });
    } catch (error) {
      console.error('Error recording attendance:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ======================================================
  // AI INTEGRATION ROUTES
  // ======================================================
  
  // Log an AI interaction
  app.post('/api/ai/interactions', authenticateToken, async (req, res) => {
    try {
      const { course_id, interaction_type, prompt, response } = req.body;
      
      if (!interaction_type || !prompt) {
        return res.status(400).json({ message: 'Interaction type and prompt are required' });
      }
      
      // If course_id is provided, check if user has access
      if (course_id) {
        if (req.user.role === 'student') {
          // Students must be enrolled
          const [enrollments] = await pool.query(
            'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
            [course_id, req.user.id]
          );
          
          if (enrollments.length === 0) {
            return res.status(403).json({ message: 'You are not enrolled in this course' });
          }
        } else if (req.user.role === 'instructor') {
          // Instructors must own the course
          const [courses] = await pool.query(
            'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
            [course_id, req.user.id]
          );
          
          if (courses.length === 0) {
            return res.status(403).json({ message: 'Not authorized to use AI for this course' });
          }
        }
      }
      
      // Log interaction
      const [result] = await pool.query(`
        INSERT INTO ai_interactions (user_id, course_id, interaction_type, prompt, response)
        VALUES (?, ?, ?, ?, ?)
      `, [
        req.user.id,
        course_id || null,
        interaction_type,
        prompt,
        response || null
      ]);
      
      res.status(201).json({ 
        message: 'AI interaction logged successfully', 
        interactionId: result.insertId 
      });
    } catch (error) {
      console.error('Error logging AI interaction:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Save AI-generated content
  app.post('/api/courses/:courseId/ai-content', authenticateToken, authorize(['instructor', 'admin']), async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const { lesson_id, title, content, content_type } = req.body;
      
      if (!title || !content || !content_type) {
        return res.status(400).json({ message: 'Title, content, and content type are required' });
      }
      
      // Check course ownership
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Only allow the instructor who owns the course or an admin to save AI content
      if (req.user.role === 'instructor' && courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to save AI content for this course' });
      }
      
      // Save AI content
      const [result] = await pool.query(`
        INSERT INTO ai_generated_content (
          course_id, lesson_id, title, content, content_type, created_by
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        courseId,
        lesson_id || null,
        title,
        content,
        content_type,
        req.user.id
      ]);
      
      res.status(201).json({ 
        message: 'AI content saved successfully', 
        contentId: result.insertId 
      });
    } catch (error) {
      console.error('Error saving AI content:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ======================================================
  // PROGRESS TRACKING ROUTES
  // ======================================================
  
  // Record progress for a lesson
  app.post('/api/lessons/:lessonId/progress', authenticateToken, authorize(['student']), async (req, res) => {
    try {
      const lessonId = req.params.lessonId;
      const studentId = req.user.id;
      const { completion_status, progress_percentage } = req.body;
      
      // Check if lesson exists and student is enrolled in the course
      const [lessons] = await pool.query(`
        SELECT l.*, c.id as course_id
        FROM lessons l
        JOIN course_modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id AND e.student_id = ?
        WHERE l.id = ?
      `, [studentId, lessonId]);
      
      if (lessons.length === 0) {
        return res.status(404).json({ 
          message: 'Lesson not found or you are not enrolled in the course' 
        });
      }
      
      // Update or create progress record
      const completed_at = completion_status === 'completed' ? new Date() : null;
      
      await pool.query(`
        INSERT INTO user_progress (
          user_id, lesson_id, completion_status, progress_percentage, 
          last_accessed, completed_at
        ) VALUES (?, ?, ?, ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
          completion_status = VALUES(completion_status),
          progress_percentage = VALUES(progress_percentage),
          last_accessed = NOW(),
          completed_at = VALUES(completed_at)
      `, [
        studentId,
        lessonId,
        completion_status || 'in_progress',
        progress_percentage || 0,
        completed_at
      ]);
      
      // If lesson is completed, check if course is completed
      if (completion_status === 'completed') {
        // Get total lessons in course
        const [totalResult] = await pool.query(`
          SELECT COUNT(*) as total
          FROM lessons l
          JOIN course_modules m ON l.module_id = m.id
          WHERE m.course_id = ?
        `, [lessons[0].course_id]);
        
        // Get completed lessons
        const [completedResult] = await pool.query(`
          SELECT COUNT(*) as completed
          FROM user_progress up
          JOIN lessons l ON up.lesson_id = l.id
          JOIN course_modules m ON l.module_id = m.id
          WHERE up.user_id = ? AND m.course_id = ? AND up.completion_status = 'completed'
        `, [studentId, lessons[0].course_id]);
        
        // If all lessons completed, update enrollment
        if (completedResult[0].completed >= totalResult[0].total) {
          await pool.query(`
            UPDATE enrollments SET
              completion_status = 'completed',
              completion_date = NOW()
            WHERE student_id = ? AND course_id = ?
          `, [studentId, lessons[0].course_id]);
        }
      }
      
      res.json({ message: 'Progress updated successfully' });
    } catch (error) {
      console.error('Error updating progress:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get student progress for a course
  app.get('/api/courses/:courseId/progress', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const studentId = req.query.studentId || req.user.id;
      
      // Verify permissions - students can only view their own progress
      if (req.user.role === 'student' && parseInt(studentId) !== req.user.id) {
        return res.status(403).json({ message: 'You can only view your own progress' });
      }
      
      // Check if course exists
      const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
      
      if (courses.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Check permissions - instructors can only view progress for their courses
      if (req.user.role === 'instructor' && courses[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view progress for this course' });
      }
      
      // For a student, check if they are enrolled
      if (req.user.role === 'student') {
        const [enrollments] = await pool.query(
          'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
          [courseId, studentId]
        );
        
        if (enrollments.length === 0) {
          return res.status(403).json({ message: 'You are not enrolled in this course' });
        }
      }
      
      // Get modules and lessons
      const [modules] = await pool.query(`
        SELECT m.id, m.title, m.order_index
        FROM course_modules m
        WHERE m.course_id = ?
        ORDER BY m.order_index
      `, [courseId]);
      
      // For each module, get its lessons with progress info
      for (const module of modules) {
        const [lessons] = await pool.query(`
          SELECT l.id, l.title, l.content_type, l.order_index,
            up.completion_status, up.progress_percentage, up.last_accessed, up.completed_at
          FROM lessons l
          LEFT JOIN user_progress up ON l.id = up.lesson_id AND up.user_id = ?
          WHERE l.module_id = ?
          ORDER BY l.order_index
        `, [studentId, module.id]);
        
        module.lessons = lessons;
      }
      
      // Get enrollment info with overall progress
      const [enrollments] = await pool.query(`
        SELECT e.*, 
          (SELECT COUNT(*) FROM lessons l 
           JOIN course_modules m ON l.module_id = m.id 
           WHERE m.course_id = ?) as total_lessons,
          (SELECT COUNT(*) FROM user_progress up 
           JOIN lessons l ON up.lesson_id = l.id 
           JOIN course_modules m ON l.module_id = m.id 
           WHERE up.user_id = ? AND m.course_id = ? AND up.completion_status = 'completed') as completed_lessons
        FROM enrollments e
        WHERE e.student_id = ? AND e.course_id = ?
      `, [courseId, studentId, courseId, studentId, courseId]);
      
      const enrollment = enrollments[0] || null;
      
      // Calculate overall progress percentage
      let overallPercentage = 0;
      if (enrollment && enrollment.total_lessons > 0) {
        overallPercentage = (enrollment.completed_lessons / enrollment.total_lessons) * 100;
      }
      
      res.json({
        enrollment: enrollment ? {
          enrollment_date: enrollment.enrollment_date,
          completion_status: enrollment.completion_status,
          completion_date: enrollment.completion_date,
        } : null,
        progress: {
          total_lessons: enrollment ? enrollment.total_lessons : 0,
          completed_lessons: enrollment ? enrollment.completed_lessons : 0,
          overall_percentage: Math.round(overallPercentage)
        },
        modules
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course completion certificate
app.get('/api/courses/:courseId/certificate', authenticateToken, authorize(['student']), async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const studentId = req.user.id;
    
    // Check if the student has completed the course
    const [enrollments] = await pool.query(`
      SELECT e.*, c.title as course_title, 
        u.first_name, u.last_name,
        c.instructor_id,
        (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = c.instructor_id) as instructor_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON e.student_id = u.id
      WHERE e.course_id = ? AND e.student_id = ? AND e.completion_status = 'completed'
    `, [courseId, studentId]);
    
    if (enrollments.length === 0) {
      return res.status(404).json({ message: 'Course not completed or enrollment not found' });
    }
    
    const enrollment = enrollments[0];
    
    // Format the certificate data
    const certificateData = {
      certificate_id: `CERT-${courseId}-${studentId}-${Date.now()}`,
      course_title: enrollment.course_title,
      student_name: `${enrollment.first_name} ${enrollment.last_name}`,
      instructor_name: enrollment.instructor_name,
      completion_date: enrollment.completion_date,
      issued_date: new Date(),
      verification_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-certificate/${courseId}/${studentId}/${enrollment.completion_date}`
    };
    
    res.json(certificateData);
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================================================
// USER MANAGEMENT ROUTES (ADMIN)
// ======================================================

// Create a new user (admin only)
app.post('/api/users', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, profile_image, bio } = req.body;
    
    if (!email || !password || !role || !['student', 'instructor', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid user data' });
    }
    
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [result] = await pool.query(`
      INSERT INTO users (
        email, password, first_name, last_name, role, 
        is_password_changed, profile_image, bio
      ) VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)
    `, [
      email, 
      hashedPassword, 
      firstName || null, 
      lastName || null, 
      role,
      profile_image || null,
      bio || null
    ]);
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      'create',
      'user',
      result.insertId,
      JSON.stringify({
        email,
        firstName,
        lastName,
        role
      }),
      req.ip
    ]);
    
    res.status(201).json({ 
      message: 'User created successfully', 
      userId: result.insertId 
    });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a user (admin only)
app.put('/api/users/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, firstName, lastName, role, profile_image, bio } = req.body;
    
    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // If email is changing, check if new email already exists
    if (email && email !== user.email) {
      const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUsers.length > 0) {
        return res.status(409).json({ message: 'Email already in use' });
      }
    }
    
    // Update user
    await pool.query(`
      UPDATE users SET
        email = ?,
        first_name = ?,
        last_name = ?,
        role = ?,
        profile_image = ?,
        bio = ?
      WHERE id = ?
    `, [
      email || user.email,
      firstName !== undefined ? firstName : user.first_name,
      lastName !== undefined ? lastName : user.last_name,
      role || user.role,
      profile_image !== undefined ? profile_image : user.profile_image,
      bio !== undefined ? bio : user.bio,
      userId
    ]);
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      'update',
      'user',
      userId,
      JSON.stringify(req.body),
      req.ip
    ]);
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a user (admin only)
app.delete('/api/users/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting yourself
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Delete user (cascade will handle related records)
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      'delete',
      'user',
      userId,
      JSON.stringify({ id: userId }),
      req.ip
    ]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile (admin can view any user, others can only view themselves)
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Only admins can view other users' profiles
    if (req.user.role !== 'admin' && parseInt(userId) !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this user profile' });
    }
    
    const [users] = await pool.query(`
      SELECT id, email, first_name, last_name, role, 
        is_password_changed, profile_image, bio, created_at 
      FROM users 
      WHERE id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // If requesting user is an instructor, include their courses
    if (user.role === 'instructor') {
      const [courses] = await pool.query(`
        SELECT id, title, description, status, start_date, end_date, is_featured,
          (SELECT COUNT(*) FROM enrollments WHERE course_id = id) as enrollment_count
        FROM courses
        WHERE instructor_id = ?
      `, [userId]);
      
      user.courses = courses;
    }
    
    // If requesting user is a student, include their enrollments
    if (user.role === 'student') {
      const [enrollments] = await pool.query(`
        SELECT e.*, c.title as course_title, c.description as course_description,
          CONCAT(u.first_name, ' ', u.last_name) as instructor_name
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        WHERE e.student_id = ?
      `, [userId]);
      
      user.enrollments = enrollments;
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update own profile (any authenticated user)
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, profile_image, bio } = req.body;
    
    // Update user profile
    await pool.query(`
      UPDATE users SET
        first_name = ?,
        last_name = ?,
        profile_image = ?,
        bio = ?
      WHERE id = ?
    `, [
      firstName !== undefined ? firstName : req.user.first_name,
      lastName !== undefined ? lastName : req.user.last_name,
      profile_image !== undefined ? profile_image : req.user.profile_image,
      bio !== undefined ? bio : req.user.bio,
      req.user.id
    ]);
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================================================
// GRADE AND ANALYTICS ROUTES
// ======================================================

// Get all grades for a student in a course
app.get('/api/courses/:courseId/grades/:studentId', authenticateToken, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const studentId = req.params.studentId;
    
    // Check permissions
    if (req.user.role === 'student') {
      // Students can only view their own grades
      if (parseInt(studentId) !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view grades for other students' });
      }
      
      // Check if enrolled in the course
      const [enrollments] = await pool.query(
        'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
        [courseId, studentId]
      );
      
      if (enrollments.length === 0) {
        return res.status(403).json({ message: 'You are not enrolled in this course' });
      }
    } else if (req.user.role === 'instructor') {
      // Instructors can only view grades for their courses
      const [courses] = await pool.query(
        'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
        [courseId, req.user.id]
      );
      
      if (courses.length === 0) {
        return res.status(403).json({ message: 'Not authorized to view grades for this course' });
      }
      
      // Check if student is enrolled in the course
      const [enrollments] = await pool.query(
        'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
        [courseId, studentId]
      );
      
      if (enrollments.length === 0) {
        return res.status(404).json({ message: 'Student is not enrolled in this course' });
      }
    }
    
    // Get all grades
    const [grades] = await pool.query(`
      SELECT g.*,
        CASE 
          WHEN g.assessment_type = 'assignment' THEN 
            (SELECT title FROM assignments WHERE id = g.assessment_id)
          WHEN g.assessment_type = 'quiz' THEN 
            (SELECT title FROM quizzes WHERE id = g.assessment_id)
          ELSE 'Unknown'
        END as assessment_title,
        CONCAT(u.first_name, ' ', u.last_name) as graded_by_name
      FROM grades g
      JOIN users u ON g.graded_by = u.id
      WHERE g.student_id = ? AND g.course_id = ?
      ORDER BY g.created_at DESC
    `, [studentId, courseId]);
    
    // Calculate average grade
    let totalGradePercentage = 0;
    grades.forEach(grade => {
      totalGradePercentage += (grade.grade / grade.max_grade) * 100;
    });
    
    const averageGrade = grades.length > 0 ? totalGradePercentage / grades.length : null;
    
    res.json({
      grades,
      summary: {
        average_grade: averageGrade ? Math.round(averageGrade) : null,
        total_assessments: grades.length
      }
    });
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course analytics (instructor, admin)
app.get('/api/courses/:courseId/analytics', authenticateToken, authorize(['instructor', 'admin']), async (req, res) => {
  try {
    const courseId = req.params.courseId;
    
    // Check course ownership for instructors
    if (req.user.role === 'instructor') {
      const [courses] = await pool.query(
        'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
        [courseId, req.user.id]
      );
      
      if (courses.length === 0) {
        return res.status(403).json({ message: 'Not authorized to view analytics for this course' });
      }
    }
    
    // Get course details
    const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    
    if (courses.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Get enrollment analytics
    const [enrollmentStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_enrollments,
        SUM(CASE WHEN completion_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN completion_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN completion_status = 'not_started' THEN 1 ELSE 0 END) as not_started
      FROM enrollments
      WHERE course_id = ?
    `, [courseId]);
    
    // Get lesson completion analytics
    const [lessonStats] = await pool.query(`
      SELECT 
        l.id, l.title,
        COUNT(DISTINCT up.user_id) as viewed_count,
        SUM(CASE WHEN up.completion_status = 'completed' THEN 1 ELSE 0 END) as completed_count
      FROM lessons l
      JOIN course_modules m ON l.module_id = m.id
      LEFT JOIN user_progress up ON l.id = up.lesson_id
      WHERE m.course_id = ?
      GROUP BY l.id
      ORDER BY m.order_index, l.order_index
    `, [courseId]);
    
    // Get assessment analytics
    const [assignmentStats] = await pool.query(`
      SELECT 
        a.id, a.title,
        COUNT(DISTINCT s.student_id) as submission_count,
        AVG(s.grade) as average_grade
      FROM assignments a
      LEFT JOIN submissions s ON a.id = s.assignment_id
      WHERE a.course_id = ?
      GROUP BY a.id
    `, [courseId]);
    
    const [quizStats] = await pool.query(`
      SELECT 
        q.id, q.title,
        COUNT(DISTINCT qa.student_id) as attempt_count,
        AVG(qa.score) as average_score
      FROM quizzes q
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
      WHERE q.course_id = ?
      GROUP BY q.id
    `, [courseId]);
    
    // Get overall grade distribution
    const [gradeDistribution] = await pool.query(`
      SELECT 
        CASE
          WHEN (g.grade / g.max_grade) * 100 >= 90 THEN 'A'
          WHEN (g.grade / g.max_grade) * 100 >= 80 THEN 'B'
          WHEN (g.grade / g.max_grade) * 100 >= 70 THEN 'C'
          WHEN (g.grade / g.max_grade) * 100 >= 60 THEN 'D'
          ELSE 'F'
        END as grade_letter,
        COUNT(*) as count
      FROM grades g
      WHERE g.course_id = ?
      GROUP BY grade_letter
      ORDER BY grade_letter
    `, [courseId]);
    
    res.json({
      course_id: courseId,
      title: courses[0].title,
      enrollment_stats: enrollmentStats[0],
      lesson_stats: lessonStats,
      assessment_stats: {
        assignments: assignmentStats,
        quizzes: quizStats
      },
      grade_distribution: gradeDistribution
    });
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system-wide analytics (admin only)
app.get('/api/analytics/system', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    // User statistics
    const [userStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students,
        SUM(CASE WHEN role = 'instructor' THEN 1 ELSE 0 END) as instructors,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
        COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_last_30_days
      FROM users
    `);
    
    // Course statistics
    const [courseStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_courses,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived,
        COUNT(DISTINCT instructor_id) as active_instructors,
        COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_last_30_days
      FROM courses
    `);
    
    // Enrollment statistics
    const [enrollmentStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_enrollments,
        COUNT(DISTINCT student_id) as enrolled_students,
        COUNT(DISTINCT course_id) as courses_with_enrollments,
        SUM(CASE WHEN completion_status = 'completed' THEN 1 ELSE 0 END) as completed_enrollments,
        COUNT(CASE WHEN enrollment_date > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_last_30_days
      FROM enrollments
    `);
    
    // Activity statistics
    const [activityStats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM user_progress WHERE last_accessed > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as lessons_viewed_24h,
        (SELECT COUNT(*) FROM submissions WHERE submission_date > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as submissions_24h,
        (SELECT COUNT(*) FROM quiz_attempts WHERE start_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as quiz_attempts_24h,
        (SELECT COUNT(*) FROM discussion_posts WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as discussion_posts_24h,
        (SELECT COUNT(*) FROM messages WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as messages_24h
    `);
    
    // AI usage statistics
    const [aiStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(DISTINCT user_id) as users_using_ai,
        COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as interactions_last_30_days,
        COUNT(CASE WHEN interaction_type = 'question' THEN 1 END) as questions,
        COUNT(CASE WHEN interaction_type = 'content_generation' THEN 1 END) as content_generations,
        COUNT(CASE WHEN interaction_type = 'feedback' THEN 1 END) as feedback_requests,
        COUNT(CASE WHEN interaction_type = 'grading' THEN 1 END) as grading_assists
      FROM ai_interactions
    `);
    
    res.json({
      timestamp: new Date(),
      user_stats: userStats[0],
      course_stats: courseStats[0],
      enrollment_stats: enrollmentStats[0],
      activity_stats: activityStats[0],
      ai_stats: aiStats[0]
    });
  } catch (error) {
    console.error('Error fetching system analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================================================
// SYSTEM SETTINGS ROUTES (ADMIN ONLY)
// ======================================================

// Get all system settings
app.get('/api/settings', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const [settings] = await pool.query(`
      SELECT * FROM system_settings
      ORDER BY setting_group, setting_key
    `);
    
    // Group settings by setting_group
    const groupedSettings = {};
    
    settings.forEach(setting => {
      const group = setting.setting_group || 'general';
      
      if (!groupedSettings[group]) {
        groupedSettings[group] = [];
      }
      
      groupedSettings[group].push(setting);
    });
    
    res.json(groupedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a system setting
app.put('/api/settings/:key', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const settingKey = req.params.key;
    const { value, description, group } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ message: 'Setting value is required' });
    }
    
    // Check if setting exists
    const [settings] = await pool.query(
      'SELECT * FROM system_settings WHERE setting_key = ?',
      [settingKey]
    );
    
    if (settings.length === 0) {
      // Create new setting
      await pool.query(`
        INSERT INTO system_settings (
          setting_key, setting_value, setting_group, description, updated_by
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        settingKey,
        value,
        group || 'general',
        description || null,
        req.user.id
      ]);
      
      res.status(201).json({ message: 'Setting created successfully' });
    } else {
      // Update existing setting
      await pool.query(`
        UPDATE system_settings SET
          setting_value = ?,
          setting_group = ?,
          description = ?,
          updated_by = ?
        WHERE setting_key = ?
      `, [
        value,
        group || settings[0].setting_group,
        description !== undefined ? description : settings[0].description,
        req.user.id,
        settingKey
      ]);
      
      res.json({ message: 'Setting updated successfully' });
    }
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      settings.length === 0 ? 'create' : 'update',
      'setting',
      settingKey,
      JSON.stringify(req.body),
      req.ip
    ]);
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a system setting
app.delete('/api/settings/:key', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const settingKey = req.params.key;
    
    // Check if setting exists
    const [settings] = await pool.query(
      'SELECT * FROM system_settings WHERE setting_key = ?',
      [settingKey]
    );
    
    if (settings.length === 0) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    
    // Delete setting
    await pool.query('DELETE FROM system_settings WHERE setting_key = ?', [settingKey]);
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      'delete',
      'setting',
      settingKey,
      JSON.stringify({ key: settingKey }),
      req.ip
    ]);
    
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================================================
// AUDIT LOGS ROUTES (ADMIN ONLY)
// ======================================================

// Get audit logs
app.get('/api/audit-logs', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { userId, action, entityType, startDate, endDate, limit, offset } = req.query;
    
    let query = `
      SELECT a.*,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (userId) {
      query += ` AND a.user_id = ?`;
      params.push(userId);
    }
    
    if (action) {
      query += ` AND a.action = ?`;
      params.push(action);
    }
    
    if (entityType) {
      query += ` AND a.entity_type = ?`;
      params.push(entityType);
    }
    
    if (startDate) {
      query += ` AND a.created_at >= ?`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND a.created_at <= ?`;
      params.push(endDate);
    }
    
    query += ` ORDER BY a.created_at DESC`;
    
    // Add pagination
    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit));
      
      if (offset) {
        query += ` OFFSET ?`;
        params.push(parseInt(offset));
      }
    }
    
    const [logs] = await pool.query(query, params);
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================================================
// FILE UPLOAD ROUTES
// ======================================================

// This route assumes you've configured multer middleware for file uploads
// You'll need to add multer configuration at the top of your server.js file

/* Example multer configuration (add this near the top of your file):

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.user?.id || 'anonymous';
    const userDir = path.join(uploadsDir, userId.toString());
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images, documents, and other common file types
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 
    'application/pdf', 
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, and common file types are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

*/

// Upload lesson material
app.post('/api/lessons/:lessonId/materials', authenticateToken, authorize(['instructor', 'admin']), /* upload.single('file'), */ async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const { title, external_url, material_type } = req.body;
    const file = req.file; // This will be defined if multer is configured
    
    if (!title || (!file && !external_url)) {
      return res.status(400).json({ message: 'Title and either file or external URL are required' });
    }
    
    // Check if lesson exists and user has permission
    const [lessons] = await pool.query(`
      SELECT l.*, c.instructor_id 
      FROM lessons l
      JOIN course_modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE l.id = ?
    `, [lessonId]);
    
    if (lessons.length === 0) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Instructors can only add materials to their own courses
    if (req.user.role === 'instructor' && lessons[0].instructor_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to add materials to this lesson' });
    }
    
    // Create material record
    const [result] = await pool.query(`
      INSERT INTO lesson_materials (
        lesson_id, title, file_path, external_url, material_type
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      lessonId,
      title,
      file ? file.path : null,
      external_url || null,
      material_type || (file ? file.mimetype.split('/')[0] : 'link')
    ]);
    
    res.status(201).json({ 
      message: 'Material added successfully', 
      materialId: result.insertId,
      file_info: file ? {
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      } : null
    });
  } catch (error) {
    console.error('Error adding material:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get lesson materials
app.get('/api/lessons/:lessonId/materials', authenticateToken, async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    
    // Check if lesson exists
    const [lessons] = await pool.query(`
      SELECT l.*, c.id as course_id, c.instructor_id 
      FROM lessons l
      JOIN course_modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE l.id = ?
    `, [lessonId]);
    
    if (lessons.length === 0) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Check access
    if (req.user.role === 'student') {
      // Students must be enrolled
      const [enrollments] = await pool.query(
        'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
        [lessons[0].course_id, req.user.id]
      );
      
      if (enrollments.length === 0) {
        return res.status(403).json({ message: 'You are not enrolled in this course' });
      }
    } else if (req.user.role === 'instructor' && lessons[0].instructor_id !== req.user.id) {
      // Instructors can only view materials for their courses
      return res.status(403).json({ message: 'Not authorized to view materials for this lesson' });
    }
    
    // Get materials
    const [materials] = await pool.query(
      'SELECT * FROM lesson_materials WHERE lesson_id = ?',
      [lessonId]
    );
    
    res.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================================================
// ERROR HANDLING MIDDLEWARE
// ======================================================

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    message: 'The requested resource was not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Multer error handling
  if (err instanceof multer?.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeded the limit' });
    }
    return res.status(400).json({ message: `File upload error: ${err.message}` });
  }
  
  res.status(500).json({
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

module.exports = app;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origins: ${corsOptions.origin.join(', ')}`);
});