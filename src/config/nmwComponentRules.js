/**
 * NMW Component Rules Configuration Module
 * Manages the rules for determining which pay components count towards NMW calculations
 */

const path = require('path');
const fs = require('fs').promises;

class NMWComponentRules {
  constructor() {
    this.rules = null;
    this.lastModified = null;
    this.configPath = path.join(__dirname, 'nmw-components.json');
  }

  /**
   * Load NMW component rules from configuration file
   * @returns {Object} NMW component rules configuration
   */
  async loadRules() {
    try {
      // Check if file exists and get modification time
      const stats = await fs.stat(this.configPath);
      
      // Only reload if file has been modified or rules not loaded
      if (!this.rules || !this.lastModified || stats.mtime > this.lastModified) {
        const configData = await fs.readFile(this.configPath, 'utf8');
        this.rules = JSON.parse(configData);
        this.lastModified = stats.mtime;
        console.log('✅ NMW component rules loaded successfully');
      }
      
      return this.rules;
    } catch (error) {
      console.error('❌ Failed to load NMW component rules:', error);
      
      // Create default rules if file doesn't exist
      if (error.code === 'ENOENT') {
        console.log('📝 Creating default NMW component rules...');
        return await this.createDefaultRules();
      }
      
      throw new Error(`Failed to load NMW component rules: ${error.message}`);
    }
  }

  /**
   * Get all NMW component rules
   * @returns {Object} All component rules
   */
  async getAllRules() {
    const rules = await this.loadRules();
    return rules;
  }

  /**
   * Get rules for a specific component category
   * @param {string} category - The category of component (e.g., 'allowances', 'premiums')
   * @returns {Object} Rules for the specified category
   */
  async getCategoryRules(category) {
    const rules = await this.loadRules();
    return rules.payComponents[category] || null;
  }

  /**
   * Get classification for a specific pay component
   * @param {string} componentName - Name of the pay component
   * @returns {Object} Classification details for the component
   */
  async classifyComponent(componentName) {
    const rules = await this.loadRules();
    const normalizedName = componentName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Search through all categories and their keywords
    for (const [categoryKey, categoryData] of Object.entries(rules.payComponents)) {
      const result = this.searchCategory(categoryData, normalizedName, categoryKey);
      if (result) {
        return result;
      }
    }
    
    // If no match found, return unclassified
    return {
      category: 'unclassified',
      treatment: 'requires_manual_review',
      confidence: 'none',
      description: `Component '${componentName}' requires manual classification`,
      originalName: componentName
    };
  }

  /**
   * Search a category for matching keywords
   * @param {Object} categoryData - Category data to search
   * @param {string} normalizedName - Normalized component name
   * @param {string} categoryKey - Category key for context
   * @returns {Object|null} Match result or null
   */
  searchCategory(categoryData, normalizedName, categoryKey) {
    // Handle direct category data (like basicPay)
    if (categoryData.keywords) {
      return this.checkKeywordMatch(categoryData, normalizedName, categoryKey);
    }
    
    // Handle nested categories (like allowances.general, allowances.expenses)
    for (const [subKey, subData] of Object.entries(categoryData)) {
      if (subData.keywords) {
        const result = this.checkKeywordMatch(subData, normalizedName, `${categoryKey}.${subKey}`);
        if (result) {
          return result;
        }
      }
    }
    
    return null;
  }

  /**
   * Check if component name matches category keywords
   * @param {Object} categoryData - Category data with keywords
   * @param {string} normalizedName - Normalized component name
   * @param {string} categoryPath - Full category path
   * @returns {Object|null} Match result or null
   */
  checkKeywordMatch(categoryData, normalizedName, categoryPath) {
    for (const keyword of categoryData.keywords) {
      if (normalizedName.includes(keyword) || keyword.includes(normalizedName)) {
        return {
          category: categoryData.category,
          treatment: categoryData.treatment,
          confidence: this.calculateConfidence(keyword, normalizedName),
          description: categoryData.description,
          categoryPath: categoryPath,
          matchedKeyword: keyword,
          calculation: categoryData.calculation,
          rules: categoryData.rules,
          warning: categoryData.warning,
          dailyLimit: categoryData.dailyLimit,
          originalName: normalizedName
        };
      }
    }
    return null;
  }

  /**
   * Calculate confidence level for keyword match
   * @param {string} keyword - Matched keyword
   * @param {string} componentName - Component name
   * @returns {string} Confidence level
   */
  calculateConfidence(keyword, componentName) {
    if (keyword === componentName) return 'high';
    if (componentName.includes(keyword) && keyword.length > 4) return 'high';
    if (keyword.includes(componentName) && componentName.length > 4) return 'medium';
    return 'medium';
  }

  /**
   * Get mapping priority for LLM processing
   * @returns {Object} Priority mapping for different component types
   */
  async getMappingPriority() {
    const rules = await this.loadRules();
    return rules.mappingPriority || {};
  }

  /**
   * Get calculation rules and order
   * @returns {Object} Calculation rules and processing order
   */
  async getCalculationRules() {
    const rules = await this.loadRules();
    return rules.calculationRules || {};
  }

  /**
   * Validate component classification results
   * @param {Array} classifications - Array of component classifications
   * @returns {Object} Validation result with warnings and errors
   */
  validateClassifications(classifications) {
    const warnings = [];
    const errors = [];
    const unclassified = [];
    
    for (const classification of classifications) {
      if (classification.category === 'unclassified') {
        unclassified.push(classification.originalName);
      }
      
      if (classification.confidence === 'low') {
        warnings.push(`Low confidence classification for '${classification.originalName}'`);
      }
      
      if (classification.treatment === 'requires_manual_review') {
        warnings.push(`Manual review required for '${classification.originalName}'`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      unclassified,
      totalClassified: classifications.filter(c => c.category !== 'unclassified').length,
      totalUnclassified: unclassified.length
    };
  }

  /**
   * Create default NMW component rules if file doesn't exist
   * @returns {Object} Default rules configuration
   */
  async createDefaultRules() {
    const defaultRules = {
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        source: 'GOV.UK National Minimum Wage and National Living Wage regulations',
        description: 'Default configuration for NMW component classification'
      },
      payComponents: {
        basicPay: {
          category: 'included',
          description: 'Basic salary or hourly wages',
          treatment: 'full_inclusion',
          keywords: ['basic_pay', 'salary', 'hourly_rate', 'base_pay', 'wages'],
          priority: 1
        },
        tips: {
          customer: {
            category: 'excluded',
            description: 'Tips, gratuities, or service charges from customers',
            treatment: 'full_exclusion',
            keywords: ['tips', 'gratuities', 'service_charge', 'tronc'],
            rule: 'Absolute exclusion - no exceptions'
          }
        }
      },
      calculationRules: {
        formula: 'Total NMW-eligible remuneration / Total hours worked in pay reference period'
      },
      mappingPriority: {
        high_confidence: ['tips', 'tronc', 'basic_pay'],
        requires_clarification: ['allowance', 'bonus', 'premium']
      }
    };

    try {
      await fs.writeFile(this.configPath, JSON.stringify(defaultRules, null, 2));
      this.rules = defaultRules;
      this.lastModified = new Date();
      console.log('✅ Default NMW component rules created');
      return defaultRules;
    } catch (error) {
      throw new Error(`Failed to create default NMW component rules: ${error.message}`);
    }
  }
}

module.exports = new NMWComponentRules();
