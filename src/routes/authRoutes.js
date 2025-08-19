/**
 * Authentication Routes
 * 
 * Provides endpoints for user authentication and multi-tenant user management
 */

const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    User registration with multi-tenant support
 * @access  Public
 */
router.post('/register', (req, res) => {
  authController.register(req, res);
});

/**
 * @route   POST /api/auth/login
 * @desc    User login with multi-tenant support
 * @access  Public
 */
router.post('/login', (req, res) => {
  authController.login(req, res);
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile with multi-tenant info
 * @access  Private
 */
router.get('/profile', authController.verifyToken, (req, res) => {
  authController.getProfile(req, res);
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authController.verifyToken, (req, res) => {
  authController.changePassword(req, res);
});

/**
 * @route   POST /api/auth/verify
 * @desc    Verify JWT token (for frontend token validation)
 * @access  Public
 */
router.post('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, authController.jwtSecret);
    res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
});

module.exports = router;
