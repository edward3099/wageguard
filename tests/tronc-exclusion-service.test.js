const TroncExclusionService = require('../src/services/troncExclusionService');
const nmwComponentRules = require('../src/config/nmwComponentRules');

// Mock the NMW component rules
jest.mock('../src/config/nmwComponentRules');

describe('Tronc Exclusion Service Tests', () => {
  let troncExclusionService;
  let mockRules;

  beforeEach(() => {
    jest.clearAllMocks();
    troncExclusionService = new TroncExclusionService();
    
    mockRules = {
      payComponents: {
        tips: {
          customer: {
            category: 'excluded',
            treatment: 'full_exclusion',
            description: 'Customer tips and gratuities'
          },
          tronc: {
            category: 'excluded',
            treatment: 'full_exclusion',
            description: 'Tronc system payments'
          }
        }
      }
    };

    nmwComponentRules.getAllRules.mockResolvedValue(mockRules);
  });

  describe('Input Validation', () => {
    test('should validate inputs correctly', () => {
      const validWorker = { id: 1, external_id: 'W001' };
      const validPayPeriod = { id: 1 };
      const validComponents = { tips: 50 };

      const result = troncExclusionService.validateInputs(validWorker, validPayPeriod, validComponents);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid worker data', () => {
      const invalidWorker = {};
      const validPayPeriod = { id: 1 };
      const validComponents = { tips: 50 };

      const result = troncExclusionService.validateInputs(invalidWorker, validPayPeriod, validComponents);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Worker ID is required');
    });

    test('should reject missing pay period', () => {
      const validWorker = { id: 1 };
      const invalidPayPeriod = {};
      const validComponents = { tips: 50 };

      const result = troncExclusionService.validateInputs(validWorker, invalidPayPeriod, validComponents);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pay period ID is required');
    });
  });

  describe('Tronc Component Identification', () => {
    test('should identify customer tips correctly', async () => {
      const payComponents = { 'customer_tips': 75, 'basic_pay': 1000 };

      nmwComponentRules.classifyComponent
        .mockResolvedValueOnce({
          category: 'excluded',
          categoryPath: 'tips.customer',
          confidence: 'high',
          description: 'Customer tips'
        })
        .mockResolvedValueOnce({
          category: 'included',
          categoryPath: 'basic_pay',
          confidence: 'high'
        });

      const troncComponents = await troncExclusionService.identifyTroncComponents(payComponents);
      
      expect(troncComponents).toHaveLength(1);
      expect(troncComponents[0].componentName).toBe('customer_tips');
      expect(troncComponents[0].value).toBe(75);
      expect(troncComponents[0].detectionMethod).toBe('rule_based_high_confidence');
    });

    test('should identify tronc payments correctly', async () => {
      const payComponents = { 'tronc_payments': 120, 'salary': 2000 };

      nmwComponentRules.classifyComponent
        .mockResolvedValueOnce({
          category: 'excluded',
          categoryPath: 'tips.tronc',
          confidence: 'high',
          description: 'Tronc payments'
        })
        .mockResolvedValueOnce({
          category: 'included',
          confidence: 'high'
        });

      const troncComponents = await troncExclusionService.identifyTroncComponents(payComponents);
      
      expect(troncComponents).toHaveLength(1);
      expect(troncComponents[0].componentName).toBe('tronc_payments');
      expect(troncComponents[0].value).toBe(120);
    });

    test('should identify tips by keyword detection', async () => {
      const payComponents = { 'tips': 85, 'gratuities': 40 };

      nmwComponentRules.classifyComponent.mockResolvedValue({
        category: 'unclassified',
        confidence: 'none'
      });

      const troncComponents = await troncExclusionService.identifyTroncComponents(payComponents);
      
      expect(troncComponents).toHaveLength(2);
      expect(troncComponents[0].componentName).toBe('tips');
      expect(troncComponents[0].detectionMethod).toBe('keyword_detection');
      expect(troncComponents[1].componentName).toBe('gratuities');
    });

    test('should skip null and zero values', async () => {
      const payComponents = {
        'tips': 50,
        'zero_tips': 0,
        'null_tips': null,
        'undefined_tips': undefined
      };

      nmwComponentRules.classifyComponent.mockResolvedValue({
        category: 'unclassified',
        confidence: 'none'
      });

      const troncComponents = await troncExclusionService.identifyTroncComponents(payComponents);
      
      expect(troncComponents).toHaveLength(1);
      expect(troncComponents[0].componentName).toBe('tips');
    });
  });

  describe('Tronc Related Detection', () => {
    test('should detect tronc-related components by category path', () => {
      const classification = {
        categoryPath: 'tips.customer',
        confidence: 'high'
      };

      const result = troncExclusionService.isTroncRelated(classification, 'customer_tips');
      expect(result).toBe(true);
    });

    test('should detect tronc-related components by keywords', () => {
      const classification = {
        category: 'unclassified',
        confidence: 'none'
      };

      const troncKeywords = ['tronc', 'tips', 'gratuities', 'service_charge'];
      
      for (const keyword of troncKeywords) {
        const result = troncExclusionService.isTroncRelated(classification, keyword);
        expect(result).toBe(true);
      }
    });

    test('should not detect non-tronc components', () => {
      const classification = {
        category: 'included',
        confidence: 'high'
      };

      const result = troncExclusionService.isTroncRelated(classification, 'basic_salary');
      expect(result).toBe(false);
    });
  });

  describe('Component Processing', () => {
    test('should exclude high-confidence tronc components', async () => {
      const troncComponents = [
        {
          componentName: 'tips',
          value: 75,
          classification: { category: 'excluded', confidence: 'high' },
          detectionMethod: 'rule_based_high_confidence'
        }
      ];

      const processed = await troncExclusionService.processTroncComponents(troncComponents, mockRules);
      
      expect(processed.excluded).toHaveLength(1);
      expect(processed.excluded[0].name).toBe('tips');
      expect(processed.excluded[0].value).toBe(75);
      expect(processed.excluded[0].nmw_treatment).toBe('full_exclusion');
      expect(processed.total_excluded).toBe(75);
    });

    test('should flag low-confidence components for review', async () => {
      const troncComponents = [
        {
          componentName: 'possible_tips',
          value: 50,
          classification: { category: 'excluded', confidence: 'low' },
          detectionMethod: 'keyword_detection'
        }
      ];

      const processed = await troncExclusionService.processTroncComponents(troncComponents, mockRules);
      
      expect(processed.flagged).toHaveLength(1);
      expect(processed.flagged[0].name).toBe('possible_tips');
      expect(processed.flagged[0].value).toBe(50);
      expect(processed.flagged[0].review_reason).toContain('manual verification');
      expect(processed.total_flagged).toBe(50);
    });

    test('should handle mixed confidence components', async () => {
      const troncComponents = [
        {
          componentName: 'confirmed_tips',
          value: 100,
          classification: { category: 'excluded', confidence: 'high' },
          detectionMethod: 'rule_based_high_confidence'
        },
        {
          componentName: 'possible_gratuity',
          value: 30,
          classification: { category: 'excluded', confidence: 'medium' },
          detectionMethod: 'keyword_detection'
        }
      ];

      const processed = await troncExclusionService.processTroncComponents(troncComponents, mockRules);
      
      expect(processed.excluded).toHaveLength(1);
      expect(processed.flagged).toHaveLength(1);
      expect(processed.total_excluded).toBe(100);
      expect(processed.total_flagged).toBe(30);
    });
  });

  describe('Exclusion Reasons', () => {
    test('should provide correct reasons for customer tips', () => {
      const component = {
        classification: { categoryPath: 'tips.customer' }
      };

      const reason = troncExclusionService.getExclusionReason(component);
      expect(reason).toContain('Customer tips and gratuities are excluded');
      expect(reason).toContain('UK regulations');
    });

    test('should provide correct reasons for tronc payments', () => {
      const component = {
        classification: { categoryPath: 'tips.tronc' }
      };

      const reason = troncExclusionService.getExclusionReason(component);
      expect(reason).toContain('Tronc payments are excluded');
      expect(reason).toContain('UK regulations');
    });

    test('should provide generic reason for keyword-detected components', () => {
      const component = {
        classification: { categoryPath: 'unclassified' }
      };

      const reason = troncExclusionService.getExclusionReason(component);
      expect(reason).toContain('identified as tip/gratuity based on naming pattern');
    });
  });

  describe('Compliance Warnings', () => {
    test('should generate critical warning for excluded tronc payments', () => {
      const processed = {
        excluded: [
          { name: 'tips', value: 75 },
          { name: 'service_charge', value: 25 }
        ],
        flagged: [],
        total_excluded: 100
      };

      const payComponents = { total_pay: 1000, tips: 75, service_charge: 25 };

      const warnings = troncExclusionService.generateComplianceWarnings(processed, payComponents);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('tronc_exclusion_critical');
      expect(warnings[0].severity).toBe('red');
      expect(warnings[0].message).toContain('£100.00 in tips/tronc payments excluded');
      expect(warnings[0].action_required).toContain('basic pay alone meets NMW');
    });

    test('should generate warning for flagged components', () => {
      const processed = {
        excluded: [],
        flagged: [
          { name: 'possible_tips', value: 50 }
        ],
        total_excluded: 0
      };

      const payComponents = { total_pay: 1000, possible_tips: 50 };

      const warnings = troncExclusionService.generateComplianceWarnings(processed, payComponents);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('potential_tronc_review');
      expect(warnings[0].severity).toBe('amber');
      expect(warnings[0].message).toContain('require manual verification');
    });

    test('should generate warning for significant tip proportion', () => {
      const processed = {
        excluded: [{ name: 'tips', value: 300 }],
        flagged: [],
        total_excluded: 300
      };

      const payComponents = { total_pay: 1000, tips: 300 };

      const warnings = troncExclusionService.generateComplianceWarnings(processed, payComponents);
      
      expect(warnings).toHaveLength(2); // Critical + proportion warning
      expect(warnings[1].type).toBe('significant_tip_proportion');
      expect(warnings[1].severity).toBe('amber');
      expect(warnings[1].details).toContain('30.0% of total pay is excluded');
    });
  });

  describe('Pay Adjustment Calculations', () => {
    test('should calculate adjusted pay correctly', () => {
      const originalComponents = { total_pay: 1000, tips: 150 };
      const processed = { total_excluded: 150 };

      const adjustment = troncExclusionService.calculateAdjustedPay(originalComponents, processed);
      
      expect(adjustment.original_gross_pay).toBe(1000);
      expect(adjustment.total_tronc_excluded).toBe(150);
      expect(adjustment.adjusted_pay_for_nmw).toBe(850);
      expect(adjustment.adjustment_percentage).toBe(15);
      expect(adjustment.exclusion_impact).toBe('moderate');
    });

    test('should handle case with no tronc exclusions', () => {
      const originalComponents = { total_pay: 1000 };
      const processed = { total_excluded: 0 };

      const adjustment = troncExclusionService.calculateAdjustedPay(originalComponents, processed);
      
      expect(adjustment.original_gross_pay).toBe(1000);
      expect(adjustment.total_tronc_excluded).toBe(0);
      expect(adjustment.adjusted_pay_for_nmw).toBe(1000);
      expect(adjustment.adjustment_percentage).toBe(0);
      expect(adjustment.exclusion_impact).toBe('none');
    });
  });

  describe('Impact Categorization', () => {
    test('should categorize adjustment impact correctly', () => {
      expect(troncExclusionService.categorizeAdjustmentImpact(0)).toBe('none');
      expect(troncExclusionService.categorizeAdjustmentImpact(3)).toBe('minimal');
      expect(troncExclusionService.categorizeAdjustmentImpact(15)).toBe('moderate');
      expect(troncExclusionService.categorizeAdjustmentImpact(25)).toBe('significant');
      expect(troncExclusionService.categorizeAdjustmentImpact(35)).toBe('critical');
    });
  });

  describe('Gross Pay Estimation', () => {
    test('should use total_pay if available', () => {
      const components = { total_pay: 1500, tips: 100, basic_pay: 1000 };
      const grossPay = troncExclusionService.estimateGrossPay(components);
      expect(grossPay).toBe(1500);
    });

    test('should use gross_pay as fallback', () => {
      const components = { gross_pay: 1200, tips: 100, basic_pay: 1000 };
      const grossPay = troncExclusionService.estimateGrossPay(components);
      expect(grossPay).toBe(1200);
    });

    test('should sum all components if no total available', () => {
      const components = { basic_pay: 1000, tips: 100, allowance: 200 };
      const grossPay = troncExclusionService.estimateGrossPay(components);
      expect(grossPay).toBe(1300);
    });
  });

  describe('Full Integration Test', () => {
    test('should process tronc exclusions end-to-end', async () => {
      const worker = { id: 1, external_id: 'W001' };
      const payPeriod = { id: 1 };
      const payComponents = {
        total_pay: 1200,
        basic_pay: 1000,
        tips: 150,
        service_charge: 50
      };

      // Mock classifications
      nmwComponentRules.classifyComponent
        .mockResolvedValueOnce({ // total_pay
          category: 'included',
          confidence: 'high'
        })
        .mockResolvedValueOnce({ // basic_pay
          category: 'included',
          confidence: 'high'
        })
        .mockResolvedValueOnce({ // tips
          category: 'excluded',
          categoryPath: 'tips.customer',
          confidence: 'high'
        })
        .mockResolvedValueOnce({ // service_charge
          category: 'excluded',
          categoryPath: 'tips.customer',
          confidence: 'high'
        });

      const result = await troncExclusionService.processTroncExclusions(worker, payPeriod, payComponents);
      
      expect(result.success).toBe(true);
      expect(result.worker_id).toBe(1);
      expect(result.exclusion_summary.total_excluded).toBe(200); // 150 + 50
      expect(result.exclusion_summary.excluded_components).toBe(2);
      expect(result.adjusted_pay_calculation.adjusted_pay_for_nmw).toBe(1000); // 1200 - 200
      expect(result.warnings).toHaveLength(2); // Critical + proportion warning (200/1200 = 16.7% >= 15%)
    });

    test('should handle processing errors gracefully', async () => {
      const worker = { id: 1 };
      const payPeriod = { id: 1 };
      const payComponents = { tips: 100 };

      nmwComponentRules.getAllRules.mockRejectedValue(new Error('Configuration error'));

      const result = await troncExclusionService.processTroncExclusions(worker, payPeriod, payComponents);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Tronc processing failed');
      expect(result.message).toBe('Configuration error');
    });
  });

  describe('Bulk Processing', () => {
    test('should process multiple workers correctly', async () => {
      const workers = [
        { id: 1, external_id: 'W001' },
        { id: 2, external_id: 'W002' }
      ];
      const payPeriods = [{ id: 1 }, { id: 2 }];
      const payComponentsArray = [
        { total_pay: 1000, tips: 100 },
        { total_pay: 1200, service_charge: 80 }
      ];

      nmwComponentRules.classifyComponent.mockResolvedValue({
        category: 'excluded',
        categoryPath: 'tips.customer',
        confidence: 'high'
      });

      const results = await troncExclusionService.processBulkTroncExclusions(workers, payPeriods, payComponentsArray);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].worker_id).toBe(1);
      expect(results[1].worker_id).toBe(2);
    });
  });

  describe('Bulk Summary Statistics', () => {
    test('should generate bulk summary statistics correctly', () => {
      const results = [
        {
          success: true,
          exclusion_summary: {
            total_excluded: 100,
            total_flagged: 0,
            excluded_components: 1,
            flagged_components: 0
          }
        },
        {
          success: true,
          exclusion_summary: {
            total_excluded: 75,
            total_flagged: 25,
            excluded_components: 1,
            flagged_components: 1
          }
        },
        {
          success: false,
          error: 'Processing failed'
        }
      ];

      const summary = troncExclusionService.getBulkSummaryStatistics(results);
      
      expect(summary.total_workers).toBe(3);
      expect(summary.successful_processing).toBe(2);
      expect(summary.failed_processing).toBe(1);
      expect(summary.workers_with_tronc).toBe(2);
      expect(summary.workers_with_flags).toBe(1);
      expect(summary.total_amount_excluded).toBe(175);
      expect(summary.total_amount_flagged).toBe(25);
      expect(summary.average_exclusion_per_worker).toBe(87.5);
      expect(summary.compliance_impact_summary.workers_affected).toBe(2);
      expect(summary.compliance_impact_summary.percentage_affected).toBe(100);
    });
  });
});
