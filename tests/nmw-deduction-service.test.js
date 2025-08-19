const NMWDeductionService = require('../src/services/nmwDeductionService');
const ratesConfig = require('../src/config/rates');

// Mock the rates configuration
jest.mock('../src/config/rates');

describe('NMW Deduction Service Tests', () => {
  let nmwDeductionService;
  let mockRatesConfig;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup mock rates configuration
    mockRatesConfig = {
      getCategoryRates: jest.fn()
    };
    
    // Mock the rates config module
    ratesConfig.getCategoryRates = mockRatesConfig.getCategoryRates;
    
    // Create service instance
    nmwDeductionService = new NMWDeductionService();
  });

  describe('Input Validation', () => {
    test('should validate worker data correctly', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        uniform: { maxDeduction: 0 },
        tools: { maxDeduction: 0 },
        training: { maxDeduction: 0 },
        other: { maxDeduction: 0 }
      });

      const result = await nmwDeductionService.calculateNMWDeductions(
        null, // Invalid worker
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { uniform_deduction: 0, tools_deduction: 0, training_deduction: 0, other_deductions: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Worker data is required');
    });

    test('should validate pay period data correctly', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        uniform: { maxDeduction: 0 },
        tools: { maxDeduction: 0 },
        training: { maxDeduction: 0 },
        other: { maxDeduction: 0 }
      });

      const result = await nmwDeductionService.calculateNMWDeductions(
        { worker_id: 'W001', worker_name: 'John Smith' },
        null, // Invalid pay period
        { uniform_deduction: 0, tools_deduction: 0, training_deduction: 0, other_deductions: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Pay period data is required');
    });

    test('should validate date formats correctly', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        uniform: { maxDeduction: 0 },
        tools: { maxDeduction: 0 },
        training: { maxDeduction: 0 },
        other: { maxDeduction: 0 }
      });

      const result = await nmwDeductionService.calculateNMWDeductions(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: 'invalid-date', period_end: '2024-01-31' },
        { uniform_deduction: 0, tools_deduction: 0, training_deduction: 0, other_deductions: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid date format');
    });

    test('should validate date order correctly', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        uniform: { maxDeduction: 0 },
        tools: { maxDeduction: 0 },
        training: { maxDeduction: 0 },
        other: { maxDeduction: 0 }
      });

      const result = await nmwDeductionService.calculateNMWDeductions(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-31', period_end: '2024-01-01' }, // End before start
        { uniform_deduction: 0, tools_deduction: 0, training_deduction: 0, other_deductions: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Period start date must be before period end date');
    });
  });

  describe('PRP Date Calculations', () => {
    test('should calculate PRP dates correctly for monthly period', () => {
      const prpDates = nmwDeductionService.calculatePRPDates('2024-01-01', '2024-01-31');
      
      expect(prpDates.totalDays).toBe(31);
      expect(prpDates.workingDays).toBe(23); // January 2024 has 23 working days
      expect(prpDates.periodLength).toBe(31);
    });

    test('should calculate PRP dates correctly for weekly period', () => {
      const prpDates = nmwDeductionService.calculatePRPDates('2024-01-01', '2024-01-07');
      
      expect(prpDates.totalDays).toBe(7);
      expect(prpDates.workingDays).toBe(5); // Monday to Sunday
    });

    test('should calculate PRP dates correctly for single day', () => {
      const prpDates = nmwDeductionService.calculatePRPDates('2024-01-01', '2024-01-01');
      
      expect(prpDates.totalDays).toBe(1);
      expect(prpDates.workingDays).toBe(1);
    });
  });

  describe('Deduction Processing by Category', () => {
    test('should process uniform deductions correctly', () => {
      const rates = { maxDeduction: 0 };
      const result = nmwDeductionService.processUniformDeductions(15.00, rates);
      
      expect(result.amount).toBe(15.00);
      expect(result.maxAllowed).toBe(0);
      expect(result.isCompliant).toBe(false);
      expect(result.excess).toBe(15.00);
      expect(result.category).toBe('uniform');
      expect(result.description).toBe('Workwear and uniform costs');
      expect(result.rule).toBe('Uniform costs cannot reduce pay below NMW');
    });

    test('should process tools deductions correctly', () => {
      const rates = { maxDeduction: 0 };
      const result = nmwDeductionService.processToolsDeductions(25.00, rates);
      
      expect(result.amount).toBe(25.00);
      expect(result.maxAllowed).toBe(0);
      expect(result.isCompliant).toBe(false);
      expect(result.excess).toBe(25.00);
      expect(result.category).toBe('tools');
      expect(result.description).toBe('Tools and equipment costs');
    });

    test('should process training deductions correctly', () => {
      const rates = { maxDeduction: 0 };
      const result = nmwDeductionService.processTrainingDeductions(30.00, rates);
      
      expect(result.amount).toBe(30.00);
      expect(result.maxAllowed).toBe(0);
      expect(result.isCompliant).toBe(false);
      expect(result.excess).toBe(30.00);
      expect(result.category).toBe('training');
      expect(result.description).toBe('Training and certification costs');
    });

    test('should process other deductions correctly', () => {
      const rates = { maxDeduction: 0 };
      const result = nmwDeductionService.processOtherDeductions(10.00, rates);
      
      expect(result.amount).toBe(10.00);
      expect(result.maxAllowed).toBe(0);
      expect(result.isCompliant).toBe(false);
      expect(result.excess).toBe(10.00);
      expect(result.category).toBe('other');
      expect(result.description).toBe('Other miscellaneous deductions');
    });

    test('should handle zero deductions correctly', () => {
      const rates = { maxDeduction: 0 };
      const result = nmwDeductionService.processUniformDeductions(0, rates);
      
      expect(result.amount).toBe(0);
      expect(result.isCompliant).toBe(true);
      expect(result.excess).toBe(0);
    });
  });

  describe('Total Deduction Calculations', () => {
    test('should calculate total deductions correctly', () => {
      const processedDeductions = {
        uniform: { amount: 15, isCompliant: false },
        tools: { amount: 25, isCompliant: false },
        training: { amount: 0, isCompliant: true },
        other: { amount: 10, isCompliant: false }
      };

      const result = nmwDeductionService.calculateTotalDeductions(processedDeductions);
      
      expect(result.total).toBe(50);
      expect(result.compliant).toBe(0);
      expect(result.nonCompliant).toBe(50);
      expect(result.complianceRate).toBe(0);
    });

    test('should calculate compliance rate correctly', () => {
      const processedDeductions = {
        uniform: { amount: 15, isCompliant: true },
        tools: { amount: 25, isCompliant: false },
        training: { amount: 0, isCompliant: true },
        other: { amount: 10, isCompliant: true }
      };

      const result = nmwDeductionService.calculateTotalDeductions(processedDeductions);
      
      expect(result.total).toBe(50);
      expect(result.compliant).toBe(25);
      expect(result.nonCompliant).toBe(25);
      expect(result.complianceRate).toBe(50);
    });

    test('should handle zero total deductions', () => {
      const processedDeductions = {
        uniform: { amount: 0, isCompliant: true },
        tools: { amount: 0, isCompliant: true },
        training: { amount: 0, isCompliant: true },
        other: { amount: 0, isCompliant: true }
      };

      const result = nmwDeductionService.calculateTotalDeductions(processedDeductions);
      
      expect(result.total).toBe(0);
      expect(result.compliant).toBe(0);
      expect(result.nonCompliant).toBe(0);
      expect(result.complianceRate).toBe(100);
    });
  });

  describe('Compliance Status Determination', () => {
    test('should return green status for compliant deductions', () => {
      const processedDeductions = {
        uniform: { amount: 0, isCompliant: true },
        tools: { amount: 0, isCompliant: true },
        training: { amount: 0, isCompliant: true },
        other: { amount: 0, isCompliant: true }
      };

      const result = nmwDeductionService.determineComplianceStatus(processedDeductions, {});
      
      expect(result.status).toBe('green');
      expect(result.score).toBe(100);
      expect(result.percentage).toBe(100);
    });

    test('should return amber status for mostly compliant deductions', () => {
      // Create test data that will result in 80% compliance rate (amber status)
      // Total: 100, Compliant: 80, Non-compliant: 20, Compliance rate: 80%
      const processedDeductions = {
        uniform: { amount: 80, isCompliant: true, excess: 0 },
        tools: { amount: 20, isCompliant: false, excess: 20 },
        training: { amount: 0, isCompliant: true, excess: 0 },
        other: { amount: 0, isCompliant: true, excess: 0 }
      };

      const result = nmwDeductionService.determineComplianceStatus(processedDeductions, {});
      
      expect(result.status).toBe('amber');
      expect(result.score).toBe(80);
      expect(result.percentage).toBe(80);
    });

    test('should return red status for mostly non-compliant deductions', () => {
      // Create test data that will result in 12.5% compliance rate
      // Total: 80, Compliant: 10, Non-compliant: 70, Compliance rate: 12.5%
      const processedDeductions = {
        uniform: { amount: 10, isCompliant: true, excess: 0 },
        tools: { amount: 20, isCompliant: false, excess: 20 },
        training: { amount: 30, isCompliant: false, excess: 30 },
        other: { amount: 20, isCompliant: false, excess: 20 }
      };

      const result = nmwDeductionService.determineComplianceStatus(processedDeductions, {});
      
      expect(result.status).toBe('red');
      expect(result.score).toBe(13); // Math.round(12.5) = 13
      expect(result.percentage).toBe(12.5);
    });
  });

  describe('Compliance Issues and Recommendations', () => {
    test('should generate compliance issues for non-compliant deductions', () => {
      const processedDeductions = {
        uniform: { 
          amount: 15, 
          maxAllowed: 0, 
          isCompliant: false, 
          excess: 15,
          description: 'Workwear and uniform costs',
          rule: 'Uniform costs cannot reduce pay below NMW'
        },
        tools: { 
          amount: 25, 
          maxAllowed: 0, 
          isCompliant: false, 
          excess: 25,
          description: 'Tools and equipment costs',
          rule: 'Tool costs cannot reduce pay below NMW'
        },
        training: { amount: 0, isCompliant: true },
        other: { amount: 0, isCompliant: true }
      };

      const issues = nmwDeductionService.generateComplianceIssues(processedDeductions);
      
      expect(issues).toHaveLength(2);
      expect(issues[0].category).toBe('uniform');
      expect(issues[0].excess).toBe(15);
      expect(issues[0].severity).toBe('high');
      expect(issues[1].category).toBe('tools');
      expect(issues[1].excess).toBe(25);
    });

    test('should generate recommendations for fixing compliance issues', () => {
      const processedDeductions = {
        uniform: { 
          amount: 15, 
          maxAllowed: 0, 
          isCompliant: false, 
          excess: 15
        },
        tools: { 
          amount: 25, 
          maxAllowed: 0, 
          isCompliant: false, 
          excess: 25
        },
        training: { amount: 0, isCompliant: true },
        other: { amount: 0, isCompliant: true }
      };

      const recommendations = nmwDeductionService.generateRecommendations(processedDeductions);
      
      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].category).toBe('uniform');
      expect(recommendations[0].action).toBe('reduce_deduction');
      expect(recommendations[0].reduction).toBe(15);
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[1].category).toBe('tools');
      expect(recommendations[1].reduction).toBe(25);
    });
  });

  describe('Full NMW Deduction Calculation', () => {
    beforeEach(() => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        uniform: { maxDeduction: 0, source: 'GOV.UK', lastUpdated: '2024-01-01' },
        tools: { maxDeduction: 0, source: 'GOV.UK', lastUpdated: '2024-01-01' },
        training: { maxDeduction: 0, source: 'GOV.UK', lastUpdated: '2024-01-01' },
        other: { maxDeduction: 0, source: 'GOV.UK', lastUpdated: '2024-01-01' }
      });
    });

    test('should calculate NMW deductions for worker with no deductions', async () => {
      const result = await nmwDeductionService.calculateNMWDeductions(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { id: 'PP001', period_start: '2024-01-01', period_end: '2024-01-31' },
        { uniform_deduction: 0, tools_deduction: 0, training_deduction: 0, other_deductions: 0 }
      );

      expect(result.success).toBe(true);
      expect(result.worker_id).toBe('W001');
      expect(result.worker_name).toBe('John Smith');
      expect(result.total_deductions).toBe(0);
      expect(result.compliant_deductions).toBe(0);
      expect(result.non_compliant_deductions).toBe(0);
      expect(result.compliance_status).toBe('green');
      expect(result.compliance_score).toBe(100);
    });

    test('should calculate NMW deductions for worker with deductions', async () => {
      const result = await nmwDeductionService.calculateNMWDeductions(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { id: 'PP001', period_start: '2024-01-01', period_end: '2024-01-31' },
        { uniform_deduction: 15, tools_deduction: 25, training_deduction: 30, other_deductions: 10 }
      );

      expect(result.success).toBe(true);
      expect(result.total_deductions).toBe(80);
      expect(result.compliant_deductions).toBe(0);
      expect(result.non_compliant_deductions).toBe(80);
      expect(result.compliance_status).toBe('red');
      expect(result.compliance_score).toBe(0);
    });

    test('should generate comprehensive breakdown', async () => {
      const result = await nmwDeductionService.calculateNMWDeductions(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { id: 'PP001', period_start: '2024-01-01', period_end: '2024-01-31' },
        { uniform_deduction: 15, tools_deduction: 25, training_deduction: 0, other_deductions: 0 }
      );

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.period).toBeDefined();
      expect(result.breakdown.deductions).toBeDefined();
      expect(result.breakdown.rates).toBeDefined();
      expect(result.breakdown.compliance).toBeDefined();

      // Check period details
      expect(result.breakdown.period.start).toBe('2024-01-01');
      expect(result.breakdown.period.end).toBe('2024-01-31');
      expect(result.breakdown.period.totalDays).toBe(31);
      expect(result.breakdown.period.workingDays).toBe(23);

      // Check deduction breakdown
      expect(result.breakdown.deductions.total).toBe(40);
      expect(result.breakdown.deductions.compliant).toBe(0);
      expect(result.breakdown.deductions.nonCompliant).toBe(40);
      expect(result.breakdown.deductions.complianceRate).toBe(0);

      // Check rates
      expect(result.breakdown.rates.uniform).toBe(0);
      expect(result.breakdown.rates.tools).toBe(0);
      expect(result.breakdown.rates.training).toBe(0);
      expect(result.breakdown.rates.other).toBe(0);

      // Check compliance
      expect(result.breakdown.compliance.status).toBe('non-compliant');
      expect(result.breakdown.compliance.issues).toHaveLength(2);
      expect(result.breakdown.compliance.recommendations).toHaveLength(2);
    });
  });

  describe('Bulk Calculations', () => {
    beforeEach(() => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        uniform: { maxDeduction: 0, source: 'GOV.UK', lastUpdated: '2024-01-01' },
        tools: { maxDeduction: 0, source: 'GOV.UK', lastUpdated: '2024-01-01' },
        training: { maxDeduction: 0, source: 'GOV.UK', lastUpdated: '2024-01-01' },
        other: { maxDeduction: 0, source: 'GOV.UK', lastUpdated: '2024-01-01' }
      });
    });

    test('should calculate deductions for multiple workers', async () => {
      const workers = [
        { worker_id: 'W001', worker_name: 'John Smith' },
        { worker_id: 'W002', worker_name: 'Jane Doe' }
      ];

      const payPeriods = [
        { id: 'PP001', worker_id: 'W001', period_start: '2024-01-01', period_end: '2024-01-31' },
        { id: 'PP002', worker_id: 'W002', period_start: '2024-01-01', period_end: '2024-01-31' }
      ];

      const deductionData = [
        { worker_id: 'W001', pay_period_id: 'PP001', uniform_deduction: 15, tools_deduction: 25, training_deduction: 0, other_deductions: 0 },
        { worker_id: 'W002', pay_period_id: 'PP002', uniform_deduction: 0, tools_deduction: 0, training_deduction: 30, other_deductions: 10 }
      ];

      const results = await nmwDeductionService.calculateBulkNMWDeductions(
        workers,
        payPeriods,
        deductionData
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].worker_id).toBe('W001');
      expect(results[1].worker_id).toBe('W002');
      expect(results[0].total_deductions).toBe(40);
      expect(results[1].total_deductions).toBe(40);
    });

    test('should handle missing deduction data gracefully', async () => {
      const workers = [
        { worker_id: 'W001', worker_name: 'John Smith' }
      ];

      const payPeriods = [
        { id: 'PP001', worker_id: 'W001', period_start: '2024-01-01', period_end: '2024-01-31' }
      ];

      const deductionData = []; // No deduction data

      const results = await nmwDeductionService.calculateBulkNMWDeductions(
        workers,
        payPeriods,
        deductionData
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].total_deductions).toBe(0);
      expect(results[0].compliant_deductions).toBe(0);
      expect(results[0].non_compliant_deductions).toBe(0);
    });
  });

  describe('Summary Generation', () => {
    test('should generate summary for successful results', () => {
      const mockResults = [
        {
          success: true,
          total_deductions: 40,
          non_compliant_deductions: 40,
          compliance_status: 'red',
          compliance_score: 0
        },
        {
          success: true,
          total_deductions: 20,
          non_compliant_deductions: 0,
          compliance_status: 'green',
          compliance_score: 100
        },
        {
          success: true,
          total_deductions: 30,
          non_compliant_deductions: 15,
          compliance_status: 'amber',
          compliance_score: 50
        }
      ];

      const summary = nmwDeductionService.getNMWDeductionSummary(mockResults);

      expect(summary.totalWorkers).toBe(3);
      expect(summary.totalDeductions).toBe(90);
      expect(summary.totalExcess).toBe(55);
      expect(summary.complianceBreakdown.green).toBe(1);
      expect(summary.complianceBreakdown.amber).toBe(1);
      expect(summary.complianceBreakdown.red).toBe(1);
      expect(summary.averageComplianceScore).toBe(50);
    });

    test('should handle empty results', () => {
      const summary = nmwDeductionService.getNMWDeductionSummary([]);

      expect(summary.totalWorkers).toBe(0);
      expect(summary.totalDeductions).toBe(0);
      expect(summary.totalExcess).toBe(0);
      expect(summary.complianceBreakdown.green).toBe(0);
      expect(summary.complianceBreakdown.amber).toBe(0);
      expect(summary.complianceBreakdown.red).toBe(0);
      expect(summary.averageComplianceScore).toBe(0);
    });

    test('should filter out failed results', () => {
      const mockResults = [
        {
          success: false,
          error: 'Invalid data'
        },
        {
          success: true,
          total_deductions: 40,
          non_compliant_deductions: 0,
          compliance_status: 'green',
          compliance_score: 100
        }
      ];

      const summary = nmwDeductionService.getNMWDeductionSummary(mockResults);

      expect(summary.totalWorkers).toBe(1);
      expect(summary.totalDeductions).toBe(40);
      expect(summary.totalExcess).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle rates configuration errors', async () => {
      mockRatesConfig.getCategoryRates.mockRejectedValue(new Error('Configuration error'));

      const result = await nmwDeductionService.calculateNMWDeductions(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { uniform_deduction: 15, tools_deduction: 0, training_deduction: 0, other_deductions: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Configuration error');
    });

    test('should handle validation errors gracefully', async () => {
      const result = await nmwDeductionService.calculateNMWDeductions(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: 'invalid-date', period_end: '2024-01-31' },
        { uniform_deduction: 15, tools_deduction: 0, training_deduction: 0, other_deductions: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid date format');
    });
  });
});
