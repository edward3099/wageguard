const NMWRateLookupService = require('./nmwRateLookupService');

/**
 * RAG Status Service - Determines Red/Amber/Green compliance status
 * This service provides the core logic for assigning RAG status based on
 * effective hourly rate vs required NMW/NLW rate
 */
class RAGStatusService {
  constructor() {
    this.nmwRateService = new NMWRateLookupService();
  }

  /**
   * Calculate RAG status for a worker
   * @param {Object} worker - Worker information
   * @param {Object} payPeriod - Pay period information
   * @param {Object} calculatedData - Calculated compliance data from previous services
   * @returns {Promise<Object>} RAG status result
   */
  async calculateRAGStatus(worker, payPeriod, calculatedData) {
    const workerId = worker?.worker_id || worker?.id || 'unknown';
    console.log(`🚦 Calculating RAG status for worker ${workerId}`);

    try {
      // Validate inputs
      const validation = this.validateInputs(worker, payPeriod, calculatedData);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Input validation failed',
          details: validation.errors,
          ragStatus: 'AMBER',
          reason: 'Invalid or incomplete data prevents definitive compliance check'
        };
      }

      // Get required NMW/NLW rate
      let requiredRateResult;
      try {
        requiredRateResult = await this.getRequiredRate(worker, payPeriod);
      } catch (error) {
        throw new Error(`Rate lookup failed: ${error.message}`);
      }
      
      if (!requiredRateResult.success) {
        return {
          success: false,
          error: 'Failed to determine required rate',
          details: requiredRateResult.error,
          ragStatus: 'AMBER',
          reason: 'Unable to determine applicable NMW/NLW rate'
        };
      }

      // Extract effective hourly rate from calculated data
      const effectiveHourlyRate = calculatedData.effectiveHourlyRate || calculatedData.effective_hourly_rate;
      if (effectiveHourlyRate === undefined || effectiveHourlyRate === null) {
        return {
          success: false,
          error: 'Missing effective hourly rate',
          ragStatus: 'AMBER',
          reason: 'Effective hourly rate could not be calculated'
        };
      }

      // Check for specific amber conditions
      const amberCheck = this.checkAmberConditions(worker, payPeriod, calculatedData);
      if (amberCheck.isAmber) {
        return {
          success: true,
          ragStatus: 'AMBER',
          reason: amberCheck.reason,
          effectiveHourlyRate: effectiveHourlyRate,
          requiredHourlyRate: requiredRateResult.hourlyRate,
          rateComparison: {
            effective: effectiveHourlyRate,
            required: requiredRateResult.hourlyRate,
            difference: effectiveHourlyRate - requiredRateResult.hourlyRate,
            percentageOfRequired: (effectiveHourlyRate / requiredRateResult.hourlyRate) * 100
          },
          rateDetails: requiredRateResult,
          amberFlags: amberCheck.flags
        };
      }

      // Determine status based on rate comparison
      const statusResult = this.determineStatusFromRates(
        effectiveHourlyRate,
        requiredRateResult.hourlyRate,
        requiredRateResult
      );

      console.log(`✅ RAG status determined: ${statusResult.ragStatus} (£${effectiveHourlyRate.toFixed(2)} vs £${requiredRateResult.hourlyRate.toFixed(2)})`);

      return {
        success: true,
        ...statusResult,
        effectiveHourlyRate: effectiveHourlyRate,
        requiredHourlyRate: requiredRateResult.hourlyRate,
        rateDetails: requiredRateResult
      };

    } catch (error) {
      console.error('❌ Failed to calculate RAG status:', error);
      return {
        success: false,
        error: 'RAG status calculation failed',
        details: error.message,
        ragStatus: 'AMBER',
        reason: 'System error during RAG status calculation'
      };
    }
  }

  /**
   * Validate inputs for RAG status calculation
   * @param {Object} worker - Worker information
   * @param {Object} payPeriod - Pay period information
   * @param {Object} calculatedData - Calculated compliance data
   * @returns {Object} Validation result
   */
  validateInputs(worker, payPeriod, calculatedData) {
    const errors = [];

    // Validate worker
    if (!worker) {
      errors.push('Worker information is required');
    } else {
      if (!worker.age && !worker.date_of_birth) {
        errors.push('Worker age or date of birth is required');
      }
    }

    // Validate pay period
    if (!payPeriod) {
      errors.push('Pay period information is required');
    } else {
      if (!payPeriod.period_start && !payPeriod.start_date) {
        errors.push('Pay period start date is required');
      }
      if (!payPeriod.period_end && !payPeriod.end_date) {
        errors.push('Pay period end date is required');
      }
    }

    // Validate calculated data
    if (!calculatedData) {
      errors.push('Calculated compliance data is required');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get required NMW/NLW rate for worker and pay period
   * @param {Object} worker - Worker information
   * @param {Object} payPeriod - Pay period information
   * @returns {Promise<Object>} Required rate result
   */
  async getRequiredRate(worker, payPeriod) {
    try {
      // Determine worker age
      let age = worker.age;
      if (!age && worker.date_of_birth) {
        const payPeriodDate = payPeriod.period_start || payPeriod.start_date;
        age = this.nmwRateService.calculateAge(worker.date_of_birth, payPeriodDate);
      }

      if (!age) {
        return {
          success: false,
          error: 'Cannot determine worker age'
        };
      }

      // Get pay period date for rate lookup
      const payPeriodDate = payPeriod.period_start || payPeriod.start_date;

      // Check for apprentice status
      const isApprentice = worker.is_apprentice || worker.apprentice || false;
      const apprenticeshipStartDate = worker.apprenticeship_start_date || worker.apprentice_start_date;

      // Get required rate
      const result = await this.nmwRateService.getRequiredRate(
        age,
        payPeriodDate,
        isApprentice,
        apprenticeshipStartDate
      );

      return result;

    } catch (error) {
      return {
        success: false,
        error: `Rate lookup failed: ${error.message}`
      };
    }
  }

  /**
   * Check for specific conditions that should result in AMBER status
   * @param {Object} worker - Worker information
   * @param {Object} payPeriod - Pay period information
   * @param {Object} calculatedData - Calculated compliance data
   * @returns {Object} Amber check result
   */
  checkAmberConditions(worker, payPeriod, calculatedData) {
    const flags = [];
    let isAmber = false;
    let reason = '';

    // Check for zero hours worked with non-zero pay
    const hoursWorked = calculatedData.hoursWorked || calculatedData.hours_worked || 0;
    const totalPay = calculatedData.totalPay || calculatedData.total_pay || 0;
    
    if (hoursWorked === 0 && totalPay > 0) {
      flags.push('zero_hours_with_pay');
      isAmber = true;
      reason = 'Zero hours worked with non-zero pay prevents definitive rate calculation';
    }

    // Check for missing critical data
    if (!worker.age && !worker.date_of_birth) {
      flags.push('missing_age_data');
      isAmber = true;
      reason = 'Missing worker age or date of birth prevents rate determination';
    }

    // Check for negative effective rate (should not happen but is an edge case)
    const effectiveRate = calculatedData.effectiveHourlyRate || calculatedData.effective_hourly_rate;
    if (effectiveRate < 0) {
      flags.push('negative_effective_rate');
      isAmber = true;
      reason = 'Negative effective hourly rate indicates data quality issues';
    }

    // Check for excessive deductions that might indicate complex compliance issues
    const deductionRatio = calculatedData.deductionRatio || calculatedData.deduction_ratio;
    if (deductionRatio && deductionRatio > 0.5) { // More than 50% of pay deducted
      flags.push('excessive_deductions');
      isAmber = true;
      reason = 'Excessive deductions may indicate complex compliance scenario';
    }

    // Check for accommodation offset exceeding legal limits
    const accommodationOffsetFlags = calculatedData.accommodationOffsetFlags || 
                                   calculatedData.accommodation_offset_flags || [];
    if (accommodationOffsetFlags.some(flag => flag.includes('excess') || flag.includes('violation'))) {
      flags.push('accommodation_offset_violations');
      isAmber = true;
      reason = 'Accommodation offset violations require manual review';
    }

    return {
      isAmber,
      reason,
      flags
    };
  }

  /**
   * Determine status based on rate comparison
   * @param {number} effectiveRate - Worker's effective hourly rate
   * @param {number} requiredRate - Required NMW/NLW rate
   * @param {Object} rateDetails - Details about the required rate
   * @returns {Object} Status determination result
   */
  determineStatusFromRates(effectiveRate, requiredRate, rateDetails) {
    const difference = effectiveRate - requiredRate;
    const percentageOfRequired = (effectiveRate / requiredRate) * 100;
    
    let ragStatus;
    let reason;
    let severity = null;

    if (effectiveRate >= requiredRate) {
      ragStatus = 'GREEN';
      reason = `Effective rate (£${effectiveRate.toFixed(2)}) meets or exceeds required rate (£${requiredRate.toFixed(2)})`;
    } else {
      ragStatus = 'RED';
      reason = `Effective rate (£${effectiveRate.toFixed(2)}) is below required rate (£${requiredRate.toFixed(2)})`;
      
      // Calculate severity of underpayment
      const shortfallPercentage = ((requiredRate - effectiveRate) / requiredRate) * 100;
      if (shortfallPercentage > 20) {
        severity = 'CRITICAL';
      } else if (shortfallPercentage > 10) {
        severity = 'HIGH';
      } else if (shortfallPercentage > 5) {
        severity = 'MEDIUM';
      } else {
        severity = 'LOW';
      }
    }

    return {
      ragStatus,
      reason,
      severity,
      rateComparison: {
        effective: effectiveRate,
        required: requiredRate,
        difference: difference,
        percentageOfRequired: percentageOfRequired,
        shortfallPercentage: ragStatus === 'RED' ? ((requiredRate - effectiveRate) / requiredRate) * 100 : 0
      }
    };
  }

  /**
   * Perform bulk RAG status calculation for multiple workers
   * @param {Array} workers - Array of worker data with calculated compliance data
   * @param {Object} options - Bulk processing options
   * @returns {Promise<Object>} Bulk RAG status results
   */
  async calculateBulkRAGStatus(workers, options = {}) {
    console.log(`🔄 Performing bulk RAG status calculation for ${workers.length} workers`);

    const results = [];
    const summary = {
      total: workers.length,
      green: 0,
      amber: 0,
      red: 0,
      errors: 0,
      criticalUnderpayments: 0
    };

    for (const workerData of workers) {
      try {
        const result = await this.calculateRAGStatus(
          workerData.worker,
          workerData.payPeriod,
          workerData.calculatedData
        );

        results.push({
          workerId: workerData.worker?.worker_id || workerData.worker?.id || 'unknown',
          ...result
        });

        // Update summary
        if (result.success) {
          switch (result.ragStatus) {
            case 'GREEN':
              summary.green++;
              break;
            case 'AMBER':
              summary.amber++;
              break;
            case 'RED':
              summary.red++;
              if (result.severity === 'CRITICAL') {
                summary.criticalUnderpayments++;
              }
              break;
          }
        } else {
          summary.errors++;
        }

      } catch (error) {
        const workerId = workerData.worker?.worker_id || workerData.worker?.id || 'unknown';
        console.error(`❌ Failed to calculate RAG status for worker ${workerId}:`, error);
        results.push({
          workerId: workerId,
          success: false,
          error: 'RAG status calculation failed',
          ragStatus: 'AMBER',
          reason: 'System error during calculation'
        });
        summary.errors++;
      }
    }

    console.log(`✅ Bulk RAG status calculation completed: ${summary.green} Green, ${summary.amber} Amber, ${summary.red} Red`);

    return {
      success: true,
      results,
      summary,
      complianceRate: summary.total > 0 ? (summary.green / summary.total) * 100 : 0,
      atRiskWorkers: summary.red + summary.amber,
      criticalIssues: summary.criticalUnderpayments
    };
  }

  /**
   * Get RAG status summary from results
   * @param {Array} ragResults - Array of RAG status results
   * @returns {Object} Summary statistics
   */
  getRAGStatusSummary(ragResults) {
    const summary = {
      total: ragResults.length,
      green: 0,
      amber: 0,
      red: 0,
      errors: 0,
      complianceRate: 0,
      averageEffectiveRate: 0,
      averageRequiredRate: 0,
      totalShortfall: 0,
      criticalUnderpayments: 0
    };

    let totalEffectiveRate = 0;
    let totalRequiredRate = 0;
    let validResults = 0;

    for (const result of ragResults) {
      if (result.success && result.ragStatus) {
        validResults++;
        
        switch (result.ragStatus) {
          case 'GREEN':
            summary.green++;
            break;
          case 'AMBER':
            summary.amber++;
            break;
          case 'RED':
            summary.red++;
            if (result.severity === 'CRITICAL') {
              summary.criticalUnderpayments++;
            }
            if (result.rateComparison) {
              summary.totalShortfall += Math.max(0, result.rateComparison.required - result.rateComparison.effective);
            }
            break;
        }

        if (result.effectiveHourlyRate) {
          totalEffectiveRate += result.effectiveHourlyRate;
        }
        if (result.requiredHourlyRate) {
          totalRequiredRate += result.requiredHourlyRate;
        }
      } else {
        summary.errors++;
      }
    }

    if (validResults > 0) {
      summary.complianceRate = (summary.green / validResults) * 100;
      summary.averageEffectiveRate = totalEffectiveRate / validResults;
      summary.averageRequiredRate = totalRequiredRate / validResults;
    }

    return summary;
  }
}

module.exports = RAGStatusService;
