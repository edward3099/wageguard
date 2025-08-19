/**
 * NMW/NLW Rate Lookup Service
 * Provides accurate National Minimum Wage and National Living Wage rates
 * based on worker age, apprentice status, and pay period dates
 */

const path = require('path');
const fs = require('fs').promises;

class NMWRateLookupService {
  constructor() {
    this.rates = null;
    this.lastModified = null;
    this.configPath = path.join(__dirname, '../config/nmw-rates.json');
  }

  /**
   * Get the required hourly rate for a worker
   * @param {number} age - Worker's age during the pay period
   * @param {Date|string} payPeriodDate - Date within the pay period (usually end date)
   * @param {boolean} isApprentice - Whether the worker is an apprentice
   * @param {Date|string} apprenticeshipStartDate - When apprenticeship started (if applicable)
   * @returns {Promise<Object>} Rate information
   */
  async getRequiredRate(age, payPeriodDate, isApprentice = false, apprenticeshipStartDate = null) {
    try {
      console.log(`🔍 Looking up NMW rate for age ${age}, date ${payPeriodDate}, apprentice: ${isApprentice}`);

      // Validate inputs
      const validation = this.validateInputs(age, payPeriodDate);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Input validation failed',
          details: validation.errors
        };
      }

      // Load rates configuration
      await this.loadRates();

      // Find the applicable rate period
      const ratePeriod = this.findApplicableRatePeriod(payPeriodDate);
      if (!ratePeriod) {
        return {
          success: false,
          error: 'No applicable rate period found',
          date: payPeriodDate
        };
      }

      // Determine the correct rate based on age and apprentice status
      const rateInfo = this.determineApplicableRate(age, isApprentice, apprenticeshipStartDate, ratePeriod, payPeriodDate);

      console.log(`✅ Found rate: £${rateInfo.hourlyRate} (${rateInfo.description})`);

      return {
        success: true,
        ...rateInfo,
        ratePeriod: {
          effectiveFrom: ratePeriod.effectiveFrom,
          effectiveTo: ratePeriod.effectiveTo,
          description: ratePeriod.description
        }
      };

    } catch (error) {
      console.error('❌ Failed to lookup NMW rate:', error);
      return {
        success: false,
        error: 'Rate lookup failed',
        message: error.message
      };
    }
  }

  /**
   * Validate input parameters
   * @param {number} age - Worker's age
   * @param {Date|string} payPeriodDate - Pay period date
   * @returns {Object} Validation result
   */
  validateInputs(age, payPeriodDate) {
    const errors = [];

    // Validate age
    if (age === null || age === undefined) {
      errors.push('Age is required');
    } else if (typeof age !== 'number' || age < 0 || age > 150) {
      errors.push('Age must be a valid number between 0 and 150');
    } else if (age < 16) {
      errors.push('Workers under 16 are not covered by NMW legislation');
    }

    // Validate pay period date
    if (!payPeriodDate) {
      errors.push('Pay period date is required');
    } else {
      const date = new Date(payPeriodDate);
      if (isNaN(date.getTime())) {
        errors.push('Pay period date must be a valid date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Load NMW rates from configuration file
   * @returns {Promise<Object>} Rates configuration
   */
  async loadRates() {
    try {
      // Check if file exists and get modification time
      const stats = await fs.stat(this.configPath);
      
      // Only reload if file has been modified or rates not loaded
      if (!this.rates || !this.lastModified || stats.mtime > this.lastModified) {
        const configData = await fs.readFile(this.configPath, 'utf8');
        this.rates = JSON.parse(configData);
        this.lastModified = stats.mtime;
        console.log('✅ NMW rates configuration loaded successfully');
      }
      
      return this.rates;
    } catch (error) {
      console.error('❌ Failed to load NMW rates configuration:', error);
      throw new Error(`Failed to load NMW rates: ${error.message}`);
    }
  }

  /**
   * Find the applicable rate period for a given date
   * @param {Date|string} payPeriodDate - Pay period date
   * @returns {Object|null} Applicable rate period or null
   */
  findApplicableRatePeriod(payPeriodDate) {
    const checkDate = new Date(payPeriodDate);
    
    // Sort rates by effective date (newest first)
    const sortedRates = [...this.rates.rates].sort((a, b) => 
      new Date(b.effectiveFrom) - new Date(a.effectiveFrom)
    );

    for (const ratePeriod of sortedRates) {
      const effectiveFrom = new Date(ratePeriod.effectiveFrom);
      const effectiveTo = ratePeriod.effectiveTo ? new Date(ratePeriod.effectiveTo) : null;

      // Check if the pay period date falls within this rate period
      if (checkDate >= effectiveFrom && (!effectiveTo || checkDate <= effectiveTo)) {
        return ratePeriod;
      }
    }

    return null;
  }

  /**
   * Determine the applicable rate based on age and apprentice status
   * @param {number} age - Worker's age
   * @param {boolean} isApprentice - Whether worker is an apprentice
   * @param {Date|string} apprenticeshipStartDate - When apprenticeship started
   * @param {Object} ratePeriod - The applicable rate period
   * @param {Date|string} payPeriodDate - Pay period date for reference
   * @returns {Object} Rate information
   */
  determineApplicableRate(age, isApprentice, apprenticeshipStartDate, ratePeriod, payPeriodDate = new Date()) {
    // Handle apprentice rate first
    if (isApprentice) {
      const apprenticeRateInfo = this.checkApprenticeEligibility(age, apprenticeshipStartDate, payPeriodDate);
      if (apprenticeRateInfo.isEligible) {
        const apprenticeRate = ratePeriod.rates.apprentice;
        return {
          hourlyRate: apprenticeRate.hourlyRate,
          description: apprenticeRate.description,
          category: apprenticeRate.category,
          rateType: 'apprentice',
          reason: apprenticeRateInfo.reason
        };
      }
    }

    // Find age-based rate
    for (const [rateKey, rateData] of Object.entries(ratePeriod.rates)) {
      if (rateKey === 'apprentice') continue; // Skip apprentice rate
      
      if (this.isAgeInRange(age, rateData.minAge, rateData.maxAge)) {
        return {
          hourlyRate: rateData.hourlyRate,
          description: rateData.description,
          category: rateData.category,
          rateType: rateKey,
          reason: `Age ${age} falls within ${rateData.description} band`
        };
      }
    }

    // Fallback - should not reach here with valid data
    throw new Error(`No applicable rate found for age ${age}`);
  }

  /**
   * Check if worker is eligible for apprentice rate
   * @param {number} age - Worker's age
   * @param {Date|string} apprenticeshipStartDate - When apprenticeship started
   * @param {Date|string} payPeriodDate - Pay period date for reference
   * @returns {Object} Eligibility information
   */
  checkApprenticeEligibility(age, apprenticeshipStartDate, payPeriodDate = new Date()) {
    // Rule 1: Under 19 years of age
    if (age < 19) {
      return {
        isEligible: true,
        reason: 'Apprentice under 19 years of age'
      };
    }

    // Rule 2: Aged 19 or over and in the first year of apprenticeship
    if (age >= 19 && apprenticeshipStartDate) {
      const startDate = new Date(apprenticeshipStartDate);
      const oneYearLater = new Date(startDate);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      
      const referenceDate = new Date(payPeriodDate);
      if (referenceDate <= oneYearLater) {
        return {
          isEligible: true,
          reason: 'Apprentice aged 19+ in first year of apprenticeship'
        };
      } else {
        return {
          isEligible: false,
          reason: 'Apprentice aged 19+ has completed first year, age-based rate applies'
        };
      }
    }

    return {
      isEligible: false,
      reason: 'Does not meet apprentice rate criteria, age-based rate applies'
    };
  }

  /**
   * Check if age falls within a specified range
   * @param {number} age - Worker's age
   * @param {number|null} minAge - Minimum age (inclusive)
   * @param {number|null} maxAge - Maximum age (inclusive)
   * @returns {boolean} Whether age is in range
   */
  isAgeInRange(age, minAge, maxAge) {
    if (minAge !== null && age < minAge) return false;
    if (maxAge !== null && age > maxAge) return false;
    return true;
  }

  /**
   * Get all available rates for a specific date
   * @param {Date|string} payPeriodDate - Pay period date
   * @returns {Promise<Object>} All rates for the date
   */
  async getAllRatesForDate(payPeriodDate) {
    try {
      await this.loadRates();
      const ratePeriod = this.findApplicableRatePeriod(payPeriodDate);
      
      if (!ratePeriod) {
        return {
          success: false,
          error: 'No applicable rate period found',
          date: payPeriodDate
        };
      }

      return {
        success: true,
        date: payPeriodDate,
        ratePeriod: {
          effectiveFrom: ratePeriod.effectiveFrom,
          effectiveTo: ratePeriod.effectiveTo,
          description: ratePeriod.description
        },
        rates: ratePeriod.rates
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get rates',
        message: error.message
      };
    }
  }

  /**
   * Get accommodation offset limit for a date
   * @param {Date|string} payPeriodDate - Pay period date
   * @returns {Promise<Object>} Accommodation offset information
   */
  async getAccommodationOffset(payPeriodDate) {
    try {
      await this.loadRates();
      
      // For now, return the current offset (could be extended to support historical values)
      const accommodationOffset = this.rates.accommodationOffset;
      
      return {
        success: true,
        date: payPeriodDate,
        dailyLimit: accommodationOffset.dailyLimit,
        effectiveFrom: accommodationOffset.effectiveFrom,
        description: accommodationOffset.description
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get accommodation offset',
        message: error.message
      };
    }
  }

  /**
   * Calculate age on a specific date
   * @param {Date|string} dateOfBirth - Worker's date of birth
   * @param {Date|string} referenceDate - Date to calculate age at
   * @returns {number} Age in years
   */
  calculateAge(dateOfBirth, referenceDate) {
    const birth = new Date(dateOfBirth);
    const reference = new Date(referenceDate);
    
    let age = reference.getFullYear() - birth.getFullYear();
    const monthDiff = reference.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Bulk rate lookup for multiple workers
   * @param {Array} workers - Array of worker data with age, isApprentice, etc.
   * @param {Date|string} payPeriodDate - Pay period date
   * @returns {Promise<Array>} Array of rate lookup results
   */
  async bulkRateLookup(workers, payPeriodDate) {
    const results = [];
    
    try {
      console.log(`🔄 Performing bulk rate lookup for ${workers.length} workers`);

      for (const worker of workers) {
        const result = await this.getRequiredRate(
          worker.age,
          payPeriodDate,
          worker.isApprentice || false,
          worker.apprenticeshipStartDate || null
        );

        results.push({
          workerId: worker.id || worker.worker_id,
          ...result
        });
      }

      console.log(`✅ Bulk rate lookup completed for ${workers.length} workers`);
      return results;

    } catch (error) {
      console.error('❌ Bulk rate lookup failed:', error);
      throw error;
    }
  }

  /**
   * Get rate history for audit purposes
   * @returns {Promise<Array>} Array of all rate periods
   */
  async getRateHistory() {
    try {
      await this.loadRates();
      
      return {
        success: true,
        history: this.rates.rates.map(period => ({
          effectiveFrom: period.effectiveFrom,
          effectiveTo: period.effectiveTo,
          description: period.description,
          rateCount: Object.keys(period.rates).length
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get rate history',
        message: error.message
      };
    }
  }
}

module.exports = NMWRateLookupService;
