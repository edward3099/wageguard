/**
 * Column Mapping Service
 * 
 * Provides intelligent CSV column header mapping using LLM assistance
 * with confidence scoring and user confirmation workflow
 */

const LLMWrapperService = require('./llmWrapperService');

class ColumnMappingService {
  constructor() {
    try {
      this.llmService = new LLMWrapperService();
      this.llmAvailable = true;
    } catch (error) {
      console.warn('LLM service not available for column mapping:', error.message);
      this.llmService = null;
      this.llmAvailable = false;
    }

    // Define our expected schema with descriptions
    this.schemaDefinitions = {
      // Core worker identification
      worker_id: {
        description: "Unique identifier for the worker/employee",
        examples: ["EMP001", "W123", "12345"],
        required: true,
        type: "string"
      },
      worker_name: {
        description: "Full name of the worker/employee",
        examples: ["John Smith", "Jane Doe"],
        required: true,
        type: "string"
      },
      
      // Time and date fields
      hours: {
        description: "Total hours worked in the period",
        examples: ["40", "37.5", "168"],
        required: true,
        type: "number"
      },
      period_start: {
        description: "Start date of the pay period",
        examples: ["2024-01-01", "01/01/2024"],
        required: true,
        type: "date"
      },
      period_end: {
        description: "End date of the pay period",
        examples: ["2024-01-31", "31/01/2024"],
        required: true,
        type: "date"
      },
      
      // Pay components
      pay: {
        description: "Total gross pay for the period before deductions",
        examples: ["1200.00", "£1,200", "1200"],
        required: true,
        type: "currency"
      },
      pay_rate: {
        description: "Hourly pay rate",
        examples: ["15.50", "£15.50", "15.5"],
        required: false,
        type: "currency"
      },
      
      // Rota/timesheet specific
      date: {
        description: "Specific work date (for daily records)",
        examples: ["2024-01-15", "15/01/2024"],
        required: false,
        type: "date"
      },
      start_time: {
        description: "Shift start time",
        examples: ["09:00", "9:00 AM", "0900"],
        required: false,
        type: "time"
      },
      end_time: {
        description: "Shift end time",
        examples: ["17:00", "5:00 PM", "1700"],
        required: false,
        type: "time"
      },
      break_minutes: {
        description: "Break time in minutes",
        examples: ["30", "60", "45"],
        required: false,
        type: "number"
      },
      
      // NMW deductions (reduce pay for NMW purposes)
      uniform_deduction: {
        description: "Deduction for uniform/workwear costs",
        examples: ["15.00", "£15", "0"],
        required: false,
        type: "currency"
      },
      tools_deduction: {
        description: "Deduction for tools/equipment costs",
        examples: ["25.00", "£25", "0"],
        required: false,
        type: "currency"
      },
      training_deduction: {
        description: "Deduction for training/certification costs",
        examples: ["50.00", "£50", "0"],
        required: false,
        type: "currency"
      },
      other_deductions: {
        description: "Other miscellaneous deductions",
        examples: ["10.00", "£10", "0"],
        required: false,
        type: "currency"
      },
      
      // NMW offsets (can count towards NMW)
      accommodation_charge: {
        description: "Charge for accommodation provided by employer",
        examples: ["60.00", "£60", "0"],
        required: false,
        type: "currency"
      },
      meals_charge: {
        description: "Charge for meals provided by employer",
        examples: ["30.00", "£30", "0"],
        required: false,
        type: "currency"
      },
      transport_charge: {
        description: "Charge for transport provided by employer",
        examples: ["20.00", "£20", "0"],
        required: false,
        type: "currency"
      },
      
      // Additional pay components
      bonus: {
        description: "Bonus payments (may count towards NMW)",
        examples: ["100.00", "£100", "0"],
        required: false,
        type: "currency"
      },
      commission: {
        description: "Commission payments",
        examples: ["150.00", "£150", "0"],
        required: false,
        type: "currency"
      },
      tips: {
        description: "Tips received directly (excluded from NMW)",
        examples: ["50.00", "£50", "0"],
        required: false,
        type: "currency"
      },
      tronc: {
        description: "Tips distributed via tronc system (excluded from NMW)",
        examples: ["75.00", "£75", "0"],
        required: false,
        type: "currency"
      },
      shift_premium: {
        description: "Additional pay for unsocial hours",
        examples: ["2.00", "£2", "0"],
        required: false,
        type: "currency"
      },
      overtime_rate: {
        description: "Overtime hourly rate or multiplier",
        examples: ["23.25", "1.5", "£23.25"],
        required: false,
        type: "number"
      },
      holiday_pay: {
        description: "Holiday/annual leave pay",
        examples: ["400.00", "£400", "0"],
        required: false,
        type: "currency"
      }
    };

    // Fallback mappings when LLM is not available
    this.fallbackMappings = {
      // Worker identification
      worker_id: ['worker_id', 'employee_id', 'staff_id', 'emp_id', 'id', 'worker', 'employee', 'staff_number'],
      worker_name: ['worker_name', 'employee_name', 'staff_name', 'name', 'full_name', 'employee', 'worker'],
      
      // Time fields
      hours: ['hours', 'hours_worked', 'total_hours', 'worked_hours', 'hrs', 'time_worked'],
      period_start: ['period_start', 'start_date', 'from_date', 'week_start', 'month_start', 'pay_period_start'],
      period_end: ['period_end', 'end_date', 'to_date', 'week_end', 'month_end', 'pay_period_end'],
      date: ['date', 'work_date', 'shift_date', 'day', 'working_date'],
      start_time: ['start_time', 'clock_in', 'begin_time', 'start', 'shift_start'],
      end_time: ['end_time', 'clock_out', 'finish_time', 'end', 'shift_end'],
      break_minutes: ['break_minutes', 'break_time', 'break', 'rest_time', 'breaks'],
      
      // Pay fields
      pay: ['pay', 'total_pay', 'gross_pay', 'wages', 'salary', 'amount', 'earnings'],
      pay_rate: ['pay_rate', 'hourly_rate', 'rate', 'per_hour', 'hour_rate'],
      
      // Deductions
      uniform_deduction: ['uniform_deduction', 'uniform_cost', 'workwear_deduction', 'clothing_cost'],
      tools_deduction: ['tools_deduction', 'tools_cost', 'equipment_deduction', 'equipment_cost'],
      training_deduction: ['training_deduction', 'training_cost', 'certification_cost', 'course_fee'],
      other_deductions: ['other_deductions', 'misc_deductions', 'additional_deductions', 'other_costs'],
      
      // Offsets
      accommodation_charge: ['accommodation_charge', 'accommodation_cost', 'housing_charge', 'lodging_fee'],
      meals_charge: ['meals_charge', 'meal_cost', 'food_charge', 'subsistence_charge'],
      transport_charge: ['transport_charge', 'transport_cost', 'travel_cost', 'commute_cost'],
      
      // Additional components
      bonus: ['bonus', 'performance_bonus', 'incentive_pay', 'reward'],
      commission: ['commission', 'sales_commission', 'performance_pay'],
      tips: ['tips', 'gratuities', 'service_charge', 'tip'],
      tronc: ['tronc', 'service_charge_pool', 'tip_pool', 'pooled_tips'],
      shift_premium: ['shift_premium', 'night_shift', 'weekend_premium', 'unsocial_hours'],
      overtime_rate: ['overtime_rate', 'overtime_multiplier', 'ot_rate', 'overtime'],
      holiday_pay: ['holiday_pay', 'holiday_allowance', 'annual_leave_pay', 'vacation_pay']
    };
  }

  /**
   * Generate intelligent column mappings using LLM or fallback logic
   * @param {string[]} csvHeaders - Array of CSV column headers
   * @param {string} csvType - Type of CSV (payroll, rota, timesheet)
   * @returns {Promise<Object>} Mapping suggestions with confidence scores
   */
  async generateColumnMappings(csvHeaders, csvType = 'payroll') {
    try {
      console.log(`🔄 Generating column mappings for ${csvHeaders.length} headers`);

      // Filter headers to remove empty/null values
      const cleanHeaders = csvHeaders.filter(header => 
        header && typeof header === 'string' && header.trim().length > 0
      );

      if (cleanHeaders.length === 0) {
        return {
          success: false,
          error: 'No valid column headers found'
        };
      }

      // Try LLM-powered mapping first
      if (this.llmAvailable) {
        try {
          const llmResult = await this.generateLLMMapping(cleanHeaders, csvType);
          if (llmResult.success) {
            return llmResult;
          }
          console.warn('LLM mapping failed, falling back to rule-based mapping');
        } catch (error) {
          console.warn('LLM mapping error, falling back to rule-based mapping:', error.message);
        }
      }

      // Fallback to rule-based mapping
      const fallbackResult = this.generateFallbackMapping(cleanHeaders, csvType);
      return fallbackResult;

    } catch (error) {
      console.error('Error in generateColumnMappings:', error);
      return {
        success: false,
        error: 'Failed to generate column mappings',
        details: error.message
      };
    }
  }

  /**
   * Generate mappings using LLM service
   * @param {string[]} headers - Clean CSV headers
   * @param {string} csvType - CSV type
   * @returns {Promise<Object>} LLM mapping result
   */
  async generateLLMMapping(headers, csvType) {
    try {
      // Get relevant schema fields based on CSV type
      const relevantFields = this.getRelevantFields(csvType);
      
      // Create structured prompt for LLM
      const systemRole = `You are an expert at mapping CSV column headers to standardized payroll data fields. You must respond with valid JSON only.

Your task is to analyze CSV headers and map them to the most appropriate standardized field names. Each mapping should include a confidence score (0-100) indicating how certain you are about the match.

IMPORTANT: You must respond with ONLY a valid JSON object, no additional text or explanation.`;

      const userInstruction = `Map these CSV headers to the appropriate standardized field names. Return a JSON object with this exact structure:

{
  "mappings": [
    {
      "csvHeader": "original_header_name",
      "suggestedField": "standardized_field_name",
      "confidence": 95,
      "reasoning": "Brief explanation"
    }
  ],
  "unmapped": ["any_headers_that_couldnt_be_mapped"],
  "csvType": "${csvType}"
}

Available standardized fields:
${relevantFields.map(field => `- ${field}: ${this.schemaDefinitions[field].description}`).join('\n')}

CSV Headers to map:
${headers.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

Guidelines:
- Only map to fields that exist in the available standardized fields list
- Confidence should be 90-100 for exact matches, 70-89 for good matches, 50-69 for uncertain matches
- Set confidence below 50 only for very uncertain mappings
- If a header doesn't match any field well, leave it unmapped
- Consider common variations and abbreviations`;

      const llmResult = await this.llmService.callLLM(
        systemRole,
        userInstruction,
        { headers, csvType, availableFields: relevantFields },
        { maxTokens: 2000, timeout: 30000 }
      );

      if (!llmResult.success) {
        throw new Error(`LLM call failed: ${llmResult.error}`);
      }

      // Parse LLM response
      const parsedMapping = this.parseLLMResponse(llmResult.response, headers);
      
      return {
        success: true,
        mappings: parsedMapping.mappings,
        unmapped: parsedMapping.unmapped,
        method: 'llm',
        provider: llmResult.provider,
        confidence: this.calculateOverallConfidence(parsedMapping.mappings),
        warnings: llmResult.warnings || []
      };

    } catch (error) {
      console.error('LLM mapping generation failed:', error);
      throw error;
    }
  }

  /**
   * Parse LLM JSON response safely
   * @param {string} response - LLM response text
   * @param {string[]} originalHeaders - Original headers for validation
   * @returns {Object} Parsed mapping data
   */
  parseLLMResponse(response, originalHeaders) {
    try {
      // Clean the response - remove any non-JSON content
      let cleanResponse = response.trim();
      
      // Find JSON object in response
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON object found in LLM response');
      }
      
      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      
      const parsed = JSON.parse(cleanResponse);
      
      // Validate structure
      if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
        throw new Error('Invalid mapping structure - missing mappings array');
      }
      
      // Validate each mapping
      const validMappings = parsed.mappings.filter(mapping => {
        return mapping.csvHeader && 
               mapping.suggestedField && 
               typeof mapping.confidence === 'number' &&
               originalHeaders.includes(mapping.csvHeader) &&
               this.schemaDefinitions[mapping.suggestedField];
      });
      
      // Find unmapped headers
      const mappedHeaders = validMappings.map(m => m.csvHeader);
      const unmapped = originalHeaders.filter(header => !mappedHeaders.includes(header));
      
      return {
        mappings: validMappings,
        unmapped: unmapped
      };
      
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      throw new Error(`LLM response parsing failed: ${error.message}`);
    }
  }

  /**
   * Generate mappings using fallback rule-based logic
   * @param {string[]} headers - CSV headers
   * @param {string} csvType - CSV type
   * @returns {Object} Fallback mapping result
   */
  generateFallbackMapping(headers, csvType) {
    try {
      const mappings = [];
      const unmapped = [];

      for (const header of headers) {
        const normalizedHeader = header.toLowerCase().trim();
        let bestMatch = null;
        let bestConfidence = 0;

        // Check each schema field for matches
        for (const [fieldName, variations] of Object.entries(this.fallbackMappings)) {
          const normalizedVariations = variations.map(v => v.toLowerCase());
          
          // Exact match
          if (normalizedVariations.includes(normalizedHeader)) {
            bestMatch = fieldName;
            bestConfidence = 95;
            break;
          }
          
          // Partial match
          for (const variation of normalizedVariations) {
            if (normalizedHeader.includes(variation) || variation.includes(normalizedHeader)) {
              const confidence = this.calculatePartialMatchConfidence(normalizedHeader, variation);
              if (confidence > bestConfidence) {
                bestMatch = fieldName;
                bestConfidence = confidence;
              }
            }
          }
        }

        if (bestMatch && bestConfidence >= 50) {
          mappings.push({
            csvHeader: header,
            suggestedField: bestMatch,
            confidence: bestConfidence,
            reasoning: `Rule-based match with confidence ${bestConfidence}%`
          });
        } else {
          unmapped.push(header);
        }
      }

      return {
        success: true,
        mappings,
        unmapped,
        method: 'fallback',
        confidence: this.calculateOverallConfidence(mappings),
        warnings: []
      };

    } catch (error) {
      console.error('Fallback mapping generation failed:', error);
      return {
        success: false,
        error: 'Fallback mapping failed',
        details: error.message
      };
    }
  }

  /**
   * Calculate confidence for partial string matches
   * @param {string} header - Original header
   * @param {string} variation - Schema variation
   * @returns {number} Confidence score 0-100
   */
  calculatePartialMatchConfidence(header, variation) {
    const headerWords = header.split(/[_\s-]+/);
    const variationWords = variation.split(/[_\s-]+/);
    
    let matchCount = 0;
    let totalWords = Math.max(headerWords.length, variationWords.length);
    
    for (const word of headerWords) {
      if (variationWords.some(vWord => vWord.includes(word) || word.includes(vWord))) {
        matchCount++;
      }
    }
    
    const baseConfidence = (matchCount / totalWords) * 100;
    
    // Bonus for exact substring matches
    if (header.includes(variation) || variation.includes(header)) {
      return Math.min(85, baseConfidence + 20);
    }
    
    return Math.min(80, baseConfidence);
  }

  /**
   * Calculate overall confidence for a set of mappings
   * @param {Object[]} mappings - Array of mappings
   * @returns {number} Overall confidence score
   */
  calculateOverallConfidence(mappings) {
    if (mappings.length === 0) return 0;
    
    const totalConfidence = mappings.reduce((sum, mapping) => sum + mapping.confidence, 0);
    return Math.round(totalConfidence / mappings.length);
  }

  /**
   * Get relevant schema fields based on CSV type
   * @param {string} csvType - CSV type
   * @returns {string[]} Array of relevant field names
   */
  getRelevantFields(csvType) {
    const baseFields = ['worker_id', 'worker_name'];
    
    switch (csvType) {
      case 'rota':
        return [...baseFields, 'date', 'start_time', 'end_time', 'break_minutes', 'shift_premium', 'overtime_rate', 'holiday_pay'];
      
      case 'timesheet':
        return [...baseFields, 'date', 'hours', 'pay_rate', 'pay', 'bonus', 'commission', 'tips', 'tronc'];
      
      case 'payroll':
      default:
        return Object.keys(this.schemaDefinitions);
    }
  }

  /**
   * Validate mapping suggestions from user corrections
   * @param {Object[]} userMappings - User-corrected mappings
   * @param {string[]} originalHeaders - Original CSV headers
   * @returns {Object} Validation result
   */
  validateUserMappings(userMappings, originalHeaders) {
    try {
      const errors = [];
      const warnings = [];
      const validMappings = [];

      for (const mapping of userMappings) {
        // Validate structure
        if (!mapping.csvHeader || !mapping.suggestedField) {
          errors.push(`Invalid mapping structure for ${mapping.csvHeader || 'unknown header'}`);
          continue;
        }

        // Validate header exists
        if (!originalHeaders.includes(mapping.csvHeader)) {
          errors.push(`Header "${mapping.csvHeader}" not found in original CSV`);
          continue;
        }

        // Validate field exists in schema
        if (!this.schemaDefinitions[mapping.suggestedField]) {
          errors.push(`Field "${mapping.suggestedField}" is not a valid schema field`);
          continue;
        }

        // Check for duplicates
        const duplicates = validMappings.filter(m => m.suggestedField === mapping.suggestedField);
        if (duplicates.length > 0) {
          warnings.push(`Field "${mapping.suggestedField}" is mapped to multiple headers`);
        }

        validMappings.push({
          csvHeader: mapping.csvHeader,
          suggestedField: mapping.suggestedField,
          confidence: 100, // User-confirmed mappings have 100% confidence
          reasoning: 'User confirmed'
        });
      }

      return {
        success: errors.length === 0,
        mappings: validMappings,
        errors,
        warnings
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Get schema information for frontend display
   * @param {string} csvType - CSV type
   * @returns {Object} Schema information
   */
  getSchemaInfo(csvType = 'payroll') {
    const relevantFields = this.getRelevantFields(csvType);
    
    return {
      fields: relevantFields.map(fieldName => ({
        name: fieldName,
        ...this.schemaDefinitions[fieldName]
      })),
      csvType,
      totalFields: relevantFields.length,
      requiredFields: relevantFields.filter(name => this.schemaDefinitions[name].required)
    };
  }
}

module.exports = ColumnMappingService;
