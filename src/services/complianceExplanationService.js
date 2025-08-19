/**
 * Compliance Explanation Service
 * 
 * Generates user-friendly explanations for compliance flags and issues
 * using the LLM wrapper service with structured error codes and data
 */

const LLMWrapperService = require('./llmWrapperService');

class ComplianceExplanationService {
  constructor() {
    this.llmService = new LLMWrapperService();
    
    // Define structured error codes and their basic information
    this.errorCodes = {
      // RAG Status Issues
      'RATE_BELOW_MINIMUM': {
        category: 'critical',
        title: 'Pay Below Minimum Wage',
        shortDescription: 'Worker\'s effective hourly rate is below the legal minimum wage requirement'
      },
      'DATA_INSUFFICIENT': {
        category: 'warning',
        title: 'Insufficient Data',
        shortDescription: 'Missing information prevents accurate compliance verification'
      },
      'EXCESSIVE_DEDUCTIONS': {
        category: 'critical', 
        title: 'Excessive Deductions',
        shortDescription: 'Deductions from pay exceed legal limits or acceptable thresholds'
      },
      'ACCOMMODATION_OFFSET_EXCEEDED': {
        category: 'critical',
        title: 'Accommodation Offset Violation',
        shortDescription: 'Accommodation charges exceed the legal daily limit'
      },
      'ZERO_HOURS_WITH_PAY': {
        category: 'warning',
        title: 'Zero Hours with Payment',
        shortDescription: 'Payment recorded despite zero working hours'
      },
      'NEGATIVE_EFFECTIVE_RATE': {
        category: 'critical',
        title: 'Negative Hourly Rate',
        shortDescription: 'Calculated hourly rate is negative, indicating data errors'
      },
      'MISSING_WORKER_AGE': {
        category: 'warning',
        title: 'Missing Worker Age',
        shortDescription: 'Worker age required to determine applicable minimum wage rate'
      },
      
      // Fix Suggestion Types
      'ARREARS_TOP_UP': {
        category: 'action',
        title: 'Arrears Payment Required',
        shortDescription: 'Additional payment needed to meet minimum wage requirements'
      },
      'URGENT_REVIEW': {
        category: 'critical',
        title: 'Urgent Payroll Review',
        shortDescription: 'Critical compliance issue requiring immediate attention'
      },
      'HOURS_REVIEW': {
        category: 'action',
        title: 'Working Hours Review',
        shortDescription: 'Review working time regulations and recorded hours'
      },
      'DATA_CLARIFICATION': {
        category: 'action',
        title: 'Data Verification Needed',
        shortDescription: 'Review and verify payroll data accuracy'
      },
      'DEDUCTION_REVIEW': {
        category: 'action',
        title: 'Deduction Compliance Review',
        shortDescription: 'Review legitimacy and compliance of payroll deductions'
      },
      'MANUAL_REVIEW': {
        category: 'action',
        title: 'Manual Review Required',
        shortDescription: 'Complex scenario requiring manual compliance assessment'
      },
      
      // Offset and Allowance Issues
      'UNIFORM_DEDUCTION': {
        category: 'critical',
        title: 'Illegal Uniform Deduction',
        shortDescription: 'Uniform costs cannot be deducted from minimum wage workers'
      },
      'TOOLS_DEDUCTION': {
        category: 'critical',
        title: 'Illegal Tools Deduction', 
        shortDescription: 'Tool costs cannot be deducted from minimum wage workers'
      },
      'TRAINING_DEDUCTION': {
        category: 'critical',
        title: 'Illegal Training Deduction',
        shortDescription: 'Training costs cannot be deducted from minimum wage workers'
      },
      'TRONC_EXCLUSION': {
        category: 'info',
        title: 'Tips/Tronc Excluded',
        shortDescription: 'Tips and tronc payments excluded from minimum wage calculation'
      },
      'LOW_COMPLIANCE_MARGIN': {
        category: 'warning',
        title: 'Low Compliance Margin',
        shortDescription: 'Pay meets minimum wage but with little buffer for changes'
      },
      
      // Data Quality Issues
      'MISSING_COLUMNS': {
        category: 'error',
        title: 'Missing Required Data',
        shortDescription: 'Essential payroll columns missing from uploaded data'
      },
      'INVALID_DATA_FORMAT': {
        category: 'error',
        title: 'Invalid Data Format',
        shortDescription: 'Data format errors prevent accurate processing'
      },
      'EMPTY_FILE': {
        category: 'error',
        title: 'Empty Data File',
        shortDescription: 'No payroll data found in uploaded file'
      }
    };
    
    // Define context templates for different issue types
    this.contextTemplates = {
      rate_calculation: {
        fields: ['effective_hourly_rate', 'required_hourly_rate', 'total_hours', 'total_pay'],
        description: 'Pay rate calculation details'
      },
      deductions: {
        fields: ['total_deductions', 'uniform_deduction', 'tools_deduction', 'training_deduction', 'other_deductions'],
        description: 'Payroll deductions breakdown'
      },
      offsets: {
        fields: ['accommodation_offset', 'meals_charge', 'transport_charge', 'daily_rate'],
        description: 'Offset and charge details'
      },
      allowances: {
        fields: ['bonus', 'commission', 'tips', 'tronc', 'shift_premium', 'overtime_rate', 'holiday_pay'],
        description: 'Additional pay components'
      },
      worker_info: {
        fields: ['age', 'apprentice_status', 'first_year_apprentice', 'worker_type'],
        description: 'Worker classification information'
      },
      time_period: {
        fields: ['period_start', 'period_end', 'period_type', 'total_hours', 'break_minutes'],
        description: 'Pay period and working time details'
      }
    };
  }

  /**
   * Generate an explanation for a compliance issue
   * @param {string} issueCode - Error/issue code
   * @param {Object} workerData - Worker information (will be masked)
   * @param {Object} issueDetails - Specific issue details
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Explanation result
   */
  async generateExplanation(issueCode, workerData = {}, issueDetails = {}, options = {}) {
    try {
      console.log(`🤖 Generating explanation for issue: ${issueCode}`);
      
      // Get error code information
      const errorInfo = this.errorCodes[issueCode];
      if (!errorInfo) {
        return {
          success: false,
          error: `Unknown issue code: ${issueCode}`,
          fallbackExplanation: this.generateFallbackExplanation(issueCode, issueDetails)
        };
      }

      // Prepare structured context for LLM
      const structuredContext = this.prepareStructuredContext(errorInfo, issueDetails, workerData);
      
      // Generate LLM explanation
      const llmResult = await this.llmService.generateComplianceExplanation(
        issueCode,
        workerData,
        structuredContext
      );

      if (!llmResult.success) {
        return {
          success: false,
          error: 'LLM explanation generation failed',
          details: llmResult.error,
          fallbackExplanation: this.generateFallbackExplanation(issueCode, issueDetails)
        };
      }

      // Parse and structure the LLM response
      const explanation = this.parseExplanationResponse(llmResult.response);

      return {
        success: true,
        issueCode,
        errorInfo,
        explanation: {
          title: errorInfo.title,
          category: errorInfo.category,
          shortDescription: errorInfo.shortDescription,
          detailedExplanation: explanation.detailed,
          actionRequired: explanation.actions,
          impact: explanation.impact,
          urgency: this.determineUrgency(errorInfo.category),
          references: explanation.references || this.getReferences(issueCode)
        },
        llmMetadata: {
          provider: llmResult.provider,
          model: llmResult.model,
          responseTime: llmResult.responseTime,
          tokensUsed: llmResult.tokensUsed
        }
      };

    } catch (error) {
      console.error('❌ Failed to generate compliance explanation:', error);
      
      return {
        success: false,
        error: 'Explanation generation failed',
        details: error.message,
        fallbackExplanation: this.generateFallbackExplanation(issueCode, issueDetails)
      };
    }
  }

  /**
   * Generate explanations for multiple issues
   * @param {Array} issues - Array of {issueCode, workerData, issueDetails}
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Batch explanation results
   */
  async generateBatchExplanations(issues, options = {}) {
    try {
      console.log(`🤖 Generating batch explanations for ${issues.length} issues`);
      
      const results = [];
      const summary = {
        total: issues.length,
        successful: 0,
        failed: 0,
        categories: {}
      };

      // Process each issue
      for (const issue of issues) {
        const result = await this.generateExplanation(
          issue.issueCode,
          issue.workerData,
          issue.issueDetails,
          options
        );

        results.push({
          issueCode: issue.issueCode,
          workerId: issue.workerData?.worker_id || issue.workerData?.id || 'unknown',
          ...result
        });

        if (result.success) {
          summary.successful++;
          const category = result.errorInfo?.category || 'unknown';
          summary.categories[category] = (summary.categories[category] || 0) + 1;
        } else {
          summary.failed++;
        }
      }

      return {
        success: true,
        results,
        summary
      };

    } catch (error) {
      console.error('❌ Failed to generate batch explanations:', error);
      return {
        success: false,
        error: 'Batch explanation generation failed',
        details: error.message
      };
    }
  }

  /**
   * Prepare structured context for LLM consumption
   * @param {Object} errorInfo - Error information
   * @param {Object} issueDetails - Issue details
   * @param {Object} workerData - Worker data
   * @returns {Object} Structured context
   */
  prepareStructuredContext(errorInfo, issueDetails, workerData) {
    const context = {
      issue: {
        category: errorInfo.category,
        title: errorInfo.title,
        shortDescription: errorInfo.shortDescription
      },
      details: issueDetails,
      relevantRegulations: this.getRelevantRegulations(errorInfo.category),
      actionPriority: this.determineUrgency(errorInfo.category)
    };

    // Add relevant context based on issue type
    if (issueDetails.effective_hourly_rate && issueDetails.required_hourly_rate) {
      context.rateComparison = {
        effective: parseFloat(issueDetails.effective_hourly_rate),
        required: parseFloat(issueDetails.required_hourly_rate),
        shortfall: parseFloat(issueDetails.required_hourly_rate) - parseFloat(issueDetails.effective_hourly_rate)
      };
    }

    if (issueDetails.total_deductions) {
      context.deductionInfo = {
        total: parseFloat(issueDetails.total_deductions),
        percentage: issueDetails.deduction_percentage || 'unknown'
      };
    }

    return context;
  }

  /**
   * Parse LLM response into structured explanation
   * @param {string} response - Raw LLM response
   * @returns {Object} Parsed explanation
   */
  parseExplanationResponse(response) {
    // Basic parsing - in a production system, this could be more sophisticated
    const explanation = {
      detailed: response,
      actions: [],
      impact: 'Review required',
      references: []
    };

    // Extract action items if present
    const actionMatches = response.match(/(?:action|recommend|should|must|need to)([^.!?]*)/gi);
    if (actionMatches) {
      explanation.actions = actionMatches.slice(0, 3).map(match => match.trim());
    }

    // Extract impact information
    if (response.toLowerCase().includes('critical') || response.toLowerCase().includes('urgent')) {
      explanation.impact = 'Critical - immediate action required';
    } else if (response.toLowerCase().includes('review') || response.toLowerCase().includes('check')) {
      explanation.impact = 'Review and verification needed';
    }

    return explanation;
  }

  /**
   * Generate fallback explanation when LLM is unavailable
   * @param {string} issueCode - Issue code
   * @param {Object} issueDetails - Issue details
   * @returns {Object} Fallback explanation
   */
  generateFallbackExplanation(issueCode, issueDetails) {
    const errorInfo = this.errorCodes[issueCode];
    
    if (!errorInfo) {
      return {
        title: 'Compliance Issue Detected',
        description: `Issue code ${issueCode} requires review. Please consult your payroll administrator or compliance specialist.`,
        action: 'Manual review required'
      };
    }

    let action = 'Review and resolve compliance issue';
    
    // Provide specific actions based on category
    switch (errorInfo.category) {
      case 'critical':
        action = 'Immediate action required - correct before payroll submission';
        break;
      case 'warning':
        action = 'Review data accuracy and make corrections as needed';
        break;
      case 'action':
        action = 'Follow recommended corrective actions';
        break;
      case 'info':
        action = 'Note for audit trail - no immediate action required';
        break;
    }

    return {
      title: errorInfo.title,
      description: errorInfo.shortDescription,
      action,
      category: errorInfo.category
    };
  }

  /**
   * Determine urgency level based on issue category
   * @param {string} category - Issue category
   * @returns {string} Urgency level
   */
  determineUrgency(category) {
    const urgencyMap = {
      critical: 'immediate',
      warning: 'medium',
      action: 'medium',
      info: 'low',
      error: 'high'
    };
    
    return urgencyMap[category] || 'medium';
  }

  /**
   * Get relevant regulations for an issue category
   * @param {string} category - Issue category
   * @returns {Array} Relevant regulations
   */
  getRelevantRegulations(category) {
    const regulations = {
      critical: [
        'National Minimum Wage Act 1998',
        'National Minimum Wage Regulations 2015',
        'Employment Rights Act 1996'
      ],
      warning: [
        'National Minimum Wage Regulations 2015',
        'Working Time Regulations 1998'
      ],
      action: [
        'National Minimum Wage Regulations 2015'
      ],
      info: [
        'HMRC National Minimum Wage guidance'
      ],
      error: [
        'Data accuracy requirements for payroll compliance'
      ]
    };
    
    return regulations[category] || ['General payroll compliance requirements'];
  }

  /**
   * Get reference links for specific issue codes
   * @param {string} issueCode - Issue code
   * @returns {Array} Reference links
   */
  getReferences(issueCode) {
    // In a production system, these would be real GOV.UK links
    const references = [
      'https://www.gov.uk/national-minimum-wage-rates',
      'https://www.gov.uk/minimum-wage-different-types-work',
      'https://www.gov.uk/hmrc-internal-manuals/national-minimum-wage-manual'
    ];
    
    return references;
  }

  /**
   * Get available error codes and their descriptions
   * @returns {Object} Error codes dictionary
   */
  getErrorCodes() {
    return this.errorCodes;
  }

  /**
   * Health check for the explanation service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const llmHealth = await this.llmService.healthCheck();
      
      return {
        status: llmHealth.status === 'healthy' ? 'healthy' : 'degraded',
        explanationService: 'operational',
        llmService: llmHealth.status,
        errorCodesLoaded: Object.keys(this.errorCodes).length,
        provider: llmHealth.provider,
        capabilities: {
          singleExplanation: true,
          batchExplanation: true,
          fallbackMode: true,
          errorCodeMapping: true
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        explanationService: 'error',
        fallbackMode: 'available'
      };
    }
  }
}

module.exports = ComplianceExplanationService;
