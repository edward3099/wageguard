/**
 * LLM API Routes
 * 
 * Provides secure endpoints for LLM functionality
 */

const express = require('express');
const LLMController = require('../controllers/llmController');

const router = express.Router();
const llmController = new LLMController();

/**
 * @route   GET /api/v1/llm/health
 * @desc    Check LLM service health
 * @access  Public
 */
router.get('/health', (req, res) => {
  llmController.healthCheck(req, res);
});

/**
 * @route   GET /api/v1/llm/config
 * @desc    Get LLM service configuration (without sensitive data)
 * @access  Public
 */
router.get('/config', (req, res) => {
  llmController.getConfiguration(req, res);
});

/**
 * @route   POST /api/v1/llm/explain-compliance
 * @desc    Generate explanation for compliance issues
 * @access  Public (would be protected in production)
 * @body    { issueCode, workerData?, issueDetails? }
 */
router.post('/explain-compliance', (req, res) => {
  llmController.explainComplianceIssue(req, res);
});

/**
 * @route   POST /api/v1/llm/suggest-mapping
 * @desc    Generate CSV column mapping suggestions
 * @access  Public (would be protected in production)
 * @body    { columnHeaders: string[], expectedColumns: string[] }
 */
router.post('/suggest-mapping', (req, res) => {
  llmController.suggestColumnMapping(req, res);
});

/**
 * @route   POST /api/v1/llm/test-masking
 * @desc    Test data masking functionality
 * @access  Public (development/testing only)
 * @body    { testData: object }
 */
router.post('/test-masking', (req, res) => {
  // Only allow in development/test environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Test endpoints are not available in production'
    });
  }
  llmController.testDataMasking(req, res);
});

/**
 * @route   POST /api/v1/llm/validate-input
 * @desc    Validate input for prompt injection and sanitize
 * @access  Public (development/testing only)
 * @body    { input: string }
 */
router.post('/validate-input', (req, res) => {
  // Only allow in development/test environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Test endpoints are not available in production'
    });
  }
  llmController.validateInput(req, res);
});

module.exports = router;
