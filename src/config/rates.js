/**
 * Configuration module for UK NMW/NLW deduction and offset rates
 * This module provides centralized access to legal rates and limits
 * that affect minimum wage calculations.
 */

const path = require('path');
const fs = require('fs').promises;

class RatesConfig {
  constructor() {
    this.rates = null;
    this.lastModified = null;
    this.configPath = path.join(__dirname, 'rates.json');
  }

  /**
   * Load rates from configuration file
   * @returns {Object} Rates configuration object
   */
  async loadRates() {
    try {
      const stats = await fs.stat(this.configPath);
      
      // Check if file has been modified since last load
      if (this.rates && this.lastModified && stats.mtime <= this.lastModified) {
        return this.rates;
      }

      const data = await fs.readFile(this.configPath, 'utf8');
      this.rates = JSON.parse(data);
      this.lastModified = stats.mtime;
      
      console.log('✅ Rates configuration loaded successfully');
      return this.rates;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create default configuration
        await this.createDefaultRates();
        return this.rates;
      }
      throw new Error(`Failed to load rates configuration: ${error.message}`);
    }
  }

  /**
   * Create default rates configuration file
   */
  async createDefaultRates() {
    const defaultRates = {
      // Accommodation offset rates (daily limits)
      accommodation: {
        dailyLimit: 9.99,
        description: "Maximum daily accommodation offset for NMW calculations",
        source: "GOV.UK NMW accommodation offset rules",
        lastUpdated: new Date().toISOString()
      },
      
      // Uniform and workwear deductions
      uniform: {
        maxDeduction: 0,
        description: "Uniform costs cannot reduce pay below NMW",
        source: "GOV.UK NMW uniform deduction rules",
        lastUpdated: new Date().toISOString()
      },
      
      // Meals and subsistence
      meals: {
        maxDeduction: 0,
        description: "Meal costs cannot reduce pay below NMW",
        source: "GOV.UK NMW meal deduction rules",
        lastUpdated: new Date().toISOString()
      },
      
      // Tools and equipment
      tools: {
        maxDeduction: 0,
        description: "Tool costs cannot reduce pay below NMW",
        source: "GOV.UK NMW tool deduction rules",
        lastUpdated: new Date().toISOString()
      },
      
      // Training and certification
      training: {
        maxDeduction: 0,
        description: "Training costs cannot reduce pay below NMW",
        source: "GOV.UK NMW training deduction rules",
        lastUpdated: new Date().toISOString()
      },
      
      // Other deductions
      other: {
        maxDeduction: 0,
        description: "Other deductions cannot reduce pay below NMW",
        source: "GOV.UK NMW general deduction rules",
        lastUpdated: new Date().toISOString()
      },
      
      // Metadata
      metadata: {
        version: "1.0.0",
        description: "UK NMW/NLW deduction and offset rates configuration",
        source: "GOV.UK National Minimum Wage and National Living Wage guidance",
        lastUpdated: new Date().toISOString(),
        notes: "Rates are based on current UK legislation and should be updated when rates change"
      }
    };

    try {
      await fs.writeFile(this.configPath, JSON.stringify(defaultRates, null, 2));
      this.rates = defaultRates;
      this.lastModified = new Date();
      console.log('✅ Default rates configuration created');
      return defaultRates;
    } catch (error) {
      throw new Error(`Failed to create default rates configuration: ${error.message}`);
    }
  }

  /**
   * Get a specific rate value
   * @param {string} category - Rate category (e.g., 'accommodation')
   * @param {string} field - Field name (e.g., 'dailyLimit')
   * @returns {*} Rate value
   */
  async getRate(category, field) {
    const rates = await this.loadRates();
    
    if (!rates[category]) {
      throw new Error(`Unknown rate category: ${category}`);
    }
    
    if (!rates[category][field]) {
      throw new Error(`Unknown field '${field}' in category '${category}'`);
    }
    
    return rates[category][field];
  }

  /**
   * Get all rates for a category
   * @param {string} category - Rate category
   * @returns {Object} Category rates
   */
  async getCategoryRates(category) {
    const rates = await this.loadRates();
    
    if (!rates[category]) {
      throw new Error(`Unknown rate category: ${category}`);
    }
    
    return rates[category];
  }

  /**
   * Get all rates
   * @returns {Object} All rates configuration
   */
  async getAllRates() {
    return await this.loadRates();
  }

  /**
   * Update a specific rate value
   * @param {string} category - Rate category
   * @param {string} field - Field name
   * @param {*} value - New value
   */
  async updateRate(category, field, value) {
    const rates = await this.loadRates();
    
    if (!rates[category]) {
      throw new Error(`Unknown rate category: ${category}`);
    }
    
    if (!rates[category][field]) {
      throw new Error(`Unknown field '${field}' in category '${category}'`);
    }
    
    // Update the rate
    rates[category][field] = value;
    rates[category].lastUpdated = new Date().toISOString();
    rates.metadata.lastUpdated = new Date().toISOString();
    
    // Save to file
    await fs.writeFile(this.configPath, JSON.stringify(rates, null, 2));
    
    // Update local cache
    this.rates = rates;
    this.lastModified = new Date();
    
    console.log(`✅ Updated rate: ${category}.${field} = ${value}`);
  }

  /**
   * Validate rates configuration
   * @returns {Object} Validation result
   */
  async validateRates() {
    try {
      const rates = await this.loadRates();
      const errors = [];
      const warnings = [];

      // Check required categories
      const requiredCategories = ['accommodation', 'uniform', 'meals', 'tools', 'training', 'other'];
      for (const category of requiredCategories) {
        if (!rates[category]) {
          errors.push(`Missing required category: ${category}`);
        }
      }

      // Check accommodation rates
      if (rates.accommodation) {
        if (typeof rates.accommodation.dailyLimit !== 'number' || rates.accommodation.dailyLimit < 0) {
          errors.push('Accommodation daily limit must be a non-negative number');
        }
        if (rates.accommodation.dailyLimit > 20) {
          warnings.push('Accommodation daily limit seems unusually high');
        }
      }

      // Check deduction rates
      const deductionCategories = ['uniform', 'meals', 'tools', 'training', 'other'];
      for (const category of deductionCategories) {
        if (rates[category] && typeof rates[category].maxDeduction !== 'number') {
          errors.push(`${category} maxDeduction must be a number`);
        }
      }

      // Check metadata
      if (!rates.metadata || !rates.metadata.version) {
        warnings.push('Missing or incomplete metadata');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Reload rates from file (force refresh)
   */
  async reloadRates() {
    this.rates = null;
    this.lastModified = null;
    return await this.loadRates();
  }
}

// Create singleton instance
const ratesConfig = new RatesConfig();

module.exports = ratesConfig;
