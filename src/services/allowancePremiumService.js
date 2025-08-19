/**
 * Allowance and Premium Calculation Service
 * Handles the calculation of NMW-eligible allowances and premiums based on configurable rules
 */

const nmwComponentRules = require('../config/nmwComponentRules');

class AllowancePremiumService {
  constructor() {
    this.componentRules = nmwComponentRules;
  }

  /**
   * Calculate NMW-eligible allowances and premiums for a worker's pay period
   * @param {Object} worker - Worker information
   * @param {Object} payPeriod - Pay period data
   * @param {Object} payComponents - Raw pay components data
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Calculation result
   */
  async calculateAllowancesAndPremiums(worker, payPeriod, payComponents, options = {}) {
    try {
      console.log(`🔄 Calculating allowances and premiums for worker ${worker.id || worker.external_id}`);

      // Validate inputs
      const validation = this.validateInputs(worker, payPeriod, payComponents);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Input validation failed',
          details: validation.errors,
          worker_id: worker.id || worker.external_id,
          pay_period_id: payPeriod.id
        };
      }

      // Load component classification rules
      const rules = await this.componentRules.getAllRules();
      
      // Classify and process all pay components
      const classifications = await this.classifyPayComponents(payComponents);
      
      // Calculate allowances
      const allowanceResult = await this.processAllowances(classifications, rules);
      
      // Calculate premiums (extracting basic rate portions)
      const premiumResult = await this.processPremiums(classifications, payPeriod, rules);
      
      // Generate detailed breakdown
      const breakdown = this.generateBreakdown(allowanceResult, premiumResult, classifications);
      
      // Calculate totals
      const totals = this.calculateTotals(allowanceResult, premiumResult);
      
      // Determine any warnings or compliance issues
      const warnings = this.generateWarnings(classifications, allowanceResult, premiumResult);
      
      console.log(`✅ Allowances and premiums calculation completed for worker ${worker.id || worker.external_id}`);

      return {
        success: true,
        worker_id: worker.id || worker.external_id,
        pay_period_id: payPeriod.id,
        allowances: allowanceResult,
        premiums: premiumResult,
        totals: totals,
        breakdown: breakdown,
        warnings: warnings,
        metadata: {
          total_components_processed: Object.keys(payComponents).length,
          classified_components: classifications.filter(c => c.category !== 'unclassified').length,
          unclassified_components: classifications.filter(c => c.category === 'unclassified').length,
          calculation_date: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Failed to calculate allowances and premiums:', error);
      return {
        success: false,
        error: 'Calculation failed',
        message: error.message,
        worker_id: worker?.id || worker?.external_id,
        pay_period_id: payPeriod?.id
      };
    }
  }

  /**
   * Validate input parameters
   * @param {Object} worker - Worker data
   * @param {Object} payPeriod - Pay period data
   * @param {Object} payComponents - Pay components data
   * @returns {Object} Validation result
   */
  validateInputs(worker, payPeriod, payComponents) {
    const errors = [];

    if (!worker || !worker.id && !worker.external_id) {
      errors.push('Worker ID is required');
    }

    if (!payPeriod || !payPeriod.id) {
      errors.push('Pay period ID is required');
    }

    if (!payComponents || typeof payComponents !== 'object') {
      errors.push('Pay components data is required');
    }

    if (Object.keys(payComponents).length === 0) {
      errors.push('No pay components provided');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Classify all pay components according to NMW rules
   * @param {Object} payComponents - Raw pay components
   * @returns {Promise<Array>} Array of classified components
   */
  async classifyPayComponents(payComponents) {
    const classifications = [];

    for (const [componentName, value] of Object.entries(payComponents)) {
      // Skip null, undefined, or zero values
      if (value == null || value === 0) {
        continue;
      }

      const classification = await this.componentRules.classifyComponent(componentName);
      classifications.push({
        ...classification,
        componentName,
        value: parseFloat(value) || 0
      });
    }

    return classifications;
  }

  /**
   * Process allowances according to NMW rules
   * @param {Array} classifications - Classified components
   * @param {Object} rules - NMW component rules
   * @returns {Object} Allowance processing result
   */
  async processAllowances(classifications, rules) {
    const included = [];
    const excluded = [];
    let totalIncluded = 0;
    let totalExcluded = 0;

    for (const component of classifications) {
      if (component.categoryPath && component.categoryPath.startsWith('allowances.')) {
        if (component.category === 'included' && component.treatment === 'full_inclusion') {
          included.push({
            name: component.componentName,
            value: component.value,
            reason: component.description,
            category: component.categoryPath
          });
          totalIncluded += component.value;
        } else if (component.category === 'excluded' && component.treatment === 'full_exclusion') {
          excluded.push({
            name: component.componentName,
            value: component.value,
            reason: component.description,
            category: component.categoryPath
          });
          totalExcluded += component.value;
        }
      }
    }

    return {
      included,
      excluded,
      total_included: totalIncluded,
      total_excluded: totalExcluded,
      net_allowance_value: totalIncluded
    };
  }

  /**
   * Process premiums according to NMW rules (extract basic rate portions)
   * @param {Array} classifications - Classified components
   * @param {Object} payPeriod - Pay period data for context
   * @param {Object} rules - NMW component rules
   * @returns {Object} Premium processing result
   */
  async processPremiums(classifications, payPeriod, rules) {
    const processed = [];
    const excluded = [];
    let totalBasicRateValue = 0;
    let totalPremiumExcluded = 0;

    for (const component of classifications) {
      if (component.categoryPath && component.categoryPath.startsWith('premiums.')) {
        if (component.treatment === 'basic_rate_only') {
          // For premiums, we need to extract the basic rate portion
          // This requires additional context about the worker's basic rate
          const basicRateEstimate = this.estimateBasicRateFromPremium(component, payPeriod);
          
          processed.push({
            name: component.componentName,
            total_value: component.value,
            basic_rate_portion: basicRateEstimate.basicPortion,
            premium_portion: basicRateEstimate.premiumPortion,
            method: basicRateEstimate.method,
            reason: component.description,
            category: component.categoryPath
          });
          
          totalBasicRateValue += basicRateEstimate.basicPortion;
          totalPremiumExcluded += basicRateEstimate.premiumPortion;
        }
      }
    }

    return {
      processed,
      excluded,
      total_basic_rate_value: totalBasicRateValue,
      total_premium_excluded: totalPremiumExcluded,
      net_premium_value: totalBasicRateValue,
      requires_manual_verification: processed.some(p => p.method === 'estimated')
    };
  }

  /**
   * Estimate basic rate portion from premium payment
   * @param {Object} component - Premium component
   * @param {Object} payPeriod - Pay period data
   * @returns {Object} Basic rate estimation
   */
  estimateBasicRateFromPremium(component, payPeriod) {
    // This is a simplified estimation - in practice, this would need more sophisticated logic
    // based on the type of premium and available context
    
    const premiumKeywords = component.matchedKeyword?.toLowerCase() || '';
    let estimatedRatio = 0.67; // Default assumption: time-and-a-half means 67% is basic rate
    let method = 'estimated';

    if (premiumKeywords.includes('time_and_half')) {
      estimatedRatio = 0.67; // 1.5x means 67% basic, 33% premium
    } else if (premiumKeywords.includes('double_time')) {
      estimatedRatio = 0.5;  // 2x means 50% basic, 50% premium
    } else if (premiumKeywords.includes('shift')) {
      estimatedRatio = 0.8;  // Shift premiums typically smaller
    } else if (premiumKeywords.includes('weekend')) {
      estimatedRatio = 0.75; // Weekend premiums vary
    }

    const basicPortion = component.value * estimatedRatio;
    const premiumPortion = component.value - basicPortion;

    return {
      basicPortion: Math.round(basicPortion * 100) / 100,
      premiumPortion: Math.round(premiumPortion * 100) / 100,
      estimatedRatio,
      method
    };
  }

  /**
   * Calculate total NMW-eligible amounts
   * @param {Object} allowanceResult - Allowance calculation result
   * @param {Object} premiumResult - Premium calculation result
   * @returns {Object} Total calculations
   */
  calculateTotals(allowanceResult, premiumResult) {
    const totalNMWEligible = allowanceResult.net_allowance_value + premiumResult.net_premium_value;
    
    return {
      total_allowances_included: allowanceResult.total_included,
      total_allowances_excluded: allowanceResult.total_excluded,
      total_premiums_basic_rate: premiumResult.total_basic_rate_value,
      total_premiums_excluded: premiumResult.total_premium_excluded,
      total_nmw_eligible: totalNMWEligible,
      net_contribution_to_nmw: totalNMWEligible
    };
  }

  /**
   * Generate detailed breakdown of calculations
   * @param {Object} allowanceResult - Allowance calculation result
   * @param {Object} premiumResult - Premium calculation result
   * @param {Array} classifications - All classifications
   * @returns {Object} Detailed breakdown
   */
  generateBreakdown(allowanceResult, premiumResult, classifications) {
    return {
      allowances: {
        included_items: allowanceResult.included,
        excluded_items: allowanceResult.excluded,
        summary: `${allowanceResult.included.length} allowances included, ${allowanceResult.excluded.length} excluded`
      },
      premiums: {
        processed_items: premiumResult.processed,
        summary: `${premiumResult.processed.length} premium components processed`
      },
      unclassified: classifications.filter(c => c.category === 'unclassified').map(c => ({
        name: c.componentName,
        value: c.value,
        reason: 'Component requires manual classification'
      }))
    };
  }

  /**
   * Generate warnings for manual review
   * @param {Array} classifications - All classifications
   * @param {Object} allowanceResult - Allowance calculation result
   * @param {Object} premiumResult - Premium calculation result
   * @returns {Array} Array of warnings
   */
  generateWarnings(classifications, allowanceResult, premiumResult) {
    const warnings = [];

    // Check for unclassified components
    const unclassified = classifications.filter(c => c.category === 'unclassified');
    if (unclassified.length > 0) {
      warnings.push({
        type: 'unclassified_components',
        severity: 'amber',
        message: `${unclassified.length} components require manual classification`,
        components: unclassified.map(c => c.componentName)
      });
    }

    // Check for low confidence classifications
    const lowConfidence = classifications.filter(c => c.confidence === 'low');
    if (lowConfidence.length > 0) {
      warnings.push({
        type: 'low_confidence',
        severity: 'amber',
        message: `${lowConfidence.length} components have low confidence classifications`,
        components: lowConfidence.map(c => c.componentName)
      });
    }

    // Check for estimated premium calculations
    if (premiumResult.requires_manual_verification) {
      warnings.push({
        type: 'estimated_premiums',
        severity: 'amber',
        message: 'Premium calculations contain estimates that should be verified manually',
        details: 'Basic rate portions estimated from premium payments'
      });
    }

    return warnings;
  }

  /**
   * Process bulk calculations for multiple workers
   * @param {Array} workers - Array of worker data
   * @param {Array} payPeriods - Array of pay period data
   * @param {Array} payComponentsArray - Array of pay components for each worker
   * @param {Object} options - Calculation options
   * @returns {Promise<Array>} Array of calculation results
   */
  async calculateBulkAllowancesAndPremiums(workers, payPeriods, payComponentsArray, options = {}) {
    const results = [];
    
    try {
      console.log(`🔄 Processing bulk allowances and premiums for ${workers.length} workers`);

      for (let i = 0; i < workers.length; i++) {
        const worker = workers[i];
        const payPeriod = payPeriods[i];
        const payComponents = payComponentsArray[i];

        const result = await this.calculateAllowancesAndPremiums(worker, payPeriod, payComponents, options);
        results.push(result);
      }

      console.log(`✅ Bulk allowances and premiums calculation completed for ${workers.length} workers`);
      return results;

    } catch (error) {
      console.error('❌ Bulk allowances and premiums calculation failed:', error);
      throw error;
    }
  }

  /**
   * Generate summary statistics for multiple calculations
   * @param {Array} results - Array of calculation results
   * @returns {Object} Summary statistics
   */
  getSummaryStatistics(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    const totalAllowances = successful.reduce((sum, r) => sum + (r.totals?.total_allowances_included || 0), 0);
    const totalPremiums = successful.reduce((sum, r) => sum + (r.totals?.total_premiums_basic_rate || 0), 0);
    const totalExcluded = successful.reduce((sum, r) => sum + (r.totals?.total_allowances_excluded || 0) + (r.totals?.total_premiums_excluded || 0), 0);
    
    return {
      total_workers: results.length,
      successful_calculations: successful.length,
      failed_calculations: failed.length,
      total_allowances_included: Math.round(totalAllowances * 100) / 100,
      total_premiums_basic_rate: Math.round(totalPremiums * 100) / 100,
      total_amounts_excluded: Math.round(totalExcluded * 100) / 100,
      total_nmw_contribution: Math.round((totalAllowances + totalPremiums) * 100) / 100,
      average_allowance_per_worker: successful.length > 0 ? Math.round((totalAllowances / successful.length) * 100) / 100 : 0,
      average_premium_per_worker: successful.length > 0 ? Math.round((totalPremiums / successful.length) * 100) / 100 : 0
    };
  }
}

module.exports = AllowancePremiumService;
