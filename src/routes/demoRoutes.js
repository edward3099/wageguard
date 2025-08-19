/**
 * Demo Routes
 * 
 * Provides endpoints to demonstrate the multi-tenancy architecture
 */

const express = require('express');
const demoController = require('../controllers/demoController');

const router = express.Router();

/**
 * @route   GET /api/demo/multi-tenancy
 * @desc    Get multi-tenancy architecture overview
 * @access  Public
 */
router.get('/multi-tenancy', (req, res) => {
  demoController.getMultiTenancyOverview(req, res);
});

/**
 * @route   GET /api/demo/bureau-dashboard
 * @desc    Get bureau dashboard demo with mock data
 * @access  Public
 */
router.get('/bureau-dashboard', (req, res) => {
  demoController.getBureauDashboard(req, res);
});

/**
 * @route   GET /api/demo/employer-dashboard
 * @desc    Get employer dashboard demo with mock data
 * @access  Public
 */
router.get('/employer-dashboard', (req, res) => {
  demoController.getEmployerDashboard(req, res);
});

/**
 * @route   GET /api/demo/client/:clientId
 * @desc    Get client details demo
 * @access  Public
 */
router.get('/client/:clientId', (req, res) => {
  demoController.getClientDetails(req, res);
});

/**
 * @route   GET /api/demo/organization-switching
 * @desc    Get organization switching capabilities demo
 * @access  Public
 */
router.get('/organization-switching', (req, res) => {
  demoController.getOrganizationSwitching(req, res);
});

/**
 * @route   GET /api/demo/security-compliance
 * @desc    Get security and compliance features demo
 * @access  Public
 */
router.get('/security-compliance', (req, res) => {
  demoController.getSecurityCompliance(req, res);
});

module.exports = router;
