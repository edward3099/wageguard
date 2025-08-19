const AllowancePremiumService = require('../src/services/allowancePremiumService');
const nmwComponentRules = require('../src/config/nmwComponentRules');

// Mock the NMW component rules
jest.mock('../src/config/nmwComponentRules');

describe('Allowance Premium Service Tests', () => {
  let allowancePremiumService;
  let mockRules;

  beforeEach(() => {
    jest.clearAllMocks();
    allowancePremiumService = new AllowancePremiumService();
    
    mockRules = {
      payComponents: {
        allowances: {
          general: {
            category: 'included',
            treatment: 'full_inclusion',
            description: 'General allowances for work performance'
          },
          expenses: {
            category: 'excluded',
            treatment: 'full_exclusion',
            description: 'Expense reimbursements'
          }
        },
        premiums: {
          overtime: {
            category: 'partial',
            treatment: 'basic_rate_only',
            description: 'Only basic rate counts, premium element excluded'
          }
        }
      }
    };

    nmwComponentRules.getAllRules.mockResolvedValue(mockRules);
  });

  describe('Input Validation', () => {
    test('should validate worker information correctly', () => {
      const validWorker = { id: 1, external_id: 'W001' };
      const validPayPeriod = { id: 1 };
      const validComponents = { basic_pay: 1000 };

      const result = allowancePremiumService.validateInputs(validWorker, validPayPeriod, validComponents);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid worker data', () => {
      const invalidWorker = {};
      const validPayPeriod = { id: 1 };
      const validComponents = { basic_pay: 1000 };

      const result = allowancePremiumService.validateInputs(invalidWorker, validPayPeriod, validComponents);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Worker ID is required');
    });

    test('should reject missing pay period', () => {
      const validWorker = { id: 1 };
      const invalidPayPeriod = {};
      const validComponents = { basic_pay: 1000 };

      const result = allowancePremiumService.validateInputs(validWorker, invalidPayPeriod, validComponents);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pay period ID is required');
    });

    test('should reject empty pay components', () => {
      const validWorker = { id: 1 };
      const validPayPeriod = { id: 1 };
      const emptyComponents = {};

      const result = allowancePremiumService.validateInputs(validWorker, validPayPeriod, emptyComponents);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No pay components provided');
    });
  });

  describe('Component Classification', () => {
    test('should classify pay components correctly', async () => {
      const payComponents = {
        'london_weighting': 200,
        'travel_expenses': 50,
        'overtime_pay': 150
      };

      nmwComponentRules.classifyComponent
        .mockResolvedValueOnce({
          category: 'included',
          treatment: 'full_inclusion',
          categoryPath: 'allowances.general',
          description: 'London weighting allowance',
          confidence: 'high'
        })
        .mockResolvedValueOnce({
          category: 'excluded', 
          treatment: 'full_exclusion',
          categoryPath: 'allowances.expenses',
          description: 'Travel expense reimbursement',
          confidence: 'high'
        })
        .mockResolvedValueOnce({
          category: 'partial',
          treatment: 'basic_rate_only',
          categoryPath: 'premiums.overtime',
          description: 'Overtime premium',
          confidence: 'medium',
          matchedKeyword: 'overtime_pay'
        });

      const classifications = await allowancePremiumService.classifyPayComponents(payComponents);
      
      expect(classifications).toHaveLength(3);
      expect(classifications[0].componentName).toBe('london_weighting');
      expect(classifications[0].category).toBe('included');
      expect(classifications[1].componentName).toBe('travel_expenses');
      expect(classifications[1].category).toBe('excluded');
      expect(classifications[2].componentName).toBe('overtime_pay');
      expect(classifications[2].category).toBe('partial');
    });

    test('should skip null and zero value components', async () => {
      const payComponents = {
        'basic_pay': 1000,
        'overtime_pay': 0,
        'bonus': null,
        'allowance': undefined
      };

      nmwComponentRules.classifyComponent.mockResolvedValue({
        category: 'included',
        treatment: 'full_inclusion'
      });

      const classifications = await allowancePremiumService.classifyPayComponents(payComponents);
      expect(classifications).toHaveLength(1);
      expect(classifications[0].componentName).toBe('basic_pay');
    });
  });

  describe('Allowance Processing', () => {
    test('should process included allowances correctly', async () => {
      const classifications = [
        {
          componentName: 'london_weighting',
          value: 200,
          category: 'included',
          treatment: 'full_inclusion',
          categoryPath: 'allowances.general',
          description: 'London weighting allowance'
        },
        {
          componentName: 'shift_allowance',
          value: 100,
          category: 'included',
          treatment: 'full_inclusion',
          categoryPath: 'allowances.general',
          description: 'Shift allowance'
        }
      ];

      const result = await allowancePremiumService.processAllowances(classifications, mockRules);
      
      expect(result.included).toHaveLength(2);
      expect(result.total_included).toBe(300);
      expect(result.net_allowance_value).toBe(300);
      expect(result.included[0].name).toBe('london_weighting');
      expect(result.included[0].value).toBe(200);
    });

    test('should process excluded allowances correctly', async () => {
      const classifications = [
        {
          componentName: 'travel_expenses',
          value: 75,
          category: 'excluded',
          treatment: 'full_exclusion',
          categoryPath: 'allowances.expenses',
          description: 'Travel expense reimbursement'
        }
      ];

      const result = await allowancePremiumService.processAllowances(classifications, mockRules);
      
      expect(result.excluded).toHaveLength(1);
      expect(result.total_excluded).toBe(75);
      expect(result.net_allowance_value).toBe(0);
      expect(result.excluded[0].name).toBe('travel_expenses');
    });

    test('should handle mixed allowances correctly', async () => {
      const classifications = [
        {
          componentName: 'london_weighting',
          value: 200,
          category: 'included',
          treatment: 'full_inclusion',
          categoryPath: 'allowances.general',
          description: 'London weighting'
        },
        {
          componentName: 'travel_expenses',
          value: 50,
          category: 'excluded',
          treatment: 'full_exclusion',
          categoryPath: 'allowances.expenses',
          description: 'Travel expenses'
        }
      ];

      const result = await allowancePremiumService.processAllowances(classifications, mockRules);
      
      expect(result.included).toHaveLength(1);
      expect(result.excluded).toHaveLength(1);
      expect(result.total_included).toBe(200);
      expect(result.total_excluded).toBe(50);
      expect(result.net_allowance_value).toBe(200);
    });
  });

  describe('Premium Processing', () => {
    test('should process overtime premiums correctly', async () => {
      const classifications = [
        {
          componentName: 'overtime_pay',
          value: 150,
          category: 'partial',
          treatment: 'basic_rate_only',
          categoryPath: 'premiums.overtime',
          description: 'Overtime premium',
          matchedKeyword: 'time_and_half'
        }
      ];

      const payPeriod = { id: 1, total_hours: 40 };

      const result = await allowancePremiumService.processPremiums(classifications, payPeriod, mockRules);
      
      expect(result.processed).toHaveLength(1);
      expect(result.processed[0].name).toBe('overtime_pay');
      expect(result.processed[0].total_value).toBe(150);
      expect(result.processed[0].basic_rate_portion).toBeCloseTo(100.5, 1); // 67% of 150
      expect(result.processed[0].premium_portion).toBeCloseTo(49.5, 1);    // 33% of 150
      expect(result.total_basic_rate_value).toBeCloseTo(100.5, 1);
    });

    test('should handle different premium types correctly', async () => {
      const classifications = [
        {
          componentName: 'double_time_pay',
          value: 200,
          category: 'partial',
          treatment: 'basic_rate_only',
          categoryPath: 'premiums.overtime',
          description: 'Double time premium',
          matchedKeyword: 'double_time'
        },
        {
          componentName: 'shift_premium',
          value: 100,
          category: 'partial',
          treatment: 'basic_rate_only',
          categoryPath: 'premiums.shift',
          description: 'Shift premium',
          matchedKeyword: 'shift'
        }
      ];

      const payPeriod = { id: 1 };

      const result = await allowancePremiumService.processPremiums(classifications, payPeriod, mockRules);
      
      expect(result.processed).toHaveLength(2);
      
      // Double time: 50% basic rate
      expect(result.processed[0].basic_rate_portion).toBe(100);
      expect(result.processed[0].premium_portion).toBe(100);
      
      // Shift premium: 80% basic rate
      expect(result.processed[1].basic_rate_portion).toBe(80);
      expect(result.processed[1].premium_portion).toBe(20);
      
      expect(result.total_basic_rate_value).toBe(180);
      expect(result.total_premium_excluded).toBe(120);
    });
  });

  describe('Total Calculations', () => {
    test('should calculate totals correctly', () => {
      const allowanceResult = {
        total_included: 300,
        total_excluded: 50,
        net_allowance_value: 300
      };

      const premiumResult = {
        total_basic_rate_value: 180,
        total_premium_excluded: 120,
        net_premium_value: 180
      };

      const totals = allowancePremiumService.calculateTotals(allowanceResult, premiumResult);
      
      expect(totals.total_allowances_included).toBe(300);
      expect(totals.total_allowances_excluded).toBe(50);
      expect(totals.total_premiums_basic_rate).toBe(180);
      expect(totals.total_premiums_excluded).toBe(120);
      expect(totals.total_nmw_eligible).toBe(480);
      expect(totals.net_contribution_to_nmw).toBe(480);
    });
  });

  describe('Warning Generation', () => {
    test('should generate warnings for unclassified components', () => {
      const classifications = [
        {
          componentName: 'unknown_payment',
          value: 100,
          category: 'unclassified',
          confidence: 'none'
        }
      ];

      const allowanceResult = { included: [], excluded: [] };
      const premiumResult = { processed: [], requires_manual_verification: false };

      const warnings = allowancePremiumService.generateWarnings(classifications, allowanceResult, premiumResult);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('unclassified_components');
      expect(warnings[0].severity).toBe('amber');
      expect(warnings[0].components).toContain('unknown_payment');
    });

    test('should generate warnings for low confidence classifications', () => {
      const classifications = [
        {
          componentName: 'questionable_allowance',
          value: 100,
          category: 'included',
          confidence: 'low'
        }
      ];

      const allowanceResult = { included: [], excluded: [] };
      const premiumResult = { processed: [], requires_manual_verification: false };

      const warnings = allowancePremiumService.generateWarnings(classifications, allowanceResult, premiumResult);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('low_confidence');
      expect(warnings[0].severity).toBe('amber');
    });

    test('should generate warnings for estimated premiums', () => {
      const classifications = [];
      const allowanceResult = { included: [], excluded: [] };
      const premiumResult = { processed: [], requires_manual_verification: true };

      const warnings = allowancePremiumService.generateWarnings(classifications, allowanceResult, premiumResult);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('estimated_premiums');
      expect(warnings[0].severity).toBe('amber');
    });
  });

  describe('Full Integration Test', () => {
    test('should calculate allowances and premiums end-to-end', async () => {
      const worker = { id: 1, external_id: 'W001' };
      const payPeriod = { id: 1, total_hours: 40 };
      const payComponents = {
        'london_weighting': 200,
        'travel_expenses': 50,
        'overtime_pay': 150,
        'shift_allowance': 100
      };

      // Mock component classifications
      nmwComponentRules.classifyComponent
        .mockResolvedValueOnce({
          category: 'included',
          treatment: 'full_inclusion',
          categoryPath: 'allowances.general',
          description: 'London weighting',
          confidence: 'high'
        })
        .mockResolvedValueOnce({
          category: 'excluded',
          treatment: 'full_exclusion',
          categoryPath: 'allowances.expenses',
          description: 'Travel expenses',
          confidence: 'high'
        })
        .mockResolvedValueOnce({
          category: 'partial',
          treatment: 'basic_rate_only',
          categoryPath: 'premiums.overtime',
          description: 'Overtime premium',
          confidence: 'medium',
          matchedKeyword: 'time_and_half'
        })
        .mockResolvedValueOnce({
          category: 'included',
          treatment: 'full_inclusion',
          categoryPath: 'allowances.general',
          description: 'Shift allowance',
          confidence: 'high'
        });

      const result = await allowancePremiumService.calculateAllowancesAndPremiums(worker, payPeriod, payComponents);
      
      expect(result.success).toBe(true);
      expect(result.worker_id).toBe(1);
      expect(result.allowances.total_included).toBe(300); // 200 + 100
      expect(result.allowances.total_excluded).toBe(50);
      expect(result.premiums.total_basic_rate_value).toBeCloseTo(100.5, 1); // 67% of 150
      expect(result.totals.total_nmw_eligible).toBeCloseTo(400.5, 1); // 300 + 100.5
      expect(result.metadata.total_components_processed).toBe(4);
    });

    test('should handle calculation errors gracefully', async () => {
      const worker = { id: 1 };
      const payPeriod = { id: 1 };
      const payComponents = { basic_pay: 1000 };

      nmwComponentRules.getAllRules.mockRejectedValue(new Error('Configuration error'));

      const result = await allowancePremiumService.calculateAllowancesAndPremiums(worker, payPeriod, payComponents);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Calculation failed');
      expect(result.message).toBe('Configuration error');
    });
  });

  describe('Bulk Processing', () => {
    test('should process multiple workers correctly', async () => {
      const workers = [
        { id: 1, external_id: 'W001' },
        { id: 2, external_id: 'W002' }
      ];
      const payPeriods = [
        { id: 1, total_hours: 40 },
        { id: 2, total_hours: 35 }
      ];
      const payComponentsArray = [
        { 'london_weighting': 200 },
        { 'shift_allowance': 150 }
      ];

      nmwComponentRules.classifyComponent.mockResolvedValue({
        category: 'included',
        treatment: 'full_inclusion',
        categoryPath: 'allowances.general',
        description: 'General allowance',
        confidence: 'high'
      });

      const results = await allowancePremiumService.calculateBulkAllowancesAndPremiums(workers, payPeriods, payComponentsArray);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].worker_id).toBe(1);
      expect(results[1].worker_id).toBe(2);
    });
  });

  describe('Summary Statistics', () => {
    test('should generate summary statistics correctly', () => {
      const results = [
        {
          success: true,
          totals: {
            total_allowances_included: 200,
            total_premiums_basic_rate: 100,
            total_allowances_excluded: 50,
            total_premiums_excluded: 30
          }
        },
        {
          success: true,
          totals: {
            total_allowances_included: 150,
            total_premiums_basic_rate: 80,
            total_allowances_excluded: 25,
            total_premiums_excluded: 20
          }
        },
        {
          success: false,
          error: 'Calculation failed'
        }
      ];

      const summary = allowancePremiumService.getSummaryStatistics(results);
      
      expect(summary.total_workers).toBe(3);
      expect(summary.successful_calculations).toBe(2);
      expect(summary.failed_calculations).toBe(1);
      expect(summary.total_allowances_included).toBe(350);
      expect(summary.total_premiums_basic_rate).toBe(180);
      expect(summary.total_amounts_excluded).toBe(125);
      expect(summary.total_nmw_contribution).toBe(530);
      expect(summary.average_allowance_per_worker).toBe(175);
      expect(summary.average_premium_per_worker).toBe(90);
    });
  });
});
