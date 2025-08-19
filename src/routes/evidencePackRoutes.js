/**
 * Evidence Pack Routes
 * 
 * Provides endpoints for generating and exporting evidence packs
 * in PDF and CSV formats for compliance reporting
 */

const express = require('express');
const evidencePackController = require('../controllers/evidencePackController');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * @route   POST /api/v1/evidence-pack/export
 * @desc    Generate and export evidence pack in specified format
 * @access  Private (requires authentication)
 * @body    {
 *   "uploadId": 123,
 *   "format": "pdf", // or "csv", "both"
 *   "options": {
 *     "includeExplanations": true,
 *     "riskAssessment": true
 *   }
 * }
 */
router.post('/export', authController.verifyToken, (req, res) => {
  evidencePackController.exportEvidencePack(req, res);
});

/**
 * @route   GET /api/v1/evidence-pack/preview/:uploadId
 * @desc    Generate evidence pack data for preview (without file generation)
 * @access  Private (requires authentication)
 * @param   uploadId - The CSV upload ID
 * @query   includeExplanations=true - Whether to include AI explanations
 */
router.get('/preview/:uploadId', authController.verifyToken, (req, res) => {
  evidencePackController.previewEvidencePack(req, res);
});

/**
 * @route   POST /api/v1/evidence-pack/csv-package
 * @desc    Generate CSV package with multiple files
 * @access  Private (requires authentication)
 * @body    {
 *   "uploadId": 123,
 *   "options": {
 *     "includeExplanations": true
 *   }
 * }
 */
router.post('/csv-package', authController.verifyToken, (req, res) => {
  evidencePackController.exportCSVPackage(req, res);
});

/**
 * @route   GET /api/v1/evidence-pack/formats
 * @desc    Get available export formats and options
 * @access  Private (requires authentication)
 */
router.get('/formats', authController.verifyToken, (req, res) => {
  evidencePackController.getExportFormats(req, res);
});

/**
 * @route   GET /api/v1/evidence-pack/health
 * @desc    Health check for evidence pack service
 * @access  Public
 */
router.get('/health', (req, res) => {
  evidencePackController.healthCheck(req, res);
});

/**
 * @route   POST /api/v1/evidence-pack/test
 * @desc    Test evidence pack generation with sample data
 * @access  Private (requires authentication)
 * @body    {
 *   "format": "pdf", // or "csv", "both", "preview"
 *   "testSize": "small" // or "medium", "large"
 * }
 */
router.post('/test', authController.verifyToken, (req, res) => {
  evidencePackController.testEvidencePackGeneration(req, res);
});

module.exports = router;
