const NMWRateLookupService = require('../src/services/nmwRateLookupService');
const fs = require('fs').promises;

// Mock fs module for testing
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn()
  }
}));

describe('NMW Rate Lookup Service Tests', () => {
  let nmwRateService;
  let mockFs;

  beforeEach(() => {
    jest.clearAllMocks();
    nmwRateService = new NMWRateLookupService();
    mockFs = require('fs').promises;
    
    // Mock the rates configuration
    const mockRatesConfig = {
      metadata: {
        version: '1.0.0',
        source: 'GOV.UK rates'
      },
      rates: [
        {
          effectiveFrom: '2024-04-01',
          effectiveTo: null,
          description: 'April 2024 rates',
          rates: {
            national_living_wage: {
              minAge: 21,
              maxAge: null,
              hourlyRate: 11.44,
              description: 'National Living Wage (21 and over)',
              category: 'NLW'
            },
            nmw_18_20: {
              minAge: 18,
              maxAge: 20,
              hourlyRate: 8.60,
              description: 'National Minimum Wage (18-20)',
              category: 'NMW'
            },
            nmw_16_17: {
              minAge: 16,
              maxAge: 17,
              hourlyRate: 6.40,
              description: 'National Minimum Wage (16-17)',
              category: 'NMW'
            },
            apprentice: {
              minAge: null,
              maxAge: null,
              hourlyRate: 6.40,
              description: 'Apprentice Rate',
              category: 'APPRENTICE'
            }
          }
        },
        {
          effectiveFrom: '2023-04-01',
          effectiveTo: '2024-03-31',
          description: 'April 2023 rates',
          rates: {
            national_living_wage: {
              minAge: 23,
              maxAge: null,
              hourlyRate: 10.42,
              description: 'National Living Wage (23 and over)',
              category: 'NLW'
            },
            nmw_21_22: {
              minAge: 21,
              maxAge: 22,
              hourlyRate: 10.18,
              description: 'National Minimum Wage (21-22)',
              category: 'NMW'
            },
            nmw_18_20: {
              minAge: 18,
              maxAge: 20,
              hourlyRate: 7.49,
              description: 'National Minimum Wage (18-20)',
              category: 'NMW'
            },
            nmw_16_17: {
              minAge: 16,
              maxAge: 17,
              hourlyRate: 5.28,
              description: 'National Minimum Wage (16-17)',
              category: 'NMW'
            },
            apprentice: {
              minAge: null,
              maxAge: null,
              hourlyRate: 5.28,
              description: 'Apprentice Rate',
              category: 'APPRENTICE'
            }
          }
        }
      ],
      accommodationOffset: {
        effectiveFrom: '2024-04-01',
        dailyLimit: 9.99,
        description: 'Maximum daily accommodation offset'
      }
    };

    mockFs.stat.mockResolvedValue({ mtime: new Date() });
    mockFs.readFile.mockResolvedValue(JSON.stringify(mockRatesConfig));
  });

  describe('Input Validation', () => {
    test('should validate worker age correctly', () => {
      const validAges = [16, 18, 21, 25, 65];
      for (const age of validAges) {
        const result = nmwRateService.validateInputs(age, '2024-04-01');
        expect(result.isValid).toBe(true);
      }
    });

    test('should reject invalid ages', () => {
      const invalidAges = [null, undefined, -1, 15, 200, 'twenty'];
      for (const age of invalidAges) {
        const result = nmwRateService.validateInputs(age, '2024-04-01');
        expect(result.isValid).toBe(false);
      }
    });

    test('should validate pay period dates', () => {
      const validDates = ['2024-04-01', new Date('2024-04-01'), '2023-12-31'];
      for (const date of validDates) {
        const result = nmwRateService.validateInputs(25, date);
        expect(result.isValid).toBe(true);
      }
    });

    test('should reject invalid dates', () => {
      const invalidDates = [null, undefined, 'invalid-date', '2024-13-01'];
      for (const date of invalidDates) {
        const result = nmwRateService.validateInputs(25, date);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('Rate Period Lookup', () => {
    beforeEach(async () => {
      await nmwRateService.loadRates();
    });

    test('should find correct rate period for 2024 dates', () => {
      const dates = ['2024-04-01', '2024-06-15', '2024-12-31'];
      for (const date of dates) {
        const period = nmwRateService.findApplicableRatePeriod(date);
        expect(period).toBeDefined();
        expect(period.effectiveFrom).toBe('2024-04-01');
        expect(period.effectiveTo).toBeNull();
      }
    });

    test('should find correct rate period for 2023 dates', () => {
      const dates = ['2023-04-01', '2023-08-15', '2024-03-31'];
      for (const date of dates) {
        const period = nmwRateService.findApplicableRatePeriod(date);
        expect(period).toBeDefined();
        expect(period.effectiveFrom).toBe('2023-04-01');
        expect(period.effectiveTo).toBe('2024-03-31');
      }
    });

    test('should return null for dates outside known periods', () => {
      const period = nmwRateService.findApplicableRatePeriod('2020-01-01');
      expect(period).toBeNull();
    });
  });

  describe('Age-Based Rate Determination', () => {
    test('should return NLW for workers 21+ in 2024', async () => {
      const ages = [21, 25, 30, 65];
      for (const age of ages) {
        const result = await nmwRateService.getRequiredRate(age, '2024-04-01');
        expect(result.success).toBe(true);
        expect(result.hourlyRate).toBe(11.44);
        expect(result.description).toBe('National Living Wage (21 and over)');
        expect(result.category).toBe('NLW');
      }
    });

    test('should return correct NMW rates for younger workers in 2024', async () => {
      // 18-20 year olds
      const result18_20 = await nmwRateService.getRequiredRate(19, '2024-04-01');
      expect(result18_20.success).toBe(true);
      expect(result18_20.hourlyRate).toBe(8.60);
      expect(result18_20.description).toBe('National Minimum Wage (18-20)');

      // 16-17 year olds
      const result16_17 = await nmwRateService.getRequiredRate(17, '2024-04-01');
      expect(result16_17.success).toBe(true);
      expect(result16_17.hourlyRate).toBe(6.40);
      expect(result16_17.description).toBe('National Minimum Wage (16-17)');
    });

    test('should return correct historical rates for 2023', async () => {
      // NLW was for 23+ in 2023
      const resultNLW = await nmwRateService.getRequiredRate(25, '2023-06-01');
      expect(resultNLW.success).toBe(true);
      expect(resultNLW.hourlyRate).toBe(10.42);

      // 21-22 had separate rate in 2023
      const result21_22 = await nmwRateService.getRequiredRate(22, '2023-06-01');
      expect(result21_22.success).toBe(true);
      expect(result21_22.hourlyRate).toBe(10.18);
      expect(result21_22.description).toBe('National Minimum Wage (21-22)');
    });
  });

  describe('Apprentice Rate Logic', () => {
    test('should return apprentice rate for apprentices under 19', async () => {
      const result = await nmwRateService.getRequiredRate(18, '2024-04-01', true);
      expect(result.success).toBe(true);
      expect(result.hourlyRate).toBe(6.40);
      expect(result.category).toBe('APPRENTICE');
      expect(result.reason).toContain('under 19');
    });

    test('should return apprentice rate for 19+ in first year of apprenticeship', async () => {
      const apprenticeshipStart = '2024-01-01';
      const payPeriod = '2024-06-01'; // 5 months into apprenticeship
      
      const result = await nmwRateService.getRequiredRate(20, payPeriod, true, apprenticeshipStart);
      expect(result.success).toBe(true);
      expect(result.hourlyRate).toBe(6.40);
      expect(result.category).toBe('APPRENTICE');
      expect(result.reason).toContain('first year');
    });

    test('should return age-based rate for 19+ after first year of apprenticeship', async () => {
      const apprenticeshipStart = '2022-01-01'; // More than 2 years ago
      const payPeriod = '2024-06-01';
      
      const result = await nmwRateService.getRequiredRate(20, payPeriod, true, apprenticeshipStart);
      expect(result.success).toBe(true);
      expect(result.hourlyRate).toBe(8.60); // 18-20 rate, not apprentice rate
      expect(result.category).toBe('NMW');
    });

    test('should handle apprentice without start date', async () => {
      const result = await nmwRateService.getRequiredRate(20, '2024-04-01', true, null);
      expect(result.success).toBe(true);
      expect(result.hourlyRate).toBe(8.60); // Falls back to age-based rate
      expect(result.category).toBe('NMW');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid input gracefully', async () => {
      const result = await nmwRateService.getRequiredRate(null, '2024-04-01');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input validation failed');
    });

    test('should handle configuration loading errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      const result = await nmwRateService.getRequiredRate(25, '2024-04-01');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate lookup failed');
    });

    test('should handle dates outside rate periods', async () => {
      const result = await nmwRateService.getRequiredRate(25, '2020-01-01');
      expect(result.success).toBe(false);
      expect(result.error).toBe('No applicable rate period found');
    });
  });

  describe('Age Calculation', () => {
    test('should calculate age correctly', () => {
      const age1 = nmwRateService.calculateAge('2000-01-01', '2024-01-01');
      expect(age1).toBe(24);

      const age2 = nmwRateService.calculateAge('2000-06-15', '2024-03-01');
      expect(age2).toBe(23); // Birthday hasn't occurred yet

      const age3 = nmwRateService.calculateAge('2000-06-15', '2024-07-01');
      expect(age3).toBe(24); // Birthday has occurred
    });
  });

  describe('Bulk Operations', () => {
    test('should perform bulk rate lookup correctly', async () => {
      const workers = [
        { id: 1, age: 25 },
        { id: 2, age: 19 },
        { id: 3, age: 17 },
        { id: 4, age: 18, isApprentice: true }
      ];

      const results = await nmwRateService.bulkRateLookup(workers, '2024-04-01');
      
      expect(results).toHaveLength(4);
      expect(results[0].hourlyRate).toBe(11.44); // NLW
      expect(results[1].hourlyRate).toBe(8.60);  // 18-20 NMW
      expect(results[2].hourlyRate).toBe(6.40);  // 16-17 NMW
      expect(results[3].hourlyRate).toBe(6.40);  // Apprentice rate
      expect(results[3].category).toBe('APPRENTICE');
    });
  });

  describe('Additional Services', () => {
    test('should get all rates for a specific date', async () => {
      const result = await nmwRateService.getAllRatesForDate('2024-04-01');
      
      expect(result.success).toBe(true);
      expect(result.rates).toBeDefined();
      expect(result.rates.national_living_wage.hourlyRate).toBe(11.44);
      expect(result.ratePeriod.effectiveFrom).toBe('2024-04-01');
    });

    test('should get accommodation offset information', async () => {
      const result = await nmwRateService.getAccommodationOffset('2024-04-01');
      
      expect(result.success).toBe(true);
      expect(result.dailyLimit).toBe(9.99);
      expect(result.description).toContain('accommodation offset');
    });

    test('should get rate history', async () => {
      const result = await nmwRateService.getRateHistory();
      
      expect(result.success).toBe(true);
      expect(result.history).toBeInstanceOf(Array);
      expect(result.history.length).toBe(2); // 2024 and 2023 periods
      expect(result.history[0].effectiveFrom).toBe('2024-04-01');
    });
  });

  describe('Apprentice Eligibility Logic', () => {
    test('should check apprentice eligibility correctly', () => {
      // Under 19 - always eligible
      const result1 = nmwRateService.checkApprenticeEligibility(18, null);
      expect(result1.isEligible).toBe(true);
      expect(result1.reason).toContain('under 19');

      // 19+ in first year
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6); // 6 months ago
      const result2 = nmwRateService.checkApprenticeEligibility(20, startDate.toISOString());
      expect(result2.isEligible).toBe(true);
      expect(result2.reason).toContain('first year');

      // 19+ after first year
      const oldStartDate = new Date();
      oldStartDate.setFullYear(oldStartDate.getFullYear() - 2);
      const result3 = nmwRateService.checkApprenticeEligibility(20, oldStartDate.toISOString());
      expect(result3.isEligible).toBe(false);
      expect(result3.reason).toContain('completed first year');
    });
  });

  describe('Age Range Checking', () => {
    test('should check age ranges correctly', () => {
      expect(nmwRateService.isAgeInRange(25, 21, null)).toBe(true);  // NLW range
      expect(nmwRateService.isAgeInRange(19, 18, 20)).toBe(true);    // 18-20 range
      expect(nmwRateService.isAgeInRange(17, 18, 20)).toBe(false);   // Below range
      expect(nmwRateService.isAgeInRange(21, 18, 20)).toBe(false);   // Above range
      expect(nmwRateService.isAgeInRange(16, 16, 17)).toBe(true);    // Lower boundary
      expect(nmwRateService.isAgeInRange(17, 16, 17)).toBe(true);    // Upper boundary
    });
  });
});
