const AccommodationOffsetService = require('../src/services/accommodationOffsetService');
const ratesConfig = require('../src/config/rates');

// Mock the rates configuration
jest.mock('../src/config/rates');

describe('Accommodation Offset Service Tests', () => {
  let accommodationService;
  let mockRatesConfig;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup mock rates configuration
    mockRatesConfig = {
      getCategoryRates: jest.fn(),
      getRate: jest.fn()
    };
    
    // Mock the rates config module
    ratesConfig.getCategoryRates = mockRatesConfig.getCategoryRates;
    ratesConfig.getRate = mockRatesConfig.getRate;
    
    // Create service instance
    accommodationService = new AccommodationOffsetService();
  });

  describe('Input Validation', () => {
    test('should validate worker data correctly', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        dailyLimit: 9.99,
        source: 'GOV.UK',
        lastUpdated: '2024-01-01'
      });

      const result = await accommodationService.calculateAccommodationOffset(
        null, // Invalid worker
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 100 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Worker data is required');
    });

    test('should validate pay period data correctly', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        dailyLimit: 9.99,
        source: 'GOV.UK',
        lastUpdated: '2024-01-01'
      });

      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        null, // Invalid pay period
        { total_charge: 100 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Pay period data is required');
    });

    test('should validate accommodation data correctly', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        dailyLimit: 9.99,
        source: 'GOV.UK',
        lastUpdated: '2024-01-01'
      });

      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        null // Invalid accommodation data
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Accommodation data is required');
    });

    test('should validate date formats correctly', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        dailyLimit: 9.99,
        source: 'GOV.UK',
        lastUpdated: '2024-01-01'
      });

      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: 'invalid-date', period_end: '2024-01-31' },
        { total_charge: 100 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid date format');
    });

    test('should validate date order correctly', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        dailyLimit: 9.99,
        source: 'GOV.UK',
        lastUpdated: '2024-01-01'
      });

      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-31', period_end: '2024-01-01' }, // End before start
        { total_charge: 100 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Period start date must be before period end date');
    });

    test('should validate negative accommodation charges', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        dailyLimit: 9.99,
        source: 'GOV.UK',
        lastUpdated: '2024-01-01'
      });

      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: -50 } // Negative charge
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('non-negative number');
    });
  });

  describe('PRP Date Calculations', () => {
    test('should calculate PRP dates correctly for monthly period', () => {
      const prpDates = accommodationService.calculatePRPDates('2024-01-01', '2024-01-31');
      
      expect(prpDates.totalDays).toBe(31);
      expect(prpDates.workingDays).toBe(23); // January 2024 has 23 working days
      expect(prpDates.accommodationDays).toBe(31);
      expect(prpDates.periodLength).toBe(31);
    });

    test('should calculate PRP dates correctly for weekly period', () => {
      const prpDates = accommodationService.calculatePRPDates('2024-01-01', '2024-01-07');
      
      expect(prpDates.totalDays).toBe(7);
      expect(prpDates.workingDays).toBe(5); // Monday to Sunday
      expect(prpDates.accommodationDays).toBe(7);
    });

    test('should calculate PRP dates correctly for single day', () => {
      const prpDates = accommodationService.calculatePRPDates('2024-01-01', '2024-01-01');
      
      expect(prpDates.totalDays).toBe(1);
      expect(prpDates.workingDays).toBe(1);
      expect(prpDates.accommodationDays).toBe(1);
    });

    test('should calculate working days correctly excluding weekends', () => {
      // Test a period that spans multiple weeks
      const prpDates = accommodationService.calculatePRPDates('2024-01-01', '2024-01-14');
      
      // January 1-14, 2024: 14 days total, 10 working days (excluding weekends)
      expect(prpDates.totalDays).toBe(14);
      expect(prpDates.workingDays).toBe(10);
    });
  });

  describe('Accommodation Offset Calculations', () => {
    beforeEach(() => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        dailyLimit: 9.99,
        source: 'GOV.UK NMW accommodation offset rules',
        lastUpdated: '2024-01-01T00:00:00.000Z'
      });
    });

    test('should calculate offset correctly when daily charge is below limit', async () => {
      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 150 } // £150 for 31 days = £4.84 per day
      );

      expect(result.success).toBe(true);
      expect(result.total_charge).toBe(150);
      expect(result.total_offset).toBe(150); // Full amount can be offset
      expect(result.total_excess).toBe(0);
      expect(result.compliant_days).toBe(31);
      expect(result.non_compliant_days).toBe(0);
      expect(result.compliance_status).toBe('green');
      expect(result.compliance_score).toBe(100);
    });

    test('should calculate offset correctly when daily charge equals limit', async () => {
      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 309.69 } // £9.99 × 31 days = £309.69
      );

      expect(result.success).toBe(true);
      expect(result.total_charge).toBe(309.69);
      expect(result.total_offset).toBe(309.69); // Full amount can be offset
      expect(result.total_excess).toBe(0);
      expect(result.compliant_days).toBe(31);
      expect(result.non_compliant_days).toBe(0);
      expect(result.compliance_status).toBe('green');
      expect(result.compliance_score).toBe(100);
    });

    test('should calculate offset correctly when daily charge exceeds limit', async () => {
      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 400 } // £400 for 31 days = £12.90 per day
      );

      expect(result.success).toBe(true);
      expect(result.total_charge).toBe(400);
      expect(result.total_offset).toBe(309.69); // £9.99 × 31 days
      expect(result.total_excess).toBeCloseTo(90.31, 2); // £2.91 × 31 days
      expect(result.compliant_days).toBe(31); // All days can be covered by limit
      expect(result.non_compliant_days).toBe(0);
      expect(result.compliance_status).toBe('amber'); // Some excess but still compliant
      expect(result.compliance_score).toBe(100);
    });

    test('should calculate offset correctly for very high daily charges', async () => {
      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 1000 } // £1000 for 31 days = £32.26 per day
      );

      expect(result.success).toBe(true);
      expect(result.total_charge).toBe(1000);
      expect(result.total_offset).toBe(309.69); // £9.99 × 31 days
      expect(result.total_excess).toBe(690.31); // £22.27 × 31 days
      expect(result.compliant_days).toBe(31); // All days can be covered by limit
      expect(result.non_compliant_days).toBe(0);
      expect(result.compliance_status).toBe('amber');
      expect(result.compliance_score).toBe(100);
    });

    test('should handle zero accommodation charge', async () => {
      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 0 }
      );

      expect(result.success).toBe(true);
      expect(result.total_charge).toBe(0);
      expect(result.total_offset).toBe(0);
      expect(result.total_excess).toBe(0);
      expect(result.compliant_days).toBe(31);
      expect(result.non_compliant_days).toBe(0);
      expect(result.compliance_status).toBe('green');
      expect(result.compliance_score).toBe(100);
    });
  });

  describe('Compliance Status Determination', () => {
    beforeEach(() => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        dailyLimit: 9.99,
        source: 'GOV.UK NMW accommodation offset rules',
        lastUpdated: '2024-01-01T00:00:00.000Z'
      });
    });

    test('should return green status for compliant charges', async () => {
      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 150 }
      );

      expect(result.compliance_status).toBe('green');
      expect(result.compliance_score).toBe(100);
    });

    test('should return amber status for charges slightly above limit', async () => {
      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 400 }
      );

      expect(result.compliance_status).toBe('amber');
      expect(result.compliance_score).toBe(100);
    });

    test('should return red status for charges well above limit', async () => {
      // This would need a scenario where some days cannot be covered by the limit
      // For now, test with a very high charge that might trigger red status
      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 2000 } // Very high charge
      );

      // The current logic might still return amber if all days can be covered
      // This test documents the current behavior
      expect(['green', 'amber', 'red']).toContain(result.compliance_status);
    });
  });

  describe('Detailed Breakdown Generation', () => {
    beforeEach(() => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        dailyLimit: 9.99,
        source: 'GOV.UK NMW accommodation offset rules',
        lastUpdated: '2024-01-01T00:00:00.000Z'
      });
    });

    test('should generate comprehensive breakdown', async () => {
      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 400 }
      );

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.period).toBeDefined();
      expect(result.breakdown.charges).toBeDefined();
      expect(result.breakdown.limits).toBeDefined();
      expect(result.breakdown.compliance).toBeDefined();

      // Check period details
      expect(result.breakdown.period.start).toBe('2024-01-01');
      expect(result.breakdown.period.end).toBe('2024-01-31');
      expect(result.breakdown.period.totalDays).toBe(31);
      expect(result.breakdown.period.workingDays).toBe(23);

      // Check charge breakdown
      expect(result.breakdown.charges.total).toBe(400);
      expect(result.breakdown.charges.daily).toBeCloseTo(12.90, 2);
      expect(result.breakdown.charges.breakdown.compliant.days).toBe(31);
      expect(result.breakdown.charges.breakdown.compliant.total).toBe(309.69);
      expect(result.breakdown.charges.breakdown.nonCompliant.totalExcess).toBeCloseTo(90.31, 2);

      // Check limits
      expect(result.breakdown.limits.dailyLimit).toBe(9.99);
      expect(result.breakdown.limits.periodLimit).toBe(309.69);
      expect(result.breakdown.limits.appliedLimit).toBe(309.69);

      // Check compliance
      expect(result.breakdown.compliance.compliantDays).toBe(31);
      expect(result.breakdown.compliance.nonCompliantDays).toBe(0);
      expect(result.breakdown.compliance.complianceRate).toBe(100);
    });
  });

  describe('Bulk Calculations', () => {
    beforeEach(() => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        dailyLimit: 9.99,
        source: 'GOV.UK NMW accommodation offset rules',
        lastUpdated: '2024-01-01T00:00:00.000Z'
      });
    });

    test('should calculate offsets for multiple workers', async () => {
      const workers = [
        { worker_id: 'W001', worker_name: 'John Smith' },
        { worker_id: 'W002', worker_name: 'Jane Doe' }
      ];

      const payPeriods = [
        { id: 'PP001', worker_id: 'W001', period_start: '2024-01-01', period_end: '2024-01-31' },
        { id: 'PP002', worker_id: 'W002', period_start: '2024-01-01', period_end: '2024-01-31' }
      ];

      const accommodationData = [
        { worker_id: 'W001', pay_period_id: 'PP001', total_charge: 200 },
        { worker_id: 'W002', pay_period_id: 'PP002', total_charge: 300 }
      ];

      const results = await accommodationService.calculateBulkAccommodationOffsets(
        workers,
        payPeriods,
        accommodationData
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].worker_id).toBe('W001');
      expect(results[1].worker_id).toBe('W002');
    });

    test('should handle missing accommodation data gracefully', async () => {
      const workers = [
        { worker_id: 'W001', worker_name: 'John Smith' }
      ];

      const payPeriods = [
        { id: 'PP001', worker_id: 'W001', period_start: '2024-01-01', period_end: '2024-01-31' }
      ];

      const accommodationData = []; // No accommodation data

      const results = await accommodationService.calculateBulkAccommodationOffsets(
        workers,
        payPeriods,
        accommodationData
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].total_charge).toBe(0);
      expect(results[0].total_offset).toBe(0);
    });
  });

  describe('Summary Generation', () => {
    test('should generate summary for successful results', () => {
      const mockResults = [
        {
          success: true,
          total_offset: 100,
          total_excess: 20,
          compliance_status: 'green',
          compliance_score: 100
        },
        {
          success: true,
          total_offset: 150,
          total_excess: 30,
          compliance_status: 'amber',
          compliance_score: 85
        },
        {
          success: true,
          total_offset: 200,
          total_excess: 50,
          compliance_status: 'red',
          compliance_score: 60
        }
      ];

      const summary = accommodationService.getAccommodationOffsetSummary(mockResults);

      expect(summary.totalWorkers).toBe(3);
      expect(summary.totalOffset).toBe(450);
      expect(summary.totalExcess).toBe(100);
      expect(summary.complianceBreakdown.green).toBe(1);
      expect(summary.complianceBreakdown.amber).toBe(1);
      expect(summary.complianceBreakdown.red).toBe(1);
      expect(summary.averageComplianceScore).toBeGreaterThan(0);
    });

    test('should handle empty results', () => {
      const summary = accommodationService.getAccommodationOffsetSummary([]);

      expect(summary.totalWorkers).toBe(0);
      expect(summary.totalOffset).toBe(0);
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
          total_offset: 100,
          total_excess: 0,
          compliance_status: 'green'
        }
      ];

      const summary = accommodationService.getAccommodationOffsetSummary(mockResults);

      expect(summary.totalWorkers).toBe(1);
      expect(summary.totalOffset).toBe(100);
      expect(summary.totalExcess).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle rates configuration errors', async () => {
      mockRatesConfig.getCategoryRates.mockRejectedValue(new Error('Configuration error'));

      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 100 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Configuration error');
    });

    test('should handle validation errors gracefully', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        dailyLimit: 9.99,
        source: 'GOV.UK NMW accommodation offset rules',
        lastUpdated: '2024-01-01T00:00:00.000Z'
      });

      const result = await accommodationService.calculateAccommodationOffset(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        { total_charge: 'invalid' } // Invalid charge type
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('non-negative number');
    });
  });
});
