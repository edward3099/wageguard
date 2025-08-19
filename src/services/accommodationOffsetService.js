const ratesConfig = require('../config/rates');

/**
 * Accommodation Offset Service for WageGuard
 * Handles calculation of accommodation offsets that can be legally counted towards NMW/NLW pay
 */
class AccommodationOffsetService {
  constructor() {
    this.ratesConfig = ratesConfig;
  }

  /**
   * Calculate the permissible accommodation offset for a worker's pay period
   * @param {Object} worker - Worker data
   * @param {Object} payPeriod - Pay period data
   * @param {Object} accommodationData - Accommodation charge data
   * @returns {Object} Accommodation offset calculation result
   */
  async calculateAccommodationOffset(worker, payPeriod, accommodationData) {
    try {
      // Validate inputs first
      const validation = this.validateAccommodationInputs(worker, payPeriod, accommodationData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          worker_id: worker?.worker_id || 'unknown',
          pay_period_id: payPeriod?.id || 'unknown'
        };
      }

      // Load current accommodation rates
      const accommodationRates = await this.ratesConfig.getCategoryRates('accommodation');
      const dailyLimit = accommodationRates.dailyLimit;

      // Calculate PRP dates
      const prpDates = this.calculatePRPDates(payPeriod.period_start, payPeriod.period_end);
      
      // Calculate accommodation offset values
      const offsetValues = this.calculateOffsetValues(accommodationData, prpDates, dailyLimit);
      
      // Determine compliance status
      const complianceStatus = this.determineComplianceStatus(offsetValues, dailyLimit);
      
      // Generate detailed breakdown
      const breakdown = this.generateBreakdown(offsetValues, dailyLimit, prpDates);
      
      return {
        success: true,
        worker_id: worker.worker_id,
        worker_name: worker.worker_name,
        pay_period_id: payPeriod.id,
        period_start: payPeriod.period_start,
        period_end: payPeriod.period_end,
        daily_limit: dailyLimit,
        total_charge: accommodationData.total_charge || 0,
        total_offset: offsetValues.totalOffset,
        total_excess: offsetValues.totalExcess,
        compliant_days: offsetValues.compliantDays,
        non_compliant_days: offsetValues.nonCompliantDays,
        compliance_status: complianceStatus.status,
        compliance_score: complianceStatus.score,
        breakdown: breakdown,
        calculation_date: new Date().toISOString(),
        rates_source: accommodationRates.source,
        rates_last_updated: accommodationRates.lastUpdated
      };
      
    } catch (error) {
      console.error('❌ Accommodation offset calculation failed:', error);
      return {
        success: false,
        error: error.message,
        worker_id: worker.worker_id,
        pay_period_id: payPeriod.id
      };
    }
  }

  /**
   * Validate accommodation calculation inputs
   * @param {Object} worker - Worker data
   * @param {Object} payPeriod - Pay period data
   * @param {Object} accommodationData - Accommodation charge data
   * @returns {Object} Validation result
   */
  validateAccommodationInputs(worker, payPeriod, accommodationData) {
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

    // Validate accommodation data
    if (!accommodationData) {
      errors.push('Accommodation data is required');
    } else {
      if (typeof accommodationData.total_charge !== 'number' || accommodationData.total_charge < 0) {
        errors.push('Accommodation total charge must be a non-negative number');
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.join('; ')
    };
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
    
    // Calculate actual accommodation days (if accommodation is provided daily)
    const accommodationDays = totalDays; // Default to total days, can be overridden
    
    return {
      start: start,
      end: end,
      totalDays: totalDays,
      workingDays: workingDays,
      accommodationDays: accommodationDays,
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
   * Calculate accommodation offset values for the pay period
   * @param {Object} accommodationData - Accommodation charge data
   * @param {Object} prpDates - PRP date information
   * @param {number} dailyLimit - Daily accommodation offset limit
   * @returns {Object} Offset calculation values
   */
  calculateOffsetValues(accommodationData, prpDates, dailyLimit) {
    const totalCharge = accommodationData.total_charge || 0;
    const totalDays = prpDates.accommodationDays;
    
    // Calculate daily charge
    const dailyCharge = totalDays > 0 ? totalCharge / totalDays : 0;
    
    // Calculate permissible daily offset (capped at daily limit)
    const permissibleDailyOffset = Math.min(dailyCharge, dailyLimit);
    
    // Calculate total permissible offset for the period
    const totalOffset = permissibleDailyOffset * totalDays;
    
    // Calculate excess charge (amount above daily limit)
    const dailyExcess = Math.max(0, dailyCharge - dailyLimit);
    const totalExcess = dailyExcess * totalDays;
    
    // Count compliant and non-compliant days
    let compliantDays = 0;
    let nonCompliantDays = 0;
    
    if (dailyCharge <= dailyLimit) {
      compliantDays = totalDays;
      nonCompliantDays = 0;
    } else {
      // Calculate how many days can be covered by the daily limit
      const daysCoveredByLimit = Math.floor(totalCharge / dailyLimit);
      compliantDays = Math.min(daysCoveredByLimit, totalDays);
      nonCompliantDays = totalDays - compliantDays;
    }
    
    return {
      totalCharge: totalCharge,
      totalDays: totalDays,
      dailyCharge: dailyCharge,
      dailyLimit: dailyLimit,
      permissibleDailyOffset: permissibleDailyOffset,
      totalOffset: totalOffset,
      dailyExcess: dailyExcess,
      totalExcess: totalExcess,
      compliantDays: compliantDays,
      nonCompliantDays: nonCompliantDays
    };
  }

  /**
   * Determine compliance status for accommodation offset
   * @param {Object} offsetValues - Calculated offset values
   * @param {number} dailyLimit - Daily accommodation offset limit
   * @returns {Object} Compliance status
   */
  determineComplianceStatus(offsetValues, dailyLimit) {
    const { dailyCharge, totalExcess, compliantDays, totalDays } = offsetValues;
    
    // Calculate compliance percentage
    const compliancePercentage = totalDays > 0 ? (compliantDays / totalDays) * 100 : 100;
    
    // Determine RAG status
    let status = 'green';
    let score = 100;
    
    if (dailyCharge > dailyLimit) {
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
      dailyLimit: dailyLimit,
      dailyCharge: dailyCharge,
      excess: totalExcess
    };
  }

  /**
   * Generate detailed breakdown of accommodation offset calculation
   * @param {Object} offsetValues - Calculated offset values
   * @param {number} dailyLimit - Daily accommodation offset limit
   * @param {Object} prpDates - PRP date information
   * @returns {Object} Detailed breakdown
   */
  generateBreakdown(offsetValues, dailyLimit, prpDates) {
    const {
      totalCharge,
      totalDays,
      dailyCharge,
      permissibleDailyOffset,
      totalOffset,
      dailyExcess,
      totalExcess,
      compliantDays,
      nonCompliantDays
    } = offsetValues;

    return {
      period: {
        start: prpDates.start.toISOString().split('T')[0],
        end: prpDates.end.toISOString().split('T')[0],
        totalDays: totalDays,
        workingDays: prpDates.workingDays
      },
      charges: {
        total: totalCharge,
        daily: dailyCharge,
        breakdown: {
          compliant: {
            days: compliantDays,
            dailyRate: Math.min(dailyCharge, dailyLimit),
            total: totalOffset
          },
          nonCompliant: {
            days: nonCompliantDays,
            dailyRate: dailyCharge,
            dailyExcess: dailyExcess,
            totalExcess: totalExcess
          }
        }
      },
      limits: {
        dailyLimit: dailyLimit,
        periodLimit: dailyLimit * totalDays,
        appliedLimit: totalOffset
      },
      compliance: {
        compliantDays: compliantDays,
        nonCompliantDays: nonCompliantDays,
        complianceRate: totalDays > 0 ? (compliantDays / totalDays) * 100 : 100
      }
    };
  }

  /**
   * Calculate accommodation offsets for multiple workers in bulk
   * @param {Array} workers - Array of worker data
   * @param {Array} payPeriods - Array of pay period data
   * @param {Array} accommodationData - Array of accommodation charge data
   * @returns {Array} Array of accommodation offset calculation results
   */
  async calculateBulkAccommodationOffsets(workers, payPeriods, accommodationData) {
    const results = [];
    
    for (const worker of workers) {
      const workerPayPeriods = payPeriods.filter(pp => pp.worker_id === worker.worker_id);
      const workerAccommodation = accommodationData.filter(acc => acc.worker_id === worker.worker_id);
      
      for (const payPeriod of workerPayPeriods) {
        const accommodation = workerAccommodation.find(acc => 
          acc.pay_period_id === payPeriod.id
        ) || { total_charge: 0 };
        
        const result = await this.calculateAccommodationOffset(worker, payPeriod, accommodation);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Get accommodation offset summary for reporting
   * @param {Array} offsetResults - Array of accommodation offset calculation results
   * @returns {Object} Summary statistics
   */
  getAccommodationOffsetSummary(offsetResults) {
    const successfulResults = offsetResults.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        totalWorkers: 0,
        totalOffset: 0,
        totalExcess: 0,
        complianceBreakdown: { green: 0, amber: 0, red: 0 },
        averageComplianceScore: 0
      };
    }
    
    const totalOffset = successfulResults.reduce((sum, r) => sum + r.total_offset, 0);
    const totalExcess = successfulResults.reduce((sum, r) => sum + r.total_excess, 0);
    
    const complianceBreakdown = successfulResults.reduce((acc, r) => {
      acc[r.compliance_status] = (acc[r.compliance_status] || 0) + 1;
      return acc;
    }, {});
    
    const averageComplianceScore = successfulResults.reduce((sum, r) => sum + r.compliance_score, 0) / successfulResults.length;
    
    return {
      totalWorkers: successfulResults.length,
      totalOffset: totalOffset,
      totalExcess: totalExcess,
      complianceBreakdown: complianceBreakdown,
      averageComplianceScore: Math.round(averageComplianceScore * 100) / 100
    };
  }
}

module.exports = AccommodationOffsetService;
