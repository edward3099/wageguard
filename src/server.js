const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Import routes
const csvUploadRoutes = require('./routes/csvUploadRoutes');
const prpCalculationRoutes = require('./routes/prpCalculationRoutes');
const llmRoutes = require('./routes/llmRoutes');
const columnMappingRoutes = require('./routes/columnMappingRoutes');
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const demoRoutes = require('./routes/demoRoutes');
const complianceExplanationRoutes = require('./routes/complianceExplanationRoutes');
const evidencePackRoutes = require('./routes/evidencePackRoutes');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'WageGuard Backend',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'WageGuard Backend API',
    version: '1.0.0',
          endpoints: {
        health: '/health',
        api: '/api/v1',
        csv: '/api/v1/csv',
        prp: '/api/v1/prp',
        llm: '/api/v1/llm',
        mapping: '/api/v1/mapping',
        auth: '/api/v1/auth',
        clients: '/api/v1/clients',
        demo: '/api/v1/demo',
        compliance: '/api/v1/compliance',
        evidencePack: '/api/v1/evidence-pack'
      }
  });
});

// API routes
app.use('/api/v1/csv', csvUploadRoutes);
app.use('/api/v1/prp', prpCalculationRoutes);
app.use('/api/v1/llm', llmRoutes);
app.use('/api/v1/mapping', columnMappingRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/demo', demoRoutes);
app.use('/api/v1/compliance', complianceExplanationRoutes);
app.use('/api/v1/evidence-pack', evidencePackRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      message: 'File size exceeds the maximum limit of 10MB'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field',
      message: 'Please use the correct field name: csvFile'
    });
  }
  
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WageGuard Backend server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`📁 CSV upload endpoint available at http://localhost:${PORT}/api/v1/csv/upload`);
  console.log(`📊 PRP calculation endpoint available at http://localhost:${PORT}/api/v1/prp/health`);
});

module.exports = app;
