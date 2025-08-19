const express = require('express');
const CSVUploadController = require('../controllers/csvUploadController');
const FileUploadService = require('../services/fileUploadService');

const router = express.Router();
const csvUploadController = new CSVUploadController();
const fileUploadService = new FileUploadService();

/**
 * CSV Upload Routes for WageGuard
 * All routes require authentication (middleware should be added)
 */

// Get multer upload middleware
const upload = fileUploadService.getUploadMiddleware();

/**
 * @route   POST /api/v1/csv/upload
 * @desc    Upload and parse CSV file
 * @access  Private
 * @body    csvFile: CSV file, csvType: string (optional)
 */
router.post('/upload', upload, async (req, res) => {
  await csvUploadController.uploadCSV(req, res);
});

/**
 * @route   GET /api/v1/csv/uploads
 * @desc    List user's CSV uploads
 * @access  Private
 */
router.get('/uploads', async (req, res) => {
  await csvUploadController.listUploads(req, res);
});

/**
 * @route   GET /api/v1/csv/uploads/:uploadId
 * @desc    Get specific CSV upload status and details
 * @access  Private
 * @param   uploadId: string
 */
router.get('/uploads/:uploadId', async (req, res) => {
  await csvUploadController.getUploadStatus(req, res);
});

/**
 * @route   DELETE /api/v1/csv/uploads/:uploadId
 * @desc    Delete CSV upload and associated data
 * @access  Private
 * @param   uploadId: string
 */
router.delete('/uploads/:uploadId', async (req, res) => {
  await csvUploadController.deleteUpload(req, res);
});

/**
 * @route   GET /api/v1/csv/health
 * @desc    Health check for CSV upload service
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CSV Upload Service is healthy',
    timestamp: new Date().toISOString(),
    service: 'WageGuard CSV Upload',
    version: '1.0.0'
  });
});

module.exports = router;
