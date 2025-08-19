const FixSuggestionService = require('../src/services/fixSuggestionService');

describe('Fix Suggestion Service Tests', () => {
  let fixSuggestionService;

  beforeEach(() => {
    fixSuggestionService = new FixSuggestionService();
  });

  describe('Input Validation', () => {
    test('should validate required worker information', () => {
      const result = fixSuggestionService.validateInputs(null, {}, {}, {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Worker information is required');
    });

    test('should validate required pay period information', () => {
      const result = fixSuggestionService.validateInputs({}, null, {}, {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pay period information is required');
    });

    test('should validate required RAG result', () => {
      const result = fixSuggestionService.validateInputs({}, {}, null, {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('RAG status result is required');
    });

    test('should validate RAG status presence', () => {
      const result = fixSuggestionService.validateInputs({}, {}, {}, {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('RAG status is required');
    });

    test('should validate calculated data', () => {
      const result = fixSuggestionService.validateInputs({}, {}, { ragStatus: 'RED' }, null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Calculated compliance data is required');
    });

    test('should pass validation with complete data', () => {
      const result = fixSuggestionService.validateInputs(
        { worker_id: 'W001' },
        { period_start: '2024-01-01' },
        { ragStatus: 'RED' },
        { effectiveHourlyRate: 10.00 }
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Currency Formatting', () => {
    test('should format currency correctly', () => {
      expect(fixSuggestionService.formatCurrency(10.5)).toBe('£10.50');
      expect(fixSuggestionService.formatCurrency(0.75)).toBe('£0.75');
      expect(fixSuggestionService.formatCurrency(1234.567)).toBe('£1234.57');
      expect(fixSuggestionService.formatCurrency(0)).toBe('£0.00');
    });
  });

  describe('Shortfall Calculations', () => {
    test('should calculate shortfall correctly', () => {
      const result = fixSuggestionService.calculateShortfall(10.00, 11.44, 40);
      
      expect(result.perHourShortfall).toBeCloseTo(1.44, 2);
      expect(result.totalShortfall).toBeCloseTo(57.60, 2);
      expect(result.shortfallPercentage).toBeCloseTo(12.59, 2);
      expect(result.hoursWorked).toBe(40);
      expect(result.effectiveRate).toBe(10.00);
      expect(result.requiredRate).toBe(11.44);
    });

    test('should handle zero shortfall', () => {
      const result = fixSuggestionService.calculateShortfall(12.00, 11.44, 40);
      
      expect(result.perHourShortfall).toBe(0);
      expect(result.totalShortfall).toBe(0);
      expect(result.shortfallPercentage).toBe(0);
    });

    test('should handle zero effective rate', () => {
      const result = fixSuggestionService.calculateShortfall(0, 11.44, 40);
      
      expect(result.perHourShortfall).toBe(11.44);
      expect(result.totalShortfall).toBeCloseTo(457.60, 2);
      expect(result.shortfallPercentage).toBe(100);
    });
  });

  describe('Primary Suggestion Formatting', () => {
    test('should format primary suggestion message correctly', () => {
      const message = fixSuggestionService.formatPrimarySuggestion(10.00, 11.44, 1.44, 57.60);
      
      expect(message).toBe(
        'Effective rate is £10.00, which is £1.44 below the required £11.44. Suggestion: Add arrears top-up of £57.60.'
      );
    });

    test('should handle decimal precision correctly', () => {
      const message = fixSuggestionService.formatPrimarySuggestion(10.555, 11.441, 0.886, 35.44);
      
      expect(message).toBe(
        'Effective rate is £10.55, which is £0.89 below the required £11.44. Suggestion: Add arrears top-up of £35.44.'
      );
    });
  });

  describe('RED Status Suggestions', () => {
    test('should generate primary arrears suggestion for RED status', () => {
      const result = fixSuggestionService.generateRedStatusSuggestions(10.00, 11.44, 40, 400);
      
      expect(result.suggestions).toHaveLength(2); // Primary arrears + rate breakdown
      expect(result.primarySuggestion).toBeDefined();
      expect(result.primarySuggestion.type).toBe('ARREARS_TOP_UP');
      expect(result.primarySuggestion.severity).toBe('HIGH');
      expect(result.primarySuggestion.actionRequired).toBe(true);
      expect(result.primarySuggestion.message).toContain('Add arrears top-up of £57.60');
      
      expect(result.calculations.totalShortfall).toBeCloseTo(57.60, 2);
    });

    test('should include critical review for severe underpayment', () => {
      const result = fixSuggestionService.generateRedStatusSuggestions(8.00, 11.44, 40, 320);
      
      const criticalSuggestion = result.suggestions.find(s => s.type === 'URGENT_REVIEW');
      expect(criticalSuggestion).toBeDefined();
      expect(criticalSuggestion.severity).toBe('CRITICAL');
      expect(criticalSuggestion.message).toContain('Critical underpayment detected');
      expect(criticalSuggestion.message).toContain('30.1%'); // Shortfall percentage
    });

    test('should include hours review for excessive hours', () => {
      const result = fixSuggestionService.generateRedStatusSuggestions(10.00, 11.44, 55, 550);
      
      const hoursReview = result.suggestions.find(s => s.type === 'HOURS_REVIEW');
      expect(hoursReview).toBeDefined();
      expect(hoursReview.severity).toBe('MEDIUM');
      expect(hoursReview.message).toContain('55 hours');
      expect(hoursReview.message).toContain('working time regulations');
    });

    test('should include rate breakdown information', () => {
      const result = fixSuggestionService.generateRedStatusSuggestions(10.00, 11.44, 40, 400);
      
      const breakdown = result.suggestions.find(s => s.type === 'RATE_BREAKDOWN');
      expect(breakdown).toBeDefined();
      expect(breakdown.severity).toBe('INFO');
      expect(breakdown.actionRequired).toBe(false);
      expect(breakdown.message).toContain('£10.00/hour vs Required £11.44/hour');
      expect(breakdown.details.complianceGap).toBeCloseTo(1.44, 2);
    });

    test('should not suggest arrears below minimum threshold', () => {
      // Very small shortfall (0.005 per hour = £0.20 total)
      const result = fixSuggestionService.generateRedStatusSuggestions(11.435, 11.44, 40, 457.40);
      
      const arrearsSuggestion = result.suggestions.find(s => s.type === 'ARREARS_TOP_UP');
      expect(arrearsSuggestion).toBeUndefined(); // Below 0.01 threshold
    });
  });

  describe('AMBER Status Suggestions', () => {
    test('should generate suggestions for zero hours with pay flag', () => {
      const ragResult = {
        ragStatus: 'AMBER',
        reason: 'Zero hours with pay',
        amberFlags: ['zero_hours_with_pay']
      };
      
      const suggestions = fixSuggestionService.generateAmberStatusSuggestions(ragResult, {});
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('DATA_CLARIFICATION');
      expect(suggestions[0].severity).toBe('MEDIUM');
      expect(suggestions[0].message).toContain('Zero hours recorded with non-zero pay');
      expect(suggestions[0].actionRequired).toBe(true);
    });

    test('should generate suggestions for missing age data flag', () => {
      const ragResult = {
        ragStatus: 'AMBER',
        amberFlags: ['missing_age_data']
      };
      
      const suggestions = fixSuggestionService.generateAmberStatusSuggestions(ragResult, {});
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('MISSING_DATA');
      expect(suggestions[0].severity).toBe('HIGH');
      expect(suggestions[0].message).toContain('Worker age or date of birth missing');
    });

    test('should generate suggestions for negative effective rate flag', () => {
      const ragResult = {
        ragStatus: 'AMBER',
        amberFlags: ['negative_effective_rate']
      };
      
      const suggestions = fixSuggestionService.generateAmberStatusSuggestions(ragResult, {});
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('DATA_ERROR');
      expect(suggestions[0].severity).toBe('CRITICAL');
      expect(suggestions[0].message).toContain('Negative effective hourly rate');
    });

    test('should generate suggestions for excessive deductions flag', () => {
      const ragResult = {
        ragStatus: 'AMBER',
        amberFlags: ['excessive_deductions']
      };
      
      const suggestions = fixSuggestionService.generateAmberStatusSuggestions(ragResult, {});
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('DEDUCTION_REVIEW');
      expect(suggestions[0].severity).toBe('HIGH');
      expect(suggestions[0].message).toContain('Deductions exceed 50%');
    });

    test('should generate suggestions for accommodation offset violations', () => {
      const ragResult = {
        ragStatus: 'AMBER',
        amberFlags: ['accommodation_offset_violations']
      };
      
      const suggestions = fixSuggestionService.generateAmberStatusSuggestions(ragResult, {});
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('ACCOMMODATION_REVIEW');
      expect(suggestions[0].severity).toBe('HIGH');
      expect(suggestions[0].message).toContain('Accommodation charges exceed legal limits');
    });

    test('should handle multiple amber flags', () => {
      const ragResult = {
        ragStatus: 'AMBER',
        amberFlags: ['zero_hours_with_pay', 'missing_age_data', 'excessive_deductions']
      };
      
      const suggestions = fixSuggestionService.generateAmberStatusSuggestions(ragResult, {});
      
      expect(suggestions).toHaveLength(3);
      expect(suggestions.some(s => s.type === 'DATA_CLARIFICATION')).toBe(true);
      expect(suggestions.some(s => s.type === 'MISSING_DATA')).toBe(true);
      expect(suggestions.some(s => s.type === 'DEDUCTION_REVIEW')).toBe(true);
    });

    test('should generate default manual review for unknown flags', () => {
      const ragResult = {
        ragStatus: 'AMBER',
        amberFlags: ['unknown_flag']
      };
      
      const suggestions = fixSuggestionService.generateAmberStatusSuggestions(ragResult, {});
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('MANUAL_REVIEW');
      expect(suggestions[0].message).toContain('unknown flag');
    });

    test('should provide fallback suggestion when no flags present', () => {
      const ragResult = {
        ragStatus: 'AMBER',
        reason: 'Manual review required'
      };
      
      const suggestions = fixSuggestionService.generateAmberStatusSuggestions(ragResult, {});
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('MANUAL_REVIEW');
      expect(suggestions[0].message).toBe('Manual review required');
    });
  });

  describe('GREEN Status Suggestions', () => {
    test('should generate low margin warning for rates just above minimum', () => {
      const ragResult = {
        ragStatus: 'GREEN',
        effectiveHourlyRate: 11.70, // Only 0.26 above minimum
        requiredHourlyRate: 11.44
      };
      
      const suggestions = fixSuggestionService.generateGreenStatusSuggestions(ragResult, {});
      
      expect(suggestions).toHaveLength(2);
      
      const lowMarginWarning = suggestions.find(s => s.type === 'LOW_MARGIN');
      expect(lowMarginWarning).toBeDefined();
      expect(lowMarginWarning.severity).toBe('LOW');
      expect(lowMarginWarning.message).toContain('£0.26/hour above minimum wage');
      expect(lowMarginWarning.actionRequired).toBe(false);
    });

    test('should not generate low margin warning for comfortable cushion', () => {
      const ragResult = {
        ragStatus: 'GREEN',
        effectiveHourlyRate: 13.00, // Comfortable cushion
        requiredHourlyRate: 11.44
      };
      
      const suggestions = fixSuggestionService.generateGreenStatusSuggestions(ragResult, {});
      
      expect(suggestions).toHaveLength(1);
      
      const lowMarginWarning = suggestions.find(s => s.type === 'LOW_MARGIN');
      expect(lowMarginWarning).toBeUndefined();
    });

    test('should always include compliance confirmation', () => {
      const ragResult = {
        ragStatus: 'GREEN',
        effectiveHourlyRate: 12.50,
        requiredHourlyRate: 11.44
      };
      
      const suggestions = fixSuggestionService.generateGreenStatusSuggestions(ragResult, {});
      
      const confirmation = suggestions.find(s => s.type === 'COMPLIANCE_CONFIRMED');
      expect(confirmation).toBeDefined();
      expect(confirmation.severity).toBe('INFO');
      expect(confirmation.message).toContain('£12.50/hour meets minimum wage requirement');
      expect(confirmation.details.cushionAmount).toBeCloseTo(1.06, 2);
      expect(confirmation.details.cushionPercentage).toBeCloseTo(9.27, 2);
    });
  });

  describe('Full Fix Suggestion Generation', () => {
    test('should generate complete fix suggestions for RED status worker', () => {
      const worker = { worker_id: 'W001', age: 25 };
      const payPeriod = { period_start: '2024-01-01', period_end: '2024-01-31' };
      const ragResult = {
        success: true,
        ragStatus: 'RED',
        effectiveHourlyRate: 10.00,
        requiredHourlyRate: 11.44,
        severity: 'MEDIUM'
      };
      const calculatedData = {
        hoursWorked: 40,
        totalPay: 400
      };

      const result = fixSuggestionService.generateFixSuggestions(worker, payPeriod, ragResult, calculatedData);

      expect(result.success).toBe(true);
      expect(result.ragStatus).toBe('RED');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.primarySuggestion).toBeDefined();
      expect(result.primarySuggestion.type).toBe('ARREARS_TOP_UP');
      expect(result.calculations.totalShortfall).toBeCloseTo(57.60, 2);
      expect(result.metadata.workerId).toBe('W001');
    });

    test('should generate complete fix suggestions for AMBER status worker', () => {
      const worker = { worker_id: 'W002' };
      const payPeriod = { period_start: '2024-01-01', period_end: '2024-01-31' };
      const ragResult = {
        success: true,
        ragStatus: 'AMBER',
        reason: 'Missing age data',
        amberFlags: ['missing_age_data']
      };
      const calculatedData = {
        hoursWorked: 35,
        totalPay: 350
      };

      const result = fixSuggestionService.generateFixSuggestions(worker, payPeriod, ragResult, calculatedData);

      expect(result.success).toBe(true);
      expect(result.ragStatus).toBe('AMBER');
      expect(result.suggestions).toHaveLength(1);
      expect(result.primarySuggestion.type).toBe('MISSING_DATA');
    });

    test('should generate complete fix suggestions for GREEN status worker', () => {
      const worker = { worker_id: 'W003', age: 22 };
      const payPeriod = { period_start: '2024-01-01', period_end: '2024-01-31' };
      const ragResult = {
        success: true,
        ragStatus: 'GREEN',
        effectiveHourlyRate: 12.50,
        requiredHourlyRate: 11.44
      };
      const calculatedData = {
        hoursWorked: 37,
        totalPay: 462.50
      };

      const result = fixSuggestionService.generateFixSuggestions(worker, payPeriod, ragResult, calculatedData);

      expect(result.success).toBe(true);
      expect(result.ragStatus).toBe('GREEN');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.primarySuggestion.type).toBe('COMPLIANCE_CONFIRMED');
    });

    test('should handle validation failures gracefully', () => {
      const result = fixSuggestionService.generateFixSuggestions(null, null, null, null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Input validation failed');
      expect(result.details).toContain('Worker information is required');
    });

    test('should handle unknown RAG status', () => {
      const worker = { worker_id: 'W001' };
      const payPeriod = { period_start: '2024-01-01' };
      const ragResult = { ragStatus: 'UNKNOWN' };
      const calculatedData = { hoursWorked: 40 };

      const result = fixSuggestionService.generateFixSuggestions(worker, payPeriod, ragResult, calculatedData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown RAG status');
      expect(result.ragStatus).toBe('UNKNOWN');
    });
  });

  describe('Bulk Processing', () => {
    test('should process multiple workers correctly', () => {
      const workerResults = [
        {
          worker: { worker_id: 'W001' },
          payPeriod: { period_start: '2024-01-01', period_end: '2024-01-31' },
          ragResult: { ragStatus: 'RED', effectiveHourlyRate: 10.00, requiredHourlyRate: 11.44 },
          calculatedData: { hoursWorked: 40, totalPay: 400 }
        },
        {
          worker: { worker_id: 'W002' },
          payPeriod: { period_start: '2024-01-01', period_end: '2024-01-31' },
          ragResult: { ragStatus: 'GREEN', effectiveHourlyRate: 12.50, requiredHourlyRate: 11.44 },
          calculatedData: { hoursWorked: 35, totalPay: 437.50 }
        },
        {
          worker: { worker_id: 'W003' },
          payPeriod: { period_start: '2024-01-01', period_end: '2024-01-31' },
          ragResult: { ragStatus: 'AMBER', amberFlags: ['missing_age_data'] },
          calculatedData: { hoursWorked: 38, totalPay: 380 }
        }
      ];

      const result = fixSuggestionService.generateBulkFixSuggestions(workerResults);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.summary.total).toBe(3);
      expect(result.summary.withSuggestions).toBe(3);
      expect(result.summary.actionRequired).toBeGreaterThan(0);
      expect(result.summary.totalShortfall).toBeCloseTo(57.60, 2); // Only W001 has shortfall
    });

    test('should handle errors in bulk processing gracefully', () => {
      const workerResults = [
        {
          worker: { worker_id: 'W001' },
          payPeriod: { period_start: '2024-01-01' },
          ragResult: { ragStatus: 'GREEN', effectiveHourlyRate: 12.50, requiredHourlyRate: 11.44 },
          calculatedData: { hoursWorked: 40 }
        },
        {
          worker: null, // Invalid data
          payPeriod: null,
          ragResult: null,
          calculatedData: null
        }
      ];

      const result = fixSuggestionService.generateBulkFixSuggestions(workerResults);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle system errors gracefully', () => {
      // Force an error by calling with invalid data structure
      jest.spyOn(fixSuggestionService, 'validateInputs').mockImplementation(() => {
        throw new Error('System failure');
      });

      const result = fixSuggestionService.generateFixSuggestions({}, {}, {}, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fix suggestion generation failed');
      expect(result.details).toBe('System failure');
    });
  });
});
