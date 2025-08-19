const express = require('express');
const PRPCalculationController = require('../controllers/prpCalculationController');

const router = express.Router();
const prpCalculationController = new PRPCalculationController();

/**
 * PRP Calculation Routes for WageGuard
 * All routes require authentication (middleware should be added)
 */

/**
 * @route   POST /api/v1/prp/calculate/:workerId/:payPeriodId
 * @desc    Calculate PRP for a specific worker and pay period
 * @access  Private
 * @param   workerId: string, payPeriodId: string
 */
router.post('/calculate/:workerId/:payPeriodId', async (req, res) => {
  await prpCalculationController.calculateWorkerPRP(req, res);
});

/**
 * @route   POST /api/v1/prp/calculate-bulk/:uploadId
 * @desc    Calculate PRP for all workers in a CSV upload
 * @access  Private
 * @param   uploadId: string
 */
router.post('/calculate-bulk/:uploadId', async (req, res) => {
  await prpCalculationController.calculateBulkPRP(req, res);
});

/**
 * @route   GET /api/v1/prp/history/:workerId
 * @desc    Get PRP calculation history for a worker
 * @access  Private
 * @param   workerId: string
 * @query   limit: number (optional, default: 10), offset: number (optional, default: 0)
 */
router.get('/history/:workerId', async (req, res) => {
  await prpCalculationController.getWorkerPRPHistory(req, res);
});

/**
 * @route   GET /api/v1/prp/summary/:uploadId
 * @desc    Get compliance summary for a CSV upload
 * @access  Private
 * @param   uploadId: string
 */
router.get('/summary/:uploadId', async (req, res) => {
  await prpCalculationController.getComplianceSummary(req, res);
});

/**
 * @route   GET /api/v1/prp/health
 * @desc    Health check for PRP calculation service
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PRP Calculation Service is healthy',
    timestamp: new Date().toISOString(),
    service: 'WageGuard PRP Calculation',
    version: '1.0.0',
    endpoints: {
      calculate: 'POST /api/v1/prp/calculate/:workerId/:payPeriodId',
      calculate_bulk: 'POST /api/v1/prp/calculate-bulk/:uploadId',
      history: 'GET /api/v1/prp/history/:workerId',
      summary: 'GET /api/v1/prp/summary/:uploadId'
    }
  });
});

module.exports = router;
