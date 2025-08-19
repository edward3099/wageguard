/**
 * Compliance Explanation Controller
 * 
 * Handles API endpoints for generating LLM-powered explanations
 * of compliance flags and issues
 */

const ComplianceExplanationService = require('../services/complianceExplanationService');
const authController = require('./authController');

class ComplianceExplanationController {
  constructor() {
    this.explanationService = new ComplianceExplanationService();
  }

  /**
   * Generate explanation for a single compliance issue
   * POST /api/v1/compliance/explain
   */
  async explainIssue(req, res) {
    try {
      const { issueCode, workerData = {}, issueDetails = {}, options = {} } = req.body;

      // Validate required fields
      if (!issueCode) {
        return res.status(400).json({
          success: false,
          error: 'Issue code is required'
        });
      }

      // Add organization context to options for audit logging
      const enhancedOptions = {
        ...options,
        organizationId: req.user?.userId,
        organizationType: req.user?.isBureau ? 'bureau' : 'employer',
        requestedBy: req.user?.email
      };

      // Generate explanation
      const result = await this.explanationService.generateExplanation(
        issueCode,
        workerData,
        issueDetails,
        enhancedOptions
      );

      // Log the explanation request for audit purposes
      console.log(`🤖 Explanation generated for ${issueCode} by user ${req.user?.email || 'anonymous'}`);

      if (result.success) {
        res.json({
          success: true,
          explanation: result.explanation,
          issueCode: result.issueCode,
          metadata: result.llmMetadata
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          details: result.details,
          fallbackExplanation: result.fallbackExplanation
        });
      }

    } catch (error) {
      console.error('❌ Explanation generation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while generating explanation',
        details: error.message
      });
    }
  }

  /**
   * Generate explanations for multiple compliance issues
   * POST /api/v1/compliance/explain-batch
   */
  async explainBatchIssues(req, res) {
    try {
      const { issues, options = {} } = req.body;

      // Validate required fields
      if (!issues || !Array.isArray(issues) || issues.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Issues array is required and must not be empty'
        });
      }

      // Validate each issue has required fields
      for (let i = 0; i < issues.length; i++) {
        if (!issues[i].issueCode) {
          return res.status(400).json({
            success: false,
            error: `Issue at index ${i} is missing required issueCode field`
          });
        }
      }

      // Limit batch size to prevent abuse
      const maxBatchSize = 10;
      if (issues.length > maxBatchSize) {
        return res.status(400).json({
          success: false,
          error: `Batch size limited to ${maxBatchSize} issues. Received ${issues.length}.`
        });
      }

      // Add organization context
      const enhancedOptions = {
        ...options,
        organizationId: req.user?.userId,
        organizationType: req.user?.isBureau ? 'bureau' : 'employer',
        requestedBy: req.user?.email
      };

      // Generate batch explanations
      const result = await this.explanationService.generateBatchExplanations(
        issues,
        enhancedOptions
      );

      console.log(`🤖 Batch explanations generated for ${issues.length} issues by user ${req.user?.email || 'anonymous'}`);

      res.json({
        success: result.success,
        results: result.results,
        summary: result.summary,
        batchSize: issues.length
      });

    } catch (error) {
      console.error('❌ Batch explanation generation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while generating batch explanations',
        details: error.message
      });
    }
  }

  /**
   * Get available error codes and their descriptions
   * GET /api/v1/compliance/error-codes
   */
  async getErrorCodes(req, res) {
    try {
      const errorCodes = this.explanationService.getErrorCodes();
      
      // Transform for API response
      const transformedCodes = Object.entries(errorCodes).map(([code, info]) => ({
        code,
        ...info
      }));

      res.json({
        success: true,
        errorCodes: transformedCodes,
        totalCodes: transformedCodes.length,
        categories: [...new Set(transformedCodes.map(code => code.category))]
      });

    } catch (error) {
      console.error('❌ Failed to get error codes:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching error codes'
      });
    }
  }

  /**
   * Get error codes filtered by category
   * GET /api/v1/compliance/error-codes/:category
   */
  async getErrorCodesByCategory(req, res) {
    try {
      const { category } = req.params;
      const errorCodes = this.explanationService.getErrorCodes();
      
      // Filter by category
      const filteredCodes = Object.entries(errorCodes)
        .filter(([code, info]) => info.category === category)
        .map(([code, info]) => ({
          code,
          ...info
        }));

      if (filteredCodes.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No error codes found for category: ${category}`,
          availableCategories: [...new Set(Object.values(errorCodes).map(info => info.category))]
        });
      }

      res.json({
        success: true,
        category,
        errorCodes: filteredCodes,
        count: filteredCodes.length
      });

    } catch (error) {
      console.error('❌ Failed to get error codes by category:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching error codes by category'
      });
    }
  }

  /**
   * Health check for compliance explanation service
   * GET /api/v1/compliance/explain/health
   */
  async healthCheck(req, res) {
    try {
      const health = await this.explanationService.healthCheck();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status !== 'unhealthy',
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
   * Test explanation generation with sample data
   * POST /api/v1/compliance/explain/test
   */
  async testExplanation(req, res) {
    try {
      // Predefined test scenarios
      const testScenarios = [
        {
          issueCode: 'RATE_BELOW_MINIMUM',
          workerData: {
            worker_id: 'TEST001',
            age: 25,
            worker_type: 'adult'
          },
          issueDetails: {
            effective_hourly_rate: 8.50,
            required_hourly_rate: 10.42,
            total_hours: 40,
            total_pay: 340,
            shortfall_amount: 76.80,
            shortfall_percentage: 18.4
          }
        },
        {
          issueCode: 'ACCOMMODATION_OFFSET_EXCEEDED',
          workerData: {
            worker_id: 'TEST002',
            age: 22
          },
          issueDetails: {
            accommodation_offset: 12.50,
            daily_limit: 9.99,
            excess_amount: 2.51,
            days_applied: 7
          }
        },
        {
          issueCode: 'EXCESSIVE_DEDUCTIONS',
          workerData: {
            worker_id: 'TEST003',
            age: 19
          },
          issueDetails: {
            total_deductions: 200,
            total_pay: 350,
            deduction_percentage: 57.1,
            uniform_deduction: 50,
            tools_deduction: 75,
            other_deductions: 75
          }
        }
      ];

      // Allow user to specify which test or run a specific one
      const { testIndex, customTest } = req.body;
      
      let testData;
      if (customTest) {
        testData = customTest;
      } else {
        const index = testIndex || 0;
        if (index < 0 || index >= testScenarios.length) {
          return res.status(400).json({
            success: false,
            error: `Invalid test index. Must be between 0 and ${testScenarios.length - 1}`,
            availableTests: testScenarios.map((test, i) => ({
              index: i,
              issueCode: test.issueCode
            }))
          });
        }
        testData = testScenarios[index];
      }

      // Generate test explanation
      const result = await this.explanationService.generateExplanation(
        testData.issueCode,
        testData.workerData,
        testData.issueDetails,
        { testMode: true }
      );

      res.json({
        success: result.success,
        testData,
        explanation: result.explanation,
        metadata: result.llmMetadata,
        fallbackExplanation: result.fallbackExplanation,
        availableTests: testScenarios.map((test, i) => ({
          index: i,
          issueCode: test.issueCode,
          description: test.issueDetails
        }))
      });

    } catch (error) {
      console.error('❌ Test explanation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during test explanation',
        details: error.message
      });
    }
  }
}

module.exports = new ComplianceExplanationController();
