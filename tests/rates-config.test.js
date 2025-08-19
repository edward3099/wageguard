const path = require('path');
const fs = require('fs').promises;
const ratesConfig = require('../src/config/rates');

// Mock fs module for testing
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

describe('Rates Configuration Module Tests', () => {
  let mockFs;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Get mocked fs module
    mockFs = require('fs').promises;
    
    // Reset the rates config instance
    ratesConfig.rates = null;
    ratesConfig.lastModified = null;
  });

  describe('Configuration Loading', () => {
    test('should load rates from file successfully', async () => {
      const mockRates = {
        accommodation: { dailyLimit: 9.99 },
        uniform: { maxDeduction: 0 },
        metadata: { version: '1.0.0' }
      };

      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRates));

      const result = await ratesConfig.loadRates();

      expect(result).toEqual(mockRates);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('rates.json'),
        'utf8'
      );
    });

    test('should create default rates when file does not exist', async () => {
      const mockError = new Error('File not found');
      mockError.code = 'ENOENT';

      mockFs.stat.mockRejectedValue(mockError);
      mockFs.writeFile.mockResolvedValue();

      const result = await ratesConfig.loadRates();

      expect(result).toBeDefined();
      expect(result.accommodation.dailyLimit).toBe(9.99);
      expect(result.uniform.maxDeduction).toBe(0);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    test('should return cached rates if file not modified', async () => {
      const mockRates = { accommodation: { dailyLimit: 9.99 } };
      const mockDate = new Date('2023-01-01');

      // First load
      mockFs.stat.mockResolvedValue({ mtime: mockDate });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRates));
      
      await ratesConfig.loadRates();

      // Second load - should use cache
      mockFs.stat.mockResolvedValue({ mtime: mockDate });
      
      const result = await ratesConfig.loadRates();

      expect(result).toEqual(mockRates);
      expect(mockFs.readFile).toHaveBeenCalledTimes(1); // Only called once
    });

    test('should reload rates when file is modified', async () => {
      const initialRates = { accommodation: { dailyLimit: 9.99 } };
      const updatedRates = { accommodation: { dailyLimit: 12.00 } };

      // First load
      mockFs.stat.mockResolvedValue({ mtime: new Date('2023-01-01') });
      mockFs.readFile.mockResolvedValue(JSON.stringify(initialRates));
      
      await ratesConfig.loadRates();

      // Second load with newer modification time
      mockFs.stat.mockResolvedValue({ mtime: new Date('2023-01-02') });
      mockFs.readFile.mockResolvedValue(JSON.stringify(updatedRates));
      
      const result = await ratesConfig.loadRates();

      expect(result).toEqual(updatedRates);
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });

    test('should handle file read errors gracefully', async () => {
      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      await expect(ratesConfig.loadRates()).rejects.toThrow('Failed to load rates configuration: Permission denied');
    });
  });

  describe('Rate Retrieval', () => {
    beforeEach(async () => {
      const mockRates = {
        accommodation: { dailyLimit: 9.99, description: 'Test' },
        uniform: { maxDeduction: 0 }
      };
      
      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRates));
    });

    test('should get specific rate value', async () => {
      const result = await ratesConfig.getRate('accommodation', 'dailyLimit');
      expect(result).toBe(9.99);
    });

    test('should get category rates', async () => {
      const result = await ratesConfig.getCategoryRates('accommodation');
      expect(result).toEqual({
        dailyLimit: 9.99,
        description: 'Test'
      });
    });

    test('should get all rates', async () => {
      const result = await ratesConfig.getAllRates();
      expect(result).toHaveProperty('accommodation');
      expect(result).toHaveProperty('uniform');
      // Note: metadata is added by createDefaultRates, not in mock data
      expect(result).toHaveProperty('accommodation');
      expect(result).toHaveProperty('uniform');
    });

    test('should throw error for unknown category', async () => {
      await expect(ratesConfig.getRate('unknown', 'field')).rejects.toThrow('Unknown rate category: unknown');
    });

    test('should throw error for unknown field', async () => {
      await expect(ratesConfig.getRate('accommodation', 'unknown')).rejects.toThrow("Unknown field 'unknown' in category 'accommodation'");
    });
  });

  describe('Rate Updates', () => {
    beforeEach(async () => {
      const mockRates = {
        accommodation: { dailyLimit: 9.99, lastUpdated: '2023-01-01' },
        metadata: { lastUpdated: '2023-01-01' }
      };
      
      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRates));
      mockFs.writeFile.mockResolvedValue();
    });

    test('should update specific rate value', async () => {
      await ratesConfig.updateRate('accommodation', 'dailyLimit', 12.00);

      expect(mockFs.writeFile).toHaveBeenCalled();
      const updatedRates = await ratesConfig.getRate('accommodation', 'dailyLimit');
      expect(updatedRates).toBe(12.00);
    });

    test('should update timestamps when rate is modified', async () => {
      const beforeUpdate = new Date();
      await ratesConfig.updateRate('accommodation', 'dailyLimit', 12.00);
      const afterUpdate = new Date();

      const rates = await ratesConfig.getAllRates();
      const accommodationUpdate = new Date(rates.accommodation.lastUpdated);
      const metadataUpdate = new Date(rates.metadata.lastUpdated);

      expect(accommodationUpdate.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(accommodationUpdate.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
      expect(metadataUpdate.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    test('should throw error when updating unknown category', async () => {
      await expect(ratesConfig.updateRate('unknown', 'field', 'value')).rejects.toThrow('Unknown rate category: unknown');
    });

    test('should throw error when updating unknown field', async () => {
      await expect(ratesConfig.updateRate('accommodation', 'unknown', 'value')).rejects.toThrow("Unknown field 'unknown' in category 'accommodation'");
    });
  });

  describe('Configuration Validation', () => {
    test('should validate correct configuration', async () => {
      const mockRates = {
        accommodation: { dailyLimit: 9.99 },
        uniform: { maxDeduction: 0 },
        meals: { maxDeduction: 0 },
        tools: { maxDeduction: 0 },
        training: { maxDeduction: 0 },
        other: { maxDeduction: 0 },
        metadata: { version: '1.0.0' }
      };

      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRates));

      const validation = await ratesConfig.validateRates();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect missing categories', async () => {
      const mockRates = {
        accommodation: { dailyLimit: 9.99 },
        // Missing other categories
        metadata: { version: '1.0.0' }
      };

      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRates));

      const validation = await ratesConfig.validateRates();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing required category: uniform');
      expect(validation.errors).toContain('Missing required category: meals');
    });

    test('should detect invalid accommodation rate', async () => {
      const mockRates = {
        accommodation: { dailyLimit: -5 }, // Invalid negative value
        uniform: { maxDeduction: 0 },
        meals: { maxDeduction: 0 },
        tools: { maxDeduction: 0 },
        training: { maxDeduction: 0 },
        other: { maxDeduction: 0 },
        metadata: { version: '1.0.0' }
      };

      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRates));

      const validation = await ratesConfig.validateRates();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Accommodation daily limit must be a non-negative number');
    });

    test('should generate warnings for unusual values', async () => {
      const mockRates = {
        accommodation: { dailyLimit: 25.00 }, // Unusually high
        uniform: { maxDeduction: 0 },
        meals: { maxDeduction: 0 },
        tools: { maxDeduction: 0 },
        training: { maxDeduction: 0 },
        other: { maxDeduction: 0 },
        metadata: { version: '1.0.0' }
      };

      mockFs.stat.mockResolvedValue({ mtime: new Date() });
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRates));

      const validation = await ratesConfig.validateRates();

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Accommodation daily limit seems unusually high');
    });

    test('should handle validation errors gracefully', async () => {
      mockFs.stat.mockRejectedValue(new Error('File system error'));

      const validation = await ratesConfig.validateRates();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Failed to load rates configuration: File system error');
    });
  });

  describe('Configuration Reload', () => {
    test('should force reload of rates', async () => {
      const initialRates = { accommodation: { dailyLimit: 9.99 } };
      const updatedRates = { accommodation: { dailyLimit: 12.00 } };

      // First load
      mockFs.stat.mockResolvedValue({ mtime: new Date('2023-01-01') });
      mockFs.readFile.mockResolvedValue(JSON.stringify(initialRates));
      
      await ratesConfig.loadRates();

      // Force reload
      mockFs.stat.mockResolvedValue({ mtime: new Date('2023-01-02') });
      mockFs.readFile.mockResolvedValue(JSON.stringify(updatedRates));
      
      const result = await ratesConfig.reloadRates();

      expect(result).toEqual(updatedRates);
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('Default Configuration Creation', () => {
    test('should create default rates with correct structure', async () => {
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockResolvedValue();

      const result = await ratesConfig.createDefaultRates();

      expect(result.accommodation.dailyLimit).toBe(9.99);
      expect(result.uniform.maxDeduction).toBe(0);
      expect(result.meals.maxDeduction).toBe(0);
      expect(result.tools.maxDeduction).toBe(0);
      expect(result.training.maxDeduction).toBe(0);
      expect(result.other.maxDeduction).toBe(0);
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.description).toContain('UK NMW/NLW');
    });

    test('should handle write errors during default creation', async () => {
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
      mockFs.writeFile.mockRejectedValue(new Error('Write permission denied'));

      await expect(ratesConfig.createDefaultRates()).rejects.toThrow('Failed to create default rates configuration: Write permission denied');
    });
  });
});
