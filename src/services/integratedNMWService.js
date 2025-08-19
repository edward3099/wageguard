const PRPCalculationService = require('./prpCalculationService');
const AccommodationOffsetService = require('./accommodationOffsetService');
const NMWDeductionService = require('./nmwDeductionService');
const AllowancePremiumService = require('./allowancePremiumService');
const TroncExclusionService = require('./troncExclusionService');
const RAGStatusService = require('./ragStatusService');
const FixSuggestionService = require('./fixSuggestionService');
const ratesConfig = require('../config/rates');

/**
 * Integrated NMW Service for WageGuard
 * Combines all NMW compliance services: PRP calculations, accommodation offsets,
 * NMW deductions, allowances/premiums, and tronc exclusions
 * to provide comprehensive NMW/NLW compliance checking
 */
class IntegratedNMWService {
  constructor() {
    this.prpService = new PRPCalculationService();
    this.accommodationService = new AccommodationOffsetService();
    this.deductionService = new NMWDeductionService();
    this.allowancePremiumService = new AllowancePremiumService();
    this.troncExclusionService = new TroncExclusionService();
    this.ragStatusService = new RAGStatusService();
    this.fixSuggestionService = new FixSuggestionService();
    this.ratesConfig = ratesConfig;
  }

  /**
   * Calculate comprehensive NMW compliance for a worker's pay period
   * @param {Object} worker - Worker data
   * @param {Object} payPeriod - Pay period data
   * @param {Object} offsetData - Offset data (accommodation, meals, transport)
   * @param {Object} deductionData - Deduction data (uniform, tools, training, other)
   * @param {Object} enhancementData - Enhancement data (bonus, commission, tips, etc.)
   * @param {Object} rawPayComponents - Raw pay components for allowance/premium/tronc analysis
   * @returns {Object} Comprehensive NMW compliance result
   */
  async calculateComprehensiveNMW(worker, payPeriod, offsetData, deductionData, enhancementData, rawPayComponents = {}) {
    try {
      // Validate inputs
      const validation = this.validateComprehensiveInputs(worker, payPeriod, offsetData, deductionData, enhancementData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          worker_id: worker?.worker_id || 'unknown',
          pay_period_id: payPeriod?.id || 'unknown'
        };
      }

      // Load current NMW rates
      const nmwRates = await this.loadNMWRates();
      
      // Calculate core PRP (Pay-Reference Period)
      const prpResult = await this.calculateCorePRP(worker, payPeriod, nmwRates);
      
      // Calculate accommodation offsets
      const accommodationResult = await this.accommodationService.calculateAccommodationOffset(
        worker, payPeriod, offsetData.accommodation || { total_charge: 0 }
      );
      
      // Calculate NMW deductions
      const deductionResult = await this.deductionService.calculateNMWDeductions(
        worker, payPeriod, deductionData
      );
      
      // Process allowances and premiums
      const allowancePremiumResult = await this.allowancePremiumService.calculateAllowancesAndPremiums(
        worker, payPeriod, rawPayComponents
      );
      
      // Process tronc exclusions
      const troncExclusionResult = await this.troncExclusionService.processTroncExclusions(
        worker, payPeriod, rawPayComponents
      );
      
      // Calculate other offsets (meals, transport)
      const otherOffsetsResult = this.calculateOtherOffsets(offsetData, nmwRates);
      
      // Calculate enhancements (bonus, commission, tips, etc.)
      const enhancementsResult = this.calculateEnhancements(enhancementData);
      
      // Integrate all calculations for final NMW compliance
      const integratedResult = this.integrateCalculations(
        prpResult,
        accommodationResult,
        deductionResult,
        allowancePremiumResult,
        troncExclusionResult,
        otherOffsetsResult,
        enhancementsResult,
        nmwRates
      );
      
      // Generate comprehensive breakdown
      const breakdown = this.generateComprehensiveBreakdown(
        prpResult,
        accommodationResult,
        deductionResult,
        allowancePremiumResult,
        troncExclusionResult,
        otherOffsetsResult,
        enhancementsResult,
        integratedResult
      );

      // Calculate RAG status based on effective rate vs required rate
      const ragStatusResult = await this.calculateRAGStatus(worker, payPeriod, integratedResult);
      
      // Generate fix suggestions if needed (especially for RED status)
      const fixSuggestionsResult = await this.generateFixSuggestions(
        worker, payPeriod, ragStatusResult, integratedResult, rawPayComponents
      );
      
      return {
        success: true,
        worker_id: worker.worker_id,
        worker_name: worker.worker_name,
        pay_period_id: payPeriod.id,
        period_start: payPeriod.period_start,
        period_end: payPeriod.period_end,
        final_compliance_status: integratedResult.finalStatus,
        final_compliance_score: integratedResult.finalScore,
        effective_hourly_rate: integratedResult.effectiveHourlyRate,
        required_hourly_rate: integratedResult.requiredHourlyRate,
        total_offsets: integratedResult.totalOffsets,
        total_deductions: integratedResult.totalDeductions,
        total_allowances: integratedResult.totalAllowances,
        total_premiums: integratedResult.totalPremiums,
        total_tronc_excluded: integratedResult.totalTroncExcluded,
        total_enhancements: integratedResult.totalEnhancements,
        net_pay_for_nmw: integratedResult.netPayForNMW,
        rag_status: ragStatusResult.ragStatus,
        rag_reason: ragStatusResult.reason,
        rag_severity: ragStatusResult.severity,
        fix_suggestions: fixSuggestionsResult.suggestions || [],
        primary_fix_suggestion: fixSuggestionsResult.primarySuggestion?.message || null,
        fix_calculations: fixSuggestionsResult.calculations || {},
        breakdown: breakdown,
        warnings: this.consolidateWarnings(allowancePremiumResult, troncExclusionResult, ragStatusResult, fixSuggestionsResult),
        calculation_date: new Date().toISOString(),
        rates_source: 'GOV.UK NMW/NLW rules',
        rates_last_updated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Comprehensive NMW calculation failed:', error);
      return {
        success: false,
        error: error.message,
        worker_id: worker?.worker_id || 'unknown',
        pay_period_id: payPeriod?.id || 'unknown'
      };
    }
  }

  /**
   * Validate comprehensive NMW calculation inputs
   * @param {Object} worker - Worker data
   * @param {Object} payPeriod - Pay period data
   * @param {Object} offsetData - Offset data
   * @param {Object} deductionData - Deduction data
   * @param {Object} enhancementData - Enhancement data
   * @returns {Object} Validation result
   */
  validateComprehensiveInputs(worker, payPeriod, offsetData, deductionData, enhancementData) {
    const errors = [];

    // Validate worker data
    if (!worker || !worker.worker_id) {
      errors.push('Worker data is required with valid worker_id');
    }

    // Validate pay period data
    if (!payPeriod || !payPeriod.period_start || !payPeriod.period_end) {
      errors.push('Pay period data is required with valid start and end dates');
    }

    // Validate dates
    if (payPeriod && payPeriod.period_start && payPeriod.period_end) {
      const startDate = new Date(payPeriod.period_start);
      const endDate = new Date(payPeriod.period_end);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        errors.push('Invalid date format for period start or end');
      }
      
      if (startDate >= endDate) {
        errors.push('Period start date must be before period end date');
      }
    }

    // Validate data objects (can be undefined/null for optional data)
    if (offsetData && typeof offsetData !== 'object') {
      errors.push('Offset data must be an object');
    }

    if (deductionData && typeof deductionData !== 'object') {
      errors.push('Deduction data must be an object');
    }

    if (enhancementData && typeof enhancementData !== 'object') {
      errors.push('Enhancement data must be an object');
    }

    return {
      isValid: errors.length === 0,
      error: errors.join('; ')
    };
  }

  /**
   * Load NMW rates from configuration
   * @returns {Object} NMW rates and limits
   */
  async loadNMWRates() {
    try {
      const accommodationRates = await this.ratesConfig.getCategoryRates('accommodation');
      const uniformRates = await this.ratesConfig.getCategoryRates('uniform');
      const toolsRates = await this.ratesConfig.getCategoryRates('tools');
      const trainingRates = await this.ratesConfig.getCategoryRates('training');
      const otherRates = await this.ratesConfig.getCategoryRates('other');

      return {
        accommodation: accommodationRates,
        uniform: uniformRates,
        tools: toolsRates,
        training: trainingRates,
        other: otherRates
      };
    } catch (error) {
      throw new Error(`Failed to load NMW rates: ${error.message}`);
    }
  }

  /**
   * Calculate core PRP (Pay-Reference Period)
   * @param {Object} worker - Worker data
   * @param {Object} payPeriod - Pay period data
   * @param {Object} nmwRates - NMW rates
   * @returns {Object} Core PRP calculation result
   */
  async calculateCorePRP(worker, payPeriod, nmwRates) {
    // Extract basic worker and pay period data for PRP calculation
    const prpWorker = {
      worker_id: worker.worker_id,
      worker_name: worker.worker_name,
      age: worker.age || 25, // Default age for rate determination
      apprentice: worker.apprentice || false
    };

    const prpPayPeriod = {
      id: payPeriod.id,
      period_start: payPeriod.period_start,
      period_end: payPeriod.period_end,
      hours: payPeriod.hours || 0,
      pay: payPeriod.pay || 0
    };

    // Calculate core PRP
    const prpResult = this.prpService.calculatePRP(prpWorker, prpPayPeriod);
    
    return {
      success: true,
      effective_hourly_rate: prpResult.effectiveHourlyRate,
      required_hourly_rate: prpResult.requiredRate,
      compliance_status: prpResult.ragStatus,
      compliance_score: prpResult.complianceScore,
      total_hours: prpResult.totalHours,
      total_pay: prpResult.totalPay,
      breakdown: prpResult.breakdown
    };
  }

  /**
   * Calculate other offsets (meals, transport)
   * @param {Object} offsetData - Offset data
   * @param {Object} nmwRates - NMW rates
   * @returns {Object} Other offsets calculation result
   */
  calculateOtherOffsets(offsetData, nmwRates) {
    const meals = offsetData.meals || { total_charge: 0 };
    const transport = offsetData.transport || { total_charge: 0 };
    
    // For now, we'll use simple calculations
    // In a real implementation, these would follow specific NMW rules
    const mealsOffset = Math.min(meals.total_charge || 0, 0); // Meals generally can't offset NMW
    const transportOffset = Math.min(transport.total_charge || 0, 0); // Transport generally can't offset NMW
    
    return {
      meals: {
        charge: meals.total_charge || 0,
        offset: mealsOffset,
        compliant: true
      },
      transport: {
        charge: transport.total_charge || 0,
        offset: transportOffset,
        compliant: true
      },
      total: mealsOffset + transportOffset
    };
  }

  /**
   * Calculate enhancements (bonus, commission, tips, etc.)
   * @param {Object} enhancementData - Enhancement data
   * @returns {Object} Enhancements calculation result
   */
  calculateEnhancements(enhancementData) {
    if (!enhancementData) {
      return {
        bonus: 0,
        commission: 0,
        tips: 0,
        tronc: 0,
        shift_premium: 0,
        overtime: 0,
        holiday_pay: 0,
        total: 0
      };
    }

    const bonus = enhancementData.bonus || 0;
    const commission = enhancementData.commission || 0;
    const tips = enhancementData.tips || 0;
    const tronc = enhancementData.tronc || 0;
    const shift_premium = enhancementData.shift_premium || 0;
    const overtime = enhancementData.overtime || 0;
    const holiday_pay = enhancementData.holiday_pay || 0;

    const total = bonus + commission + tips + tronc + shift_premium + overtime + holiday_pay;

    return {
      bonus,
      commission,
      tips,
      tronc,
      shift_premium,
      overtime,
      holiday_pay,
      total
    };
  }

  /**
   * Integrate all calculations for final NMW compliance
   * @param {Object} prpResult - Core PRP result
   * @param {Object} accommodationResult - Accommodation offset result
   * @param {Object} deductionResult - NMW deduction result
   * @param {Object} allowancePremiumResult - Allowance and premium result
   * @param {Object} troncExclusionResult - Tronc exclusion result
   * @param {Object} otherOffsetsResult - Other offsets result
   * @param {Object} enhancementsResult - Enhancements result
   * @param {Object} nmwRates - NMW rates
   * @returns {Object} Integrated calculation result
   */
  integrateCalculations(prpResult, accommodationResult, deductionResult, allowancePremiumResult, troncExclusionResult, otherOffsetsResult, enhancementsResult, nmwRates) {
    // Extract key values
    const basePay = prpResult.total_pay || 0;
    const baseHours = prpResult.total_hours || 0;
    const requiredRate = prpResult.required_hourly_rate || 0;
    
    // Calculate total offsets (accommodation + other offsets)
    const totalOffsets = (accommodationResult.success ? accommodationResult.total_offset : 0) + otherOffsetsResult.total;
    
    // Calculate total deductions
    const totalDeductions = deductionResult.success ? deductionResult.total_deductions : 0;
    
    // Calculate allowances and premiums
    const totalAllowances = allowancePremiumResult.success ? allowancePremiumResult.totals?.total_allowances_included || 0 : 0;
    const totalPremiums = allowancePremiumResult.success ? allowancePremiumResult.totals?.total_premiums_basic_rate || 0 : 0;
    
    // Calculate tronc exclusions
    const totalTroncExcluded = troncExclusionResult.success ? troncExclusionResult.exclusion_summary?.total_excluded || 0 : 0;
    
    // Calculate total enhancements
    const totalEnhancements = enhancementsResult.total;
    
    // Calculate net pay for NMW purposes
    // Base pay + allowances + premiums (basic rate) + enhancements - deductions - tronc exclusions
    const netPayForNMW = basePay + totalAllowances + totalPremiums + totalEnhancements - totalDeductions - totalTroncExcluded;
    
    // Calculate effective hourly rate after all adjustments
    const effectiveHourlyRate = baseHours > 0 ? (netPayForNMW - totalOffsets) / baseHours : 0;
    
    // Determine final compliance status
    const finalStatus = this.determineFinalComplianceStatus(
      effectiveHourlyRate,
      requiredRate,
      accommodationResult,
      deductionResult
    );
    
    // Calculate final compliance score
    const finalScore = this.calculateFinalComplianceScore(
      effectiveHourlyRate,
      requiredRate,
      accommodationResult,
      deductionResult
    );
    
    return {
      finalStatus,
      finalScore,
      effectiveHourlyRate,
      requiredHourlyRate: requiredRate,
      totalOffsets,
      totalDeductions,
      totalAllowances,
      totalPremiums,
      totalTroncExcluded,
      totalEnhancements,
      netPayForNMW,
      basePay,
      baseHours
    };
  }

  /**
   * Determine final compliance status based on all factors
   * @param {number} effectiveRate - Effective hourly rate
   * @param {number} requiredRate - Required hourly rate
   * @param {Object} accommodationResult - Accommodation offset result
   * @param {Object} deductionResult - NMW deduction result
   * @returns {string} Final compliance status (green/amber/red)
   */
  determineFinalComplianceStatus(effectiveRate, requiredRate, accommodationResult, deductionResult) {
    // Check if there are any compliance issues
    const hasAccommodationIssues = accommodationResult.success && accommodationResult.total_excess > 0;
    const hasDeductionIssues = deductionResult.success && deductionResult.total_excess > 0;
    const hasRateIssues = effectiveRate < requiredRate;
    
    if (hasRateIssues || hasAccommodationIssues || hasDeductionIssues) {
      // Determine severity
      if (effectiveRate < requiredRate * 0.9) {
        return 'red'; // Significantly below NMW
      } else if (effectiveRate < requiredRate) {
        return 'red'; // Below NMW
      } else if (hasAccommodationIssues || hasDeductionIssues) {
        return 'amber'; // Above NMW but has offset/deduction issues
      } else {
        return 'green'; // Above NMW and no issues
      }
    }
    
    return 'green'; // No issues
  }

  /**
   * Calculate final compliance score based on all factors
   * @param {number} effectiveRate - Effective hourly rate
   * @param {number} requiredRate - Required hourly rate
   * @param {Object} accommodationResult - Accommodation offset result
   * @param {number} deductionResult - NMW deduction result
   * @returns {number} Final compliance score (0-100)
   */
  calculateFinalComplianceScore(effectiveRate, requiredRate, accommodationResult, deductionResult) {
    let score = 100;
    
    // Rate compliance (60% weight)
    if (effectiveRate >= requiredRate) {
      score -= 0; // Full points for rate compliance
    } else {
      const rateDeficit = (requiredRate - effectiveRate) / requiredRate;
      score -= Math.min(60, rateDeficit * 100); // Up to 60 points off for rate issues
    }
    
    // Accommodation compliance (20% weight)
    if (accommodationResult.success && accommodationResult.total_excess > 0) {
      const accommodationDeficit = accommodationResult.total_excess / (accommodationResult.total_charge || 1);
      score -= Math.min(20, accommodationDeficit * 20);
    }
    
    // Deduction compliance (20% weight)
    if (deductionResult.success && deductionResult.total_excess > 0) {
      const deductionDeficit = deductionResult.total_excess / (deductionResult.total_deductions || 1);
      score -= Math.min(20, deductionDeficit * 20);
    }
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Generate comprehensive breakdown of all calculations
   * @param {Object} prpResult - Core PRP result
   * @param {Object} accommodationResult - Accommodation offset result
   * @param {Object} deductionResult - NMW deduction result
   * @param {Object} allowancePremiumResult - Allowance and premium result
   * @param {Object} troncExclusionResult - Tronc exclusion result
   * @param {Object} otherOffsetsResult - Other offsets result
   * @param {Object} enhancementsResult - Enhancements result
   * @param {Object} integratedResult - Integrated calculation result
   * @returns {Object} Comprehensive breakdown
   */
  generateComprehensiveBreakdown(prpResult, accommodationResult, deductionResult, allowancePremiumResult, troncExclusionResult, otherOffsetsResult, enhancementsResult, integratedResult) {
    return {
      core_prp: {
        effective_hourly_rate: prpResult.effective_hourly_rate,
        required_hourly_rate: prpResult.required_hourly_rate,
        compliance_status: prpResult.compliance_status,
        compliance_score: prpResult.compliance_score,
        total_hours: prpResult.total_hours,
        total_pay: prpResult.total_pay
      },
      accommodation_offsets: accommodationResult.success ? {
        total_charge: accommodationResult.total_charge,
        total_offset: accommodationResult.total_offset,
        total_excess: accommodationResult.total_excess,
        compliance_status: accommodationResult.compliance_status,
        compliance_score: accommodationResult.compliance_score
      } : null,
      nmw_deductions: deductionResult.success ? {
        total_deductions: deductionResult.total_deductions,
        compliant_deductions: deductionResult.compliant_deductions,
        non_compliant_deductions: deductionResult.non_compliant_deductions,
        compliance_status: deductionResult.compliance_status,
        compliance_score: deductionResult.compliance_score
      } : null,
      allowances_premiums: allowancePremiumResult.success ? {
        total_allowances_included: allowancePremiumResult.totals?.total_allowances_included,
        total_allowances_excluded: allowancePremiumResult.totals?.total_allowances_excluded,
        total_premiums_basic_rate: allowancePremiumResult.totals?.total_premiums_basic_rate,
        total_premiums_excluded: allowancePremiumResult.totals?.total_premiums_excluded,
        total_nmw_eligible: allowancePremiumResult.totals?.total_nmw_eligible
      } : null,
      tronc_exclusions: troncExclusionResult.success ? {
        total_excluded: troncExclusionResult.exclusion_summary?.total_excluded,
        excluded_components: troncExclusionResult.exclusion_summary?.excluded_components,
        flagged_components: troncExclusionResult.exclusion_summary?.flagged_components,
        impact_category: troncExclusionResult.adjusted_pay_calculation?.exclusion_impact
      } : null,
      other_offsets: otherOffsetsResult,
      enhancements: enhancementsResult,
      integration: {
        final_status: integratedResult.finalStatus,
        final_score: integratedResult.finalScore,
        effective_hourly_rate: integratedResult.effectiveHourlyRate,
        required_hourly_rate: integratedResult.requiredHourlyRate,
        net_pay_for_nmw: integratedResult.netPayForNMW,
        total_offsets: integratedResult.totalOffsets,
        total_deductions: integratedResult.totalDeductions,
        total_allowances: integratedResult.totalAllowances,
        total_premiums: integratedResult.totalPremiums,
        total_tronc_excluded: integratedResult.totalTroncExcluded,
        total_enhancements: integratedResult.totalEnhancements
      }
    };
  }

  /**
   * Consolidate warnings from all calculation services
   * @param {Object} allowancePremiumResult - Allowance premium result
   * @param {Object} troncExclusionResult - Tronc exclusion result
   * @returns {Array} Consolidated warnings
   */
  consolidateWarnings(allowancePremiumResult, troncExclusionResult) {
    const warnings = [];

    // Add allowance/premium warnings
    if (allowancePremiumResult.success && allowancePremiumResult.warnings) {
      warnings.push(...allowancePremiumResult.warnings.map(w => ({
        ...w,
        source: 'allowances_premiums'
      })));
    }

    // Add tronc exclusion warnings
    if (troncExclusionResult.success && troncExclusionResult.warnings) {
      warnings.push(...troncExclusionResult.warnings.map(w => ({
        ...w,
        source: 'tronc_exclusions'
      })));
    }

    return warnings;
  }

  /**
   * Calculate comprehensive NMW compliance for multiple workers in bulk
   * @param {Array} workers - Array of worker data
   * @param {Array} payPeriods - Array of pay period data
   * @param {Array} offsetData - Array of offset data
   * @param {Array} deductionData - Array of deduction data
   * @param {Array} enhancementData - Array of enhancement data
   * @param {Array} rawPayComponentsArray - Array of raw pay components for each worker
   * @returns {Array} Array of comprehensive NMW compliance results
   */
  async calculateBulkComprehensiveNMW(workers, payPeriods, offsetData, deductionData, enhancementData, rawPayComponentsArray = []) {
    const results = [];
    
    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      const workerPayPeriods = payPeriods.filter(pp => pp.worker_id === worker.worker_id);
      const workerOffsets = offsetData.filter(off => off.worker_id === worker.worker_id);
      const workerDeductions = deductionData.filter(ded => ded.worker_id === worker.worker_id);
      const workerEnhancements = enhancementData.filter(enh => enh.worker_id === worker.worker_id);
      
      for (const payPeriod of workerPayPeriods) {
        const offsets = workerOffsets.find(off => off.pay_period_id === payPeriod.id) || {};
        const deductions = workerDeductions.find(ded => ded.pay_period_id === payPeriod.id) || {};
        const enhancements = workerEnhancements.find(enh => enh.pay_period_id === payPeriod.id) || {};
        const rawPayComponents = rawPayComponentsArray[i] || {};
        
        const result = await this.calculateComprehensiveNMW(
          worker, payPeriod, offsets, deductions, enhancements, rawPayComponents
        );
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Get comprehensive NMW compliance summary for reporting
   * @param {Array} complianceResults - Array of comprehensive NMW compliance results
   * @returns {Object} Summary statistics
   */
  getComprehensiveNMWSsummary(complianceResults) {
    const successfulResults = complianceResults.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        totalWorkers: 0,
        complianceBreakdown: { green: 0, amber: 0, red: 0 },
        averageComplianceScore: 0,
        averageEffectiveRate: 0,
        averageRequiredRate: 0,
        totalOffsets: 0,
        totalDeductions: 0,
        totalEnhancements: 0
      };
    }
    
    const complianceBreakdown = successfulResults.reduce((acc, r) => {
      acc[r.final_compliance_status] = (acc[r.final_compliance_status] || 0) + 1;
      return acc;
    }, {});
    
    const averageComplianceScore = successfulResults.reduce((sum, r) => sum + r.final_compliance_score, 0) / successfulResults.length;
    const averageEffectiveRate = successfulResults.reduce((sum, r) => sum + r.effective_hourly_rate, 0) / successfulResults.length;
    const averageRequiredRate = successfulResults.reduce((sum, r) => sum + r.required_hourly_rate, 0) / successfulResults.length;
    
    const totalOffsets = successfulResults.reduce((sum, r) => sum + (r.total_offsets || 0), 0);
    const totalDeductions = successfulResults.reduce((sum, r) => sum + (r.total_deductions || 0), 0);
    const totalAllowances = successfulResults.reduce((sum, r) => sum + (r.total_allowances || 0), 0);
    const totalPremiums = successfulResults.reduce((sum, r) => sum + (r.total_premiums || 0), 0);
    const totalTroncExcluded = successfulResults.reduce((sum, r) => sum + (r.total_tronc_excluded || 0), 0);
    const totalEnhancements = successfulResults.reduce((sum, r) => sum + (r.total_enhancements || 0), 0);
    
    return {
      totalWorkers: successfulResults.length,
      complianceBreakdown,
      averageComplianceScore: Math.round(averageComplianceScore * 100) / 100,
      averageEffectiveRate: Math.round(averageEffectiveRate * 100) / 100,
      averageRequiredRate: Math.round(averageRequiredRate * 100) / 100,
      totalOffsets: Math.round(totalOffsets * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalAllowances: Math.round(totalAllowances * 100) / 100,
      totalPremiums: Math.round(totalPremiums * 100) / 100,
      totalTroncExcluded: Math.round(totalTroncExcluded * 100) / 100,
      totalEnhancements: Math.round(totalEnhancements * 100) / 100
    };
  }

  /**
   * Calculate RAG status for a worker based on integrated calculation results
   * @param {Object} worker - Worker data
   * @param {Object} payPeriod - Pay period data
   * @param {Object} integratedResult - Integrated calculation result
   * @returns {Promise<Object>} RAG status result
   */
  async calculateRAGStatus(worker, payPeriod, integratedResult) {
    try {
      console.log(`🚦 Calculating RAG status for worker ${worker.worker_id || worker.id}`);
      
      // Prepare calculated data for RAG status service
      const calculatedData = {
        effectiveHourlyRate: integratedResult.effectiveHourlyRate,
        hoursWorked: integratedResult.hoursWorked || 0,
        totalPay: integratedResult.totalPay || 0,
        totalOffsets: integratedResult.totalOffsets || 0,
        totalDeductions: integratedResult.totalDeductions || 0,
        deductionRatio: integratedResult.totalPay > 0 ? 
          (integratedResult.totalDeductions / integratedResult.totalPay) : 0,
        accommodationOffsetFlags: this.extractAccommodationFlags(integratedResult),
        compliance_score: integratedResult.finalScore
      };

      const ragResult = await this.ragStatusService.calculateRAGStatus(worker, payPeriod, calculatedData);
      
      if (ragResult.success) {
        console.log(`✅ RAG status calculated: ${ragResult.ragStatus} for worker ${worker.worker_id}`);
        return ragResult;
      } else {
        console.warn(`⚠️ RAG status calculation failed for worker ${worker.worker_id}: ${ragResult.error}`);
        return {
          success: false,
          ragStatus: 'AMBER',
          reason: 'RAG status calculation failed',
          error: ragResult.error
        };
      }

    } catch (error) {
      console.error(`❌ RAG status calculation error for worker ${worker.worker_id}:`, error);
      return {
        success: false,
        ragStatus: 'AMBER',
        reason: 'System error during RAG status calculation',
        error: error.message
      };
    }
  }

  /**
   * Generate fix suggestions for a worker based on RAG status
   * @param {Object} worker - Worker data
   * @param {Object} payPeriod - Pay period data
   * @param {Object} ragStatusResult - RAG status result
   * @param {Object} integratedResult - Integrated calculation result
   * @param {Object} rawPayComponents - Raw pay components
   * @returns {Promise<Object>} Fix suggestions result
   */
  async generateFixSuggestions(worker, payPeriod, ragStatusResult, integratedResult, rawPayComponents) {
    try {
      console.log(`🔧 Generating fix suggestions for worker ${worker.worker_id || worker.id}`);

      // Prepare calculated data for fix suggestion service
      const calculatedData = {
        effectiveHourlyRate: integratedResult.effectiveHourlyRate,
        hoursWorked: integratedResult.hoursWorked || 0,
        totalPay: integratedResult.totalPay || 0,
        totalOffsets: integratedResult.totalOffsets || 0,
        totalDeductions: integratedResult.totalDeductions || 0,
        totalEnhancements: integratedResult.totalEnhancements || 0,
        netPayForNMW: integratedResult.netPayForNMW || 0
      };

      const fixResult = this.fixSuggestionService.generateFixSuggestions(
        worker, payPeriod, ragStatusResult, calculatedData
      );

      if (fixResult.success) {
        const suggestionCount = fixResult.suggestions?.length || 0;
        console.log(`✅ Generated ${suggestionCount} fix suggestions for worker ${worker.worker_id}`);
        return fixResult;
      } else {
        console.warn(`⚠️ Fix suggestion generation failed for worker ${worker.worker_id}: ${fixResult.error}`);
        return {
          success: false,
          suggestions: [],
          primarySuggestion: null,
          error: fixResult.error
        };
      }

    } catch (error) {
      console.error(`❌ Fix suggestion generation error for worker ${worker.worker_id}:`, error);
      return {
        success: false,
        suggestions: [],
        primarySuggestion: null,
        error: error.message
      };
    }
  }

  /**
   * Extract accommodation-related flags from integrated result
   * @param {Object} integratedResult - Integrated calculation result
   * @returns {Array} Array of accommodation flags
   */
  extractAccommodationFlags(integratedResult) {
    const flags = [];
    
    // Check for accommodation-related issues in the breakdown
    if (integratedResult.breakdown?.accommodation_offsets) {
      const accomBreakdown = integratedResult.breakdown.accommodation_offsets;
      
      if (accomBreakdown.daily_excess > 0) {
        flags.push('daily_excess_violation');
      }
      if (accomBreakdown.period_excess > 0) {
        flags.push('period_limit_exceeded');
      }
      if (accomBreakdown.compliance_status === 'non_compliant') {
        flags.push('accommodation_compliance_violation');
      }
    }

    return flags;
  }

  /**
   * Consolidate warnings from all services including RAG status and fix suggestions
   * @param {Object} allowancePremiumResult - Allowance premium result
   * @param {Object} troncExclusionResult - Tronc exclusion result
   * @param {Object} ragStatusResult - RAG status result
   * @param {Object} fixSuggestionsResult - Fix suggestions result
   * @returns {Array} Consolidated warnings
   */
  consolidateWarnings(allowancePremiumResult, troncExclusionResult, ragStatusResult, fixSuggestionsResult) {
    const warnings = [];
    
    // Existing warnings from allowances/premiums and tronc exclusions
    if (allowancePremiumResult.success && allowancePremiumResult.warnings) {
      warnings.push(...allowancePremiumResult.warnings.map(w => ({ ...w, source: 'allowances_premiums' })));
    }
    if (troncExclusionResult.success && troncExclusionResult.warnings) {
      warnings.push(...troncExclusionResult.warnings.map(w => ({ ...w, source: 'tronc_exclusions' })));
    }

    // New warnings from RAG status calculation
    if (ragStatusResult && ragStatusResult.amberFlags) {
      for (const flag of ragStatusResult.amberFlags) {
        warnings.push({
          type: 'rag_status_flag',
          message: `RAG status amber flag: ${flag.replace(/_/g, ' ')}`,
          severity: 'medium',
          source: 'rag_status'
        });
      }
    }

    // Warnings from fix suggestions (e.g., critical underpayments)
    if (fixSuggestionsResult && fixSuggestionsResult.suggestions) {
      const criticalSuggestions = fixSuggestionsResult.suggestions.filter(s => s.severity === 'CRITICAL');
      for (const suggestion of criticalSuggestions) {
        warnings.push({
          type: 'critical_compliance_issue',
          message: suggestion.message,
          severity: 'critical',
          source: 'fix_suggestions'
        });
      }
    }

    return warnings;
  }
}

module.exports = IntegratedNMWService;
