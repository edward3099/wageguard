const path = require('path');
const fs = require('fs').promises;
const nmwComponentRules = require('../src/config/nmwComponentRules');

// Mock fs module for testing
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

describe('NMW Component Rules Module Tests', () => {
  let mockFs;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs = require('fs').promises;
    nmwComponentRules.rules = null;
    nmwComponentRules.lastModified = null;
  });

  describe('Configuration Loading', () => {
    test('should load NMW component rules from file', async () => {
      const mockRules = {
        metadata: {
          version: '1.0.0',
          source: 'GOV.UK regulations'
        },
        payComponents: {
          basicPay: {
            category: 'included',
            treatment: 'full_inclusion',
            keywords: ['basic_pay', 'salary']
          }
        }
      };

      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRules));

      const result = await nmwComponentRules.loadRules();
      
      expect(result).toEqual(mockRules);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('nmw-components.json'),
        'utf8'
      );
    });

    test('should create default rules if file does not exist', async () => {
      const defaultRules = {
        metadata: { version: '1.0.0' },
        payComponents: { basicPay: { category: 'included' } }
      };

      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockResolvedValue();

      const result = await nmwComponentRules.loadRules();
      
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('payComponents');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    test('should handle file read errors gracefully', async () => {
      mockFs.stat.mockRejectedValue(new Error('Permission denied'));
      
      await expect(nmwComponentRules.loadRules()).rejects.toThrow('Failed to load NMW component rules');
    });
  });

  describe('Component Classification', () => {
    beforeEach(async () => {
      const mockRules = {
        payComponents: {
          basicPay: {
            category: 'included',
            treatment: 'full_inclusion',
            keywords: ['basic_pay', 'salary', 'wages'],
            description: 'Basic salary or hourly wages'
          },
          tips: {
            customer: {
              category: 'excluded',
              treatment: 'full_exclusion',
              keywords: ['tips', 'gratuities', 'service_charge'],
              description: 'Tips from customers'
            }
          },
          allowances: {
            general: {
              category: 'included',
              treatment: 'full_inclusion',
              keywords: ['london_weighting', 'shift_allowance'],
              description: 'General allowances'
            },
            expenses: {
              category: 'excluded',
              treatment: 'full_exclusion',
              keywords: ['travel_expenses', 'mileage'],
              description: 'Expense reimbursements'
            }
          }
        }
      };

      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRules));
      await nmwComponentRules.loadRules();
    });

    test('should classify basic pay correctly', async () => {
      const result = await nmwComponentRules.classifyComponent('Basic Pay');
      
      expect(result.category).toBe('included');
      expect(result.treatment).toBe('full_inclusion');
      expect(result.confidence).toBe('high');
      expect(result.description).toBe('Basic salary or hourly wages');
    });

    test('should classify tips correctly', async () => {
      const result = await nmwComponentRules.classifyComponent('Tips');
      
      expect(result.category).toBe('excluded');
      expect(result.treatment).toBe('full_exclusion');
      expect(result.categoryPath).toBe('tips.customer');
    });

    test('should classify shift allowance correctly', async () => {
      const result = await nmwComponentRules.classifyComponent('Shift Allowance');
      
      expect(result.category).toBe('included');
      expect(result.treatment).toBe('full_inclusion');
      expect(result.categoryPath).toBe('allowances.general');
    });

    test('should classify travel expenses correctly', async () => {
      const result = await nmwComponentRules.classifyComponent('Travel Expenses');
      
      expect(result.category).toBe('excluded');
      expect(result.treatment).toBe('full_exclusion');
      expect(result.categoryPath).toBe('allowances.expenses');
    });

    test('should handle unclassified components', async () => {
      const result = await nmwComponentRules.classifyComponent('Unknown Payment');
      
      expect(result.category).toBe('unclassified');
      expect(result.treatment).toBe('requires_manual_review');
      expect(result.confidence).toBe('none');
    });

    test('should handle variations in component names', async () => {
      const variations = [
        'basic-pay',
        'Basic_Pay',
        'BASIC PAY',
        'basic.pay'
      ];

      for (const variation of variations) {
        const result = await nmwComponentRules.classifyComponent(variation);
        expect(result.category).toBe('included');
      }
    });
  });

  describe('Confidence Calculation', () => {
    test('should return high confidence for exact matches', () => {
      const confidence = nmwComponentRules.calculateConfidence('basic_pay', 'basic_pay');
      expect(confidence).toBe('high');
    });

    test('should return high confidence for long keyword matches', () => {
      const confidence = nmwComponentRules.calculateConfidence('shift_allowance', 'shift_allowance_extra');
      expect(confidence).toBe('high');
    });

    test('should return medium confidence for partial matches', () => {
      const confidence = nmwComponentRules.calculateConfidence('pay', 'basic_pay');
      expect(confidence).toBe('medium');
    });
  });

  describe('Category Rules Retrieval', () => {
    beforeEach(async () => {
      const mockRules = {
        payComponents: {
          allowances: {
            general: { category: 'included' },
            expenses: { category: 'excluded' }
          },
          tips: {
            customer: { category: 'excluded' }
          }
        }
      };

      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRules));
      await nmwComponentRules.loadRules();
    });

    test('should get category rules correctly', async () => {
      const allowanceRules = await nmwComponentRules.getCategoryRules('allowances');
      
      expect(allowanceRules).toHaveProperty('general');
      expect(allowanceRules).toHaveProperty('expenses');
      expect(allowanceRules.general.category).toBe('included');
    });

    test('should return null for non-existent category', async () => {
      const result = await nmwComponentRules.getCategoryRules('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('Validation', () => {
    test('should validate classifications correctly', () => {
      const classifications = [
        {
          category: 'included',
          confidence: 'high',
          originalName: 'Basic Pay'
        },
        {
          category: 'unclassified',
          treatment: 'requires_manual_review',
          originalName: 'Unknown Payment'
        },
        {
          category: 'excluded',
          confidence: 'low',
          originalName: 'Questionable Allowance'
        }
      ];

      const validation = nmwComponentRules.validateClassifications(classifications);
      
      expect(validation.isValid).toBe(true);
      expect(validation.totalClassified).toBe(2);
      expect(validation.totalUnclassified).toBe(1);
      expect(validation.warnings).toHaveLength(2);
      expect(validation.unclassified).toContain('Unknown Payment');
    });

    test('should identify low confidence classifications', () => {
      const classifications = [
        {
          category: 'included',
          confidence: 'low',
          originalName: 'Ambiguous Payment'
        }
      ];

      const validation = nmwComponentRules.validateClassifications(classifications);
      expect(validation.warnings).toContain("Low confidence classification for 'Ambiguous Payment'");
    });
  });

  describe('Mapping Priority', () => {
    test('should get mapping priority rules', async () => {
      const mockRules = {
        mappingPriority: {
          high_confidence: ['tips', 'basic_pay'],
          requires_clarification: ['allowance', 'bonus']
        }
      };

      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRules));
      
      const priority = await nmwComponentRules.getMappingPriority();
      
      expect(priority.high_confidence).toContain('tips');
      expect(priority.requires_clarification).toContain('allowance');
    });
  });

  describe('Calculation Rules', () => {
    test('should get calculation rules and order', async () => {
      const mockRules = {
        calculationRules: {
          formula: 'Total NMW-eligible remuneration / Total hours worked',
          order: ['Start with gross pay', 'Add qualifying allowances']
        }
      };

      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRules));
      
      const calculationRules = await nmwComponentRules.getCalculationRules();
      
      expect(calculationRules.formula).toContain('Total NMW-eligible remuneration');
      expect(calculationRules.order).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    test('should handle JSON parsing errors', async () => {
      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue('invalid json');
      
      await expect(nmwComponentRules.loadRules()).rejects.toThrow();
    });

    test('should handle file write errors when creating defaults', async () => {
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));
      
      await expect(nmwComponentRules.loadRules()).rejects.toThrow('Failed to create default NMW component rules');
    });
  });
});
