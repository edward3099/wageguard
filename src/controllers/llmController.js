/**
 * LLM Controller
 * 
 * Provides secure API endpoints for LLM functionality including:
 * - Compliance explanations
 * - CSV column mapping suggestions
 * - Health checks
 */

const LLMWrapperService = require('../services/llmWrapperService');

class LLMController {
  constructor() {
    try {
      this.llmService = new LLMWrapperService();
    } catch (error) {
      console.warn('LLM service initialization failed:', error.message);
      this.llmService = null;
    }
  }

  /**
   * Check if LLM service is available
   */
  isServiceAvailable() {
    return this.llmService !== null;
  }

  /**
   * Generate explanation for a compliance issue
   * POST /api/v1/llm/explain-compliance
   */
  async explainComplianceIssue(req, res) {
    try {
      if (!this.isServiceAvailable()) {
        return res.status(503).json({
          error: 'LLM service is not available. Please check API key configuration.',
          available: false
        });
      }

      const { issueCode, workerData, issueDetails } = req.body;

      // Validate required fields
      if (!issueCode) {
        return res.status(400).json({
          error: 'issueCode is required',
          example: {
            issueCode: 'ERR_ACCOM_OFFSET_EXCEEDED',
            workerData: { worker_name: 'John Smith', age: 25 },
            issueDetails: { offsetAmount: 12.00, dailyLimit: 9.99 }
          }
        });
      }

      // Generate explanation
      const result = await this.llmService.generateComplianceExplanation(
        issueCode,
        workerData,
        issueDetails
      );

      if (result.success) {
        res.json({
          success: true,
          explanation: result.response,
          metadata: {
            provider: result.provider,
            model: result.model,
            warnings: result.warnings || [],
            dataMasked: result.metadata?.dataMasked || false
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to generate explanation',
          details: result.error
        });
      }

    } catch (error) {
      console.error('Error in explainComplianceIssue:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Generate CSV column mapping suggestions
   * POST /api/v1/llm/suggest-mapping
   */
  async suggestColumnMapping(req, res) {
    try {
      if (!this.isServiceAvailable()) {
        return res.status(503).json({
          error: 'LLM service is not available. Please check API key configuration.',
          available: false
        });
      }

      const { columnHeaders, expectedColumns } = req.body;

      // Validate required fields
      if (!Array.isArray(columnHeaders) || !Array.isArray(expectedColumns)) {
        return res.status(400).json({
          error: 'columnHeaders and expectedColumns must be arrays',
          example: {
            columnHeaders: ['employee_name', 'hours_worked', 'gross_pay'],
            expectedColumns: ['worker_name', 'hours', 'total_pay']
          }
        });
      }

      if (columnHeaders.length === 0) {
        return res.status(400).json({
          error: 'columnHeaders cannot be empty'
        });
      }

      // Generate mapping suggestions
      const result = await this.llmService.generateColumnMappingSuggestions(
        columnHeaders,
        expectedColumns
      );

      if (result.success) {
        res.json({
          success: true,
          suggestions: result.response,
          metadata: {
            provider: result.provider,
            model: result.model,
            warnings: result.warnings || [],
            columnsAnalyzed: columnHeaders.length
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to generate mapping suggestions',
          details: result.error
        });
      }

    } catch (error) {
      console.error('Error in suggestColumnMapping:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Test data masking functionality
   * POST /api/v1/llm/test-masking
   */
  async testDataMasking(req, res) {
    try {
      if (!this.isServiceAvailable()) {
        return res.status(503).json({
          error: 'LLM service is not available. Please check API key configuration.',
          available: false
        });
      }

      const { testData } = req.body;

      if (!testData) {
        return res.status(400).json({
          error: 'testData is required',
          example: {
            testData: {
              worker_name: 'John Smith',
              worker_id: 'EMP123',
              email: 'john@company.com',
              hourlyRate: 15.50
            }
          }
        });
      }

      // Apply data masking
      const maskedData = this.llmService.maskSensitiveData(testData);

      res.json({
        success: true,
        original: testData,
        masked: maskedData,
        message: 'Data masking applied successfully'
      });

    } catch (error) {
      console.error('Error in testDataMasking:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Validate input for prompt injection
   * POST /api/v1/llm/validate-input
   */
  async validateInput(req, res) {
    try {
      if (!this.isServiceAvailable()) {
        return res.status(503).json({
          error: 'LLM service is not available. Please check API key configuration.',
          available: false
        });
      }

      const { input } = req.body;

      if (typeof input !== 'string') {
        return res.status(400).json({
          error: 'input must be a string',
          example: {
            input: 'Please explain this compliance rule'
          }
        });
      }

      // Validate and sanitize input
      const validation = this.llmService.validateAndSanitizeInput(input);

      res.json({
        success: true,
        validation: {
          isValid: validation.isValid,
          sanitizedInput: validation.sanitizedInput,
          warnings: validation.warnings,
          originalLength: input.length,
          sanitizedLength: validation.sanitizedInput.length
        }
      });

    } catch (error) {
      console.error('Error in validateInput:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Health check for LLM service
   * GET /api/v1/llm/health
   */
  async healthCheck(req, res) {
    try {
      if (!this.isServiceAvailable()) {
        return res.status(503).json({
          status: 'unhealthy',
          error: 'LLM service is not available. Please check API key configuration.',
          available: false,
          timestamp: new Date().toISOString()
        });
      }

      // Perform health check
      const health = await this.llmService.healthCheck();

      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        ...health,
        available: true,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in LLM healthCheck:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: 'Health check failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get LLM service configuration (without sensitive data)
   * GET /api/v1/llm/config
   */
  async getConfiguration(req, res) {
    try {
      if (!this.isServiceAvailable()) {
        return res.json({
          available: false,
          error: 'LLM service is not available. Please check API key configuration.',
          providers: {
            anthropic: !!process.env.ANTHROPIC_API_KEY,
            openai: !!process.env.OPENAI_API_KEY,
            google: !!process.env.GOOGLE_API_KEY
          }
        });
      }

      res.json({
        available: true,
        provider: {
          name: this.llmService.provider.name,
          model: this.llmService.provider.model,
          endpoint: this.llmService.provider.endpoint.replace(/\/[^/]*$/, '/***') // Mask endpoint path
        },
        features: {
          datamasking: true,
          promptValidation: true,
          complianceExplanations: true,
          columnMapping: true
        },
        providers: {
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          openai: !!process.env.OPENAI_API_KEY,
          google: !!process.env.GOOGLE_API_KEY
        }
      });

    } catch (error) {
      console.error('Error in getConfiguration:', error);
      res.status(500).json({
        available: false,
        error: 'Failed to get configuration',
        message: error.message
      });
    }
  }
}

module.exports = LLMController;
