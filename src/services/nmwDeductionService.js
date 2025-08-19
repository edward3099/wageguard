const ratesConfig = require('../config/rates');

/**
 * NMW Deduction Service for WageGuard
 * Handles identification and processing of deductions that reduce NMW pay
 */
class NMWDeductionService {
  constructor() {
    this.ratesConfig = ratesConfig;
  }

  /**
   * Calculate NMW-reducing deductions for a worker's pay period
   * @param {Object} worker - Worker data
   * @param {Object} payPeriod - Pay period data
   * @param {Object} deductionData - Deduction data
   * @returns {Object} NMW deduction calculation result
   */
  async calculateNMWDeductions(worker, payPeriod, deductionData) {
    try {
      // Validate inputs
      const validation = this.validateDeductionInputs(worker, payPeriod, deductionData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          worker_id: worker?.worker_id || 'unknown',
          pay_period_id: payPeriod?.id || 'unknown'
        };
      }

      // Load current deduction rates and limits
      const deductionRates = await this.loadDeductionRates();
      
      // Calculate PRP dates
      const prpDates = this.calculatePRPDates(payPeriod.period_start, payPeriod.period_end);
      
      // Process deductions by category
      const processedDeductions = this.processDeductionsByCategory(deductionData, deductionRates);
      
      // Calculate total NMW-reducing deductions
      const totalDeductions = this.calculateTotalDeductions(processedDeductions);
      
      // Determine compliance status
      const complianceStatus = this.determineComplianceStatus(processedDeductions, deductionRates);
      
      // Generate detailed breakdown
      const breakdown = this.generateBreakdown(processedDeductions, totalDeductions, prpDates, deductionRates);
      
      return {
        success: true,
        worker_id: worker.worker_id,
        worker_name: worker.worker_name,
        pay_period_id: payPeriod.id,
        period_start: payPeriod.period_start,
        period_end: payPeriod.period_end,
        total_deductions: totalDeductions.total,
        compliant_deductions: totalDeductions.compliant,
        non_compliant_deductions: totalDeductions.nonCompliant,
        compliance_status: complianceStatus.status,
        compliance_score: complianceStatus.score,
        breakdown: breakdown,
        calculation_date: new Date().toISOString(),
        rates_source: 'GOV.UK NMW deduction rules',
        rates_last_updated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ NMW deduction calculation failed:', error);
      return {
        success: false,
        error: error.message,
        worker_id: worker?.worker_id || 'unknown',
        pay_period_id: payPeriod?.id || 'unknown'
      };
    }
  }

  /**
   * Validate deduction calculation inputs
   * @param {Object} worker - Worker data
   * @param {Object} payPeriod - Pay period data
   * @param {Object} deductionData - Deduction data
   * @returns {Object} Validation result
   */
  validateDeductionInputs(worker, payPeriod, deductionData) {
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

    // Validate deduction data
    if (!deductionData) {
      errors.push('Deduction data is required');
    }

    return {
      isValid: errors.length === 0,
      error: errors.join('; ')
    };
  }

  /**
   * Load deduction rates and limits from configuration
   * @returns {Object} Deduction rates and limits
   */
  async loadDeductionRates() {
    try {
      const uniformRates = await this.ratesConfig.getCategoryRates('uniform');
      const toolsRates = await this.ratesConfig.getCategoryRates('tools');
      const trainingRates = await this.ratesConfig.getCategoryRates('training');
      const otherRates = await this.ratesConfig.getCategoryRates('other');

      return {
        uniform: uniformRates,
        tools: toolsRates,
        training: trainingRates,
        other: otherRates
      };
    } catch (error) {
      throw new Error(`Failed to load deduction rates: ${error.message}`);
    }
  }

  /**
   * Calculate Pay-Reference Period (PRP) dates
   * @param {string|Date} periodStart - Period start date
   * @param {string|Date} periodEnd - Period end date
   * @returns {Object} PRP date information
   */
  calculatePRPDates(periodStart, periodEnd) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    
    // Calculate total days in period
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Calculate working days (excluding weekends - simplified calculation)
    const workingDays = this.calculateWorkingDays(start, end);
    
    return {
      start: start,
      end: end,
      totalDays: totalDays,
      workingDays: workingDays,
      periodLength: totalDays
    };
  }

  /**
   * Calculate working days between two dates (excluding weekends)
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @returns {number} Number of working days
   */
  calculateWorkingDays(start, end) {
    let workingDays = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  }

  /**
   * Process deductions by category
   * @param {Object} deductionData - Raw deduction data
   * @param {Object} deductionRates - Deduction rates and limits
   * @returns {Object} Processed deductions by category
   */
  processDeductionsByCategory(deductionData, deductionRates) {
    const processed = {
      uniform: this.processUniformDeductions(deductionData.uniform_deduction || 0, deductionRates.uniform),
      tools: this.processToolsDeductions(deductionData.tools_deduction || 0, deductionRates.tools),
      training: this.processTrainingDeductions(deductionData.training_deduction || 0, deductionRates.training),
      other: this.processOtherDeductions(deductionData.other_deductions || 0, deductionRates.other)
    };

    return processed;
  }

  /**
   * Process uniform deductions
   * @param {number} amount - Uniform deduction amount
   * @param {Object} rates - Uniform deduction rates
   * @returns {Object} Processed uniform deductions
   */
  processUniformDeductions(amount, rates) {
    const maxDeduction = rates.maxDeduction || 0;
    const isCompliant = amount <= maxDeduction;
    
    return {
      amount: amount,
      maxAllowed: maxDeduction,
      isCompliant: isCompliant,
      excess: Math.max(0, amount - maxDeduction),
      category: 'uniform',
      description: 'Workwear and uniform costs',
      rule: 'Uniform costs cannot reduce pay below NMW'
    };
  }

  /**
   * Process tools deductions
   * @param {number} amount - Tools deduction amount
   * @param {Object} rates - Tools deduction rates
   * @returns {Object} Processed tools deductions
   */
  processToolsDeductions(amount, rates) {
    const maxDeduction = rates.maxDeduction || 0;
    const isCompliant = amount <= maxDeduction;
    
    return {
      amount: amount,
      maxAllowed: maxDeduction,
      isCompliant: isCompliant,
      excess: Math.max(0, amount - maxDeduction),
      category: 'tools',
      description: 'Tools and equipment costs',
      rule: 'Tool costs cannot reduce pay below NMW'
    };
  }

  /**
   * Process training deductions
   * @param {number} amount - Training deduction amount
   * @param {Object} rates - Training deduction rates
   * @returns {Object} Processed training deductions
   */
  processTrainingDeductions(amount, rates) {
    const maxDeduction = rates.maxDeduction || 0;
    const isCompliant = amount <= maxDeduction;
    
    return {
      amount: amount,
      maxAllowed: maxDeduction,
      isCompliant: isCompliant,
      excess: Math.max(0, amount - maxDeduction),
      category: 'training',
      description: 'Training and certification costs',
      rule: 'Training costs cannot reduce pay below NMW'
    };
  }

  /**
   * Process other deductions
   * @param {number} amount - Other deductions amount
   * @param {Object} rates - Other deduction rates
   * @returns {Object} Processed other deductions
   */
  processOtherDeductions(amount, rates) {
    const maxDeduction = rates.maxDeduction || 0;
    const isCompliant = amount <= maxDeduction;
    
    return {
      amount: amount,
      maxAllowed: maxDeduction,
      isCompliant: isCompliant,
      excess: Math.max(0, amount - maxDeduction),
      category: 'other',
      description: 'Other miscellaneous deductions',
      rule: 'Other deductions cannot reduce pay below NMW'
    };
  }

  /**
   * Calculate total deductions and compliance
   * @param {Object} processedDeductions - Processed deductions by category
   * @returns {Object} Total deduction calculations
   */
  calculateTotalDeductions(processedDeductions) {
    let total = 0;
    let compliant = 0;
    let nonCompliant = 0;
    let totalExcess = 0;

    Object.values(processedDeductions).forEach(deduction => {
      total += deduction.amount;
      
      if (deduction.isCompliant) {
        compliant += deduction.amount;
      } else {
        nonCompliant += deduction.amount;
        totalExcess += deduction.excess;
      }
    });

    return {
      total: total,
      compliant: compliant,
      nonCompliant: nonCompliant,
      totalExcess: totalExcess,
      complianceRate: total > 0 ? (compliant / total) * 100 : 100
    };
  }

  /**
   * Determine compliance status for deductions
   * @param {Object} processedDeductions - Processed deductions
   * @param {Object} deductionRates - Deduction rates
   * @returns {Object} Compliance status
   */
  determineComplianceStatus(processedDeductions, deductionRates) {
    const totalDeductions = this.calculateTotalDeductions(processedDeductions);
    const compliancePercentage = totalDeductions.complianceRate;
    
    // Determine RAG status
    let status = 'green';
    let score = 100;
    
    if (totalDeductions.totalExcess > 0) {
      if (compliancePercentage >= 80) {
        status = 'amber';
        score = Math.round(compliancePercentage);
      } else {
        status = 'red';
        score = Math.round(compliancePercentage);
      }
    }
    
    return {
      status: status,
      score: score,
      percentage: compliancePercentage,
      totalDeductions: totalDeductions.total,
      compliantAmount: totalDeductions.compliant,
      nonCompliantAmount: totalDeductions.nonCompliant,
      excessAmount: totalDeductions.totalExcess
    };
  }

  /**
   * Generate detailed breakdown of NMW deductions
   * @param {Object} processedDeductions - Processed deductions
   * @param {Object} totalDeductions - Total deduction calculations
   * @param {Object} prpDates - PRP date information
   * @param {Object} deductionRates - Deduction rates
   * @returns {Object} Detailed breakdown
   */
  generateBreakdown(processedDeductions, totalDeductions, prpDates, deductionRates) {
    return {
      period: {
        start: prpDates.start.toISOString().split('T')[0],
        end: prpDates.end.toISOString().split('T')[0],
        totalDays: prpDates.totalDays,
        workingDays: prpDates.workingDays
      },
      deductions: {
        total: totalDeductions.total,
        compliant: totalDeductions.compliant,
        nonCompliant: totalDeductions.nonCompliant,
        totalExcess: totalDeductions.totalExcess,
        complianceRate: totalDeductions.complianceRate,
        breakdown: processedDeductions
      },
      rates: {
        uniform: deductionRates.uniform?.maxDeduction || 0,
        tools: deductionRates.tools?.maxDeduction || 0,
        training: deductionRates.training?.maxDeduction || 0,
        other: deductionRates.other?.maxDeduction || 0
      },
      compliance: {
        status: totalDeductions.totalExcess > 0 ? 'non-compliant' : 'compliant',
        issues: this.generateComplianceIssues(processedDeductions),
        recommendations: this.generateRecommendations(processedDeductions)
      }
    };
  }

  /**
   * Generate compliance issues for non-compliant deductions
   * @param {Object} processedDeductions - Processed deductions
   * @returns {Array} Array of compliance issues
   */
  generateComplianceIssues(processedDeductions) {
    const issues = [];
    
    Object.entries(processedDeductions).forEach(([category, deduction]) => {
      if (!deduction.isCompliant) {
        issues.push({
          category: category,
          amount: deduction.amount,
          maxAllowed: deduction.maxAllowed,
          excess: deduction.excess,
          description: deduction.description,
          rule: deduction.rule,
          severity: deduction.excess > deduction.maxAllowed ? 'high' : 'medium'
        });
      }
    });
    
    return issues;
  }

  /**
   * Generate recommendations for fixing compliance issues
   * @param {Object} processedDeductions - Processed deductions
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(processedDeductions) {
    const recommendations = [];
    
    Object.entries(processedDeductions).forEach(([category, deduction]) => {
      if (!deduction.isCompliant) {
        recommendations.push({
          category: category,
          action: 'reduce_deduction',
          currentAmount: deduction.amount,
          recommendedAmount: deduction.maxAllowed,
          reduction: deduction.excess,
          description: `Reduce ${category} deduction from £${deduction.amount.toFixed(2)} to £${deduction.maxAllowed.toFixed(2)}`,
          priority: deduction.excess > deduction.maxAllowed ? 'high' : 'medium'
        });
      }
    });
    
    return recommendations;
  }

  /**
   * Calculate NMW deductions for multiple workers in bulk
   * @param {Array} workers - Array of worker data
   * @param {Array} payPeriods - Array of pay period data
   * @param {Array} deductionData - Array of deduction data
   * @returns {Array} Array of NMW deduction calculation results
   */
  async calculateBulkNMWDeductions(workers, payPeriods, deductionData) {
    const results = [];
    
    for (const worker of workers) {
      const workerPayPeriods = payPeriods.filter(pp => pp.worker_id === worker.worker_id);
      const workerDeductions = deductionData.filter(ded => ded.worker_id === worker.worker_id);
      
      for (const payPeriod of workerPayPeriods) {
        const deductions = workerDeductions.find(ded => 
          ded.pay_period_id === payPeriod.id
        ) || {
          uniform_deduction: 0,
          tools_deduction: 0,
          training_deduction: 0,
          other_deductions: 0
        };
        
        const result = await this.calculateNMWDeductions(worker, payPeriod, deductions);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Get NMW deduction summary for reporting
   * @param {Array} deductionResults - Array of NMW deduction calculation results
   * @returns {Object} Summary statistics
   */
  getNMWDeductionSummary(deductionResults) {
    const successfulResults = deductionResults.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        totalWorkers: 0,
        totalDeductions: 0,
        totalExcess: 0,
        complianceBreakdown: { green: 0, amber: 0, red: 0 },
        averageComplianceScore: 0
      };
    }
    
    const totalDeductions = successfulResults.reduce((sum, r) => sum + r.total_deductions, 0);
    const totalExcess = successfulResults.reduce((sum, r) => sum + r.non_compliant_deductions, 0);
    
    const complianceBreakdown = successfulResults.reduce((acc, r) => {
      acc[r.compliance_status] = (acc[r.compliance_status] || 0) + 1;
      return acc;
    }, {});
    
    const averageComplianceScore = successfulResults.reduce((sum, r) => sum + r.compliance_score, 0) / successfulResults.length;
    
    return {
      totalWorkers: successfulResults.length,
      totalDeductions: totalDeductions,
      totalExcess: totalExcess,
      complianceBreakdown: complianceBreakdown,
      averageComplianceScore: Math.round(averageComplianceScore * 100) / 100
    };
  }
}

module.exports = NMWDeductionService;
