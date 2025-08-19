const IntegratedNMWService = require('../src/services/integratedNMWService');
const RAGStatusService = require('../src/services/ragStatusService');
const FixSuggestionService = require('../src/services/fixSuggestionService');

// Mock dependencies to control the test environment
jest.mock('../src/config/rates');
jest.mock('../src/config/nmwComponentRules');
jest.mock('../src/services/nmwRateLookupService');

describe('Integrated NMW Service with RAG Status and Fix Suggestions', () => {
  let integratedService;
  let mockRatesConfig;
  let mockNMWComponentRules;

  beforeEach(() => {
    jest.clearAllMocks();
    integratedService = new IntegratedNMWService();
    
    // Mock rates configuration
    mockRatesConfig = require('../src/config/rates');
    mockRatesConfig.getAllRates.mockResolvedValue({
      accommodation: { dailyLimit: 9.99 },
      uniform: { maxDeduction: 0 },
      tools: { maxDeduction: 0 },
      training: { maxDeduction: 0 },
      other: { maxDeduction: 0 }
    });

    // Mock NMW component rules
    mockNMWComponentRules = require('../src/config/nmwComponentRules');
    mockNMWComponentRules.loadRules.mockResolvedValue({
      component_categories: {
        included: {
          keywords: ['basic pay', 'salary', 'wages'],
          treatment: 'full_inclusion'
        },
        excluded: {
          keywords: ['tips', 'gratuities', 'tronc'],
          treatment: 'full_exclusion'
        }
      }
    });

    // Mock NMW rate lookup service
    const mockNMWRateService = require('../src/services/nmwRateLookupService');
    mockNMWRateService.mockImplementation(() => ({
      getRequiredRate: jest.fn().mockResolvedValue({
        success: true,
        hourlyRate: 11.44,
        description: 'National Living Wage (21 and over)',
        category: 'NLW'
      })
    }));
  });

  describe('RAG Status Integration', () => {
    test('should calculate GREEN status for compliant worker', async () => {
      const worker = {
        worker_id: 'W001',
        worker_name: 'John Smith',
        age: 25
      };

      const payPeriod = {
        id: 'PP001',
        worker_id: 'W001',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        hours_worked: 40,
        total_pay: 500.00 // £12.50/hour - above minimum wage
      };

      const offsetData = {};
      const deductionData = {};
      const enhancementData = {};
      const rawPayComponents = {};

      const result = await integratedService.calculateComprehensiveNMW(
        worker, payPeriod, offsetData, deductionData, enhancementData, rawPayComponents
      );

      expect(result.success).toBe(true);
      expect(result.rag_status).toBe('GREEN');
      expect(result.rag_reason).toContain('meets or exceeds required rate');
      expect(result.effective_hourly_rate).toBeCloseTo(12.50, 2);
      expect(result.required_hourly_rate).toBe(11.44);
      expect(result.fix_suggestions).toHaveLength(1);
      expect(result.primary_fix_suggestion).toContain('Compliant');
    });

    test('should calculate RED status for non-compliant worker with fix suggestions', async () => {
      const worker = {
        worker_id: 'W002',
        worker_name: 'Jane Doe',
        age: 25
      };

      const payPeriod = {
        id: 'PP002',
        worker_id: 'W002',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        hours_worked: 40,
        total_pay: 400.00 // £10.00/hour - below minimum wage
      };

      const offsetData = {};
      const deductionData = {};
      const enhancementData = {};
      const rawPayComponents = {};

      const result = await integratedService.calculateComprehensiveNMW(
        worker, payPeriod, offsetData, deductionData, enhancementData, rawPayComponents
      );

      expect(result.success).toBe(true);
      expect(result.rag_status).toBe('RED');
      expect(result.rag_severity).toBe('HIGH');
      expect(result.rag_reason).toContain('is below required rate');
      expect(result.effective_hourly_rate).toBeCloseTo(10.00, 2);
      expect(result.required_hourly_rate).toBe(11.44);
      expect(result.fix_suggestions.length).toBeGreaterThan(0);
      expect(result.primary_fix_suggestion).toContain('Add arrears top-up of £57.60');
      expect(result.fix_calculations.totalShortfall).toBeCloseTo(57.60, 2);
    });

    test('should calculate AMBER status for edge case conditions', async () => {
      const worker = {
        worker_id: 'W003',
        worker_name: 'Bob Wilson'
        // Missing age - should trigger AMBER
      };

      const payPeriod = {
        id: 'PP003',
        worker_id: 'W003',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        hours_worked: 0, // Zero hours with pay - another AMBER trigger
        total_pay: 100.00
      };

      const offsetData = {};
      const deductionData = {};
      const enhancementData = {};
      const rawPayComponents = {};

      const result = await integratedService.calculateComprehensiveNMW(
        worker, payPeriod, offsetData, deductionData, enhancementData, rawPayComponents
      );

      expect(result.success).toBe(true);
      expect(result.rag_status).toBe('AMBER');
      expect(result.rag_reason).toContain('prevents definitive');
      expect(result.fix_suggestions.length).toBeGreaterThan(0);
      expect(result.primary_fix_suggestion).toContain('review');
    });
  });

  describe('Complex Scenarios with Deductions and Offsets', () => {
    test('should handle worker with excessive deductions leading to AMBER status', async () => {
      const worker = {
        worker_id: 'W004',
        worker_name: 'Alice Johnson',
        age: 22
      };

      const payPeriod = {
        id: 'PP004',
        worker_id: 'W004',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        hours_worked: 40,
        total_pay: 500.00
      };

      const offsetData = {};
      const deductionData = {
        uniform_deduction: 300.00 // 60% of pay - excessive
      };
      const enhancementData = {};
      const rawPayComponents = {};

      const result = await integratedService.calculateComprehensiveNMW(
        worker, payPeriod, offsetData, deductionData, enhancementData, rawPayComponents
      );

      expect(result.success).toBe(true);
      expect(result.rag_status).toBe('AMBER');
      expect(result.fix_suggestions.some(s => s.type === 'DEDUCTION_REVIEW')).toBe(true);
    });

    test('should handle accommodation offset violations', async () => {
      const worker = {
        worker_id: 'W005',
        worker_name: 'Charlie Brown',
        age: 26
      };

      const payPeriod = {
        id: 'PP005',
        worker_id: 'W005',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        hours_worked: 40,
        total_pay: 500.00
      };

      const offsetData = {
        accommodation_charge: 500.00 // Excessive accommodation charge
      };
      const deductionData = {};
      const enhancementData = {};
      const rawPayComponents = {};

      const result = await integratedService.calculateComprehensiveNMW(
        worker, payPeriod, offsetData, deductionData, enhancementData, rawPayComponents
      );

      expect(result.success).toBe(true);
      expect(result.rag_status).toBe('AMBER');
      expect(result.fix_suggestions.some(s => s.type === 'ACCOMMODATION_REVIEW')).toBe(true);
    });
  });

  describe('Bulk Processing with RAG Status', () => {
    test('should process multiple workers with different RAG statuses', async () => {
      const workers = [
        { worker_id: 'W001', worker_name: 'John Smith', age: 25 },
        { worker_id: 'W002', worker_name: 'Jane Doe', age: 25 },
        { worker_id: 'W003', worker_name: 'Bob Wilson' } // Missing age
      ];

      const payPeriods = [
        {
          id: 'PP001',
          worker_id: 'W001',
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          hours_worked: 40,
          total_pay: 500.00 // GREEN - compliant
        },
        {
          id: 'PP002',
          worker_id: 'W002',
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          hours_worked: 40,
          total_pay: 400.00 // RED - non-compliant
        },
        {
          id: 'PP003',
          worker_id: 'W003',
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          hours_worked: 0,
          total_pay: 100.00 // AMBER - edge case
        }
      ];

      const offsetData = [{}, {}, {}];
      const deductionData = [{}, {}, {}];
      const enhancementData = [{}, {}, {}];
      const rawPayComponentsArray = [{}, {}, {}];

      const results = await integratedService.calculateBulkComprehensiveNMW(
        workers, payPeriods, offsetData, deductionData, enhancementData, rawPayComponentsArray
      );

      expect(results).toHaveLength(3);
      
      // Check GREEN status result
      const greenResult = results.find(r => r.worker_id === 'W001');
      expect(greenResult.rag_status).toBe('GREEN');
      expect(greenResult.fix_suggestions).toHaveLength(1);
      expect(greenResult.primary_fix_suggestion).toContain('Compliant');

      // Check RED status result
      const redResult = results.find(r => r.worker_id === 'W002');
      expect(redResult.rag_status).toBe('RED');
      expect(redResult.rag_severity).toBe('HIGH');
      expect(redResult.fix_suggestions.length).toBeGreaterThan(0);
      expect(redResult.primary_fix_suggestion).toContain('arrears top-up');

      // Check AMBER status result
      const amberResult = results.find(r => r.worker_id === 'W003');
      expect(amberResult.rag_status).toBe('AMBER');
      expect(amberResult.fix_suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling in RAG Integration', () => {
    test('should handle RAG status calculation failures gracefully', async () => {
      // Mock RAG status service to fail
      jest.spyOn(integratedService.ragStatusService, 'calculateRAGStatus')
        .mockResolvedValue({
          success: false,
          error: 'RAG calculation failed'
        });

      const worker = { worker_id: 'W001', age: 25 };
      const payPeriod = {
        id: 'PP001',
        worker_id: 'W001',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        hours_worked: 40,
        total_pay: 500.00
      };

      const result = await integratedService.calculateComprehensiveNMW(
        worker, payPeriod, {}, {}, {}, {}
      );

      expect(result.success).toBe(true);
      expect(result.rag_status).toBe('AMBER');
      expect(result.rag_reason).toBe('RAG status calculation failed');
    });

    test('should handle fix suggestion generation failures gracefully', async () => {
      // Mock fix suggestion service to fail
      jest.spyOn(integratedService.fixSuggestionService, 'generateFixSuggestions')
        .mockReturnValue({
          success: false,
          error: 'Fix suggestion generation failed'
        });

      const worker = { worker_id: 'W001', age: 25 };
      const payPeriod = {
        id: 'PP001',
        worker_id: 'W001',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        hours_worked: 40,
        total_pay: 400.00
      };

      const result = await integratedService.calculateComprehensiveNMW(
        worker, payPeriod, {}, {}, {}, {}
      );

      expect(result.success).toBe(true);
      expect(result.rag_status).toBe('RED');
      expect(result.fix_suggestions).toEqual([]);
      expect(result.primary_fix_suggestion).toBeNull();
    });
  });

  describe('Warning Consolidation', () => {
    test('should consolidate warnings from all services', async () => {
      const worker = { worker_id: 'W001', age: 25 };
      const payPeriod = {
        id: 'PP001',
        worker_id: 'W001',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        hours_worked: 40,
        total_pay: 320.00 // Very low pay to trigger critical suggestions
      };

      const result = await integratedService.calculateComprehensiveNMW(
        worker, payPeriod, {}, {}, {}, {}
      );

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});
