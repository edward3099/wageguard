const PRPCalculationService = require('../src/services/prpCalculationService');

describe('PRP Calculation Service Tests', () => {
  let prpService;

  beforeAll(() => {
    prpService = new PRPCalculationService();
  });

  describe('Input Validation', () => {
    test('should validate required worker ID', () => {
      const worker = { age: 25 };
      const payPeriod = {
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        total_hours: 160,
        total_pay: 1280.00
      };

      expect(() => {
        prpService.validateInputs(worker, payPeriod);
      }).toThrow('Worker ID is required');
    });

    test('should validate required pay period dates', () => {
      const worker = { id: 1, age: 25 };
      const payPeriod = {
        total_hours: 160,
        total_pay: 1280.00
      };

      expect(() => {
        prpService.validateInputs(worker, payPeriod);
      }).toThrow('Pay period start and end dates are required');
    });

    test('should validate positive total hours', () => {
      const worker = { id: 1, age: 25 };
      const payPeriod = {
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        total_hours: 0,
        total_pay: 1280.00
      };

      expect(() => {
        prpService.validateInputs(worker, payPeriod);
      }).toThrow('Total hours must be greater than 0');
    });

    test('should validate positive total pay', () => {
      const worker = { id: 1, age: 25 };
      const payPeriod = {
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        total_hours: 160,
        total_pay: -100
      };

      expect(() => {
        prpService.validateInputs(worker, payPeriod);
      }).toThrow('Total pay must be greater than 0');
    });

    test('should validate date format', () => {
      const worker = { id: 1, age: 25 };
      const payPeriod = {
        period_start: 'invalid-date',
        period_end: '2024-01-31',
        total_hours: 160,
        total_pay: 1280.00
      };

      expect(() => {
        prpService.validateInputs(worker, payPeriod);
      }).toThrow('Invalid date format');
    });

    test('should validate start date before end date', () => {
      const worker = { id: 1, age: 25 };
      const payPeriod = {
        period_start: '2024-01-31',
        period_end: '2024-01-01',
        total_hours: 160,
        total_pay: 1280.00
      };

      expect(() => {
        prpService.validateInputs(worker, payPeriod);
      }).toThrow('Period start date must be before end date');
    });

    test('should pass validation with valid inputs', () => {
      const worker = { id: 1, age: 25 };
      const payPeriod = {
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        total_hours: 160,
        total_pay: 1280.00
      };

      expect(() => {
        prpService.validateInputs(worker, payPeriod);
      }).not.toThrow();
    });
  });

  describe('PRP Date Calculation', () => {
    test('should identify weekly PRP correctly', () => {
      const start = '2024-01-01';
      const end = '2024-01-07';
      const result = prpService.calculatePRPDates(start, end);

      expect(result.type).toBe('weekly');
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
    });

    test('should identify monthly PRP correctly', () => {
      const start = '2024-01-01';
      const end = '2024-01-31';
      const result = prpService.calculatePRPDates(start, end);

      expect(result.type).toBe('monthly');
    });

    test('should identify quarterly PRP correctly', () => {
      const start = '2024-01-01';
      const end = '2024-04-01';
      const result = prpService.calculatePRPDates(start, end);

      expect(result.type).toBe('quarterly');
    });

    test('should identify annual PRP correctly', () => {
      const start = '2024-01-01';
      const end = '2024-12-31';
      const result = prpService.calculatePRPDates(start, end);

      expect(result.type).toBe('annual');
    });

    test('should align weekly PRP to Monday-Sunday', () => {
      const start = '2024-01-03'; // Wednesday
      const end = '2024-01-05';   // Friday
      const result = prpService.calculatePRPDates(start, end);

      expect(result.type).toBe('weekly');
      // Should align to Monday (Jan 1) and Sunday (Jan 7)
      expect(result.start.getDay()).toBe(1); // Monday
      expect(result.end.getDay()).toBe(0);   // Sunday
    });
  });

  describe('Applicable Rate Determination', () => {
    test('should return NLW for workers aged 23+', () => {
      const worker = { id: 1, age: 25, apprentice_status: false };
      const checkDate = new Date('2024-01-01');
      const result = prpService.determineApplicableRate(worker, checkDate);

      expect(result.rule_name).toBe('NLW_23_24');
      expect(result.rate).toBe(10.42);
      expect(result.worker_type).toBe('adult');
    });

    test('should return NMW 21-22 for workers aged 21-22', () => {
      const worker = { id: 2, age: 21, apprentice_status: false };
      const checkDate = new Date('2024-01-01');
      const result = prpService.determineApplicableRate(worker, checkDate);

      expect(result.rule_name).toBe('NMW_23_24_21_22');
      expect(result.rate).toBe(10.18);
      expect(result.worker_type).toBe('young_adult');
    });

    test('should return NMW 18-20 for workers aged 18-20', () => {
      const worker = { id: 3, age: 19, apprentice_status: false };
      const checkDate = new Date('2024-01-01');
      const result = prpService.determineApplicableRate(worker, checkDate);

      expect(result.rule_name).toBe('NMW_23_24_18_20');
      expect(result.rate).toBe(7.49);
      expect(result.worker_type).toBe('young_worker');
    });

    test('should return NMW 16-17 for workers aged 16-17', () => {
      const worker = { id: 4, age: 16, apprentice_status: false };
      const checkDate = new Date('2024-01-01');
      const result = prpService.determineApplicableRate(worker, checkDate);

      expect(result.rule_name).toBe('NMW_23_24_16_17');
      expect(result.rate).toBe(5.28);
      expect(result.worker_type).toBe('school_leaver');
    });

    test('should return apprentice rate for first year apprentices regardless of age', () => {
      const worker = { id: 5, age: 25, apprentice_status: true, first_year_apprentice: true };
      const checkDate = new Date('2024-01-01');
      const result = prpService.determineApplicableRate(worker, checkDate);

      expect(result.rule_name).toBe('NMW_23_24_APPRENTICE');
      expect(result.rate).toBe(5.28);
      expect(result.worker_type).toBe('first_year_apprentice');
    });

    test('should return apprentice rate for apprentices under 19', () => {
      const worker = { id: 6, age: 18, apprentice_status: true, first_year_apprentice: false };
      const checkDate = new Date('2024-01-01');
      const result = prpService.determineApplicableRate(worker, checkDate);

      expect(result.rule_name).toBe('NMW_23_24_APPRENTICE');
      expect(result.rate).toBe(5.28);
      expect(result.worker_type).toBe('apprentice');
    });

    test('should return age-appropriate rate for apprentices 19+', () => {
      const worker = { id: 7, age: 20, apprentice_status: true, first_year_apprentice: false };
      const checkDate = new Date('2024-01-01');
      const result = prpService.determineApplicableRate(worker, checkDate);

      expect(result.rule_name).toBe('NMW_23_24_18_20');
      expect(result.rate).toBe(7.49);
      expect(result.worker_type).toBe('young_worker');
    });

    test('should throw error for workers under 16', () => {
      const worker = { id: 8, age: 15, apprentice_status: false };
      const checkDate = new Date('2024-01-01');

      expect(() => {
        prpService.determineApplicableRate(worker, checkDate);
      }).toThrow('Worker age 15 is below minimum working age of 16');
    });
  });

  describe('Offset Processing', () => {
    test('should process accommodation offsets correctly', () => {
      const offsets = [
        {
          offset_type: 'accommodation',
          daily_rate: 8.50,
          days_applied: 5,
          amount: 42.50,
          is_accommodation: true
        }
      ];
      const prpDates = { start: new Date('2024-01-01'), end: new Date('2024-01-31') };
      const result = prpService.processOffsets(offsets, prpDates);

      expect(result.accommodation.total).toBe(42.50);
      expect(result.accommodation.daily).toBe(8.50);
      expect(result.accommodation.days).toBe(5);
      expect(result.accommodation.compliant).toBe(true);
      expect(result.totalValue).toBe(42.50);
    });

    test('should flag excessive accommodation offsets', () => {
      const offsets = [
        {
          offset_type: 'accommodation',
          daily_rate: 12.00,
          days_applied: 5,
          amount: 60.00,
          is_accommodation: true
        }
      ];
      const prpDates = { start: new Date('2024-01-01'), end: new Date('2024-01-31') };
      const result = prpService.processOffsets(offsets, prpDates);

      expect(result.accommodation.compliant).toBe(false);
      expect(result.accommodation.issues).toHaveLength(1);
      expect(result.accommodation.issues[0].type).toBe('exceeds_limit');
      expect(result.accommodation.issues[0].daily_rate).toBe(12.00);
      expect(result.accommodation.issues[0].limit).toBe(9.99);
    });

    test('should categorize offsets by description when type not specified', () => {
      const offsets = [
        {
          description: 'Housing accommodation',
          daily_rate: 5.00,
          days_applied: 3,
          amount: 15.00
        }
      ];
      const prpDates = { start: new Date('2024-01-01'), end: new Date('2024-01-31') };
      const result = prpService.processOffsets(offsets, prpDates);

      expect(result.accommodation.total).toBe(15.00);
      expect(result.totalValue).toBe(15.00);
    });
  });

  describe('Allowance Processing', () => {
    test('should process allowances correctly', () => {
      const allowances = [
        {
          allowance_type: 'bonus',
          amount: 100.00,
          is_bonus: true
        },
        {
          allowance_type: 'premium',
          amount: 50.00,
          is_premium: true
        }
      ];
      const prpDates = { start: new Date('2024-01-01'), end: new Date('2024-01-31') };
      const result = prpService.processAllowances(allowances, prpDates);

      expect(result.bonus.total).toBe(100.00);
      expect(result.premium.total).toBe(50.00);
      expect(result.totalValue).toBe(150.00);
    });

    test('should flag high allowance amounts', () => {
      const allowances = [
        {
          allowance_type: 'bonus',
          amount: 1500.00,
          is_bonus: true
        }
      ];
      const prpDates = { start: new Date('2024-01-01'), end: new Date('2024-01-31') };
      const result = prpService.processAllowances(allowances, prpDates);

      expect(result.bonus.issues).toHaveLength(1);
      expect(result.bonus.issues[0].type).toBe('high_amount');
      expect(result.bonus.issues[0].amount).toBe(1500.00);
    });
  });

  describe('Effective Hourly Rate Calculation', () => {
    test('should calculate effective rate correctly with no offsets or allowances', () => {
      const totalPay = 1280.00;
      const totalHours = 160;
      const totalOffsets = 0;
      const totalAllowances = 0;

      const result = prpService.calculateEffectiveHourlyRate(totalPay, totalHours, totalOffsets, totalAllowances);

      expect(result).toBe(8.00); // 1280 / 160
    });

    test('should calculate effective rate with offsets', () => {
      const totalPay = 1280.00;
      const totalHours = 160;
      const totalOffsets = 100.00;
      const totalAllowances = 0;

      const result = prpService.calculateEffectiveHourlyRate(totalPay, totalHours, totalOffsets, totalAllowances);

      expect(result).toBe(7.375); // (1280 - 100) / 160
    });

    test('should calculate effective rate with allowances', () => {
      const totalPay = 1280.00;
      const totalHours = 160;
      const totalOffsets = 0;
      const totalAllowances = 50.00;

      const result = prpService.calculateEffectiveHourlyRate(totalPay, totalHours, totalOffsets, totalAllowances);

      expect(result).toBe(8.3125); // (1280 + 50) / 160
    });

    test('should return 0 for zero hours', () => {
      const totalPay = 1280.00;
      const totalHours = 0;
      const totalOffsets = 0;
      const totalAllowances = 0;

      const result = prpService.calculateEffectiveHourlyRate(totalPay, totalHours, totalOffsets, totalAllowances);

      expect(result).toBe(0);
    });
  });

  describe('RAG Status Determination', () => {
    test('should return GREEN for compliant rates', () => {
      const effectiveRate = 10.50;
      const requiredRate = 10.42;

      const result = prpService.determineRAGStatus(effectiveRate, requiredRate);

      expect(result).toBe('GREEN');
    });

    test('should return AMBER for rates within tolerance', () => {
      const effectiveRate = 10.22; // Within 2% of 10.42
      const requiredRate = 10.42;

      const result = prpService.determineRAGStatus(effectiveRate, requiredRate);

      expect(result).toBe('AMBER');
    });

    test('should return RED for non-compliant rates', () => {
      const effectiveRate = 9.50;
      const requiredRate = 10.42;

      const result = prpService.determineRAGStatus(effectiveRate, requiredRate);

      expect(result).toBe('RED');
    });

    test('should use custom tolerance', () => {
      const effectiveRate = 10.30;
      const requiredRate = 10.42;
      const tolerance = 0.05; // 5%

      const result = prpService.determineRAGStatus(effectiveRate, requiredRate, tolerance);

      expect(result).toBe('AMBER');
    });
  });

  describe('Compliance Issues Generation', () => {
    test('should generate hourly rate issue for non-compliant rates', () => {
      const effectiveRate = 9.50;
      const requiredRate = 10.42;
      const offsets = { totalValue: 0 };
      const allowances = { totalValue: 0 };

      const result = prpService.generateComplianceIssues(effectiveRate, requiredRate, offsets, allowances);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('hourly_rate');
      expect(result[0].severity).toBe('high');
      expect(result[0].shortfall).toBeCloseTo(0.92, 2);
    });

    test('should generate offset issues for non-compliant offsets', () => {
      const effectiveRate = 10.50;
      const requiredRate = 10.42;
      const offsets = {
        accommodation: {
          compliant: false,
          issues: [{
            type: 'exceeds_limit',
            message: 'accommodation offset £12.00 exceeds limit £9.99',
            daily_rate: 12.00,
            limit: 9.99
          }]
        },
        totalValue: 0
      };
      const allowances = { totalValue: 0 };

      const result = prpService.generateComplianceIssues(effectiveRate, requiredRate, offsets, allowances);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('accommodation_offset');
      expect(result[0].severity).toBe('medium');
    });
  });

  describe('Fix Suggestions Generation', () => {
    test('should suggest pay increase for non-compliant rates', () => {
      const effectiveRate = 9.50;
      const requiredRate = 10.42;
      const offsets = { totalValue: 0 };
      const allowances = { totalValue: 0 };
      const totalHours = 160;

      const result = prpService.generateFixSuggestions(effectiveRate, requiredRate, offsets, allowances, totalHours);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('increase_pay');
      expect(result[0].priority).toBe('high');
      expect(result[0].shortfall_per_hour).toBeCloseTo(0.92, 2);
    });

    test('should suggest offset reduction when applicable', () => {
      const effectiveRate = 9.50;
      const requiredRate = 10.42;
      const offsets = {
        accommodation: { total: 0, daily: 0, days: 0, compliant: true, issues: [] },
        uniform: { total: 0, daily: 0, days: 0, compliant: true, issues: [] },
        meals: { total: 0, daily: 0, days: 0, compliant: true, issues: [] },
        deductions: { total: 0, daily: 0, days: 0, compliant: true, issues: [] },
        totalValue: 100.00,
        totalDays: 0
      };
      const allowances = { totalValue: 0 };
      const totalHours = 160;

      const result = prpService.generateFixSuggestions(effectiveRate, requiredRate, offsets, allowances, totalHours);

      expect(result).toHaveLength(2);
      expect(result[1].type).toBe('reduce_offsets');
      expect(result[1].required_reduction).toBeCloseTo(147.2, 1); // 0.92 * 160
    });
  });

  describe('Compliance Score Calculation', () => {
    test('should return 100 for perfect compliance', () => {
      const effectiveRate = 10.42;
      const requiredRate = 10.42;

      const result = prpService.calculateComplianceScore(effectiveRate, requiredRate);

      expect(result).toBe(100);
    });

    test('should calculate score for partial compliance', () => {
      const effectiveRate = 9.50;
      const requiredRate = 10.42;

      const result = prpService.calculateComplianceScore(effectiveRate, requiredRate);

      // 9.50/10.42 * 100 = 91.17, penalty = (10.42-9.50)/10.42 * 50 = 4.41
      // Final score = 91.17 - 4.41 = 86.76, rounded to 87
      expect(result).toBe(87);
    });

    test('should return low score for very low compliance', () => {
      const effectiveRate = 5.00;
      const requiredRate = 10.42;

      const result = prpService.calculateComplianceScore(effectiveRate, requiredRate);

      // 5.00/10.42 * 100 = 47.98, penalty = (10.42-5.00)/10.42 * 50 = 25.96
      // Final score = 47.98 - 25.96 = 22.02, rounded to 22
      expect(result).toBe(22);
    });
  });

  describe('Full PRP Calculation', () => {
    test('should calculate complete PRP for compliant worker', () => {
      const worker = {
        id: 1,
        age: 25,
        apprentice_status: false,
        first_year_apprentice: false
      };
      const payPeriod = {
        id: 1,
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        total_hours: 160,
        total_pay: 1280.00
      };
      const offsets = [];
      const allowances = [];

      const result = prpService.calculatePRP(worker, payPeriod, offsets, allowances);

      expect(result.success).toBe(true);
      expect(result.prp.effective_hourly_rate).toBe(8.00);
      expect(result.prp.required_hourly_rate).toBe(10.42);
      expect(result.compliance.rag_status).toBe('RED');
      expect(result.compliance.issues).toHaveLength(1);
      expect(result.compliance.fix_suggestions).toHaveLength(1);
      expect(result.applicable_rate.rule_name).toBe('NLW_23_24');
    });

    test('should handle calculation errors gracefully', () => {
      const worker = null;
      const payPeriod = {};

      const result = prpService.calculatePRP(worker, payPeriod);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Batch PRP Calculation', () => {
    test('should calculate PRP for multiple workers', () => {
      const workers = [
        { id: 1, age: 25, apprentice_status: false },
        { id: 2, age: 19, apprentice_status: false }
      ];
      const payPeriods = [
        { id: 1, worker_id: 1, period_start: '2024-01-01', period_end: '2024-01-31', total_hours: 160, total_pay: 1280.00 },
        { id: 2, worker_id: 2, period_start: '2024-01-01', period_end: '2024-01-31', total_hours: 160, total_pay: 1200.00 }
      ];
      const offsets = [];
      const allowances = [];

      const result = prpService.batchCalculatePRP(workers, payPeriods, offsets, allowances);

      expect(result.success).toBe(true);
      expect(result.total_workers).toBe(2);
      expect(result.calculations).toHaveLength(2);
      expect(result.summary.total_hours).toBe(320);
      expect(result.summary.total_pay).toBe(2480.00);
    });
  });
});
