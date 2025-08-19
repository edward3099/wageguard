/**
 * Client Management Routes
 * 
 * Provides endpoints for bureaus to manage their clients
 */

const express = require('express');
const clientController = require('../controllers/clientController');
const authController = require('../controllers/authController');

const router = express.Router();

// All client routes require authentication and bureau access
router.use(authController.verifyToken);
router.use(authController.requireBureau);

/**
 * @route   POST /api/clients
 * @desc    Create a new client for a bureau
 * @access  Private (Bureau only)
 */
router.post('/', (req, res) => {
  clientController.createClient(req, res);
});

/**
 * @route   GET /api/clients
 * @desc    Get all clients for a bureau
 * @access  Private (Bureau only)
 */
router.get('/', (req, res) => {
  clientController.getClients(req, res);
});

/**
 * @route   GET /api/clients/:clientId
 * @desc    Get a specific client by ID
 * @access  Private (Bureau only)
 */
router.get('/:clientId', (req, res) => {
  clientController.getClient(req, res);
});

/**
 * @route   PUT /api/clients/:clientId
 * @desc    Update a client
 * @access  Private (Bureau only)
 */
router.put('/:clientId', (req, res) => {
  clientController.updateClient(req, res);
});

/**
 * @route   DELETE /api/clients/:clientId
 * @desc    Delete a client (soft delete)
 * @access  Private (Bureau only)
 */
router.delete('/:clientId', (req, res) => {
  clientController.deleteClient(req, res);
});

/**
 * @route   GET /api/clients/:clientId/compliance-summary
 * @desc    Get client compliance summary and trends
 * @access  Private (Bureau only)
 */
router.get('/:clientId/compliance-summary', (req, res) => {
  clientController.getClientComplianceSummary(req, res);
});

module.exports = router;
