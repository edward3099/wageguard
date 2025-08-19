const path = require('path');
const fs = require('fs-extra');
const CSVParserService = require('../src/services/csvParserService');

describe('Enhanced CSV Parser Service Tests', () => {
  let csvParser;
  let testFilePath;

  beforeAll(async () => {
    csvParser = new CSVParserService();
    
    // Create test file path
    testFilePath = path.join(__dirname, '../sample-data/sample-payroll-with-deductions.csv');
    
    // Ensure test file exists
    if (!await fs.pathExists(testFilePath)) {
      throw new Error(`Test file not found: ${testFilePath}`);
    }
  });

  describe('Extended Column Support', () => {
    test('should recognize extended columns for payroll CSV type', () => {
      const expectedColumns = csvParser.extendedColumns.payroll;
      
      expect(expectedColumns).toContain('uniform_deduction');
      expect(expectedColumns).toContain('tools_deduction');
      expect(expectedColumns).toContain('training_deduction');
      expect(expectedColumns).toContain('other_deductions');
      expect(expectedColumns).toContain('accommodation_charge');
      expect(expectedColumns).toContain('meals_charge');
      expect(expectedColumns).toContain('transport_charge');
      expect(expectedColumns).toContain('bonus');
      expect(expectedColumns).toContain('commission');
      expect(expectedColumns).toContain('tips');
      expect(expectedColumns).toContain('tronc');
    });

    test('should recognize extended columns for rota CSV type', () => {
      const expectedColumns = csvParser.extendedColumns.rota;
      
      expect(expectedColumns).toContain('shift_premium');
      expect(expectedColumns).toContain('overtime_rate');
      expect(expectedColumns).toContain('holiday_pay');
    });

    test('should recognize extended columns for timesheet CSV type', () => {
      const expectedColumns = csvParser.extendedColumns.timesheet;
      
      expect(expectedColumns).toContain('bonus');
      expect(expectedColumns).toContain('commission');
      expect(expectedColumns).toContain('tips');
      expect(expectedColumns).toContain('tronc');
    });
  });

  describe('Column Mapping for New Fields', () => {
    test('should map uniform deduction variations correctly', () => {
      const variations = csvParser.columnMappings.uniform_deduction;
      
      expect(variations).toContain('uniform_deduction');
      expect(variations).toContain('uniform_cost');
      expect(variations).toContain('workwear_deduction');
      expect(variations).toContain('clothing_cost');
      expect(variations).toContain('uniform_charge');
    });

    test('should map accommodation charge variations correctly', () => {
      const variations = csvParser.columnMappings.accommodation_charge;
      
      expect(variations).toContain('accommodation_charge');
      expect(variations).toContain('accommodation_cost');
      expect(variations).toContain('housing_charge');
      expect(variations).toContain('lodging_fee');
      expect(variations).toContain('room_charge');
    });

    test('should map shift premium variations correctly', () => {
      const variations = csvParser.columnMappings.shift_premium;
      
      expect(variations).toContain('shift_premium');
      expect(variations).toContain('night_shift');
      expect(variations).toContain('weekend_premium');
      expect(variations).toContain('unsocial_hours');
    });
  });

  describe('Component Categorization', () => {
    let parsedData;

    beforeAll(async () => {
      parsedData = await csvParser.parseCSV(testFilePath, 'payroll');
    });

    test('should categorize deductions correctly', () => {
      const components = parsedData.components;
      
      expect(components.deductions.uniform).toHaveLength(5);
      expect(components.deductions.tools).toHaveLength(3);
      expect(components.deductions.training).toHaveLength(2);
      expect(components.deductions.other).toHaveLength(3); // W001, W003, W005 have other deductions
    });

    test('should categorize offsets correctly', () => {
      const components = parsedData.components;
      
      expect(components.offsets.accommodation).toHaveLength(3);
      expect(components.offsets.meals).toHaveLength(4);
      expect(components.offsets.transport).toHaveLength(4);
    });

    test('should categorize enhancements correctly', () => {
      const components = parsedData.components;
      
      expect(components.enhancements.shift_premium).toHaveLength(2);
      expect(components.enhancements.overtime).toHaveLength(5);
      expect(components.enhancements.holiday_pay).toHaveLength(0);
      expect(components.enhancements.bonus).toHaveLength(2);
      expect(components.enhancements.commission).toHaveLength(1);
      expect(components.enhancements.tips).toHaveLength(2);
      expect(components.enhancements.tronc).toHaveLength(2);
    });

    test('should calculate summary totals correctly', () => {
      const components = parsedData.components;
      
      // Calculate expected totals from sample data
      const expectedUniformDeductions = 15 + 12 + 18 + 10 + 20; // 75
      const expectedToolsDeductions = 25 + 35 + 40; // 100
      const expectedTrainingDeductions = 30 + 45; // 75
      const expectedOtherDeductions = 5 + 8 + 10; // 23
      const expectedTotalDeductions = expectedUniformDeductions + expectedToolsDeductions + expectedTrainingDeductions + expectedOtherDeductions; // 273
      
      const expectedAccommodationOffsets = 45 + 60 + 75; // 180
      const expectedMealsOffsets = 30 + 25 + 40 + 50; // 145
      const expectedTransportOffsets = 20 + 15 + 25 + 30; // 90
      const expectedTotalOffsets = expectedAccommodationOffsets + expectedMealsOffsets + expectedTransportOffsets; // 415
      
      const expectedShiftPremium = 25 + 30; // 55
      const expectedBonus = 50 + 100; // 150
      const expectedCommission = 75; // 75
      const expectedTips = 15 + 20; // 35
      const expectedTronc = 10 + 15; // 25
      const expectedTotalEnhancements = expectedShiftPremium + expectedBonus + expectedCommission + expectedTips + expectedTronc; // 340
      
      expect(components.summary.totalDeductions).toBe(expectedTotalDeductions);
      expect(components.summary.totalOffsets).toBe(expectedTotalOffsets);
      expect(components.summary.totalEnhancements).toBe(expectedTotalEnhancements);
    });

    test('should count unique workers correctly', () => {
      const components = parsedData.components;
      
      // All 5 workers have some deductions
      expect(components.summary.workersWithDeductions).toBe(5);
      
      // 4 workers have offsets (W002 has no accommodation)
      expect(components.summary.workersWithOffsets).toBe(4);
    });

    test('should include worker details in categorized components', () => {
      const components = parsedData.components;
      
      // Check uniform deductions
      const johnUniform = components.deductions.uniform.find(d => d.worker_id === 'W001');
      expect(johnUniform).toBeDefined();
      expect(johnUniform.worker_name).toBe('John Smith');
      expect(johnUniform.amount).toBe(15.00);
      expect(johnUniform.row).toBe(2);
      
      // Check accommodation offsets
      const janeAccommodation = components.offsets.accommodation.find(o => o.worker_id === 'W002');
      expect(janeAccommodation).toBeUndefined(); // Jane has no accommodation charge
      
      const mikeAccommodation = components.offsets.accommodation.find(o => o.worker_id === 'W003');
      expect(mikeAccommodation).toBeDefined();
      expect(mikeAccommodation.worker_name).toBe('Mike Johnson');
      expect(mikeAccommodation.amount).toBe(60.00);
    });
  });

  describe('Data Processing for New Fields', () => {
    let processedData;

    beforeAll(async () => {
      const parsed = await csvParser.parseCSV(testFilePath, 'payroll');
      processedData = parsed.data;
    });

    test('should process deduction fields as numbers', () => {
      const john = processedData.find(w => w.worker_id === 'W001');
      
      expect(typeof john.uniform_deduction).toBe('number');
      expect(john.uniform_deduction).toBe(15.00);
      expect(typeof john.tools_deduction).toBe('number');
      expect(john.tools_deduction).toBe(25.00);
      expect(typeof john.training_deduction).toBe('number');
      expect(john.training_deduction).toBe(0.00);
      expect(typeof john.other_deductions).toBe('number');
      expect(john.other_deductions).toBe(5.00);
    });

    test('should process offset fields as numbers', () => {
      const john = processedData.find(w => w.worker_id === 'W001');
      
      expect(typeof john.accommodation_charge).toBe('number');
      expect(john.accommodation_charge).toBe(45.00);
      expect(typeof john.meals_charge).toBe('number');
      expect(john.meals_charge).toBe(30.00);
      expect(typeof john.transport_charge).toBe('number');
      expect(john.transport_charge).toBe(20.00);
    });

    test('should process enhancement fields as numbers', () => {
      const jane = processedData.find(w => w.worker_id === 'W002');
      
      expect(typeof jane.shift_premium).toBe('number');
      expect(jane.shift_premium).toBe(25.00);
      expect(typeof jane.overtime_rate).toBe('number');
      expect(jane.overtime_rate).toBe(1.25);
      expect(typeof jane.commission).toBe('number');
      expect(jane.commission).toBe(75.00);
      expect(typeof jane.tips).toBe('number');
      expect(jane.tips).toBe(15.00);
      expect(typeof jane.tronc).toBe('number');
      expect(jane.tronc).toBe(10.00);
    });

    test('should handle missing fields gracefully', () => {
      const sarah = processedData.find(w => w.worker_id === 'W004');
      
      // Sarah has no accommodation, meals, or transport charges
      expect(sarah.accommodation_charge).toBe(0);
      expect(sarah.meals_charge).toBe(0);
      expect(sarah.transport_charge).toBe(0);
      
      // Sarah has no training or other deductions
      expect(sarah.training_deduction).toBe(0);
      expect(sarah.other_deductions).toBe(0);
    });
  });

  describe('Integration with Main Parser', () => {
    test('should include components in parse result', async () => {
      const result = await csvParser.parseCSV(testFilePath, 'payroll');
      
      expect(result.success).toBe(true);
      expect(result.components).toBeDefined();
      expect(result.components.deductions).toBeDefined();
      expect(result.components.offsets).toBeDefined();
      expect(result.components.enhancements).toBeDefined();
      expect(result.components.summary).toBeDefined();
    });

    test('should maintain backward compatibility', async () => {
      const result = await csvParser.parseCSV(testFilePath, 'payroll');
      
      // Original fields should still be present
      expect(result.data[0]).toHaveProperty('worker_id');
      expect(result.data[0]).toHaveProperty('worker_name');
      expect(result.data[0]).toHaveProperty('hours');
      expect(result.data[0]).toHaveProperty('pay');
      expect(result.data[0]).toHaveProperty('period_start');
      expect(result.data[0]).toHaveProperty('period_end');
      
      // New fields should be present
      expect(result.data[0]).toHaveProperty('uniform_deduction');
      expect(result.data[0]).toHaveProperty('accommodation_charge');
      expect(result.data[0]).toHaveProperty('shift_premium');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle negative deduction values', () => {
      const testData = [
        {
          worker_id: 'TEST001',
          worker_name: 'Test Worker',
          uniform_deduction: '-10.00',
          tools_deduction: '0',
          training_deduction: '0',
          other_deductions: '0'
        }
      ];
      
      const components = csvParser.categorizeComponents(testData);
      
      // Negative deductions should not be included
      expect(components.deductions.uniform).toHaveLength(0);
      expect(components.summary.totalDeductions).toBe(0);
    });

    test('should handle non-numeric deduction values', () => {
      const testData = [
        {
          worker_id: 'TEST001',
          worker_name: 'Test Worker',
          uniform_deduction: 'invalid',
          tools_deduction: '0',
          training_deduction: '0',
          other_deductions: '0'
        }
      ];
      
      const components = csvParser.categorizeComponents(testData);
      
      // Invalid deductions should not be included
      expect(components.deductions.uniform).toHaveLength(0);
      expect(components.summary.totalDeductions).toBe(0);
    });

    test('should handle empty string values', () => {
      const testData = [
        {
          worker_id: 'TEST001',
          worker_name: 'Test Worker',
          uniform_deduction: '',
          tools_deduction: '0',
          training_deduction: '0',
          other_deductions: '0'
        }
      ];
      
      const components = csvParser.categorizeComponents(testData);
      
      // Empty string deductions should not be included
      expect(components.deductions.uniform).toHaveLength(0);
      expect(components.summary.totalDeductions).toBe(0);
    });
  });
});
