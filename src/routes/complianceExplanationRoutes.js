/**
 * Compliance Explanation Routes
 * 
 * Provides endpoints for generating LLM-powered explanations
 * of compliance flags and issues
 */

const express = require('express');
const complianceExplanationController = require('../controllers/complianceExplanationController');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * @route   POST /api/v1/compliance/explain
 * @desc    Generate explanation for a single compliance issue
 * @access  Private (requires authentication)
 * @body    {
 *   "issueCode": "RATE_BELOW_MINIMUM",
 *   "workerData": { "worker_id": "W001", "age": 25 },
 *   "issueDetails": { "effective_hourly_rate": 8.50, "required_hourly_rate": 10.42 },
 *   "options": { "includeReferences": true }
 * }
 */
router.post('/explain', authController.verifyToken, (req, res) => {
  complianceExplanationController.explainIssue(req, res);
});

/**
 * @route   POST /api/v1/compliance/explain-batch
 * @desc    Generate explanations for multiple compliance issues
 * @access  Private (requires authentication)
 * @body    {
 *   "issues": [
 *     {
 *       "issueCode": "RATE_BELOW_MINIMUM",
 *       "workerData": { "worker_id": "W001", "age": 25 },
 *       "issueDetails": { "effective_hourly_rate": 8.50, "required_hourly_rate": 10.42 }
 *     }
 *   ],
 *   "options": { "includeReferences": true }
 * }
 */
router.post('/explain-batch', authController.verifyToken, (req, res) => {
  complianceExplanationController.explainBatchIssues(req, res);
});

/**
 * @route   GET /api/v1/compliance/error-codes
 * @desc    Get all available error codes and their descriptions
 * @access  Private (requires authentication)
 */
router.get('/error-codes', authController.verifyToken, (req, res) => {
  complianceExplanationController.getErrorCodes(req, res);
});

/**
 * @route   GET /api/v1/compliance/error-codes/:category
 * @desc    Get error codes filtered by category (critical, warning, action, info, error)
 * @access  Private (requires authentication)
 */
router.get('/error-codes/:category', authController.verifyToken, (req, res) => {
  complianceExplanationController.getErrorCodesByCategory(req, res);
});

/**
 * @route   GET /api/v1/compliance/explain/health
 * @desc    Health check for compliance explanation service
 * @access  Public
 */
router.get('/explain/health', (req, res) => {
  complianceExplanationController.healthCheck(req, res);
});

/**
 * @route   POST /api/v1/compliance/explain/test
 * @desc    Test explanation generation with predefined scenarios
 * @access  Private (requires authentication)
 * @body    {
 *   "testIndex": 0,  // Optional: which test scenario to run (0-2)
 *   "customTest": {  // Optional: custom test data
 *     "issueCode": "CUSTOM_CODE",
 *     "workerData": {},
 *     "issueDetails": {}
 *   }
 * }
 */
router.post('/explain/test', authController.verifyToken, (req, res) => {
  complianceExplanationController.testExplanation(req, res);
});

module.exports = router;
