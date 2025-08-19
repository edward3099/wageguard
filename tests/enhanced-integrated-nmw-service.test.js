const IntegratedNMWService = require('../src/services/integratedNMWService');

// Mock all the dependent services
jest.mock('../src/services/prpCalculationService');
jest.mock('../src/services/accommodationOffsetService');
jest.mock('../src/services/nmwDeductionService');
jest.mock('../src/services/allowancePremiumService');
jest.mock('../src/services/troncExclusionService');
jest.mock('../src/config/rates');

describe('Enhanced Integrated NMW Service Tests', () => {
  let integratedNMWService;
  let mockPRPService;
  let mockAccommodationService;
  let mockDeductionService;
  let mockAllowancePremiumService;
  let mockTroncExclusionService;
  let mockRatesConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the services
    mockPRPService = require('../src/services/prpCalculationService');
    mockAccommodationService = require('../src/services/accommodationOffsetService');
    mockDeductionService = require('../src/services/nmwDeductionService');
    mockAllowancePremiumService = require('../src/services/allowancePremiumService');
    mockTroncExclusionService = require('../src/services/troncExclusionService');
    mockRatesConfig = require('../src/config/rates');

    // Mock the constructor calls
    mockPRPService.mockImplementation(() => ({
      calculatePRP: jest.fn()
    }));
    mockAccommodationService.mockImplementation(() => ({
      calculateAccommodationOffset: jest.fn()
    }));
    mockDeductionService.mockImplementation(() => ({
      calculateNMWDeductions: jest.fn()
    }));
    mockAllowancePremiumService.mockImplementation(() => ({
      calculateAllowancesAndPremiums: jest.fn()
    }));
    mockTroncExclusionService.mockImplementation(() => ({
      processTroncExclusions: jest.fn()
    }));

    integratedNMWService = new IntegratedNMWService();
  });

  describe('Enhanced NMW Calculation', () => {
    test('should integrate allowances, premiums, and tronc exclusions', async () => {
      // Mock rates config
      mockRatesConfig.getCategoryRates = jest.fn()
        .mockResolvedValueOnce({ dailyLimit: 9.99 }) // accommodation
        .mockResolvedValueOnce({ maxDeduction: 0 })  // uniform
        .mockResolvedValueOnce({ maxDeduction: 0 })  // tools
        .mockResolvedValueOnce({ maxDeduction: 0 })  // training
        .mockResolvedValueOnce({ maxDeduction: 0 }); // other

      // Mock service responses
      integratedNMWService.prpService.calculatePRP.mockReturnValue({
        effectiveHourlyRate: 10.50,
        requiredRate: 10.42,
        ragStatus: 'green',
        complianceScore: 85,
        totalHours: 40,
        totalPay: 420,
        breakdown: {}
      });

      integratedNMWService.accommodationService.calculateAccommodationOffset.mockResolvedValue({
        success: true,
        total_charge: 200,
        total_offset: 160,
        total_excess: 0,
        compliance_status: 'green',
        compliance_score: 100
      });

      integratedNMWService.deductionService.calculateNMWDeductions.mockResolvedValue({
        success: true,
        total_deductions: 50,
        compliant_deductions: 50,
        non_compliant_deductions: 0,
        total_excess: 0,
        compliance_status: 'green',
        compliance_score: 100
      });

      integratedNMWService.allowancePremiumService.calculateAllowancesAndPremiums.mockResolvedValue({
        success: true,
        totals: {
          total_allowances_included: 100,
          total_allowances_excluded: 25,
          total_premiums_basic_rate: 80,
          total_premiums_excluded: 40,
          total_nmw_eligible: 180
        },
        warnings: [
          {
            type: 'estimated_premiums',
            severity: 'amber',
            message: 'Premium calculations contain estimates'
          }
        ]
      });

      integratedNMWService.troncExclusionService.processTroncExclusions.mockResolvedValue({
        success: true,
        exclusion_summary: {
          total_excluded: 75,
          excluded_components: 2,
          flagged_components: 0
        },
        adjusted_pay_calculation: {
          exclusion_impact: 'moderate'
        },
        warnings: [
          {
            type: 'tronc_exclusion_critical',
            severity: 'red',
            message: 'Tips excluded from NMW calculation'
          }
        ]
      });

      const worker = {
        worker_id: 'W001',
        worker_name: 'John Smith',
        age: 25
      };

      const payPeriod = {
        id: 1,
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        hours: 40,
        pay: 420
      };

      const rawPayComponents = {
        basic_pay: 420,
        london_weighting: 100,
        overtime_premium: 120,
        tips: 75
      };

      const result = await integratedNMWService.calculateComprehensiveNMW(
        worker, payPeriod, {}, {}, {}, rawPayComponents
      );

      expect(result.success).toBe(true);
      expect(result.worker_id).toBe('W001');
      expect(result.total_allowances).toBe(100);
      expect(result.total_premiums).toBe(80);
      expect(result.total_tronc_excluded).toBe(75);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0].source).toBe('allowances_premiums');
      expect(result.warnings[1].source).toBe('tronc_exclusions');
      
      // Verify all new services were called
      expect(integratedNMWService.allowancePremiumService.calculateAllowancesAndPremiums)
        .toHaveBeenCalledWith(worker, payPeriod, rawPayComponents);
      expect(integratedNMWService.troncExclusionService.processTroncExclusions)
        .toHaveBeenCalledWith(worker, payPeriod, rawPayComponents);
    });

    test('should handle service failures gracefully', async () => {
      // Mock rates config
      mockRatesConfig.getCategoryRates = jest.fn()
        .mockResolvedValueOnce({ dailyLimit: 9.99 })
        .mockResolvedValueOnce({ maxDeduction: 0 })
        .mockResolvedValueOnce({ maxDeduction: 0 })
        .mockResolvedValueOnce({ maxDeduction: 0 })
        .mockResolvedValueOnce({ maxDeduction: 0 });

      // Mock successful core services
      integratedNMWService.prpService.calculatePRP.mockReturnValue({
        effectiveHourlyRate: 10.50,
        requiredRate: 10.42,
        ragStatus: 'green',
        complianceScore: 85,
        totalHours: 40,
        totalPay: 420,
        breakdown: {}
      });

      integratedNMWService.accommodationService.calculateAccommodationOffset.mockResolvedValue({
        success: true,
        total_offset: 0,
        compliance_status: 'green',
        compliance_score: 100
      });

      integratedNMWService.deductionService.calculateNMWDeductions.mockResolvedValue({
        success: true,
        total_deductions: 0,
        total_excess: 0,
        compliance_status: 'green',
        compliance_score: 100
      });

      // Mock failed new services
      integratedNMWService.allowancePremiumService.calculateAllowancesAndPremiums.mockResolvedValue({
        success: false,
        error: 'Allowance calculation failed'
      });

      integratedNMWService.troncExclusionService.processTroncExclusions.mockResolvedValue({
        success: false,
        error: 'Tronc processing failed'
      });

      const worker = { worker_id: 'W001', worker_name: 'John Smith' };
      const payPeriod = {
        id: 1,
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        hours: 40,
        pay: 420
      };

      const result = await integratedNMWService.calculateComprehensiveNMW(
        worker, payPeriod, {}, {}, {}, {}
      );

      expect(result.success).toBe(true);
      expect(result.total_allowances).toBe(0);
      expect(result.total_premiums).toBe(0);
      expect(result.total_tronc_excluded).toBe(0);
      expect(result.breakdown.allowances_premiums).toBeNull();
      expect(result.breakdown.tronc_exclusions).toBeNull();
    });
  });

  describe('Warning Consolidation', () => {
    test('should consolidate warnings from all services', () => {
      const allowancePremiumResult = {
        success: true,
        warnings: [
          { type: 'low_confidence', severity: 'amber', message: 'Low confidence classification' }
        ]
      };

      const troncExclusionResult = {
        success: true,
        warnings: [
          { type: 'tronc_exclusion_critical', severity: 'red', message: 'Tips excluded' }
        ]
      };

      const warnings = integratedNMWService.consolidateWarnings(allowancePremiumResult, troncExclusionResult);
      
      expect(warnings).toHaveLength(2);
      expect(warnings[0].source).toBe('allowances_premiums');
      expect(warnings[1].source).toBe('tronc_exclusions');
    });

    test('should handle services with no warnings', () => {
      const allowancePremiumResult = { success: true };
      const troncExclusionResult = { success: true, warnings: [] };

      const warnings = integratedNMWService.consolidateWarnings(allowancePremiumResult, troncExclusionResult);
      
      expect(warnings).toHaveLength(0);
    });
  });

  describe('Enhanced Breakdown Generation', () => {
    test('should include allowances, premiums, and tronc exclusions in breakdown', () => {
      const prpResult = {
        effective_hourly_rate: 10.50,
        required_hourly_rate: 10.42,
        compliance_status: 'green',
        compliance_score: 85,
        total_hours: 40,
        total_pay: 420
      };

      const accommodationResult = {
        success: true,
        total_charge: 200,
        total_offset: 160,
        total_excess: 0,
        compliance_status: 'green',
        compliance_score: 100
      };

      const deductionResult = {
        success: true,
        total_deductions: 50,
        compliant_deductions: 50,
        non_compliant_deductions: 0,
        compliance_status: 'green',
        compliance_score: 100
      };

      const allowancePremiumResult = {
        success: true,
        totals: {
          total_allowances_included: 100,
          total_allowances_excluded: 25,
          total_premiums_basic_rate: 80,
          total_premiums_excluded: 40,
          total_nmw_eligible: 180
        }
      };

      const troncExclusionResult = {
        success: true,
        exclusion_summary: {
          total_excluded: 75,
          excluded_components: 2,
          flagged_components: 0
        },
        adjusted_pay_calculation: {
          exclusion_impact: 'moderate'
        }
      };

      const integratedResult = {
        finalStatus: 'green',
        finalScore: 90,
        effectiveHourlyRate: 10.50,
        requiredHourlyRate: 10.42,
        netPayForNMW: 555,
        totalOffsets: 160,
        totalDeductions: 50,
        totalAllowances: 100,
        totalPremiums: 80,
        totalTroncExcluded: 75,
        totalEnhancements: 0
      };

      const breakdown = integratedNMWService.generateComprehensiveBreakdown(
        prpResult,
        accommodationResult,
        deductionResult,
        allowancePremiumResult,
        troncExclusionResult,
        { total: 0 }, // otherOffsetsResult
        { total: 0 }, // enhancementsResult
        integratedResult
      );

      expect(breakdown.allowances_premiums).toBeDefined();
      expect(breakdown.allowances_premiums.total_allowances_included).toBe(100);
      expect(breakdown.allowances_premiums.total_premiums_basic_rate).toBe(80);
      
      expect(breakdown.tronc_exclusions).toBeDefined();
      expect(breakdown.tronc_exclusions.total_excluded).toBe(75);
      expect(breakdown.tronc_exclusions.impact_category).toBe('moderate');
      
      expect(breakdown.integration.total_allowances).toBe(100);
      expect(breakdown.integration.total_premiums).toBe(80);
      expect(breakdown.integration.total_tronc_excluded).toBe(75);
    });
  });
});
