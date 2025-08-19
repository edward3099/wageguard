/**
 * Compliance Explanation Service Tests
 * 
 * Tests the compliance explanation service and integration with LLM wrapper
 */

const ComplianceExplanationService = require('../src/services/complianceExplanationService');

// Mock the LLM wrapper service to avoid requiring API keys in tests
jest.mock('../src/services/llmWrapperService', () => {
  return jest.fn().mockImplementation(() => ({
    generateComplianceExplanation: jest.fn().mockResolvedValue({
      success: true,
      response: 'This is a mock compliance explanation that explains the issue in detail.',
      provider: 'mock',
      model: 'mock-model',
      responseTime: 100,
      tokensUsed: 50
    }),
    healthCheck: jest.fn().mockResolvedValue({
      status: 'healthy',
      provider: 'mock',
      model: 'mock-model'
    })
  }));
});

describe('ComplianceExplanationService', () => {
  let explanationService;

  beforeEach(() => {
    // Create service instance for each test
    explanationService = new ComplianceExplanationService();
  });

  describe('Service Initialization', () => {
    test('should initialize with error codes loaded', () => {
      const errorCodes = explanationService.getErrorCodes();
      expect(Object.keys(errorCodes).length).toBeGreaterThan(0);
      expect(errorCodes).toHaveProperty('RATE_BELOW_MINIMUM');
      expect(errorCodes).toHaveProperty('ACCOMMODATION_OFFSET_EXCEEDED');
      expect(errorCodes).toHaveProperty('EXCESSIVE_DEDUCTIONS');
    });

    test('should have proper error code structure', () => {
      const errorCodes = explanationService.getErrorCodes();
      const sampleCode = errorCodes['RATE_BELOW_MINIMUM'];
      
      expect(sampleCode).toHaveProperty('category');
      expect(sampleCode).toHaveProperty('title');
      expect(sampleCode).toHaveProperty('shortDescription');
      expect(['critical', 'warning', 'action', 'info', 'error']).toContain(sampleCode.category);
    });
  });

  describe('Explanation Generation', () => {
    test('should generate explanation for rate below minimum', async () => {
      const issueCode = 'RATE_BELOW_MINIMUM';
      const workerData = {
        worker_id: 'TEST001',
        worker_name: 'Test Worker',
        age: 25
      };
      const issueDetails = {
        effective_hourly_rate: 8.50,
        required_hourly_rate: 10.42,
        total_hours: 40,
        total_pay: 340
      };

      const result = await explanationService.generateExplanation(
        issueCode,
        workerData,
        issueDetails
      );

      expect(result.success).toBe(true);
      expect(result.issueCode).toBe(issueCode);
      expect(result.explanation).toHaveProperty('title');
      expect(result.explanation).toHaveProperty('category');
      expect(result.explanation).toHaveProperty('detailedExplanation');
      expect(result.explanation).toHaveProperty('actionRequired');
      expect(result.explanation.category).toBe('critical');
    });

    test('should generate explanation for accommodation offset exceeded', async () => {
      const issueCode = 'ACCOMMODATION_OFFSET_EXCEEDED';
      const workerData = {
        worker_id: 'TEST002',
        age: 22
      };
      const issueDetails = {
        accommodation_offset: 12.50,
        daily_limit: 9.99,
        excess_amount: 2.51
      };

      const result = await explanationService.generateExplanation(
        issueCode,
        workerData,
        issueDetails
      );

      expect(result.success).toBe(true);
      expect(result.explanation.category).toBe('critical');
      expect(result.explanation.urgency).toBe('immediate');
    });

    test('should handle unknown issue codes gracefully', async () => {
      const issueCode = 'UNKNOWN_CODE';
      const workerData = { worker_id: 'TEST003' };
      const issueDetails = {};

      const result = await explanationService.generateExplanation(
        issueCode,
        workerData,
        issueDetails
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown issue code');
      expect(result.fallbackExplanation).toBeDefined();
      expect(result.fallbackExplanation.title).toBe('Compliance Issue Detected');
    });
  });

  describe('Batch Explanation Generation', () => {
    test('should generate explanations for multiple issues', async () => {
      const issues = [
        {
          issueCode: 'RATE_BELOW_MINIMUM',
          workerData: { worker_id: 'W001', age: 25 },
          issueDetails: { effective_hourly_rate: 8.50, required_hourly_rate: 10.42 }
        },
        {
          issueCode: 'EXCESSIVE_DEDUCTIONS',
          workerData: { worker_id: 'W002', age: 30 },
          issueDetails: { total_deductions: 200, total_pay: 350 }
        },
        {
          issueCode: 'DATA_INSUFFICIENT',
          workerData: { worker_id: 'W003' },
          issueDetails: {}
        }
      ];

      const result = await explanationService.generateBatchExplanations(issues);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBeGreaterThan(0);
      
      // Check that each result has the expected structure
      result.results.forEach(explanationResult => {
        expect(explanationResult).toHaveProperty('issueCode');
        expect(explanationResult).toHaveProperty('workerId');
        expect(explanationResult).toHaveProperty('success');
      });
    });

    test('should handle batch processing with mixed valid and invalid codes', async () => {
      const issues = [
        {
          issueCode: 'RATE_BELOW_MINIMUM',
          workerData: { worker_id: 'W001' },
          issueDetails: { effective_hourly_rate: 8.50 }
        },
        {
          issueCode: 'INVALID_CODE',
          workerData: { worker_id: 'W002' },
          issueDetails: {}
        }
      ];

      const result = await explanationService.generateBatchExplanations(issues);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
    });
  });

  describe('Fallback Explanation Generation', () => {
    test('should generate fallback explanation for known codes', () => {
      const fallback = explanationService.generateFallbackExplanation(
        'RATE_BELOW_MINIMUM',
        { effective_hourly_rate: 8.50 }
      );

      expect(fallback).toHaveProperty('title');
      expect(fallback).toHaveProperty('description');
      expect(fallback).toHaveProperty('action');
      expect(fallback).toHaveProperty('category');
      expect(fallback.title).toBe('Pay Below Minimum Wage');
    });

    test('should generate generic fallback for unknown codes', () => {
      const fallback = explanationService.generateFallbackExplanation(
        'UNKNOWN_CODE',
        {}
      );

      expect(fallback.title).toBe('Compliance Issue Detected');
      expect(fallback.action).toBe('Manual review required');
    });
  });

  describe('Utility Methods', () => {
    test('should determine correct urgency levels', () => {
      expect(explanationService.determineUrgency('critical')).toBe('immediate');
      expect(explanationService.determineUrgency('warning')).toBe('medium');
      expect(explanationService.determineUrgency('action')).toBe('medium');
      expect(explanationService.determineUrgency('info')).toBe('low');
      expect(explanationService.determineUrgency('error')).toBe('high');
      expect(explanationService.determineUrgency('unknown')).toBe('medium');
    });

    test('should provide relevant regulations for categories', () => {
      const criticalRegs = explanationService.getRelevantRegulations('critical');
      expect(criticalRegs).toContain('National Minimum Wage Act 1998');
      
      const warningRegs = explanationService.getRelevantRegulations('warning');
      expect(warningRegs).toContain('National Minimum Wage Regulations 2015');
      
      const unknownRegs = explanationService.getRelevantRegulations('unknown');
      expect(unknownRegs).toContain('General payroll compliance requirements');
    });

    test('should provide reference links', () => {
      const references = explanationService.getReferences('RATE_BELOW_MINIMUM');
      expect(Array.isArray(references)).toBe(true);
      expect(references.length).toBeGreaterThan(0);
      expect(references[0]).toContain('gov.uk');
    });
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const health = await explanationService.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('explanationService');
      expect(health).toHaveProperty('errorCodesLoaded');
      expect(health).toHaveProperty('capabilities');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.errorCodesLoaded).toBeGreaterThan(0);
      expect(health.capabilities.singleExplanation).toBe(true);
      expect(health.capabilities.batchExplanation).toBe(true);
      expect(health.capabilities.fallbackMode).toBe(true);
    });
  });

  describe('Context Preparation', () => {
    test('should prepare structured context correctly', () => {
      const errorInfo = { category: 'critical', title: 'Test Issue', shortDescription: 'Test' };
      const issueDetails = {
        effective_hourly_rate: 8.50,
        required_hourly_rate: 10.42,
        total_deductions: 100
      };
      const workerData = { worker_id: 'TEST001' };

      const context = explanationService.prepareStructuredContext(errorInfo, issueDetails, workerData);

      expect(context).toHaveProperty('issue');
      expect(context).toHaveProperty('details');
      expect(context).toHaveProperty('relevantRegulations');
      expect(context).toHaveProperty('actionPriority');
      expect(context).toHaveProperty('rateComparison');
      expect(context).toHaveProperty('deductionInfo');

      expect(context.rateComparison.effective).toBe(8.50);
      expect(context.rateComparison.required).toBe(10.42);
      expect(context.rateComparison.shortfall).toBeCloseTo(1.92, 2);
      expect(context.deductionInfo.total).toBe(100);
    });
  });

  describe('Response Parsing', () => {
    test('should parse LLM response correctly', () => {
      const response = `This is a critical compliance issue. The worker needs immediate attention.
        You should review the payroll data and must correct the underpayment.
        Recommend consulting with legal team for guidance.`;

      const parsed = explanationService.parseExplanationResponse(response);

      expect(parsed).toHaveProperty('detailed');
      expect(parsed).toHaveProperty('actions');
      expect(parsed).toHaveProperty('impact');
      expect(parsed.detailed).toBe(response);
      expect(parsed.actions.length).toBeGreaterThan(0);
      expect(parsed.impact).toBe('Critical - immediate action required');
    });

    test('should handle responses without action items', () => {
      const response = 'This is a simple explanation without specific items.';
      const parsed = explanationService.parseExplanationResponse(response);

      expect(parsed.detailed).toBe(response);
      expect(parsed.actions).toHaveLength(0);
      expect(parsed.impact).toBe('Review required');
    });
  });
});
