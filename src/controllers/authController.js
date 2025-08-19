/**
 * Authentication Controller
 * 
 * Handles user authentication, registration, and multi-tenant user management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

class AuthController {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  /**
   * User registration with multi-tenant support
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const { email, password, companyName, role = 'employer', isBureau = false } = req.body;

      // Validate input
      if (!email || !password || !companyName) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and company name are required'
        });
      }

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash, role, company_name, is_bureau) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, role, company_name, is_bureau, created_at`,
        [email, passwordHash, role, companyName, isBureau]
      );

      const user = userResult.rows[0];

      // If user is a bureau, create bureau record
      if (isBureau) {
        await pool.query(
          'INSERT INTO bureaus (name, user_id, description) VALUES ($1, $2, $3)',
          [companyName, user.id, 'Payroll compliance bureau']
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          isBureau: user.is_bureau,
          companyName: user.company_name
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn }
      );

      // Remove sensitive data
      delete user.password_hash;

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user,
        token
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during registration'
      });
    }
  }

  /**
   * User login with multi-tenant support
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Find user
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      const user = userResult.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Get bureau info if user is a bureau
      let bureau = null;
      if (user.is_bureau) {
        const bureauResult = await pool.query(
          'SELECT * FROM bureaus WHERE user_id = $1',
          [user.id]
        );
        if (bureauResult.rows.length > 0) {
          bureau = bureauResult.rows[0];
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          isBureau: user.is_bureau,
          companyName: user.company_name,
          bureauId: bureau?.id
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn }
      );

      // Remove sensitive data
      delete user.password_hash;

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          ...user,
          bureau
        },
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during login'
      });
    }
  }

  /**
   * Get current user profile with multi-tenant info
   * GET /api/auth/profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;

      const userResult = await pool.query(
        'SELECT id, email, role, company_name, is_bureau, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = userResult.rows[0];

      // Get bureau info if user is a bureau
      let bureau = null;
      if (user.is_bureau) {
        const bureauResult = await pool.query(
          'SELECT * FROM bureaus WHERE user_id = $1',
          [userId]
        );
        if (bureauResult.rows.length > 0) {
          bureau = bureauResult.rows[0];
        }
      }

      // Get client count if user is a bureau
      let clientCount = 0;
      if (user.is_bureau && bureau) {
        const clientResult = await pool.query(
          'SELECT COUNT(*) as count FROM clients WHERE bureau_id = $1',
          [bureau.id]
        );
        clientCount = parseInt(clientResult.rows[0].count);
      }

      res.json({
        success: true,
        user: {
          ...user,
          bureau,
          clientCount
        }
      });

    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching profile'
      });
    }
  }

  /**
   * Change user password
   * PUT /api/auth/change-password
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }

      // Get current user
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while changing password'
      });
    }
  }

  /**
   * Verify JWT token middleware
   */
  verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  }

  /**
   * Check if user is a bureau
   */
  requireBureau(req, res, next) {
    if (!req.user.isBureau) {
      return res.status(403).json({
        success: false,
        error: 'Bureau access required'
      });
    }
    next();
  }

  /**
   * Check if user has access to specific organization
   */
  requireOrganizationAccess(req, res, next) {
    const { organizationId } = req.params;
    
    // If user is a bureau, they can access their own data
    if (req.user.isBureau && req.user.bureauId) {
      return next();
    }
    
    // If user is an employer, they can only access their own data
    if (req.user.role === 'employer' && req.user.userId.toString() === organizationId) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      error: 'Access denied to this organization'
    });
  }
}

module.exports = new AuthController();
