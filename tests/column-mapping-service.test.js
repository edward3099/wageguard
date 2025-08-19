/**
 * Unit Tests for Column Mapping Service
 * 
 * Tests for intelligent CSV column header mapping with LLM assistance
 */

const ColumnMappingService = require('../src/services/columnMappingService');

// Mock the LLM wrapper service
jest.mock('../src/services/llmWrapperService', () => {
  return jest.fn().mockImplementation(() => {
    return {
      callLLM: jest.fn(),
    };
  });
});

describe('ColumnMappingService', () => {
  let mappingService;
  let mockLLMService;

  beforeEach(() => {
    // Create service instance
    mappingService = new ColumnMappingService();
    
    // Mock LLM service to simulate unavailable state
    mappingService.llmAvailable = false;
    mappingService.llmService = null;
  });

  describe('Initialization', () => {
    test('should initialize with schema definitions', () => {
      expect(mappingService.schemaDefinitions).toBeDefined();
      expect(Object.keys(mappingService.schemaDefinitions)).toContain('worker_id');
      expect(Object.keys(mappingService.schemaDefinitions)).toContain('worker_name');
      expect(Object.keys(mappingService.schemaDefinitions)).toContain('hours');
    });

    test('should have fallback mappings', () => {
      expect(mappingService.fallbackMappings).toBeDefined();
      expect(mappingService.fallbackMappings.worker_id).toContain('employee_id');
      expect(mappingService.fallbackMappings.worker_name).toContain('employee_name');
    });

    test('should handle LLM service unavailable gracefully', () => {
      expect(mappingService.llmAvailable).toBe(false);
      expect(mappingService.llmService).toBe(null);
    });
  });

  describe('Fallback Mapping Generation', () => {
    test('should generate mappings for standard headers', async () => {
      const headers = ['employee_name', 'emp_id', 'hours_worked', 'gross_pay'];
      
      const result = await mappingService.generateColumnMappings(headers, 'payroll');

      expect(result.success).toBe(true);
      expect(result.method).toBe('fallback');
      expect(result.mappings).toHaveLength(4);
      
      // Check specific mappings
      const nameMapping = result.mappings.find(m => m.csvHeader === 'employee_name');
      expect(nameMapping.suggestedField).toBe('worker_name');
      expect(nameMapping.confidence).toBeGreaterThan(90);

      const idMapping = result.mappings.find(m => m.csvHeader === 'emp_id');
      expect(idMapping.suggestedField).toBe('worker_id');
    });

    test('should handle exact matches with high confidence', async () => {
      const headers = ['worker_id', 'worker_name', 'hours', 'pay'];
      
      const result = await mappingService.generateColumnMappings(headers, 'payroll');

      expect(result.success).toBe(true);
      result.mappings.forEach(mapping => {
        expect(mapping.confidence).toBe(95); // Exact matches should have 95% confidence
      });
    });

    test('should handle partial matches with lower confidence', async () => {
      const headers = ['staff_member', 'hrs_worked', 'gross_amount'];
      
      const result = await mappingService.generateColumnMappings(headers, 'payroll');

      expect(result.success).toBe(true);
      expect(result.mappings.length).toBeGreaterThan(0);
      
      // Partial matches should have lower confidence (not exact 95%)
      const partialMatches = result.mappings.filter(m => m.confidence < 95);
      expect(partialMatches.length).toBeGreaterThan(0);
      
      result.mappings.forEach(mapping => {
        expect(mapping.confidence).toBeGreaterThanOrEqual(50);
      });
    });

    test('should leave unmappable headers unmapped', async () => {
      const headers = ['employee_name', 'random_column', 'weird_field', 'hours'];
      
      const result = await mappingService.generateColumnMappings(headers, 'payroll');

      expect(result.success).toBe(true);
      expect(result.unmapped).toContain('random_column');
      expect(result.unmapped).toContain('weird_field');
      expect(result.mappings.some(m => m.csvHeader === 'employee_name')).toBe(true);
      expect(result.mappings.some(m => m.csvHeader === 'hours')).toBe(true);
    });

    test('should handle empty headers array', async () => {
      const result = await mappingService.generateColumnMappings([], 'payroll');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid column headers found');
    });

    test('should filter out null/empty headers', async () => {
      const headers = ['employee_name', '', null, 'hours', '   ', undefined];
      
      const result = await mappingService.generateColumnMappings(headers, 'payroll');

      expect(result.success).toBe(true);
      expect(result.mappings.length).toBe(2); // Only 'employee_name' and 'hours' should be processed
    });
  });

  describe('CSV Type Specific Mappings', () => {
    test('should return relevant fields for payroll type', () => {
      const fields = mappingService.getRelevantFields('payroll');
      
      expect(fields).toContain('worker_id');
      expect(fields).toContain('worker_name');
      expect(fields).toContain('hours');
      expect(fields).toContain('pay');
      expect(fields).toContain('uniform_deduction');
      expect(fields).toContain('accommodation_charge');
    });

    test('should return relevant fields for rota type', () => {
      const fields = mappingService.getRelevantFields('rota');
      
      expect(fields).toContain('worker_id');
      expect(fields).toContain('worker_name');
      expect(fields).toContain('date');
      expect(fields).toContain('start_time');
      expect(fields).toContain('end_time');
      expect(fields).not.toContain('uniform_deduction'); // Should not include payroll-specific fields
    });

    test('should return relevant fields for timesheet type', () => {
      const fields = mappingService.getRelevantFields('timesheet');
      
      expect(fields).toContain('worker_id');
      expect(fields).toContain('worker_name');
      expect(fields).toContain('date');
      expect(fields).toContain('hours');
      expect(fields).toContain('pay_rate');
    });
  });

  describe('Confidence Calculation', () => {
    test('should calculate partial match confidence correctly', () => {
      const confidence1 = mappingService.calculatePartialMatchConfidence('employee_name', 'worker_name');
      const confidence2 = mappingService.calculatePartialMatchConfidence('emp_identifier', 'employee_id');
      const confidence3 = mappingService.calculatePartialMatchConfidence('totally_different', 'worker_id');

      expect(confidence1).toBe(50); // Based on actual calculation: employee_name vs worker_name
      expect(confidence2).toBe(80); // Based on actual calculation: emp_identifier vs employee_id  
      expect(confidence2).toBeGreaterThan(confidence1); // Better match
      expect(confidence3).toBeLessThan(50); // Poor match
    });

    test('should calculate overall confidence for mapping sets', () => {
      const mappings = [
        { confidence: 95 },
        { confidence: 85 },
        { confidence: 75 }
      ];

      const overall = mappingService.calculateOverallConfidence(mappings);
      expect(overall).toBe(85); // Average of 95, 85, 75
    });

    test('should return 0 confidence for empty mappings', () => {
      const overall = mappingService.calculateOverallConfidence([]);
      expect(overall).toBe(0);
    });
  });

  describe('User Mapping Validation', () => {
    test('should validate correct user mappings', () => {
      const userMappings = [
        { csvHeader: 'employee_name', suggestedField: 'worker_name' },
        { csvHeader: 'emp_id', suggestedField: 'worker_id' }
      ];
      const originalHeaders = ['employee_name', 'emp_id', 'hours'];

      const result = mappingService.validateUserMappings(userMappings, originalHeaders);

      expect(result.success).toBe(true);
      expect(result.mappings).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid field names', () => {
      const userMappings = [
        { csvHeader: 'employee_name', suggestedField: 'invalid_field' }
      ];
      const originalHeaders = ['employee_name'];

      const result = mappingService.validateUserMappings(userMappings, originalHeaders);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Field "invalid_field" is not a valid schema field');
    });

    test('should detect headers not in original CSV', () => {
      const userMappings = [
        { csvHeader: 'non_existent_header', suggestedField: 'worker_name' }
      ];
      const originalHeaders = ['employee_name'];

      const result = mappingService.validateUserMappings(userMappings, originalHeaders);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Header "non_existent_header" not found in original CSV');
    });

    test('should warn about duplicate field mappings', () => {
      const userMappings = [
        { csvHeader: 'employee_name', suggestedField: 'worker_name' },
        { csvHeader: 'staff_name', suggestedField: 'worker_name' }
      ];
      const originalHeaders = ['employee_name', 'staff_name'];

      const result = mappingService.validateUserMappings(userMappings, originalHeaders);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Field "worker_name" is mapped to multiple headers');
    });

    test('should handle malformed mapping objects', () => {
      const userMappings = [
        { csvHeader: 'employee_name' }, // Missing suggestedField
        { suggestedField: 'worker_id' }, // Missing csvHeader
        { csvHeader: '', suggestedField: '' } // Empty values
      ];
      const originalHeaders = ['employee_name'];

      const result = mappingService.validateUserMappings(userMappings, originalHeaders);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Information', () => {
    test('should provide schema info for payroll type', () => {
      const schemaInfo = mappingService.getSchemaInfo('payroll');

      expect(schemaInfo.csvType).toBe('payroll');
      expect(schemaInfo.fields).toBeDefined();
      expect(schemaInfo.totalFields).toBeGreaterThan(0);
      expect(schemaInfo.requiredFields).toBeDefined();
      
      // Check required fields
      const requiredFieldNames = schemaInfo.requiredFields;
      expect(requiredFieldNames).toContain('worker_id');
      expect(requiredFieldNames).toContain('worker_name');
    });

    test('should provide field descriptions and examples', () => {
      const schemaInfo = mappingService.getSchemaInfo('payroll');
      
      const workerIdField = schemaInfo.fields.find(f => f.name === 'worker_id');
      expect(workerIdField.description).toBeDefined();
      expect(workerIdField.examples).toBeDefined();
      expect(workerIdField.required).toBe(true);
      expect(workerIdField.type).toBe('string');
    });
  });

  describe('LLM Response Parsing', () => {
    test('should parse valid LLM JSON response', () => {
      const validResponse = JSON.stringify({
        mappings: [
          {
            csvHeader: 'employee_name',
            suggestedField: 'worker_name',
            confidence: 95,
            reasoning: 'Exact semantic match'
          }
        ],
        unmapped: ['random_column'],
        csvType: 'payroll'
      });

      const originalHeaders = ['employee_name', 'random_column'];
      const result = mappingService.parseLLMResponse(validResponse, originalHeaders);

      expect(result.mappings).toHaveLength(1);
      expect(result.unmapped).toContain('random_column');
    });

    test('should handle JSON response with extra text', () => {
      const responseWithExtra = `Here's the mapping:
      ${JSON.stringify({
        mappings: [
          {
            csvHeader: 'emp_id',
            suggestedField: 'worker_id',
            confidence: 90,
            reasoning: 'Standard abbreviation'
          }
        ],
        unmapped: []
      })}
      Hope this helps!`;

      const originalHeaders = ['emp_id'];
      const result = mappingService.parseLLMResponse(responseWithExtra, originalHeaders);

      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].csvHeader).toBe('emp_id');
    });

    test('should throw error for invalid JSON', () => {
      const invalidResponse = 'This is not JSON at all';
      const originalHeaders = ['test'];

      expect(() => {
        mappingService.parseLLMResponse(invalidResponse, originalHeaders);
      }).toThrow('No JSON object found in LLM response');
    });

    test('should filter out invalid mappings', () => {
      const responseWithInvalid = JSON.stringify({
        mappings: [
          {
            csvHeader: 'valid_header',
            suggestedField: 'worker_name',
            confidence: 95,
            reasoning: 'Valid mapping'
          },
          {
            csvHeader: 'non_existent_header',
            suggestedField: 'worker_id',
            confidence: 90,
            reasoning: 'Invalid - header not in original'
          },
          {
            csvHeader: 'another_valid',
            suggestedField: 'invalid_field',
            confidence: 85,
            reasoning: 'Invalid - field not in schema'
          }
        ],
        unmapped: []
      });

      const originalHeaders = ['valid_header', 'another_header'];
      const result = mappingService.parseLLMResponse(responseWithInvalid, originalHeaders);

      expect(result.mappings).toHaveLength(1); // Only the valid mapping should remain
      expect(result.mappings[0].csvHeader).toBe('valid_header');
    });
  });

  describe('Error Handling', () => {
    test('should handle service errors gracefully', async () => {
      // Simulate service error by passing invalid input
      const result = await mappingService.generateColumnMappings(null, 'payroll');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle validation errors in user mappings', () => {
      // Test with null input
      const result = mappingService.validateUserMappings(null, ['test']);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
