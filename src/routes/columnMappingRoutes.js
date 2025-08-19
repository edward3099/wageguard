/**
 * Column Mapping API Routes
 * 
 * Provides endpoints for CSV column header mapping functionality
 */

const express = require('express');
const ColumnMappingController = require('../controllers/columnMappingController');

const router = express.Router();
const mappingController = new ColumnMappingController();

/**
 * @route   GET /api/v1/mapping/health
 * @desc    Check column mapping service health
 * @access  Public
 */
router.get('/health', (req, res) => {
  mappingController.getHealthInfo(req, res);
});

/**
 * @route   GET /api/v1/mapping/schema/:csvType
 * @desc    Get schema information for a CSV type
 * @access  Public
 * @params  csvType: payroll, rota, or timesheet
 */
router.get('/schema/:csvType', (req, res) => {
  mappingController.getSchemaInfo(req, res);
});

/**
 * @route   POST /api/v1/mapping/suggest
 * @desc    Generate intelligent column mapping suggestions
 * @access  Public (would be protected in production)
 * @body    { csvHeaders: string[], csvType?: string, uploadId?: string }
 */
router.post('/suggest', (req, res) => {
  mappingController.suggestMappings(req, res);
});

/**
 * @route   POST /api/v1/mapping/validate
 * @desc    Validate user-corrected column mappings
 * @access  Public (would be protected in production)
 * @body    { mappings: object[], originalHeaders: string[], csvType?: string }
 */
router.post('/validate', (req, res) => {
  mappingController.validateMappings(req, res);
});

/**
 * @route   POST /api/v1/mapping/test
 * @desc    Test mapping functionality with sample data
 * @access  Public (development/testing only)
 * @body    { testHeaders?: string[], csvType?: string }
 */
router.post('/test', (req, res) => {
  mappingController.testMapping(req, res);
});

module.exports = router;
