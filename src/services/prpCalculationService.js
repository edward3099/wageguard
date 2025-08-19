const { getApplicableComplianceRules } = require('../utils/database-utils');

/**
 * Pay-Reference Period (PRP) Calculation Service for WageGuard
 * Implements deterministic logic for NMW/NLW compliance calculations
 */
class PRPCalculationService {
  constructor() {
    // UK NMW/NLW rates (2023-24 tax year)
    this.rates = {
      'NLW_23_24': { min_age: 23, rate: 10.42, effective_date: '2023-04-01' },
      'NMW_23_24_21_22': { min_age: 21, rate: 10.18, effective_date: '2023-04-01' },
      'NMW_23_24_18_20': { min_age: 18, rate: 7.49, effective_date: '2023-04-01' },
      'NMW_23_24_16_17': { min_age: 16, rate: 5.28, effective_date: '2023-04-01' },
      'NMW_23_24_APPRENTICE': { min_age: 16, rate: 5.28, effective_date: '2023-04-01' }
    };

    // Offset limits
    this.offsetLimits = {
      accommodation: { max_daily: 9.99, description: 'Maximum accommodation offset per day' },
      uniform: { max_daily: 0.00, description: 'No uniform offset allowed' },
      meals: { max_daily: 0.00, description: 'No meals offset allowed' }
    };
  }

  /**
   * Calculate Pay-Reference Period (PRP) for a worker
   * @param {Object} worker - Worker information
   * @param {Object} payPeriod - Pay period data
   * @param {Array} offsets - Array of offset objects
   * @param {Array} allowances - Array of allowance objects
   * @returns {Object} PRP calculation result
   */
  calculatePRP(worker, payPeriod, offsets = [], allowances = []) {
    try {
      // Validate inputs
      this.validateInputs(worker, payPeriod);

      // Calculate PRP start and end dates
      const prpDates = this.calculatePRPDates(payPeriod.period_start, payPeriod.period_end);

      // Determine applicable NMW/NLW rate
      const applicableRate = this.determineApplicableRate(worker, prpDates.start);

      // Calculate total hours and pay for PRP
      const prpCalculation = this.calculatePRPValues(payPeriod, prpDates);

      // Process offsets
      const processedOffsets = this.processOffsets(offsets, prpDates);

      // Process allowances
      const processedAllowances = this.processAllowances(allowances, prpDates);

      // Calculate effective hourly rate
      const effectiveRate = this.calculateEffectiveHourlyRate(
        prpCalculation.totalPay,
        prpCalculation.totalHours,
        processedOffsets.totalValue,
        processedAllowances.totalValue
      );

      // Determine RAG status
      const ragStatus = this.determineRAGStatus(effectiveRate, applicableRate.rate);

      // Generate compliance issues
      const complianceIssues = this.generateComplianceIssues(
        effectiveRate,
        applicableRate.rate,
        processedOffsets,
        processedAllowances
      );

      // Generate fix suggestions
      const fixSuggestions = this.generateFixSuggestions(
        effectiveRate,
        applicableRate.rate,
        processedOffsets,
        processedAllowances,
        prpCalculation.totalHours
      );

      return {
        success: true,
        prp: {
          start_date: prpDates.start,
          end_date: prpDates.end,
          total_hours: prpCalculation.totalHours,
          total_pay: prpCalculation.totalPay,
          effective_hourly_rate: effectiveRate,
          required_hourly_rate: applicableRate.rate
        },
        worker: {
          id: worker.id,
          age: worker.age,
          apprentice_status: worker.apprentice_status,
          first_year_apprentice: worker.first_year_apprentice
        },
        applicable_rate: applicableRate,
        offsets: processedOffsets,
        allowances: processedAllowances,
        compliance: {
          rag_status: ragStatus,
          issues: complianceIssues,
          fix_suggestions: fixSuggestions,
          compliance_score: this.calculateComplianceScore(effectiveRate, applicableRate.rate)
        },
        calculation_metadata: {
          calculated_at: new Date().toISOString(),
          prp_type: prpDates.type,
          rules_applied: [applicableRate.rule_name]
        }
      };

    } catch (error) {
      console.error('❌ PRP calculation failed:', error);
      return {
        success: false,
        error: error.message,
        worker_id: worker?.id,
        pay_period_id: payPeriod?.id
      };
    }
  }

  /**
   * Validate input parameters
   * @param {Object} worker - Worker information
   * @param {Object} payPeriod - Pay period data
   */
  validateInputs(worker, payPeriod) {
    if (!worker || !worker.id) {
      throw new Error('Worker ID is required');
    }

    if (!payPeriod || !payPeriod.period_start || !payPeriod.period_end) {
      throw new Error('Pay period start and end dates are required');
    }

    if (!payPeriod.total_hours || payPeriod.total_hours <= 0) {
      throw new Error('Total hours must be greater than 0');
    }

    if (!payPeriod.total_pay || payPeriod.total_pay <= 0) {
      throw new Error('Total pay must be greater than 0');
    }

    // Validate dates
    const startDate = new Date(payPeriod.period_start);
    const endDate = new Date(payPeriod.period_end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }

    if (startDate >= endDate) {
      throw new Error('Period start date must be before end date');
    }
  }

  /**
   * Calculate PRP start and end dates
   * @param {string|Date} periodStart - Period start date
   * @param {string|Date} periodEnd - Period end date
   * @returns {Object} PRP dates and type
   */
  calculatePRPDates(periodStart, periodEnd) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Determine PRP type based on period length
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    let prpType;
    if (daysDiff <= 7) {
      prpType = 'weekly';
    } else if (daysDiff <= 31) {
      prpType = 'monthly';
    } else if (daysDiff <= 91) {
      prpType = 'quarterly';
    } else {
      prpType = 'annual';
    }

    // For weekly PRPs, align to Monday-Sunday
    let prpStart = start;
    let prpEnd = end;

    if (prpType === 'weekly') {
      // Find the Monday of the week containing the start date
      const dayOfWeek = start.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      prpStart = new Date(start);
      prpStart.setDate(start.getDate() - daysToMonday);

      // Find the Sunday of the week containing the end date
      const endDayOfWeek = end.getDay();
      const daysToSunday = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
      prpEnd = new Date(end);
      prpEnd.setDate(end.getDate() + daysToSunday);
    }

    return {
      start: prpStart,
      end: prpEnd,
      type: prpType,
      original_start: start,
      original_end: end
    };
  }

  /**
   * Determine applicable NMW/NLW rate for a worker
   * @param {Object} worker - Worker information
   * @param {Date} checkDate - Date to check compliance for
   * @returns {Object} Applicable rate information
   */
  determineApplicableRate(worker, checkDate) {
    const age = worker.age || 18;
    const isApprentice = worker.apprentice_status || false;
    const isFirstYearApprentice = worker.first_year_apprentice || false;

    // First year apprentices get apprentice rate regardless of age
    if (isApprentice && isFirstYearApprentice) {
      return {
        rule_name: 'NMW_23_24_APPRENTICE',
        rate: this.rates['NMW_23_24_APPRENTICE'].rate,
        description: 'First year apprentice rate',
        worker_type: 'first_year_apprentice'
      };
    }

    // Regular apprentices get apprentice rate if under 19, otherwise age-appropriate rate
    if (isApprentice && age < 19) {
      return {
        rule_name: 'NMW_23_24_APPRENTICE',
        rate: this.rates['NMW_23_24_APPRENTICE'].rate,
        description: 'Apprentice rate (under 19)',
        worker_type: 'apprentice'
      };
    }

    // Age-based rates for non-apprentices
    if (age >= 23) {
      return {
        rule_name: 'NLW_23_24',
        rate: this.rates['NLW_23_24'].rate,
        description: 'National Living Wage (23+)',
        worker_type: 'adult'
      };
    } else if (age >= 21) {
      return {
        rule_name: 'NMW_23_24_21_22',
        rate: this.rates['NMW_23_24_21_22'].rate,
        description: 'National Minimum Wage (21-22)',
        worker_type: 'young_adult'
      };
    } else if (age >= 18) {
      return {
        rule_name: 'NMW_23_24_18_20',
        rate: this.rates['NMW_23_24_18_20'].rate,
        description: 'National Minimum Wage (18-20)',
        worker_type: 'young_worker'
      };
    } else if (age >= 16) {
      return {
        rule_name: 'NMW_23_24_16_17',
        rate: this.rates['NMW_23_24_16_17'].rate,
        description: 'National Minimum Wage (16-17)',
        worker_type: 'school_leaver'
      };
    } else {
      throw new Error(`Worker age ${age} is below minimum working age of 16`);
    }
  }

  /**
   * Calculate PRP values
   * @param {Object} payPeriod - Pay period data
   * @param {Object} prpDates - PRP dates
   * @returns {Object} PRP calculation values
   */
  calculatePRPValues(payPeriod, prpDates) {
    // For now, use the original period values
    // In a more sophisticated implementation, this would recalculate based on PRP dates
    return {
      totalHours: payPeriod.total_hours,
      totalPay: payPeriod.total_pay,
      periodStart: payPeriod.period_start,
      periodEnd: payPeriod.period_end
    };
  }

  /**
   * Process offsets for PRP
   * @param {Array} offsets - Array of offset objects
   * @param {Object} prpDates - PRP dates
   * @returns {Object} Processed offsets
   */
  processOffsets(offsets, prpDates) {
    const processed = {
      accommodation: { total: 0, daily: 0, days: 0, compliant: true, issues: [] },
      uniform: { total: 0, daily: 0, days: 0, compliant: true, issues: [] },
      meals: { total: 0, daily: 0, days: 0, compliant: true, issues: [] },
      deductions: { total: 0, daily: 0, days: 0, compliant: true, issues: [] },
      totalValue: 0,
      totalDays: 0
    };

    offsets.forEach(offset => {
      const offsetType = this.categorizeOffset(offset);
      const dailyRate = offset.daily_rate || 0;
      const daysApplied = offset.days_applied || 1;
      const totalAmount = offset.amount || 0;

      // Update offset totals
      processed[offsetType].total += totalAmount;
      processed[offsetType].daily += dailyRate;
      processed[offsetType].days += daysApplied;

      // Check compliance with limits
      const limit = this.offsetLimits[offsetType];
      if (limit && dailyRate > limit.max_daily) {
        processed[offsetType].compliant = false;
        processed[offsetType].issues.push({
          type: 'exceeds_limit',
          message: `${offsetType} offset £${dailyRate.toFixed(2)} exceeds limit £${limit.max_daily.toFixed(2)}`,
          daily_rate: dailyRate,
          limit: limit.max_daily
        });
      }

      processed.totalValue += totalAmount;
      processed.totalDays += daysApplied;
    });

    return processed;
  }

  /**
   * Categorize offset by type
   * @param {Object} offset - Offset object
   * @returns {string} Offset category
   */
  categorizeOffset(offset) {
    if (offset.is_accommodation) return 'accommodation';
    if (offset.is_uniform) return 'uniform';
    if (offset.is_meals) return 'meals';
    if (offset.is_deduction) return 'deductions';
    
    // Default based on description or type
    const description = (offset.description || '').toLowerCase();
    if (description.includes('accommodation') || description.includes('housing')) return 'accommodation';
    if (description.includes('uniform') || description.includes('clothing')) return 'uniform';
    if (description.includes('meal') || description.includes('food')) return 'meals';
    
    return 'deductions';
  }

  /**
   * Process allowances for PRP
   * @param {Array} allowances - Array of allowance objects
   * @param {Object} prpDates - PRP dates
   * @returns {Object} Processed allowances
   */
  processAllowances(allowances, prpDates) {
    const processed = {
      tronc: { total: 0, compliant: true, issues: [] },
      premium: { total: 0, compliant: true, issues: [] },
      bonus: { total: 0, compliant: true, issues: [] },
      totalValue: 0
    };

    allowances.forEach(allowance => {
      const allowanceType = this.categorizeAllowance(allowance);
      const amount = allowance.amount || 0;

      processed[allowanceType].total += amount;
      processed.totalValue += amount;

      // Check for excessive allowances that might affect compliance
      if (amount > 1000) { // Arbitrary threshold - could be configurable
        processed[allowanceType].issues.push({
          type: 'high_amount',
          message: `${allowanceType} allowance £${amount.toFixed(2)} is unusually high`,
          amount: amount
        });
      }
    });

    return processed;
  }

  /**
   * Categorize allowance by type
   * @param {Object} allowance - Allowance object
   * @returns {string} Allowance category
   */
  categorizeAllowance(allowance) {
    if (allowance.is_tronc) return 'tronc';
    if (allowance.is_premium) return 'premium';
    if (allowance.is_bonus) return 'bonus';
    
    // Default based on description or type
    const description = (allowance.description || '').toLowerCase();
    if (description.includes('tronc') || description.includes('service charge')) return 'tronc';
    if (description.includes('premium') || description.includes('overtime')) return 'premium';
    if (description.includes('bonus') || description.includes('incentive')) return 'bonus';
    
    return 'bonus';
  }

  /**
   * Calculate effective hourly rate
   * @param {number} totalPay - Total pay for the period
   * @param {number} totalHours - Total hours worked
   * @param {number} totalOffsets - Total offset value
   * @param {number} totalAllowances - Total allowance value
   * @returns {number} Effective hourly rate
   */
  calculateEffectiveHourlyRate(totalPay, totalHours, totalOffsets, totalAllowances) {
    if (totalHours <= 0) return 0;

    // Effective pay = total pay - total offsets + total allowances
    // Offsets reduce pay, allowances increase pay
    const effectivePay = totalPay - totalOffsets + totalAllowances;

    return effectivePay / totalHours;
  }

  /**
   * Determine RAG status based on compliance
   * @param {number} effectiveRate - Effective hourly rate
   * @param {number} requiredRate - Required minimum rate
   * @param {number} tolerance - Tolerance percentage (default 2%)
   * @returns {string} RAG status
   */
  determineRAGStatus(effectiveRate, requiredRate, tolerance = 0.02) {
    if (effectiveRate >= requiredRate) {
      return 'GREEN';
    }

    const toleranceAmount = requiredRate * tolerance;
    if (effectiveRate >= (requiredRate - toleranceAmount)) {
      return 'AMBER';
    }

    return 'RED';
  }

  /**
   * Generate compliance issues
   * @param {number} effectiveRate - Effective hourly rate
   * @param {number} requiredRate - Required minimum rate
   * @param {Object} offsets - Processed offsets
   * @param {Object} allowances - Processed allowances
   * @returns {Array} Array of compliance issues
   */
  generateComplianceIssues(effectiveRate, requiredRate, offsets, allowances) {
    const issues = [];

    // Check hourly rate compliance
    if (effectiveRate < requiredRate) {
      const shortfall = requiredRate - effectiveRate;
      issues.push({
        type: 'hourly_rate',
        severity: 'high',
        message: `Effective hourly rate £${effectiveRate.toFixed(2)} is below required rate £${requiredRate.toFixed(2)}`,
        shortfall: shortfall,
        current_rate: effectiveRate,
        required_rate: requiredRate
      });
    }

    // Check offset compliance
    Object.entries(offsets).forEach(([type, data]) => {
      if (type !== 'totalValue' && type !== 'totalDays' && !data.compliant) {
        data.issues.forEach(issue => {
          issues.push({
            type: `${type}_offset`,
            severity: 'medium',
            message: issue.message,
            offset_type: type,
            daily_rate: issue.daily_rate,
            limit: issue.limit
          });
        });
      }
    });

    // Check for excessive allowances
    Object.entries(allowances).forEach(([type, data]) => {
      if (type !== 'totalValue' && data.issues.length > 0) {
        data.issues.forEach(issue => {
          issues.push({
            type: `${type}_allowance`,
            severity: 'low',
            message: issue.message,
            allowance_type: type,
            amount: issue.amount
          });
        });
      }
    });

    return issues;
  }

  /**
   * Generate fix suggestions
   * @param {number} effectiveRate - Effective hourly rate
   * @param {number} requiredRate - Required minimum rate
   * @param {Object} offsets - Processed offsets
   * @param {Object} allowances - Processed allowances
   * @param {number} totalHours - Total hours worked
   * @returns {Array} Array of fix suggestions
   */
  generateFixSuggestions(effectiveRate, requiredRate, offsets, allowances, totalHours) {
    const suggestions = [];

    // Calculate shortfall
    if (effectiveRate < requiredRate) {
      const shortfall = requiredRate - effectiveRate;
      const weeklyShortfall = shortfall * 40; // Assuming 40-hour week
      const monthlyShortfall = weeklyShortfall * 4.33; // Average weeks per month

      suggestions.push({
        type: 'increase_pay',
        priority: 'high',
        message: `Increase hourly rate by £${shortfall.toFixed(2)} to meet minimum wage requirements`,
        shortfall_per_hour: shortfall,
        weekly_impact: weeklyShortfall,
        monthly_impact: monthlyShortfall
      });

      // Alternative: reduce offsets
      if (offsets.totalValue > 0) {
        const requiredReduction = shortfall * totalHours;
        suggestions.push({
          type: 'reduce_offsets',
          priority: 'medium',
          message: `Reduce total offsets by £${requiredReduction.toFixed(2)} to meet minimum wage`,
          required_reduction: requiredReduction,
          current_offsets: offsets.totalValue
        });
      }
    }

    // Fix offset compliance issues
    Object.entries(offsets).forEach(([type, data]) => {
      if (type !== 'totalValue' && type !== 'totalDays' && !data.compliant) {
        const limit = this.offsetLimits[type];
        if (limit) {
          suggestions.push({
            type: `fix_${type}_offset`,
            priority: 'medium',
            message: `Reduce ${type} offset to maximum £${limit.max_daily.toFixed(2)} per day`,
            offset_type: type,
            current_daily: data.daily,
            max_daily: limit.max_daily
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * Calculate compliance score (0-100)
   * @param {number} effectiveRate - Effective hourly rate
   * @param {number} requiredRate - Required minimum rate
   * @returns {number} Compliance score
   */
  calculateComplianceScore(effectiveRate, requiredRate) {
    if (effectiveRate >= requiredRate) {
      return 100; // Perfect compliance
    }

    // Calculate percentage of required rate achieved
    const percentage = (effectiveRate / requiredRate) * 100;
    
    // Apply penalty for being below required rate
    const penalty = Math.max(0, (requiredRate - effectiveRate) / requiredRate * 50);
    
    return Math.max(0, Math.round(percentage - penalty));
  }

  /**
   * Batch calculate PRP for multiple workers
   * @param {Array} workers - Array of worker data
   * @param {Array} payPeriods - Array of pay period data
   * @param {Array} offsets - Array of offset data
   * @param {Array} allowances - Array of allowance data
   * @returns {Object} Batch calculation results
   */
  batchCalculatePRP(workers, payPeriods, offsets, allowances) {
    const results = {
      success: true,
      total_workers: workers.length,
      compliant_workers: 0,
      amber_workers: 0,
      non_compliant_workers: 0,
      calculations: [],
      summary: {
        total_hours: 0,
        total_pay: 0,
        total_offsets: 0,
        total_allowances: 0,
        average_compliance_score: 0
      }
    };

    let totalComplianceScore = 0;

    workers.forEach(worker => {
      const workerPayPeriods = payPeriods.filter(pp => pp.worker_id === worker.id);
      const workerOffsets = offsets.filter(o => o.worker_id === worker.id);
      const workerAllowances = allowances.filter(a => a.worker_id === worker.id);

      workerPayPeriods.forEach(payPeriod => {
        const calculation = this.calculatePRP(worker, payPeriod, workerOffsets, workerAllowances);
        
        if (calculation.success) {
          results.calculations.push(calculation);
          
          // Update summary statistics
          results.summary.total_hours += calculation.prp.total_hours;
          results.summary.total_pay += calculation.prp.total_pay;
          results.summary.total_offsets += calculation.offsets.totalValue;
          results.summary.total_allowances += calculation.allowances.totalValue;
          
          // Count RAG status
          switch (calculation.compliance.rag_status) {
            case 'GREEN':
              results.compliant_workers++;
              break;
            case 'AMBER':
              results.amber_workers++;
              break;
            case 'RED':
              results.non_compliant_workers++;
              break;
          }
          
          totalComplianceScore += calculation.compliance.compliance_score;
        }
      });
    });

    // Calculate average compliance score
    if (results.calculations.length > 0) {
      results.summary.average_compliance_score = Math.round(totalComplianceScore / results.calculations.length);
    }

    return results;
  }
}

module.exports = PRPCalculationService;
