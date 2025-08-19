/**
 * Column Mapping Controller
 * 
 * Handles CSV column header mapping with LLM assistance and user confirmation
 */

const ColumnMappingService = require('../services/columnMappingService');

class ColumnMappingController {
  constructor() {
    this.mappingService = new ColumnMappingService();
  }

  /**
   * Generate column mapping suggestions for CSV headers
   * POST /api/v1/mapping/suggest
   */
  async suggestMappings(req, res) {
    try {
      const { csvHeaders, csvType = 'payroll', uploadId } = req.body;

      // Validate input
      if (!csvHeaders || !Array.isArray(csvHeaders)) {
        return res.status(400).json({
          success: false,
          error: 'csvHeaders is required and must be an array',
          example: {
            csvHeaders: ['employee_name', 'hours_worked', 'gross_pay'],
            csvType: 'payroll',
            uploadId: 'optional-upload-id'
          }
        });
      }

      if (csvHeaders.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'csvHeaders cannot be empty'
        });
      }

      // Validate csvType
      const validTypes = ['payroll', 'rota', 'timesheet'];
      if (!validTypes.includes(csvType)) {
        return res.status(400).json({
          success: false,
          error: `csvType must be one of: ${validTypes.join(', ')}`
        });
      }

      console.log(`🔄 Generating mapping suggestions for ${csvHeaders.length} headers (type: ${csvType})`);

      // Generate mapping suggestions
      const mappingResult = await this.mappingService.generateColumnMappings(csvHeaders, csvType);

      if (!mappingResult.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate mapping suggestions',
          details: mappingResult.error
        });
      }

      res.json({
        success: true,
        mappings: mappingResult.mappings,
        unmapped: mappingResult.unmapped,
        metadata: {
          method: mappingResult.method,
          provider: mappingResult.provider,
          overallConfidence: mappingResult.confidence,
          csvType,
          totalHeaders: csvHeaders.length,
          mappedHeaders: mappingResult.mappings.length,
          unmappedHeaders: mappingResult.unmapped.length,
          warnings: mappingResult.warnings || []
        },
        uploadId
      });

    } catch (error) {
      console.error('Error in suggestMappings:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Validate user-corrected mappings
   * POST /api/v1/mapping/validate
   */
  async validateMappings(req, res) {
    try {
      const { mappings, originalHeaders, csvType = 'payroll' } = req.body;

      // Validate input
      if (!mappings || !Array.isArray(mappings)) {
        return res.status(400).json({
          success: false,
          error: 'mappings is required and must be an array',
          example: {
            mappings: [
              {
                csvHeader: 'employee_name',
                suggestedField: 'worker_name'
              }
            ],
            originalHeaders: ['employee_name', 'hours_worked'],
            csvType: 'payroll'
          }
        });
      }

      if (!originalHeaders || !Array.isArray(originalHeaders)) {
        return res.status(400).json({
          success: false,
          error: 'originalHeaders is required and must be an array'
        });
      }

      // Validate user mappings
      const validationResult = this.mappingService.validateUserMappings(mappings, originalHeaders);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Mapping validation failed',
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });
      }

      res.json({
        success: true,
        validMappings: validationResult.mappings,
        metadata: {
          csvType,
          validatedMappings: validationResult.mappings.length,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        }
      });

    } catch (error) {
      console.error('Error in validateMappings:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get schema information for a CSV type
   * GET /api/v1/mapping/schema/:csvType
   */
  async getSchemaInfo(req, res) {
    try {
      const { csvType } = req.params;

      // Validate csvType
      const validTypes = ['payroll', 'rota', 'timesheet'];
      if (!validTypes.includes(csvType)) {
        return res.status(400).json({
          success: false,
          error: `csvType must be one of: ${validTypes.join(', ')}`
        });
      }

      const schemaInfo = this.mappingService.getSchemaInfo(csvType);

      res.json({
        success: true,
        schema: schemaInfo,
        availableTypes: validTypes
      });

    } catch (error) {
      console.error('Error in getSchemaInfo:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Test mapping with sample data
   * POST /api/v1/mapping/test
   */
  async testMapping(req, res) {
    try {
      // Only allow in development/test environments
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          error: 'Test endpoints are not available in production'
        });
      }

      const { testHeaders, csvType = 'payroll' } = req.body;

      if (!testHeaders) {
        // Provide sample test data
        const sampleData = {
          payroll: [
            'employee_name', 'emp_id', 'hours_worked', 'gross_pay', 
            'start_date', 'end_date', 'uniform_cost', 'accommodation_fee'
          ],
          rota: [
            'staff_name', 'worker_id', 'shift_date', 'clock_in', 
            'clock_out', 'break_time', 'night_premium'
          ],
          timesheet: [
            'worker', 'id', 'date', 'hrs', 'rate', 'total', 'bonus'
          ]
        };

        return res.json({
          success: true,
          message: 'Test endpoint for column mapping',
          sampleData,
          usage: {
            endpoint: 'POST /api/v1/mapping/test',
            body: {
              testHeaders: sampleData.payroll,
              csvType: 'payroll'
            }
          }
        });
      }

      if (!Array.isArray(testHeaders)) {
        return res.status(400).json({
          success: false,
          error: 'testHeaders must be an array'
        });
      }

      // Generate test mappings
      const mappingResult = await this.mappingService.generateColumnMappings(testHeaders, csvType);

      res.json({
        success: true,
        testResult: mappingResult,
        inputHeaders: testHeaders,
        csvType
      });

    } catch (error) {
      console.error('Error in testMapping:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get mapping statistics and health info
   * GET /api/v1/mapping/health
   */
  async getHealthInfo(req, res) {
    try {
      const health = {
        status: 'healthy',
        services: {
          columnMapping: true,
          llmService: this.mappingService.llmAvailable,
          fallbackMapping: true
        },
        features: {
          intelligentMapping: this.mappingService.llmAvailable,
          ruleBasedFallback: true,
          userValidation: true,
          confidenceScoring: true
        },
        supportedTypes: ['payroll', 'rota', 'timesheet'],
        schemaFields: Object.keys(this.mappingService.schemaDefinitions).length,
        timestamp: new Date().toISOString()
      };

      res.json(health);

    } catch (error) {
      console.error('Error in getHealthInfo:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: 'Health check failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = ColumnMappingController;
