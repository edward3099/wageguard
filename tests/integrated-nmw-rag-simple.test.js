const IntegratedNMWService = require('../src/services/integratedNMWService');

describe('Integrated NMW Service - RAG Status Integration (Simple)', () => {
  let integratedService;

  beforeEach(() => {
    integratedService = new IntegratedNMWService();
  });

  describe('RAG Status Calculation Integration', () => {
    test('should calculate RAG status with mocked integrated result', async () => {
      const worker = {
        worker_id: 'W001',
        worker_name: 'John Smith',
        age: 25
      };

      const payPeriod = {
        id: 'PP001',
        period_start: '2024-01-01',
        period_end: '2024-01-31'
      };

      // Mock an integrated result that represents a compliant worker
      const mockIntegratedResult = {
        effectiveHourlyRate: 12.50,
        hoursWorked: 40,
        totalPay: 500.00,
        totalOffsets: 0,
        totalDeductions: 0,
        finalScore: 95
      };

      const ragResult = await integratedService.calculateRAGStatus(worker, payPeriod, mockIntegratedResult);

      expect(ragResult.success).toBe(true);
      expect(ragResult.ragStatus).toBe('GREEN');
      expect(ragResult.reason).toContain('meets or exceeds required rate');
    });

    test('should calculate RAG status for non-compliant worker', async () => {
      const worker = {
        worker_id: 'W002',
        worker_name: 'Jane Doe',
        age: 25
      };

      const payPeriod = {
        id: 'PP002',
        period_start: '2024-01-01',
        period_end: '2024-01-31'
      };

      // Mock an integrated result that represents a non-compliant worker with HIGH severity
      // £9.00 vs £10.42 = 13.6% shortfall (> 10% = HIGH severity)
      const mockIntegratedResult = {
        effectiveHourlyRate: 9.00,
        hoursWorked: 40,
        totalPay: 360.00,
        totalOffsets: 0,
        totalDeductions: 0,
        finalScore: 50
      };

      const ragResult = await integratedService.calculateRAGStatus(worker, payPeriod, mockIntegratedResult);

      expect(ragResult.success).toBe(true);
      expect(ragResult.ragStatus).toBe('RED');
      expect(ragResult.severity).toBe('HIGH');
      expect(ragResult.reason).toContain('is below required rate');
    });

    test('should calculate RAG status for edge case (AMBER)', async () => {
      const worker = {
        worker_id: 'W003',
        worker_name: 'Bob Wilson',
        age: 25  // Add age to pass validation
      };

      const payPeriod = {
        id: 'PP003',
        period_start: '2024-01-01',
        period_end: '2024-01-31'
      };

      const mockIntegratedResult = {
        effectiveHourlyRate: 11.50,
        hoursWorked: 0, // Zero hours with pay
        totalPay: 100.00,
        totalOffsets: 0,
        totalDeductions: 0,
        finalScore: 75
      };

      const ragResult = await integratedService.calculateRAGStatus(worker, payPeriod, mockIntegratedResult);

      expect(ragResult.success).toBe(true);
      expect(ragResult.ragStatus).toBe('AMBER');
      expect(ragResult.amberFlags).toContain('zero_hours_with_pay');
    });
  });

  describe('Fix Suggestions Integration', () => {
    test('should generate fix suggestions for RED status', async () => {
      const worker = {
        worker_id: 'W001',
        worker_name: 'John Smith',
        age: 25
      };

      const payPeriod = {
        id: 'PP001',
        period_start: '2024-01-01',
        period_end: '2024-01-31'
      };

      const mockRAGResult = {
        success: true,
        ragStatus: 'RED',
        effectiveHourlyRate: 10.00,
        requiredHourlyRate: 11.44,
        severity: 'HIGH'
      };

      const mockIntegratedResult = {
        effectiveHourlyRate: 10.00,
        hoursWorked: 40,
        totalPay: 400.00,
        totalOffsets: 0,
        totalDeductions: 0,
        netPayForNMW: 400.00
      };

      const fixResult = await integratedService.generateFixSuggestions(
        worker, payPeriod, mockRAGResult, mockIntegratedResult, {}
      );

      expect(fixResult.success).toBe(true);
      expect(fixResult.suggestions.length).toBeGreaterThan(0);
      expect(fixResult.primarySuggestion).toBeDefined();
      expect(fixResult.primarySuggestion.type).toBe('ARREARS_TOP_UP');
      expect(fixResult.primarySuggestion.message).toContain('Add arrears top-up of £57.60');
    });

    test('should generate fix suggestions for AMBER status', async () => {
      const worker = {
        worker_id: 'W002',
        worker_name: 'Jane Doe'
      };

      const payPeriod = {
        id: 'PP002',
        period_start: '2024-01-01',
        period_end: '2024-01-31'
      };

      const mockRAGResult = {
        success: true,
        ragStatus: 'AMBER',
        reason: 'Missing age data',
        amberFlags: ['missing_age_data']
      };

      const mockIntegratedResult = {
        effectiveHourlyRate: 11.50,
        hoursWorked: 35,
        totalPay: 402.50,
        totalOffsets: 0,
        totalDeductions: 0,
        netPayForNMW: 402.50
      };

      const fixResult = await integratedService.generateFixSuggestions(
        worker, payPeriod, mockRAGResult, mockIntegratedResult, {}
      );

      expect(fixResult.success).toBe(true);
      expect(fixResult.suggestions.length).toBeGreaterThan(0);
      expect(fixResult.primarySuggestion.type).toBe('MISSING_DATA');
      expect(fixResult.primarySuggestion.message).toContain('Worker age or date of birth missing');
    });

    test('should generate fix suggestions for GREEN status', async () => {
      const worker = {
        worker_id: 'W003',
        worker_name: 'Bob Wilson',
        age: 22
      };

      const payPeriod = {
        id: 'PP003',
        period_start: '2024-01-01',
        period_end: '2024-01-31'
      };

      const mockRAGResult = {
        success: true,
        ragStatus: 'GREEN',
        effectiveHourlyRate: 12.50,
        requiredHourlyRate: 11.44
      };

      const mockIntegratedResult = {
        effectiveHourlyRate: 12.50,
        hoursWorked: 37,
        totalPay: 462.50,
        totalOffsets: 0,
        totalDeductions: 0,
        netPayForNMW: 462.50
      };

      const fixResult = await integratedService.generateFixSuggestions(
        worker, payPeriod, mockRAGResult, mockIntegratedResult, {}
      );

      expect(fixResult.success).toBe(true);
      expect(fixResult.suggestions.length).toBeGreaterThan(0);
      expect(fixResult.primarySuggestion.type).toBe('COMPLIANCE_CONFIRMED');
      expect(fixResult.primarySuggestion.message).toContain('meets minimum wage requirement');
    });
  });

  describe('Accommodation Flags Extraction', () => {
    test('should extract accommodation flags from integrated result', () => {
      const mockIntegratedResult = {
        breakdown: {
          accommodation_offsets: {
            daily_excess: 5.50,
            period_excess: 0,
            compliance_status: 'non_compliant'
          }
        }
      };

      const flags = integratedService.extractAccommodationFlags(mockIntegratedResult);

      expect(flags).toContain('daily_excess_violation');
      expect(flags).toContain('accommodation_compliance_violation');
      expect(flags).not.toContain('period_limit_exceeded');
    });

    test('should return empty flags for compliant accommodation', () => {
      const mockIntegratedResult = {
        breakdown: {
          accommodation_offsets: {
            daily_excess: 0,
            period_excess: 0,
            compliance_status: 'compliant'
          }
        }
      };

      const flags = integratedService.extractAccommodationFlags(mockIntegratedResult);

      expect(flags).toHaveLength(0);
    });
  });

  describe('Warning Consolidation', () => {
    test('should consolidate warnings from all sources', () => {
      const allowancePremiumResult = {
        success: true,
        warnings: [
          { type: 'unclassified_component', message: 'Unknown component', severity: 'medium' }
        ]
      };

      const troncExclusionResult = {
        success: true,
        warnings: [
          { type: 'significant_exclusion', message: 'Large tronc exclusion', severity: 'high' }
        ]
      };

      const ragStatusResult = {
        ragStatus: 'AMBER',
        amberFlags: ['zero_hours_with_pay', 'missing_age_data']
      };

      const fixSuggestionsResult = {
        suggestions: [
          { type: 'URGENT_REVIEW', severity: 'CRITICAL', message: 'Critical underpayment' },
          { type: 'DEDUCTION_REVIEW', severity: 'HIGH', message: 'Review deductions' }
        ]
      };

      const warnings = integratedService.consolidateWarnings(
        allowancePremiumResult,
        troncExclusionResult,
        ragStatusResult,
        fixSuggestionsResult
      );

      expect(warnings).toHaveLength(5); // 1 + 1 + 2 + 1
      
      // Check source attribution
      expect(warnings.some(w => w.source === 'allowances_premiums')).toBe(true);
      expect(warnings.some(w => w.source === 'tronc_exclusions')).toBe(true);
      expect(warnings.some(w => w.source === 'rag_status')).toBe(true);
      expect(warnings.some(w => w.source === 'fix_suggestions')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle RAG status service errors gracefully', async () => {
      // Mock RAG status service to throw error
      jest.spyOn(integratedService.ragStatusService, 'calculateRAGStatus')
        .mockRejectedValue(new Error('Service unavailable'));

      const worker = { worker_id: 'W001', age: 25 };
      const payPeriod = { id: 'PP001', period_start: '2024-01-01' };
      const mockIntegratedResult = { effectiveHourlyRate: 12.50 };

      const result = await integratedService.calculateRAGStatus(worker, payPeriod, mockIntegratedResult);

      expect(result.success).toBe(false);
      expect(result.ragStatus).toBe('AMBER');
      expect(result.reason).toBe('System error during RAG status calculation');
      expect(result.error).toBe('Service unavailable');
    });

    test('should handle fix suggestion service errors gracefully', async () => {
      // Mock fix suggestion service to throw error
      jest.spyOn(integratedService.fixSuggestionService, 'generateFixSuggestions')
        .mockImplementation(() => {
          throw new Error('Service unavailable');
        });

      const worker = { worker_id: 'W001', age: 25 };
      const payPeriod = { id: 'PP001', period_start: '2024-01-01' };
      const mockRAGResult = { ragStatus: 'RED' };
      const mockIntegratedResult = { effectiveHourlyRate: 10.00 };

      const result = await integratedService.generateFixSuggestions(
        worker, payPeriod, mockRAGResult, mockIntegratedResult, {}
      );

      expect(result.success).toBe(false);
      expect(result.suggestions).toEqual([]);
      expect(result.primarySuggestion).toBeNull();
      expect(result.error).toBe('Service unavailable');
    });
  });
});
