const RAGStatusService = require('../src/services/ragStatusService');
const NMWRateLookupService = require('../src/services/nmwRateLookupService');

// Mock the NMW Rate Lookup Service
jest.mock('../src/services/nmwRateLookupService');

describe('RAG Status Service Tests', () => {
  let ragStatusService;
  let mockNMWRateService;

  beforeEach(() => {
    jest.clearAllMocks();
    ragStatusService = new RAGStatusService();
    mockNMWRateService = ragStatusService.nmwRateService;

    // Default mock setup
    mockNMWRateService.getRequiredRate.mockResolvedValue({
      success: true,
      hourlyRate: 11.44,
      description: 'National Living Wage (21 and over)',
      category: 'NLW'
    });

    mockNMWRateService.calculateAge.mockReturnValue(25);
  });

  describe('Input Validation', () => {
    test('should validate required worker information', () => {
      const result = ragStatusService.validateInputs(null, {}, {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Worker information is required');
    });

    test('should validate worker age or date of birth', () => {
      const worker = { worker_id: 'W001' }; // No age or DOB
      const result = ragStatusService.validateInputs(worker, {}, {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Worker age or date of birth is required');
    });

    test('should validate pay period information', () => {
      const worker = { age: 25 };
      const result = ragStatusService.validateInputs(worker, null, {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pay period information is required');
    });

    test('should validate pay period dates', () => {
      const worker = { age: 25 };
      const payPeriod = {}; // No dates
      const result = ragStatusService.validateInputs(worker, payPeriod, {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pay period start date is required');
      expect(result.errors).toContain('Pay period end date is required');
    });

    test('should validate calculated data', () => {
      const worker = { age: 25 };
      const payPeriod = { period_start: '2024-01-01', period_end: '2024-01-31' };
      const result = ragStatusService.validateInputs(worker, payPeriod, null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Calculated compliance data is required');
    });

    test('should pass validation with complete data', () => {
      const worker = { age: 25 };
      const payPeriod = { period_start: '2024-01-01', period_end: '2024-01-31' };
      const calculatedData = { effectiveHourlyRate: 12.00 };
      const result = ragStatusService.validateInputs(worker, payPeriod, calculatedData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Required Rate Lookup', () => {
    test('should get required rate for worker with age', async () => {
      const worker = { age: 25, worker_id: 'W001' };
      const payPeriod = { period_start: '2024-01-01' };

      const result = await ragStatusService.getRequiredRate(worker, payPeriod);

      expect(result.success).toBe(true);
      expect(result.hourlyRate).toBe(11.44);
      expect(mockNMWRateService.getRequiredRate).toHaveBeenCalledWith(
        25, '2024-01-01', false, undefined
      );
    });

    test('should calculate age from date of birth', async () => {
      const worker = { date_of_birth: '1998-06-15', worker_id: 'W001' };
      const payPeriod = { period_start: '2024-01-01' };

      await ragStatusService.getRequiredRate(worker, payPeriod);

      expect(mockNMWRateService.calculateAge).toHaveBeenCalledWith('1998-06-15', '2024-01-01');
      expect(mockNMWRateService.getRequiredRate).toHaveBeenCalledWith(
        25, '2024-01-01', false, undefined
      );
    });

    test('should handle apprentice information', async () => {
      const worker = { 
        age: 20, 
        worker_id: 'W001',
        is_apprentice: true,
        apprenticeship_start_date: '2024-01-01'
      };
      const payPeriod = { period_start: '2024-06-01' };

      await ragStatusService.getRequiredRate(worker, payPeriod);

      expect(mockNMWRateService.getRequiredRate).toHaveBeenCalledWith(
        20, '2024-06-01', true, '2024-01-01'
      );
    });

    test('should handle rate lookup failure', async () => {
      mockNMWRateService.getRequiredRate.mockResolvedValue({
        success: false,
        error: 'Rate not found'
      });

      const worker = { age: 25, worker_id: 'W001' };
      const payPeriod = { period_start: '2024-01-01' };

      const result = await ragStatusService.getRequiredRate(worker, payPeriod);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate not found');
    });
  });

  describe('Amber Conditions Detection', () => {
    test('should detect zero hours with pay as amber condition', () => {
      const worker = { age: 25 };
      const payPeriod = {};
      const calculatedData = { 
        hoursWorked: 0, 
        totalPay: 100,
        effectiveHourlyRate: 12.00
      };

      const result = ragStatusService.checkAmberConditions(worker, payPeriod, calculatedData);

      expect(result.isAmber).toBe(true);
      expect(result.reason).toContain('Zero hours worked with non-zero pay');
      expect(result.flags).toContain('zero_hours_with_pay');
    });

    test('should detect missing age data as amber condition', () => {
      const worker = { worker_id: 'W001' }; // No age or DOB
      const payPeriod = {};
      const calculatedData = { effectiveHourlyRate: 12.00 };

      const result = ragStatusService.checkAmberConditions(worker, payPeriod, calculatedData);

      expect(result.isAmber).toBe(true);
      expect(result.reason).toContain('Missing worker age or date of birth');
      expect(result.flags).toContain('missing_age_data');
    });

    test('should detect negative effective rate as amber condition', () => {
      const worker = { age: 25 };
      const payPeriod = {};
      const calculatedData = { effectiveHourlyRate: -5.00 };

      const result = ragStatusService.checkAmberConditions(worker, payPeriod, calculatedData);

      expect(result.isAmber).toBe(true);
      expect(result.reason).toContain('Negative effective hourly rate');
      expect(result.flags).toContain('negative_effective_rate');
    });

    test('should detect excessive deductions as amber condition', () => {
      const worker = { age: 25 };
      const payPeriod = {};
      const calculatedData = { 
        effectiveHourlyRate: 12.00,
        deductionRatio: 0.6 // 60% deductions
      };

      const result = ragStatusService.checkAmberConditions(worker, payPeriod, calculatedData);

      expect(result.isAmber).toBe(true);
      expect(result.reason).toContain('Excessive deductions');
      expect(result.flags).toContain('excessive_deductions');
    });

    test('should detect accommodation offset violations as amber condition', () => {
      const worker = { age: 25 };
      const payPeriod = {};
      const calculatedData = { 
        effectiveHourlyRate: 12.00,
        accommodationOffsetFlags: ['daily_excess_violation', 'period_limit_exceeded']
      };

      const result = ragStatusService.checkAmberConditions(worker, payPeriod, calculatedData);

      expect(result.isAmber).toBe(true);
      expect(result.reason).toContain('Accommodation offset violations');
      expect(result.flags).toContain('accommodation_offset_violations');
    });

    test('should return no amber conditions for normal data', () => {
      const worker = { age: 25 };
      const payPeriod = {};
      const calculatedData = { 
        effectiveHourlyRate: 12.00,
        hoursWorked: 40,
        totalPay: 480,
        deductionRatio: 0.1
      };

      const result = ragStatusService.checkAmberConditions(worker, payPeriod, calculatedData);

      expect(result.isAmber).toBe(false);
      expect(result.flags).toHaveLength(0);
    });
  });

  describe('Rate Comparison and Status Determination', () => {
    test('should assign GREEN status when effective rate meets required rate', () => {
      const result = ragStatusService.determineStatusFromRates(11.44, 11.44, {});

      expect(result.ragStatus).toBe('GREEN');
      expect(result.reason).toContain('meets or exceeds required rate');
      expect(result.rateComparison.difference).toBe(0);
      expect(result.rateComparison.percentageOfRequired).toBe(100);
    });

    test('should assign GREEN status when effective rate exceeds required rate', () => {
      const result = ragStatusService.determineStatusFromRates(12.50, 11.44, {});

      expect(result.ragStatus).toBe('GREEN');
      expect(result.reason).toContain('meets or exceeds required rate');
      expect(result.rateComparison.difference).toBeCloseTo(1.06, 2);
      expect(result.rateComparison.percentageOfRequired).toBeCloseTo(109.27, 2);
    });

    test('should assign RED status when effective rate is below required rate', () => {
      const result = ragStatusService.determineStatusFromRates(10.00, 11.44, {});

      expect(result.ragStatus).toBe('RED');
      expect(result.reason).toContain('is below required rate');
      expect(result.rateComparison.difference).toBeCloseTo(-1.44, 2);
      expect(result.rateComparison.shortfallPercentage).toBeCloseTo(12.59, 2);
    });

    test('should calculate correct severity levels for RED status', () => {
      // LOW severity (< 5% shortfall)
      const lowResult = ragStatusService.determineStatusFromRates(11.00, 11.44, {});
      expect(lowResult.severity).toBe('LOW');

      // MEDIUM severity (5-10% shortfall)
      const mediumResult = ragStatusService.determineStatusFromRates(10.30, 11.44, {});
      expect(mediumResult.severity).toBe('MEDIUM');

      // HIGH severity (10-20% shortfall)
      const highResult = ragStatusService.determineStatusFromRates(9.50, 11.44, {});
      expect(highResult.severity).toBe('HIGH');

      // CRITICAL severity (> 20% shortfall)
      const criticalResult = ragStatusService.determineStatusFromRates(8.00, 11.44, {});
      expect(criticalResult.severity).toBe('CRITICAL');
    });
  });

  describe('RAG Status Calculation', () => {
    test('should calculate GREEN status for compliant worker', async () => {
      const worker = { age: 25, worker_id: 'W001' };
      const payPeriod = { period_start: '2024-01-01', period_end: '2024-01-31' };
      const calculatedData = { 
        effectiveHourlyRate: 12.50,
        hoursWorked: 40,
        totalPay: 500
      };

      const result = await ragStatusService.calculateRAGStatus(worker, payPeriod, calculatedData);

      expect(result.success).toBe(true);
      expect(result.ragStatus).toBe('GREEN');
      expect(result.effectiveHourlyRate).toBe(12.50);
      expect(result.requiredHourlyRate).toBe(11.44);
      expect(result.rateComparison.difference).toBeCloseTo(1.06, 2);
    });

    test('should calculate RED status for non-compliant worker', async () => {
      const worker = { age: 25, worker_id: 'W001' };
      const payPeriod = { period_start: '2024-01-01', period_end: '2024-01-31' };
      const calculatedData = { 
        effectiveHourlyRate: 10.00,
        hoursWorked: 40,
        totalPay: 400
      };

      const result = await ragStatusService.calculateRAGStatus(worker, payPeriod, calculatedData);

      expect(result.success).toBe(true);
      expect(result.ragStatus).toBe('RED');
      expect(result.severity).toBe('HIGH'); // 12.59% shortfall is > 10%
      expect(result.effectiveHourlyRate).toBe(10.00);
      expect(result.requiredHourlyRate).toBe(11.44);
    });

    test('should calculate AMBER status for edge case conditions', async () => {
      const worker = { age: 25, worker_id: 'W001' };
      const payPeriod = { period_start: '2024-01-01', period_end: '2024-01-31' };
      const calculatedData = { 
        effectiveHourlyRate: 12.00,
        hoursWorked: 0, // Zero hours with pay - amber condition
        totalPay: 100
      };

      const result = await ragStatusService.calculateRAGStatus(worker, payPeriod, calculatedData);

      expect(result.success).toBe(true);
      expect(result.ragStatus).toBe('AMBER');
      expect(result.reason).toContain('Zero hours worked with non-zero pay');
      expect(result.amberFlags).toContain('zero_hours_with_pay');
    });

    test('should handle validation failures', async () => {
      const result = await ragStatusService.calculateRAGStatus(null, null, null);

      expect(result.success).toBe(false);
      expect(result.ragStatus).toBe('AMBER');
      expect(result.error).toBe('Input validation failed');
      expect(result.reason).toContain('Invalid or incomplete data');
    });

    test('should handle rate lookup failures', async () => {
      mockNMWRateService.getRequiredRate.mockResolvedValue({
        success: false,
        error: 'Rate not found'
      });

      const worker = { age: 25, worker_id: 'W001' };
      const payPeriod = { period_start: '2024-01-01', period_end: '2024-01-31' };
      const calculatedData = { effectiveHourlyRate: 12.00 };

      const result = await ragStatusService.calculateRAGStatus(worker, payPeriod, calculatedData);

      expect(result.success).toBe(false);
      expect(result.ragStatus).toBe('AMBER');
      expect(result.error).toBe('Failed to determine required rate');
    });

    test('should handle missing effective hourly rate', async () => {
      const worker = { age: 25, worker_id: 'W001' };
      const payPeriod = { period_start: '2024-01-01', period_end: '2024-01-31' };
      const calculatedData = { }; // Missing effective rate

      const result = await ragStatusService.calculateRAGStatus(worker, payPeriod, calculatedData);

      expect(result.success).toBe(false);
      expect(result.ragStatus).toBe('AMBER');
      expect(result.error).toBe('Missing effective hourly rate');
    });
  });

  describe('Bulk Processing', () => {
    test('should process multiple workers correctly', async () => {
      const workers = [
        {
          worker: { age: 25, worker_id: 'W001' },
          payPeriod: { period_start: '2024-01-01', period_end: '2024-01-31' },
          calculatedData: { effectiveHourlyRate: 12.50, hoursWorked: 40, totalPay: 500 }
        },
        {
          worker: { age: 19, worker_id: 'W002' },
          payPeriod: { period_start: '2024-01-01', period_end: '2024-01-31' },
          calculatedData: { effectiveHourlyRate: 8.00, hoursWorked: 35, totalPay: 280 }
        },
        {
          worker: { age: 22, worker_id: 'W003' },
          payPeriod: { period_start: '2024-01-01', period_end: '2024-01-31' },
          calculatedData: { effectiveHourlyRate: 11.44, hoursWorked: 40, totalPay: 458 }
        }
      ];

      // Mock different rates for different ages
      mockNMWRateService.getRequiredRate
        .mockResolvedValueOnce({ success: true, hourlyRate: 11.44, category: 'NLW' })
        .mockResolvedValueOnce({ success: true, hourlyRate: 8.60, category: 'NMW' })
        .mockResolvedValueOnce({ success: true, hourlyRate: 11.44, category: 'NLW' });

      const result = await ragStatusService.calculateBulkRAGStatus(workers);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.summary.total).toBe(3);
      expect(result.summary.green).toBe(2); // W001 and W003
      expect(result.summary.red).toBe(1);   // W002
      expect(result.complianceRate).toBeCloseTo(66.67, 2);
    });

    test('should handle errors in bulk processing', async () => {
      const workers = [
        {
          worker: { age: 25, worker_id: 'W001' },
          payPeriod: { period_start: '2024-01-01', period_end: '2024-01-31' },
          calculatedData: { effectiveHourlyRate: 12.50 }
        },
        {
          worker: null, // Invalid worker
          payPeriod: { period_start: '2024-01-01', period_end: '2024-01-31' },
          calculatedData: { effectiveHourlyRate: 10.00 }
        }
      ];

      const result = await ragStatusService.calculateBulkRAGStatus(workers);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.summary.green).toBe(1);
      expect(result.summary.errors).toBe(1);
    });
  });

  describe('Summary Statistics', () => {
    test('should generate correct summary statistics', () => {
      const ragResults = [
        { 
          success: true, 
          ragStatus: 'GREEN', 
          effectiveHourlyRate: 12.50, 
          requiredHourlyRate: 11.44 
        },
        { 
          success: true, 
          ragStatus: 'RED', 
          effectiveHourlyRate: 10.00, 
          requiredHourlyRate: 11.44,
          severity: 'MEDIUM',
          rateComparison: { required: 11.44, effective: 10.00 }
        },
        { 
          success: true, 
          ragStatus: 'AMBER', 
          effectiveHourlyRate: 11.00, 
          requiredHourlyRate: 11.44 
        },
        { 
          success: false, 
          error: 'Failed to calculate' 
        }
      ];

      const summary = ragStatusService.getRAGStatusSummary(ragResults);

      expect(summary.total).toBe(4);
      expect(summary.green).toBe(1);
      expect(summary.amber).toBe(1);
      expect(summary.red).toBe(1);
      expect(summary.errors).toBe(1);
      expect(summary.complianceRate).toBeCloseTo(33.33, 2);
      expect(summary.averageEffectiveRate).toBeCloseTo(11.17, 2);
      expect(summary.averageRequiredRate).toBeCloseTo(11.44, 2);
      expect(summary.totalShortfall).toBeCloseTo(1.44, 2);
    });

    test('should handle empty results array', () => {
      const summary = ragStatusService.getRAGStatusSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.complianceRate).toBe(0);
      expect(summary.averageEffectiveRate).toBe(0);
      expect(summary.averageRequiredRate).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle system errors gracefully', async () => {
      // Force a system error by making the service itself throw an error
      jest.spyOn(ragStatusService, 'getRequiredRate').mockRejectedValue(new Error('System failure'));

      const worker = { age: 25, worker_id: 'W001' };
      const payPeriod = { period_start: '2024-01-01', period_end: '2024-01-31' };
      const calculatedData = { effectiveHourlyRate: 12.00 };

      const result = await ragStatusService.calculateRAGStatus(worker, payPeriod, calculatedData);

      expect(result.success).toBe(false);
      expect(result.ragStatus).toBe('AMBER');
      expect(result.error).toBe('RAG status calculation failed');
      expect(result.reason).toBe('System error during RAG status calculation');
    });
  });
});
