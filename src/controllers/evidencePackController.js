/**
 * Evidence Pack Controller
 * 
 * Handles API endpoints for generating and exporting evidence packs
 * Supports both PDF and CSV formats for compliance reporting
 */

const EvidencePackService = require('../services/evidencePackService');
const PdfGenerationService = require('../services/pdfGenerationService');
const CsvGenerationService = require('../services/csvGenerationService');
const authController = require('./authController');

class EvidencePackController {
  constructor() {
    this.evidencePackService = new EvidencePackService();
    this.pdfService = new PdfGenerationService();
    this.csvService = new CsvGenerationService();
  }

  /**
   * Generate and export evidence pack in specified format
   * POST /api/v1/evidence-pack/export
   */
  async exportEvidencePack(req, res) {
    try {
      const { uploadId, format = 'pdf', options = {} } = req.body;

      // Validate required fields
      if (!uploadId) {
        return res.status(400).json({
          success: false,
          error: 'Upload ID is required'
        });
      }

      // Validate format
      const validFormats = ['pdf', 'csv', 'both'];
      if (!validFormats.includes(format.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: `Invalid format. Must be one of: ${validFormats.join(', ')}`
        });
      }

      console.log(`📋 Generating evidence pack for upload ${uploadId} in ${format} format`);

      // Add user context to options
      const enhancedOptions = {
        ...options,
        format,
        requestedBy: req.user?.email || 'system',
        organizationId: req.user?.userId,
        organizationType: req.user?.isBureau ? 'bureau' : 'employer',
        includeExplanations: options.includeExplanations !== false // Default to true
      };

      // Generate evidence pack data
      const evidenceResult = await this.evidencePackService.generateEvidencePack(uploadId, enhancedOptions);
      
      if (!evidenceResult.success) {
        return res.status(500).json({
          success: false,
          error: evidenceResult.error,
          details: evidenceResult.details
        });
      }

      const evidencePack = evidenceResult.evidencePack;

      // Generate requested format(s)
      const result = {
        success: true,
        uploadId,
        format,
        metadata: evidencePack.metadata,
        summary: evidencePack.summary,
        generated: evidencePack.generated
      };

      if (format === 'pdf' || format === 'both') {
        const pdfBuffer = await this.pdfService.generatePDF(evidencePack, enhancedOptions);
        
        if (format === 'pdf') {
          // Return PDF directly
          const filename = `evidence_pack_${uploadId}_${new Date().toISOString().split('T')[0]}.pdf`;
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Length', pdfBuffer.length);
          
          return res.send(pdfBuffer);
        } else {
          // Include PDF in multi-format response
          result.pdf = {
            filename: `evidence_pack_${uploadId}.pdf`,
            size: pdfBuffer.length,
            data: pdfBuffer.toString('base64')
          };
        }
      }

      if (format === 'csv' || format === 'both') {
        const csvContent = await this.csvService.generateCSV(evidencePack, enhancedOptions);
        
        if (format === 'csv') {
          // Return CSV directly
          const filename = `evidence_pack_${uploadId}_${new Date().toISOString().split('T')[0]}.csv`;
          
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
          
          return res.send(csvContent);
        } else {
          // Include CSV in multi-format response
          result.csv = {
            filename: `evidence_pack_${uploadId}.csv`,
            size: Buffer.byteLength(csvContent, 'utf8'),
            data: Buffer.from(csvContent).toString('base64')
          };
        }
      }

      // Return JSON response for 'both' format
      res.json(result);

    } catch (error) {
      console.error('❌ Evidence pack export failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during evidence pack export',
        details: error.message
      });
    }
  }

  /**
   * Generate evidence pack data without export (for preview)
   * GET /api/v1/evidence-pack/preview/:uploadId
   */
  async previewEvidencePack(req, res) {
    try {
      const { uploadId } = req.params;
      const { includeExplanations = false } = req.query;

      console.log(`👁️ Generating evidence pack preview for upload ${uploadId}`);

      const options = {
        format: 'preview',
        requestedBy: req.user?.email || 'system',
        organizationId: req.user?.userId,
        organizationType: req.user?.isBureau ? 'bureau' : 'employer',
        includeExplanations: includeExplanations === 'true'
      };

      const evidenceResult = await this.evidencePackService.generateEvidencePack(uploadId, options);

      if (!evidenceResult.success) {
        return res.status(500).json({
          success: false,
          error: evidenceResult.error,
          details: evidenceResult.details
        });
      }

      // Return preview data without generating actual files
      res.json({
        success: true,
        uploadId,
        preview: {
          metadata: evidenceResult.evidencePack.metadata,
          summary: evidenceResult.evidencePack.summary,
          workerCount: evidenceResult.evidencePack.workers.length,
          explanationCount: evidenceResult.evidencePack.explanations.length,
          complianceRulesCount: evidenceResult.evidencePack.complianceRules.length,
          generated: evidenceResult.evidencePack.generated
        }
      });

    } catch (error) {
      console.error('❌ Evidence pack preview failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during evidence pack preview',
        details: error.message
      });
    }
  }

  /**
   * Generate CSV package with multiple files
   * POST /api/v1/evidence-pack/csv-package
   */
  async exportCSVPackage(req, res) {
    try {
      const { uploadId, options = {} } = req.body;

      if (!uploadId) {
        return res.status(400).json({
          success: false,
          error: 'Upload ID is required'
        });
      }

      console.log(`📊 Generating CSV package for upload ${uploadId}`);

      const enhancedOptions = {
        ...options,
        format: 'csv-package',
        requestedBy: req.user?.email || 'system',
        organizationId: req.user?.userId,
        organizationType: req.user?.isBureau ? 'bureau' : 'employer',
        includeExplanations: options.includeExplanations !== false
      };

      // Generate evidence pack data
      const evidenceResult = await this.evidencePackService.generateEvidencePack(uploadId, enhancedOptions);
      
      if (!evidenceResult.success) {
        return res.status(500).json({
          success: false,
          error: evidenceResult.error,
          details: evidenceResult.details
        });
      }

      // Generate CSV package
      const csvFiles = await this.csvService.generateCSVPackage(evidenceResult.evidencePack);

      // Return package information
      res.json({
        success: true,
        uploadId,
        format: 'csv-package',
        files: Object.keys(csvFiles).map(filename => ({
          filename,
          size: Buffer.byteLength(csvFiles[filename], 'utf8'),
          data: Buffer.from(csvFiles[filename]).toString('base64')
        })),
        summary: evidenceResult.evidencePack.summary,
        generated: evidenceResult.evidencePack.generated
      });

    } catch (error) {
      console.error('❌ CSV package export failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during CSV package export',
        details: error.message
      });
    }
  }

  /**
   * Get available export formats and options
   * GET /api/v1/evidence-pack/formats
   */
  async getExportFormats(req, res) {
    try {
      const formats = {
        pdf: {
          name: 'PDF Report',
          description: 'Professional PDF document with complete compliance analysis',
          features: [
            'Executive summary with risk assessment',
            'Detailed worker compliance table',
            'AI-generated explanations for issues',
            'Compliance rules reference',
            'Professional formatting for audit purposes'
          ],
          mimeType: 'application/pdf',
          fileExtension: '.pdf'
        },
        csv: {
          name: 'CSV Data Export',
          description: 'Comprehensive CSV file with all compliance data',
          features: [
            'Summary statistics and metadata',
            'Complete worker compliance details',
            'AI explanations in structured format',
            'Compliance rules reference',
            'Machine-readable format for analysis'
          ],
          mimeType: 'text/csv',
          fileExtension: '.csv'
        },
        'csv-package': {
          name: 'CSV Package',
          description: 'Multiple CSV files for different data aspects',
          features: [
            'Main evidence pack file',
            'Simplified worker summary',
            'Non-compliant workers only',
            'Review required workers only',
            'Audit trail log'
          ],
          mimeType: 'application/json',
          fileExtension: '.zip (multiple .csv files)'
        },
        both: {
          name: 'PDF + CSV Combined',
          description: 'Both PDF and CSV formats in single request',
          features: [
            'All PDF features',
            'All CSV features',
            'Base64 encoded file data',
            'JSON response with both formats'
          ],
          mimeType: 'application/json',
          fileExtension: '.pdf + .csv'
        }
      };

      const options = {
        includeExplanations: {
          type: 'boolean',
          default: true,
          description: 'Include AI-generated explanations for compliance issues'
        },
        riskAssessment: {
          type: 'boolean',
          default: true,
          description: 'Include detailed risk assessment and recommendations'
        },
        complianceRules: {
          type: 'boolean',
          default: true,
          description: 'Include compliance rules reference section'
        }
      };

      res.json({
        success: true,
        availableFormats: formats,
        exportOptions: options,
        recommendations: {
          audit: 'Use PDF format for formal audit submissions',
          analysis: 'Use CSV format for data analysis and processing',
          comprehensive: 'Use CSV package for complete data breakdown',
          combined: 'Use "both" format for complete documentation'
        }
      });

    } catch (error) {
      console.error('❌ Failed to get export formats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching export formats'
      });
    }
  }

  /**
   * Health check for evidence pack service
   * GET /api/v1/evidence-pack/health
   */
  async healthCheck(req, res) {
    try {
      const health = {
        evidencePackService: 'operational',
        pdfGeneration: 'operational',
        csvGeneration: 'operational',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };

      // Test basic functionality
      try {
        // Test CSV generation
        const testData = { test: 'data' };
        await this.csvService.stringifyAsync([testData], { header: true });
        
        health.csvGeneration = 'healthy';
      } catch (error) {
        health.csvGeneration = 'degraded';
        health.csvError = error.message;
      }

      // Determine overall status
      const allHealthy = Object.values(health)
        .filter(val => typeof val === 'string' && val !== health.timestamp && val !== health.version)
        .every(status => status === 'operational' || status === 'healthy');

      health.overall = allHealthy ? 'healthy' : 'degraded';

      res.status(allHealthy ? 200 : 503).json({
        success: allHealthy,
        health
      });

    } catch (error) {
      console.error('❌ Health check failed:', error);
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        details: error.message
      });
    }
  }

  /**
   * Test evidence pack generation with sample data
   * POST /api/v1/evidence-pack/test
   */
  async testEvidencePackGeneration(req, res) {
    try {
      const { format = 'preview', testSize = 'small' } = req.body;

      console.log(`🧪 Testing evidence pack generation with ${testSize} dataset`);

      // Generate test data
      const testEvidencePack = this.generateTestData(testSize);

      let result = {
        success: true,
        testSize,
        format,
        summary: testEvidencePack.summary,
        generated: testEvidencePack.generated
      };

      if (format === 'pdf') {
        const pdfBuffer = await this.pdfService.generatePDF(testEvidencePack);
        result.pdf = {
          size: pdfBuffer.length,
          generated: true
        };
      } else if (format === 'csv') {
        const csvContent = await this.csvService.generateCSV(testEvidencePack);
        result.csv = {
          size: Buffer.byteLength(csvContent, 'utf8'),
          generated: true
        };
      } else if (format === 'both') {
        const pdfBuffer = await this.pdfService.generatePDF(testEvidencePack);
        const csvContent = await this.csvService.generateCSV(testEvidencePack);
        result.pdf = { size: pdfBuffer.length, generated: true };
        result.csv = { size: Buffer.byteLength(csvContent, 'utf8'), generated: true };
      }

      res.json(result);

    } catch (error) {
      console.error('❌ Test generation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Test generation failed',
        details: error.message
      });
    }
  }

  /**
   * Generate test data for testing
   * @param {string} size - Test data size (small, medium, large)
   * @returns {Object} Test evidence pack
   */
  generateTestData(size = 'small') {
    const workerCounts = { small: 5, medium: 20, large: 100 };
    const workerCount = workerCounts[size] || 5;

    const workers = [];
    for (let i = 1; i <= workerCount; i++) {
      const rate = 8 + Math.random() * 5; // Random rate between 8-13
      const hours = 35 + Math.random() * 10; // Random hours between 35-45
      const pay = rate * hours;
      
      workers.push({
        id: i,
        worker_id: `TEST${i.toString().padStart(3, '0')}`,
        worker_name: `Test Worker ${i}`,
        age: 18 + Math.floor(Math.random() * 50),
        total_hours: hours,
        total_pay: pay,
        effective_hourly_rate: rate,
        rag_status: rate < 10.42 ? 'RED' : rate < 11 ? 'AMBER' : 'GREEN',
        rag_reason: rate < 10.42 ? 'Below minimum wage' : rate < 11 ? 'Review recommended' : 'Compliant',
        shortfall_amount: rate < 10.42 ? (10.42 - rate) * hours : 0,
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        period_type: 'monthly'
      });
    }

    const compliant = workers.filter(w => w.rag_status === 'GREEN').length;
    const reviewRequired = workers.filter(w => w.rag_status === 'AMBER').length;
    const nonCompliant = workers.filter(w => w.rag_status === 'RED').length;

    return {
      metadata: {
        title: 'Test Evidence Pack',
        subtitle: `Test compliance report for ${workerCount} workers`,
        organization: { id: 'test', type: 'employer' },
        compliance: {
          framework: 'UK National Minimum Wage / National Living Wage',
          regulations: ['National Minimum Wage Act 1998']
        },
        disclaimer: 'This is test data for demonstration purposes only.'
      },
      uploadInfo: {
        id: 'test',
        filename: `test-${size}-dataset.csv`,
        uploadDate: new Date().toISOString(),
        totalWorkers: workerCount
      },
      summary: {
        totalWorkers: workerCount,
        compliant,
        reviewRequired,
        nonCompliant,
        complianceRate: (compliant / workerCount) * 100,
        financialImpact: {
          totalShortfall: workers.reduce((sum, w) => sum + w.shortfall_amount, 0),
          averageShortfall: 0,
          currency: 'GBP'
        },
        riskLevel: {
          level: nonCompliant > 0 ? 'HIGH' : reviewRequired > 0 ? 'MEDIUM' : 'LOW',
          description: 'Test risk assessment',
          recommendations: ['Review test data', 'Verify calculations']
        }
      },
      workers,
      complianceRules: [
        {
          id: 'TEST_NMW',
          title: 'Test NMW Rules',
          description: 'Test compliance rules for demonstration',
          rates: { 'Test Rate': '£10.42' },
          source: 'Test Source',
          url: 'https://example.com',
          lastUpdated: new Date().toISOString()
        }
      ],
      explanations: [],
      generated: {
        timestamp: new Date().toISOString(),
        requestedBy: 'test-system',
        format: 'test',
        version: '1.0.0'
      }
    };
  }
}

module.exports = new EvidencePackController();
