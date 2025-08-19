/**
 * Tronc Payment Exclusion Service
 * Handles identification and exclusion of tronc payments from NMW calculations
 * 
 * UK Law: Tips, gratuities, service charges, and tronc payments NEVER count towards NMW
 */

const nmwComponentRules = require('../config/nmwComponentRules');

class TroncExclusionService {
  constructor() {
    this.componentRules = nmwComponentRules;
  }

  /**
   * Process and exclude tronc payments from NMW calculation
   * @param {Object} worker - Worker information
   * @param {Object} payPeriod - Pay period data
   * @param {Object} payComponents - Raw pay components data
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processTroncExclusions(worker, payPeriod, payComponents, options = {}) {
    try {
      console.log(`🔄 Processing tronc exclusions for worker ${worker.id || worker.external_id}`);

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
      
      // Identify tronc and tip-related payments
      const troncComponents = await this.identifyTroncComponents(payComponents);
      
      // Process identified components
      const processed = await this.processTroncComponents(troncComponents, rules);
      
      // Generate exclusion summary
      const exclusionSummary = this.generateExclusionSummary(processed);
      
      // Generate compliance warnings if any tips/tronc were found
      const warnings = this.generateComplianceWarnings(processed, payComponents);
      
      // Calculate adjusted pay for NMW purposes
      const adjustedPayCalculation = this.calculateAdjustedPay(payComponents, processed);

      console.log(`✅ Tronc exclusions processing completed for worker ${worker.id || worker.external_id}`);

      return {
        success: true,
        worker_id: worker.id || worker.external_id,
        pay_period_id: payPeriod.id,
        tronc_components: processed,
        exclusion_summary: exclusionSummary,
        adjusted_pay_calculation: adjustedPayCalculation,
        warnings: warnings,
        metadata: {
          total_components_checked: Object.keys(payComponents).length,
          tronc_components_found: processed.excluded.length,
          total_amount_excluded: exclusionSummary.total_excluded,
          processing_date: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Failed to process tronc exclusions:', error);
      return {
        success: false,
        error: 'Tronc processing failed',
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

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Identify components that are tips, tronc, or gratuities
   * @param {Object} payComponents - Raw pay components
   * @returns {Promise<Array>} Array of potentially tronc-related components
   */
  async identifyTroncComponents(payComponents) {
    const potentialTroncComponents = [];

    for (const [componentName, value] of Object.entries(payComponents)) {
      // Skip null, undefined, or zero values
      if (value == null || value === 0) {
        continue;
      }

      const classification = await this.componentRules.classifyComponent(componentName);
      
      // Check if component is classified as tips/tronc related
      if (this.isTroncRelated(classification, componentName)) {
        potentialTroncComponents.push({
          componentName,
          value: parseFloat(value) || 0,
          classification,
          detectionMethod: this.getDetectionMethod(classification, componentName)
        });
      }
    }

    return potentialTroncComponents;
  }

  /**
   * Determine if a component is tronc-related
   * @param {Object} classification - Component classification
   * @param {string} componentName - Original component name
   * @returns {boolean} True if tronc-related
   */
  isTroncRelated(classification, componentName) {
    // Check classification category
    if (classification.categoryPath && classification.categoryPath.startsWith('tips.')) {
      return true;
    }

    // Check for high-confidence tronc/tip keywords
    const normalizedName = componentName.toLowerCase();
    const troncKeywords = [
      'tronc', 'tips', 'gratuities', 'service_charge', 'cover_charge',
      'customer_tips', 'tip_share', 'pooled_tips', 'gratuity', 
      'service_fee', 'tip_pool'
    ];

    return troncKeywords.some(keyword => 
      normalizedName.includes(keyword) || keyword.includes(normalizedName)
    );
  }

  /**
   * Get the method used to detect tronc payment
   * @param {Object} classification - Component classification
   * @param {string} componentName - Component name
   * @returns {string} Detection method
   */
  getDetectionMethod(classification, componentName) {
    if (classification.categoryPath && classification.categoryPath.startsWith('tips.')) {
      return classification.confidence === 'high' ? 'rule_based_high_confidence' : 'rule_based_medium_confidence';
    }
    
    return 'keyword_detection';
  }

  /**
   * Process identified tronc components according to rules
   * @param {Array} troncComponents - Identified tronc components
   * @param {Object} rules - NMW component rules
   * @returns {Object} Processing result
   */
  async processTroncComponents(troncComponents, rules) {
    const excluded = [];
    const flagged = [];
    let totalExcluded = 0;

    for (const component of troncComponents) {
      const processedComponent = {
        name: component.componentName,
        value: component.value,
        detection_method: component.detectionMethod,
        classification: component.classification.category,
        confidence: component.classification.confidence,
        reason: this.getExclusionReason(component),
        nmw_treatment: 'full_exclusion'
      };

      if (component.classification.confidence === 'high' || 
          component.detectionMethod === 'rule_based_high_confidence') {
        excluded.push(processedComponent);
        totalExcluded += component.value;
      } else {
        // Flag for manual review if confidence is lower
        flagged.push({
          ...processedComponent,
          review_reason: 'Lower confidence detection - manual verification recommended'
        });
      }
    }

    return {
      excluded,
      flagged,
      total_excluded: totalExcluded,
      total_flagged: flagged.reduce((sum, item) => sum + item.value, 0)
    };
  }

  /**
   * Get exclusion reason for component
   * @param {Object} component - Tronc component
   * @returns {string} Exclusion reason
   */
  getExclusionReason(component) {
    if (component.classification.categoryPath === 'tips.customer') {
      return 'Customer tips and gratuities are excluded from NMW calculations per UK regulations';
    } else if (component.classification.categoryPath === 'tips.tronc') {
      return 'Tronc payments are excluded from NMW calculations per UK regulations';
    } else {
      return 'Component identified as tip/gratuity based on naming pattern - excluded from NMW';
    }
  }

  /**
   * Generate exclusion summary
   * @param {Object} processed - Processed tronc components
   * @returns {Object} Exclusion summary
   */
  generateExclusionSummary(processed) {
    return {
      total_excluded: processed.total_excluded,
      total_flagged: processed.total_flagged,
      excluded_components: processed.excluded.length,
      flagged_components: processed.flagged.length,
      automatic_exclusions: processed.excluded.map(item => ({
        name: item.name,
        value: item.value,
        reason: item.reason
      })),
      manual_review_required: processed.flagged.map(item => ({
        name: item.name,
        value: item.value,
        review_reason: item.review_reason
      }))
    };
  }

  /**
   * Generate compliance warnings
   * @param {Object} processed - Processed tronc components
   * @param {Object} originalPayComponents - Original pay components
   * @returns {Array} Array of warnings
   */
  generateComplianceWarnings(processed, originalPayComponents) {
    const warnings = [];

    // Critical warning if tips/tronc were found
    if (processed.excluded.length > 0) {
      warnings.push({
        type: 'tronc_exclusion_critical',
        severity: 'red',
        message: `£${processed.total_excluded.toFixed(2)} in tips/tronc payments excluded from NMW calculation`,
        components: processed.excluded.map(item => item.name),
        compliance_impact: 'These amounts cannot be used to meet NMW requirements',
        action_required: 'Ensure basic pay alone meets NMW requirements'
      });
    }

    // Warning for flagged components requiring manual review
    if (processed.flagged.length > 0) {
      warnings.push({
        type: 'potential_tronc_review',
        severity: 'amber',
        message: `${processed.flagged.length} components flagged as potential tips/tronc require manual verification`,
        components: processed.flagged.map(item => item.name),
        action_required: 'Manually verify if these are customer tips or employer payments'
      });
    }

    // Check if the remaining pay after exclusions might be problematic
    const grossPay = this.estimateGrossPay(originalPayComponents);
    const remainingPay = grossPay - processed.total_excluded;
    const exclusionPercentage = grossPay > 0 ? (processed.total_excluded / grossPay) * 100 : 0;
    
    if (processed.total_excluded > 0 && exclusionPercentage >= 15) {
      warnings.push({
        type: 'significant_tip_proportion',
        severity: 'amber',
        message: 'Tips/tronc represent a significant portion of total pay',
        details: `${exclusionPercentage.toFixed(1)}% of total pay is excluded`,
        compliance_concern: 'High tip proportion increases NMW compliance risk'
      });
    }

    return warnings;
  }

  /**
   * Estimate gross pay from components
   * @param {Object} payComponents - Pay components
   * @returns {number} Estimated gross pay
   */
  estimateGrossPay(payComponents) {
    // Look for total pay or sum all numeric values
    if (payComponents.total_pay || payComponents.gross_pay) {
      return parseFloat(payComponents.total_pay || payComponents.gross_pay) || 0;
    }

    // Sum all numeric components as fallback
    return Object.values(payComponents)
      .filter(value => !isNaN(parseFloat(value)))
      .reduce((sum, value) => sum + parseFloat(value), 0);
  }

  /**
   * Calculate adjusted pay for NMW purposes
   * @param {Object} originalComponents - Original pay components
   * @param {Object} processed - Processed tronc components
   * @returns {Object} Adjusted pay calculation
   */
  calculateAdjustedPay(originalComponents, processed) {
    const grossPay = this.estimateGrossPay(originalComponents);
    const adjustedPay = grossPay - processed.total_excluded;
    const adjustmentPercentage = grossPay > 0 ? (processed.total_excluded / grossPay) * 100 : 0;

    return {
      original_gross_pay: grossPay,
      total_tronc_excluded: processed.total_excluded,
      adjusted_pay_for_nmw: adjustedPay,
      adjustment_percentage: Math.round(adjustmentPercentage * 100) / 100,
      exclusion_impact: this.categorizeAdjustmentImpact(adjustmentPercentage)
    };
  }

  /**
   * Categorize the impact of tronc exclusions
   * @param {number} adjustmentPercentage - Percentage of pay excluded
   * @returns {string} Impact category
   */
  categorizeAdjustmentImpact(adjustmentPercentage) {
    if (adjustmentPercentage === 0) return 'none';
    if (adjustmentPercentage < 5) return 'minimal';
    if (adjustmentPercentage < 20) return 'moderate';
    if (adjustmentPercentage < 30) return 'significant';
    return 'critical';
  }

  /**
   * Process bulk tronc exclusions for multiple workers
   * @param {Array} workers - Array of worker data
   * @param {Array} payPeriods - Array of pay period data
   * @param {Array} payComponentsArray - Array of pay components for each worker
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} Array of processing results
   */
  async processBulkTroncExclusions(workers, payPeriods, payComponentsArray, options = {}) {
    const results = [];
    
    try {
      console.log(`🔄 Processing bulk tronc exclusions for ${workers.length} workers`);

      for (let i = 0; i < workers.length; i++) {
        const worker = workers[i];
        const payPeriod = payPeriods[i];
        const payComponents = payComponentsArray[i];

        const result = await this.processTroncExclusions(worker, payPeriod, payComponents, options);
        results.push(result);
      }

      console.log(`✅ Bulk tronc exclusions processing completed for ${workers.length} workers`);
      return results;

    } catch (error) {
      console.error('❌ Bulk tronc exclusions processing failed:', error);
      throw error;
    }
  }

  /**
   * Generate summary statistics for bulk processing
   * @param {Array} results - Array of processing results
   * @returns {Object} Summary statistics
   */
  getBulkSummaryStatistics(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    const totalExcluded = successful.reduce((sum, r) => sum + (r.exclusion_summary?.total_excluded || 0), 0);
    const totalFlagged = successful.reduce((sum, r) => sum + (r.exclusion_summary?.total_flagged || 0), 0);
    const workersWithTronc = successful.filter(r => r.exclusion_summary?.excluded_components > 0).length;
    const workersWithFlags = successful.filter(r => r.exclusion_summary?.flagged_components > 0).length;
    
    return {
      total_workers: results.length,
      successful_processing: successful.length,
      failed_processing: failed.length,
      workers_with_tronc: workersWithTronc,
      workers_with_flags: workersWithFlags,
      total_amount_excluded: Math.round(totalExcluded * 100) / 100,
      total_amount_flagged: Math.round(totalFlagged * 100) / 100,
      average_exclusion_per_worker: successful.length > 0 ? Math.round((totalExcluded / successful.length) * 100) / 100 : 0,
      compliance_impact_summary: {
        workers_affected: workersWithTronc,
        percentage_affected: successful.length > 0 ? Math.round((workersWithTronc / successful.length) * 100) : 0
      }
    };
  }
}

module.exports = TroncExclusionService;
