/**
 * Fix Suggestion Service - Generates deterministic fix suggestions for compliance issues
 * This service calculates precise financial shortfalls and provides structured
 * recommendations for addressing NMW/NLW compliance violations
 */
class FixSuggestionService {
  constructor() {
    // Constants for formatting and thresholds
    this.CURRENCY_SYMBOL = '£';
    this.DECIMAL_PLACES = 2;
    this.MIN_SUGGESTION_THRESHOLD = 0.01; // Minimum shortfall to suggest a fix
  }

  /**
   * Generate fix suggestions for a worker with compliance issues
   * @param {Object} worker - Worker information
   * @param {Object} payPeriod - Pay period information
   * @param {Object} ragResult - RAG status result from RAGStatusService
   * @param {Object} calculatedData - Calculated compliance data
   * @returns {Object} Fix suggestion result
   */
  generateFixSuggestions(worker, payPeriod, ragResult, calculatedData) {
    const workerId = worker?.worker_id || worker?.id || 'unknown';
    console.log(`🔧 Generating fix suggestions for worker ${workerId}`);

    try {
      // Validate inputs
      const validation = this.validateInputs(worker, payPeriod, ragResult, calculatedData);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Input validation failed',
          details: validation.errors
        };
      }

      // Extract key values
      const effectiveRate = ragResult.effectiveHourlyRate || calculatedData.effectiveHourlyRate;
      const requiredRate = ragResult.requiredHourlyRate || ragResult.rateDetails?.hourlyRate;
      const hoursWorked = calculatedData.hoursWorked || calculatedData.hours_worked || 0;
      const totalPay = calculatedData.totalPay || calculatedData.total_pay || 0;

      // Generate suggestions based on RAG status
      let suggestions = [];
      let primarySuggestion = null;
      let calculations = {};

      switch (ragResult.ragStatus) {
        case 'RED':
          const redResult = this.generateRedStatusSuggestions(
            effectiveRate, requiredRate, hoursWorked, totalPay
          );
          suggestions = redResult.suggestions;
          primarySuggestion = redResult.primarySuggestion;
          calculations = redResult.calculations;
          break;

        case 'AMBER':
          suggestions = this.generateAmberStatusSuggestions(ragResult, calculatedData);
          primarySuggestion = suggestions.length > 0 ? suggestions[0] : null;
          break;

        case 'GREEN':
          suggestions = this.generateGreenStatusSuggestions(ragResult, calculatedData);
          primarySuggestion = suggestions.length > 0 ? suggestions[0] : null;
          break;

        default:
          return {
            success: false,
            error: 'Unknown RAG status',
            ragStatus: ragResult.ragStatus
          };
      }

      console.log(`✅ Generated ${suggestions.length} fix suggestions for ${ragResult.ragStatus} status`);

      return {
        success: true,
        ragStatus: ragResult.ragStatus,
        suggestions: suggestions,
        primarySuggestion: primarySuggestion,
        calculations: calculations,
        metadata: {
          workerId: worker.worker_id || worker.id,
          payPeriod: {
            start: payPeriod.period_start || payPeriod.start_date,
            end: payPeriod.period_end || payPeriod.end_date
          },
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Failed to generate fix suggestions:', error);
      return {
        success: false,
        error: 'Fix suggestion generation failed',
        details: error.message
      };
    }
  }

  /**
   * Generate fix suggestions for RED status (non-compliant) workers
   * @param {number} effectiveRate - Worker's effective hourly rate
   * @param {number} requiredRate - Required NMW/NLW rate
   * @param {number} hoursWorked - Total hours worked in period
   * @param {number} totalPay - Total pay for the period
   * @returns {Object} RED status suggestions and calculations
   */
  generateRedStatusSuggestions(effectiveRate, requiredRate, hoursWorked, totalPay) {
    const calculations = this.calculateShortfall(effectiveRate, requiredRate, hoursWorked);
    const suggestions = [];

    // Primary suggestion - arrears top-up
    if (calculations.totalShortfall >= this.MIN_SUGGESTION_THRESHOLD && calculations.perHourShortfall >= 0.01) {
      const primaryMessage = this.formatPrimarySuggestion(
        effectiveRate, requiredRate, calculations.perHourShortfall, calculations.totalShortfall
      );
      
      suggestions.push({
        type: 'ARREARS_TOP_UP',
        severity: 'HIGH',
        message: primaryMessage,
        actionRequired: true,
        financialImpact: {
          perHourShortfall: calculations.perHourShortfall,
          totalShortfall: calculations.totalShortfall,
          currentPay: totalPay,
          requiredPay: totalPay + calculations.totalShortfall
        }
      });
    }

    // Additional context-specific suggestions
    if (calculations.shortfallPercentage > 20) {
      suggestions.push({
        type: 'URGENT_REVIEW',
        severity: 'CRITICAL',
        message: `Critical underpayment detected (${calculations.shortfallPercentage.toFixed(1)}% below minimum). Immediate payroll review required.`,
        actionRequired: true
      });
    }

    if (hoursWorked > 48) {
      suggestions.push({
        type: 'HOURS_REVIEW',
        severity: 'MEDIUM',
        message: `Review working time regulations compliance. Worker has ${hoursWorked} hours which may exceed limits.`,
        actionRequired: false
      });
    }

    // Rate breakdown suggestion
    suggestions.push({
      type: 'RATE_BREAKDOWN',
      severity: 'INFO',
      message: `Rate breakdown: Effective £${effectiveRate.toFixed(2)}/hour vs Required £${requiredRate.toFixed(2)}/hour over ${hoursWorked} hours.`,
      actionRequired: false,
      details: {
        effectiveRate: effectiveRate,
        requiredRate: requiredRate,
        hoursWorked: hoursWorked,
        complianceGap: calculations.perHourShortfall
      }
    });

    return {
      suggestions,
      primarySuggestion: suggestions.length > 0 ? suggestions[0] : null,
      calculations
    };
  }

  /**
   * Generate fix suggestions for AMBER status (edge case) workers
   * @param {Object} ragResult - RAG status result
   * @param {Object} calculatedData - Calculated compliance data
   * @returns {Array} AMBER status suggestions
   */
  generateAmberStatusSuggestions(ragResult, calculatedData) {
    const suggestions = [];

    // Handle specific amber flags
    if (ragResult.amberFlags) {
      for (const flag of ragResult.amberFlags) {
        switch (flag) {
          case 'zero_hours_with_pay':
            suggestions.push({
              type: 'DATA_CLARIFICATION',
              severity: 'MEDIUM',
              message: 'Zero hours recorded with non-zero pay. Please verify timesheet data and ensure all working hours are captured.',
              actionRequired: true
            });
            break;

          case 'missing_age_data':
            suggestions.push({
              type: 'MISSING_DATA',
              severity: 'HIGH',
              message: 'Worker age or date of birth missing. Required to determine applicable minimum wage rate.',
              actionRequired: true
            });
            break;

          case 'negative_effective_rate':
            suggestions.push({
              type: 'DATA_ERROR',
              severity: 'CRITICAL',
              message: 'Negative effective hourly rate indicates data quality issues. Review pay and hours data immediately.',
              actionRequired: true
            });
            break;

          case 'excessive_deductions':
            suggestions.push({
              type: 'DEDUCTION_REVIEW',
              severity: 'HIGH',
              message: 'Deductions exceed 50% of pay. Review deduction legitimacy and NMW compliance rules.',
              actionRequired: true
            });
            break;

          case 'accommodation_offset_violations':
            suggestions.push({
              type: 'ACCOMMODATION_REVIEW',
              severity: 'HIGH',
              message: 'Accommodation charges exceed legal limits. Review offset calculations and daily limits.',
              actionRequired: true
            });
            break;

          default:
            suggestions.push({
              type: 'MANUAL_REVIEW',
              severity: 'MEDIUM',
              message: `Manual review required for compliance flag: ${flag.replace(/_/g, ' ')}.`,
              actionRequired: true
            });
        }
      }
    }

    // General amber suggestion
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'MANUAL_REVIEW',
        severity: 'MEDIUM',
        message: ragResult.reason || 'Manual review required to determine compliance status.',
        actionRequired: true
      });
    }

    return suggestions;
  }

  /**
   * Generate suggestions for GREEN status (compliant) workers
   * @param {Object} ragResult - RAG status result
   * @param {Object} calculatedData - Calculated compliance data
   * @returns {Array} GREEN status suggestions
   */
  generateGreenStatusSuggestions(ragResult, calculatedData) {
    const suggestions = [];
    const effectiveRate = ragResult.effectiveHourlyRate;
    const requiredRate = ragResult.requiredHourlyRate;

    // Calculate cushion above minimum wage
    const cushion = effectiveRate - requiredRate;
    const cushionPercentage = (cushion / requiredRate) * 100;

    if (cushionPercentage < 5) {
      suggestions.push({
        type: 'LOW_MARGIN',
        severity: 'LOW',
        message: `Pay is compliant but only £${cushion.toFixed(2)}/hour above minimum wage. Consider buffer for rate changes.`,
        actionRequired: false
      });
    }

    suggestions.push({
      type: 'COMPLIANCE_CONFIRMED',
      severity: 'INFO',
      message: `Compliant: £${effectiveRate.toFixed(2)}/hour meets minimum wage requirement of £${requiredRate.toFixed(2)}/hour.`,
      actionRequired: false,
      details: {
        cushionAmount: cushion,
        cushionPercentage: cushionPercentage
      }
    });

    return suggestions;
  }

  /**
   * Calculate shortfall amounts and percentages
   * @param {number} effectiveRate - Worker's effective hourly rate
   * @param {number} requiredRate - Required NMW/NLW rate
   * @param {number} hoursWorked - Total hours worked
   * @returns {Object} Shortfall calculations
   */
  calculateShortfall(effectiveRate, requiredRate, hoursWorked) {
    const perHourShortfall = Math.max(0, requiredRate - effectiveRate);
    const totalShortfall = perHourShortfall * hoursWorked;
    const shortfallPercentage = effectiveRate > 0 ? ((perHourShortfall / requiredRate) * 100) : 100;

    return {
      perHourShortfall: perHourShortfall,
      totalShortfall: totalShortfall,
      shortfallPercentage: shortfallPercentage,
      hoursWorked: hoursWorked,
      effectiveRate: effectiveRate,
      requiredRate: requiredRate
    };
  }

  /**
   * Format the primary suggestion message for RED status
   * @param {number} effectiveRate - Worker's effective hourly rate
   * @param {number} requiredRate - Required NMW/NLW rate
   * @param {number} perHourShortfall - Shortfall per hour
   * @param {number} totalShortfall - Total shortfall amount
   * @returns {string} Formatted suggestion message
   */
  formatPrimarySuggestion(effectiveRate, requiredRate, perHourShortfall, totalShortfall) {
    const effectiveFormatted = this.formatCurrency(effectiveRate);
    const requiredFormatted = this.formatCurrency(requiredRate);
    const shortfallFormatted = this.formatCurrency(perHourShortfall);
    const totalFormatted = this.formatCurrency(totalShortfall);

    return `Effective rate is ${effectiveFormatted}, which is ${shortfallFormatted} below the required ${requiredFormatted}. Suggestion: Add arrears top-up of ${totalFormatted}.`;
  }

  /**
   * Format currency values consistently
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount) {
    return `${this.CURRENCY_SYMBOL}${amount.toFixed(this.DECIMAL_PLACES)}`;
  }

  /**
   * Validate inputs for fix suggestion generation
   * @param {Object} worker - Worker information
   * @param {Object} payPeriod - Pay period information
   * @param {Object} ragResult - RAG status result
   * @param {Object} calculatedData - Calculated compliance data
   * @returns {Object} Validation result
   */
  validateInputs(worker, payPeriod, ragResult, calculatedData) {
    const errors = [];

    if (!worker) {
      errors.push('Worker information is required');
    }

    if (!payPeriod) {
      errors.push('Pay period information is required');
    }

    if (!ragResult) {
      errors.push('RAG status result is required');
    } else {
      if (!ragResult.ragStatus) {
        errors.push('RAG status is required');
      }
    }

    if (!calculatedData) {
      errors.push('Calculated compliance data is required');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Generate bulk fix suggestions for multiple workers
   * @param {Array} workerResults - Array of worker data with RAG results
   * @returns {Object} Bulk fix suggestions result
   */
  generateBulkFixSuggestions(workerResults) {
    console.log(`🔄 Generating bulk fix suggestions for ${workerResults.length} workers`);

    const results = [];
    const summary = {
      total: workerResults.length,
      withSuggestions: 0,
      actionRequired: 0,
      totalShortfall: 0,
      criticalIssues: 0
    };

    for (const workerData of workerResults) {
      try {
        const result = this.generateFixSuggestions(
          workerData.worker,
          workerData.payPeriod,
          workerData.ragResult,
          workerData.calculatedData
        );

        if (result.success) {
          results.push(result);
          
          if (result.suggestions.length > 0) {
            summary.withSuggestions++;
          }

          // Check for action required
          const hasActionRequired = result.suggestions.some(s => s.actionRequired);
          if (hasActionRequired) {
            summary.actionRequired++;
          }

          // Check for critical issues
          const hasCritical = result.suggestions.some(s => s.severity === 'CRITICAL');
          if (hasCritical) {
            summary.criticalIssues++;
          }

          // Sum shortfalls
          if (result.calculations && result.calculations.totalShortfall) {
            summary.totalShortfall += result.calculations.totalShortfall;
          }
        } else {
          results.push(result);
        }

      } catch (error) {
        const workerId = workerData.worker?.worker_id || workerData.worker?.id || 'unknown';
        console.error(`❌ Failed to generate fix suggestions for worker ${workerId}:`, error);
        results.push({
          success: false,
          error: 'Fix suggestion generation failed',
          workerId: workerId
        });
      }
    }

    console.log(`✅ Bulk fix suggestion generation completed: ${summary.withSuggestions}/${summary.total} with suggestions`);

    return {
      success: true,
      results: results,
      summary: summary
    };
  }
}

module.exports = FixSuggestionService;
