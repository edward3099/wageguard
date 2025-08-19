const IntegratedNMWService = require('../src/services/integratedNMWService');
const PRPCalculationService = require('../src/services/prpCalculationService');
const AccommodationOffsetService = require('../src/services/accommodationOffsetService');
const NMWDeductionService = require('../src/services/nmwDeductionService');
const ratesConfig = require('../src/config/rates');

// Mock the dependent services
jest.mock('../src/services/prpCalculationService');
jest.mock('../src/services/accommodationOffsetService');
jest.mock('../src/services/nmwDeductionService');
jest.mock('../src/config/rates');

describe('Integrated NMW Service Tests', () => {
  let integratedService;
  let mockPRPService;
  let mockAccommodationService;
  let mockDeductionService;
  let mockRatesConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockPRPService = {
      calculatePRP: jest.fn()
    };
    mockAccommodationService = {
      calculateAccommodationOffset: jest.fn()
    };
    mockDeductionService = {
      calculateNMWDeductions: jest.fn()
    };
    mockRatesConfig = {
      getCategoryRates: jest.fn()
    };

    // Mock the constructors
    PRPCalculationService.mockImplementation(() => mockPRPService);
    AccommodationOffsetService.mockImplementation(() => mockAccommodationService);
    NMWDeductionService.mockImplementation(() => mockDeductionService);
    ratesConfig.getCategoryRates = mockRatesConfig.getCategoryRates;

    integratedService = new IntegratedNMWService();
  });

  describe('Input Validation', () => {
    test('should validate worker data correctly', async () => {
      const result = await integratedService.calculateComprehensiveNMW(
        null,
        { period_start: '2024-01-01', period_end: '2024-01-31' },
        {},
        {},
        {}
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Worker data is required');
    });

    test('should validate pay period data correctly', async () => {
      const result = await integratedService.calculateComprehensiveNMW(
        { worker_id: 'W001', worker_name: 'John Smith' },
        null,
        {},
        {},
        {}
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Pay period data is required');
    });

    test('should validate date format correctly', async () => {
      const result = await integratedService.calculateComprehensiveNMW(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: 'invalid-date', period_end: '2024-01-31' },
        {},
        {},
        {}
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid date format');
    });

    test('should validate date order correctly', async () => {
      const result = await integratedService.calculateComprehensiveNMW(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { period_start: '2024-01-31', period_end: '2024-01-01' },
        {},
        {},
        {}
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Period start date must be before period end date');
    });

    test('should accept valid inputs', async () => {
      mockRatesConfig.getCategoryRates.mockResolvedValue({
        accommodation: { dailyLimit: 9.99 },
        uniform: { maxDeduction: 0 },
        tools: { maxDeduction: 0 },
        training: { maxDeduction: 0 },
        other: { maxDeduction: 0 }
      });

      mockPRPService.calculatePRP.mockReturnValue({
        effectiveHourlyRate: 10.50,
        requiredRate: 10.42,
        ragStatus: 'green',
        complianceScore: 100,
        totalHours: 40,
        totalPay: 420.00
      });

      mockAccommodationService.calculateAccommodationOffset.mockResolvedValue({
        success: true,
        total_charge: 100,
        total_offset: 99.90,
        total_excess: 0.10,
        compliance_status: 'green',
        compliance_score: 95
      });

      mockDeductionService.calculateNMWDeductions.mockResolvedValue({
        success: true,
        total_deductions: 50,
        compliant_deductions: 50,
        non_compliant_deductions: 0,
        compliance_status: 'green',
        compliance_score: 100
      });

      const result = await integratedService.calculateComprehensiveNMW(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { id: 'PP001', period_start: '2024-01-01', period_end: '2024-01-31' },
        { accommodation: { total_charge: 100 } },
        { uniform_deduction: 25, tools_deduction: 25 },
        { bonus: 50 }
      );
      
      expect(result.success).toBe(true);
      expect(result.worker_id).toBe('W001');
      expect(result.pay_period_id).toBe('PP001');
    });
  });

  describe('NMW Rates Loading', () => {
    test('should load NMW rates correctly', async () => {
      const mockRates = {
        accommodation: { dailyLimit: 9.99 },
        uniform: { maxDeduction: 0 },
        tools: { maxDeduction: 0 },
        training: { maxDeduction: 0 },
        other: { maxDeduction: 0 }
      };

      mockRatesConfig.getCategoryRates
        .mockResolvedValueOnce(mockRates.accommodation)
        .mockResolvedValueOnce(mockRates.uniform)
        .mockResolvedValueOnce(mockRates.tools)
        .mockResolvedValueOnce(mockRates.training)
        .mockResolvedValueOnce(mockRates.other);

      const rates = await integratedService.loadNMWRates();
      
      expect(rates).toEqual(mockRates);
      expect(mockRatesConfig.getCategoryRates).toHaveBeenCalledTimes(5);
    });

    test('should handle rate loading errors', async () => {
      mockRatesConfig.getCategoryRates.mockRejectedValue(new Error('Rate loading failed'));
      
      await expect(integratedService.loadNMWRates()).rejects.toThrow('Failed to load NMW rates: Rate loading failed');
    });
  });

  describe('Core PRP Calculation', () => {
    test('should calculate core PRP correctly', async () => {
      const mockPRPResult = {
        effectiveHourlyRate: 10.50,
        requiredRate: 10.42,
        ragStatus: 'green',
        complianceScore: 100,
        totalHours: 40,
        totalPay: 420.00,
        breakdown: { prpDates: ['2024-01-01', '2024-01-31'] }
      };

      mockPRPService.calculatePRP.mockReturnValue(mockPRPResult);

      const result = await integratedService.calculateCorePRP(
        { worker_id: 'W001', worker_name: 'John Smith', age: 25 },
        { id: 'PP001', period_start: '2024-01-01', period_end: '2024-01-31', hours: 40, pay: 420.00 },
        {}
      );
      
      expect(result.success).toBe(true);
      expect(result.effective_hourly_rate).toBe(10.50);
      expect(result.required_hourly_rate).toBe(10.42);
      expect(result.compliance_status).toBe('green');
      expect(result.compliance_score).toBe(100);
      expect(result.total_hours).toBe(40);
      expect(result.total_pay).toBe(420.00);
    });

    test('should use default values for missing worker properties', async () => {
      const mockPRPResult = {
        effectiveHourlyRate: 10.50,
        requiredRate: 10.42,
        ragStatus: 'green',
        complianceScore: 100,
        totalHours: 40,
        totalPay: 420.00,
        breakdown: {}
      };

      mockPRPService.calculatePRP.mockReturnValue(mockPRPResult);

      const result = await integratedService.calculateCorePRP(
        { worker_id: 'W001', worker_name: 'John Smith' }, // Missing age and apprentice
        { id: 'PP001', period_start: '2024-01-01', period_end: '2024-01-31' }, // Missing hours and pay
        {}
      );
      
      expect(result.success).toBe(true);
      expect(mockPRPService.calculatePRP).toHaveBeenCalledWith(
        { worker_id: 'W001', worker_name: 'John Smith', age: 25, apprentice: false },
        { id: 'PP001', period_start: '2024-01-01', period_end: '2024-01-31', hours: 0, pay: 0 }
      );
    });
  });

  describe('Other Offsets Calculation', () => {
    test('should calculate other offsets correctly', () => {
      const offsetData = {
        meals: { total_charge: 30 },
        transport: { total_charge: 20 }
      };

      const result = integratedService.calculateOtherOffsets(offsetData, {});
      
      expect(result.meals.charge).toBe(30);
      expect(result.meals.offset).toBe(0); // Meals can't offset NMW
      expect(result.transport.charge).toBe(20);
      expect(result.transport.offset).toBe(0); // Transport can't offset NMW
      expect(result.total).toBe(0);
    });

    test('should handle missing offset data', () => {
      const result = integratedService.calculateOtherOffsets({}, {});
      
      expect(result.meals.charge).toBe(0);
      expect(result.transport.charge).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Enhancements Calculation', () => {
    test('should calculate enhancements correctly', () => {
      const enhancementData = {
        bonus: 100,
        commission: 50,
        tips: 25,
        tronc: 15,
        shift_premium: 30,
        overtime: 40,
        holiday_pay: 20
      };

      const result = integratedService.calculateEnhancements(enhancementData);
      
      expect(result.bonus).toBe(100);
      expect(result.commission).toBe(50);
      expect(result.tips).toBe(25);
      expect(result.tronc).toBe(15);
      expect(result.shift_premium).toBe(30);
      expect(result.overtime).toBe(40);
      expect(result.holiday_pay).toBe(20);
      expect(result.total).toBe(280);
    });

    test('should handle missing enhancement data', () => {
      const result = integratedService.calculateEnhancements(null);
      
      expect(result.bonus).toBe(0);
      expect(result.commission).toBe(0);
      expect(result.tips).toBe(0);
      expect(result.tronc).toBe(0);
      expect(result.shift_premium).toBe(0);
      expect(result.overtime).toBe(0);
      expect(result.holiday_pay).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Calculation Integration', () => {
    test('should integrate calculations correctly', () => {
      const prpResult = {
        total_pay: 400,
        total_hours: 40,
        required_hourly_rate: 10.42
      };

      const accommodationResult = {
        success: true,
        total_offset: 99.90,
        total_excess: 0 // No excess charges for green status
      };

      const deductionResult = {
        success: true,
        total_deductions: 0,
        total_excess: 0
      };

      const otherOffsetsResult = { total: 0 };
      const enhancementsResult = { total: 50 };
      const nmwRates = {};

      const result = integratedService.integrateCalculations(
        prpResult,
        accommodationResult,
        deductionResult,
        otherOffsetsResult,
        enhancementsResult,
        nmwRates
      );
      
      // Effective rate: (450 - 99.90) / 40 = 8.75, which is below required rate 10.42
      expect(result.finalStatus).toBe('red'); // Below NMW due to high offsets
      expect(result.effectiveHourlyRate).toBeCloseTo(8.75, 2);
      expect(result.totalOffsets).toBe(99.90);
      expect(result.totalDeductions).toBe(0);
      expect(result.totalEnhancements).toBe(50);
      expect(result.netPayForNMW).toBe(450);
    });

    test('should handle accommodation issues', () => {
      const prpResult = {
        total_pay: 600, // Higher pay to ensure above NMW even with offsets
        total_hours: 40,
        required_hourly_rate: 10.42
      };

      const accommodationResult = {
        success: true,
        total_offset: 99.90,
        total_excess: 50.10
      };

      const deductionResult = {
        success: true,
        total_deductions: 0,
        total_excess: 0
      };

      const otherOffsetsResult = { total: 0 };
      const enhancementsResult = { total: 0 };
      const nmwRates = {};

      const result = integratedService.integrateCalculations(
        prpResult,
        accommodationResult,
        deductionResult,
        otherOffsetsResult,
        enhancementsResult,
        nmwRates
      );
      
      // Effective rate: (600 - 99.90) / 40 = 12.50, which is above NMW but has accommodation issues
      expect(result.finalStatus).toBe('amber'); // Above NMW but has accommodation issues
      expect(result.effectiveHourlyRate).toBeCloseTo(12.50, 2);
    });

    test('should handle deduction issues', () => {
      const prpResult = {
        total_pay: 600, // Higher pay to ensure above NMW even with deductions
        total_hours: 40,
        required_hourly_rate: 10.42
      };

      const accommodationResult = {
        success: true,
        total_offset: 0,
        total_excess: 0
      };

      const deductionResult = {
        success: true,
        total_deductions: 100,
        total_excess: 25
      };

      const otherOffsetsResult = { total: 0 };
      const enhancementsResult = { total: 0 };
      const nmwRates = {};

      const result = integratedService.integrateCalculations(
        prpResult,
        accommodationResult,
        deductionResult,
        otherOffsetsResult,
        enhancementsResult,
        nmwRates
      );
      
      // Effective rate: (600 - 100) / 40 = 12.50, which is above NMW but has deduction issues
      expect(result.finalStatus).toBe('amber'); // Above NMW but has deduction issues
      expect(result.effectiveHourlyRate).toBeCloseTo(12.50, 2);
    });

    test('should handle rate issues', () => {
      const prpResult = {
        total_pay: 300, // Low pay
        total_hours: 40,
        required_hourly_rate: 10.42
      };

      const accommodationResult = {
        success: true,
        total_offset: 0,
        total_excess: 0
      };

      const deductionResult = {
        success: true,
        total_deductions: 0,
        total_excess: 0
      };

      const otherOffsetsResult = { total: 0 };
      const enhancementsResult = { total: 0 };
      const nmwRates = {};

      const result = integratedService.integrateCalculations(
        prpResult,
        accommodationResult,
        deductionResult,
        otherOffsetsResult,
        enhancementsResult,
        nmwRates
      );
      
      // Effective rate: (300 - 0) / 40 = 7.50, which is below required rate 10.42
      expect(result.finalStatus).toBe('red'); // Below NMW
      expect(result.effectiveHourlyRate).toBeCloseTo(7.50, 2);
    });
  });

  describe('Compliance Score Calculation', () => {
    test('should calculate perfect compliance score', () => {
      const result = integratedService.calculateFinalComplianceScore(
        10.50, // effectiveRate
        10.42, // requiredRate
        { success: true, total_excess: 0 }, // accommodationResult
        { success: true, total_excess: 0 }  // deductionResult
      );
      
      expect(result).toBe(100);
    });

    test('should calculate score with rate issues', () => {
      const result = integratedService.calculateFinalComplianceScore(
        9.00, // effectiveRate (below required)
        10.42, // requiredRate
        { success: true, total_excess: 0 },
        { success: true, total_excess: 0 }
      );
      
      expect(result).toBeLessThan(100);
      expect(result).toBeGreaterThan(0);
    });

    test('should calculate score with accommodation issues', () => {
      const result = integratedService.calculateFinalComplianceScore(
        10.50, // effectiveRate
        10.42, // requiredRate
        { success: true, total_excess: 50, total_charge: 100 }, // accommodationResult with issues
        { success: true, total_excess: 0 }  // deductionResult
      );
      
      expect(result).toBeLessThan(100);
      expect(result).toBeGreaterThan(0);
    });

    test('should calculate score with deduction issues', () => {
      const result = integratedService.calculateFinalComplianceScore(
        10.50, // effectiveRate
        10.42, // requiredRate
        { success: true, total_excess: 0 },
        { success: true, total_excess: 30, total_deductions: 100 } // deductionResult with issues
      );
      
      expect(result).toBeLessThan(100);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Comprehensive Breakdown Generation', () => {
    test('should generate comprehensive breakdown', () => {
      const prpResult = {
        effective_hourly_rate: 10.50,
        required_hourly_rate: 10.42,
        compliance_status: 'green',
        compliance_score: 100,
        total_hours: 40,
        total_pay: 400
      };

      const accommodationResult = {
        success: true,
        total_charge: 100,
        total_offset: 99.90,
        total_excess: 0.10,
        compliance_status: 'green',
        compliance_score: 95
      };

      const deductionResult = {
        success: true,
        total_deductions: 50,
        compliant_deductions: 50,
        non_compliant_deductions: 0,
        compliance_status: 'green',
        compliance_score: 100
      };

      const otherOffsetsResult = { total: 0 };
      const enhancementsResult = { total: 50 };
      const integratedResult = {
        finalStatus: 'green',
        finalScore: 95,
        effectiveHourlyRate: 8.75,
        requiredHourlyRate: 10.42,
        netPayForNMW: 450,
        totalOffsets: 99.90,
        totalDeductions: 50,
        totalEnhancements: 50
      };

      const breakdown = integratedService.generateComprehensiveBreakdown(
        prpResult,
        accommodationResult,
        deductionResult,
        otherOffsetsResult,
        enhancementsResult,
        integratedResult
      );
      
      expect(breakdown.core_prp).toEqual(prpResult);
      expect(breakdown.accommodation_offsets).toEqual({
        total_charge: accommodationResult.total_charge,
        total_offset: accommodationResult.total_offset,
        total_excess: accommodationResult.total_excess,
        compliance_status: accommodationResult.compliance_status,
        compliance_score: accommodationResult.compliance_score
      });
      expect(breakdown.nmw_deductions).toEqual({
        total_deductions: deductionResult.total_deductions,
        compliant_deductions: deductionResult.compliant_deductions,
        non_compliant_deductions: deductionResult.non_compliant_deductions,
        compliance_status: deductionResult.compliance_status,
        compliance_score: deductionResult.compliance_score
      });
      expect(breakdown.other_offsets).toEqual(otherOffsetsResult);
      expect(breakdown.enhancements).toEqual(enhancementsResult);
      expect(breakdown.integration).toEqual({
        final_status: 'green',
        final_score: 95,
        effective_hourly_rate: 8.75,
        required_hourly_rate: 10.42,
        net_pay_for_nmw: 450,
        total_offsets: 99.90,
        total_deductions: 50,
        total_enhancements: 50
      });
    });

    test('should handle failed service results', () => {
      const prpResult = {
        effective_hourly_rate: 10.50,
        required_hourly_rate: 10.42,
        compliance_status: 'green',
        compliance_score: 100,
        total_hours: 40,
        total_pay: 400
      };

      const accommodationResult = { success: false };
      const deductionResult = { success: false };
      const otherOffsetsResult = { total: 0 };
      const enhancementsResult = { total: 0 };
      const integratedResult = {
        finalStatus: 'green',
        finalScore: 100,
        effectiveHourlyRate: 10.50,
        requiredHourlyRate: 10.42,
        netPayForNMW: 400,
        totalOffsets: 0,
        totalDeductions: 0,
        totalEnhancements: 0
      };

      const breakdown = integratedService.generateComprehensiveBreakdown(
        prpResult,
        accommodationResult,
        deductionResult,
        otherOffsetsResult,
        enhancementsResult,
        integratedResult
      );
      
      expect(breakdown.accommodation_offsets).toBeNull();
      expect(breakdown.nmw_deductions).toBeNull();
    });
  });

  describe('Bulk Calculations', () => {
    test('should calculate bulk comprehensive NMW correctly', async () => {
      const workers = [
        { worker_id: 'W001', worker_name: 'John Smith' },
        { worker_id: 'W002', worker_name: 'Jane Doe' }
      ];

      const payPeriods = [
        { id: 'PP001', worker_id: 'W001', period_start: '2024-01-01', period_end: '2024-01-31' },
        { id: 'PP002', worker_id: 'W002', period_start: '2024-01-01', period_end: '2024-01-31' }
      ];

      const offsetData = [
        { worker_id: 'W001', pay_period_id: 'PP001', accommodation: { total_charge: 100 } },
        { worker_id: 'W002', pay_period_id: 'PP002', accommodation: { total_charge: 50 } }
      ];

      const deductionData = [
        { worker_id: 'W001', pay_period_id: 'PP001', uniform_deduction: 25 },
        { worker_id: 'W002', pay_period_id: 'PP002', uniform_deduction: 15 }
      ];

      const enhancementData = [
        { worker_id: 'W001', pay_period_id: 'PP001', bonus: 50 },
        { worker_id: 'W002', pay_period_id: 'PP002', bonus: 30 }
      ];

      // Mock the comprehensive calculation for each worker
      integratedService.calculateComprehensiveNMW = jest.fn()
        .mockResolvedValueOnce({ success: true, worker_id: 'W001' })
        .mockResolvedValueOnce({ success: true, worker_id: 'W002' });

      const results = await integratedService.calculateBulkComprehensiveNMW(
        workers,
        payPeriods,
        offsetData,
        deductionData,
        enhancementData
      );
      
      expect(results).toHaveLength(2);
      expect(integratedService.calculateComprehensiveNMW).toHaveBeenCalledTimes(2);
    });
  });

  describe('Summary Generation', () => {
    test('should generate summary for successful results', () => {
      const complianceResults = [
        {
          success: true,
          final_compliance_status: 'green',
          final_compliance_score: 100,
          effective_hourly_rate: 10.50,
          required_hourly_rate: 10.42,
          total_offsets: 50,
          total_deductions: 25,
          total_enhancements: 100
        },
        {
          success: true,
          final_compliance_status: 'amber',
          final_compliance_score: 80,
          effective_hourly_rate: 10.00,
          required_hourly_rate: 10.42,
          total_offsets: 30,
          total_deductions: 15,
          total_enhancements: 50
        }
      ];

      const summary = integratedService.getComprehensiveNMWSsummary(complianceResults);
      
      expect(summary.totalWorkers).toBe(2);
      expect(summary.complianceBreakdown).toEqual({ green: 1, amber: 1 });
      expect(summary.averageComplianceScore).toBe(90);
      expect(summary.averageEffectiveRate).toBe(10.25);
      expect(summary.averageRequiredRate).toBe(10.42);
      expect(summary.totalOffsets).toBe(80);
      expect(summary.totalDeductions).toBe(40);
      expect(summary.totalEnhancements).toBe(150);
    });

    test('should handle empty results', () => {
      const summary = integratedService.getComprehensiveNMWSsummary([]);
      
      expect(summary.totalWorkers).toBe(0);
      expect(summary.complianceBreakdown).toEqual({ green: 0, amber: 0, red: 0 });
      expect(summary.averageComplianceScore).toBe(0);
      expect(summary.averageEffectiveRate).toBe(0);
      expect(summary.averageRequiredRate).toBe(0);
      expect(summary.totalOffsets).toBe(0);
      expect(summary.totalDeductions).toBe(0);
      expect(summary.totalEnhancements).toBe(0);
    });

    test('should handle failed results', () => {
      const complianceResults = [
        { success: false, error: 'Calculation failed' },
        { success: true, final_compliance_status: 'green', final_compliance_score: 100 }
      ];

      const summary = integratedService.getComprehensiveNMWSsummary(complianceResults);
      
      expect(summary.totalWorkers).toBe(1); // Only successful results
      expect(summary.complianceBreakdown).toEqual({ green: 1 });
    });
  });

  describe('Error Handling', () => {
    test('should handle calculation errors gracefully', async () => {
      mockRatesConfig.getCategoryRates.mockRejectedValue(new Error('Rate loading failed'));

      const result = await integratedService.calculateComprehensiveNMW(
        { worker_id: 'W001', worker_name: 'John Smith' },
        { id: 'PP001', period_start: '2024-01-01', period_end: '2024-01-31' },
        {},
        {},
        {}
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate loading failed');
      expect(result.worker_id).toBe('W001');
      expect(result.pay_period_id).toBe('PP001');
    });

    test('should handle null worker data in error cases', async () => {
      const result = await integratedService.calculateComprehensiveNMW(
        null,
        null,
        {},
        {},
        {}
      );
      
      expect(result.success).toBe(false);
      expect(result.worker_id).toBe('unknown');
      expect(result.pay_period_id).toBe('unknown');
    });
  });
});
