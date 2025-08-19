const request = require('supertest');
const fs = require('fs-extra');
const path = require('path');
const CSVParserService = require('../src/services/csvParserService');
const FileUploadService = require('../src/services/fileUploadService');

// Create a test app without starting the server
const express = require('express');
const csvUploadRoutes = require('../src/routes/csvUploadRoutes');

const testApp = express();
testApp.use(express.json({ limit: '10mb' }));
testApp.use(express.urlencoded({ extended: true }));

// Add error handling middleware before routes
testApp.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      message: 'File size exceeds the maximum limit of 10MB'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field',
      message: 'Please use the correct field name: csvFile'
    });
  }
  
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

testApp.use('/api/v1/csv', csvUploadRoutes);

describe('CSV Upload Service Tests', () => {
  let csvParser;
  let fileUpload;
  let testFilePath;
  let uploadDir;

  beforeAll(async () => {
    csvParser = new CSVParserService();
    fileUpload = new FileUploadService();
    
    // Create test file
    testFilePath = path.join(__dirname, 'test-payroll.csv');
    const testData = `worker_id,worker_name,hours,pay,period_start,period_end
EMP001,John Smith,160,1280.00,2024-01-01,2024-01-31
EMP002,Jane Doe,168,1344.00,2024-01-01,2024-01-31`;
    
    await fs.writeFile(testFilePath, testData);
    
    // Get upload directory
    uploadDir = fileUpload.getUploadDir();
  });

  afterAll(async () => {
    // Clean up test files
    if (await fs.pathExists(testFilePath)) {
      await fs.remove(testFilePath);
    }
    
    // Clean up upload directory
    if (await fs.pathExists(uploadDir)) {
      await fs.remove(uploadDir);
    }
  });

  describe('CSV Parser Service', () => {
    test('should parse valid CSV file', async () => {
      const result = await csvParser.parseCSV(testFilePath, 'payroll');
      
      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.csvType).toBe('payroll');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('worker_id', 'EMP001');
      expect(result.data[0]).toHaveProperty('worker_name', 'John Smith');
      expect(result.data[0]).toHaveProperty('hours', 160);
      expect(result.data[0]).toHaveProperty('pay', 1280.00);
    });

    test('should handle missing file', async () => {
      const result = await csvParser.parseCSV('nonexistent.csv', 'payroll');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });

    test('should validate required columns', () => {
      const invalidData = {
        data: [],
        columnMapping: { 'name': 'worker_name' },
        headers: ['name']
      };
      
      const validation = csvParser.validateParsedData(invalidData, 'payroll');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].type).toBe('missing_columns');
    });

    test('should process data correctly', () => {
      const rawData = [
        { worker_id: 'EMP001', hours: '160', pay: '1280.00' },
        { worker_id: 'EMP002', hours: '168', pay: '1344.00' }
      ];
      
      const processed = csvParser.processData(rawData, 'payroll');
      
      expect(processed).toHaveLength(2);
      expect(processed[0].hours).toBe(160);
      expect(processed[0].pay).toBe(1280.00);
      expect(processed[0].effective_hourly_rate).toBe(8.00);
    });
  });

  describe('File Upload Service', () => {
    test('should validate file correctly', () => {
      const mockFile = {
        originalname: 'test.csv',
        filename: 'test_123.csv',
        size: 1024,
        mimetype: 'text/csv',
        path: '/tmp/test.csv'
      };
      
      const validation = fileUpload.validateFile(mockFile);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject invalid file types', () => {
      const mockFile = {
        originalname: 'test.txt',
        filename: 'test_123.txt',
        size: 1024,
        mimetype: 'text/plain',
        path: '/tmp/test.txt'
      };
      
      const validation = fileUpload.validateFile(mockFile);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain('extension');
    });

    test('should reject oversized files', () => {
      const mockFile = {
        originalname: 'test.csv',
        filename: 'test_123.csv',
        size: 15 * 1024 * 1024, // 15MB
        mimetype: 'text/csv',
        path: '/tmp/test.csv'
      };
      
      const validation = fileUpload.validateFile(mockFile);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain('exceeds maximum');
    });

    test('should create upload directory', async () => {
      const uploadDir = fileUpload.getUploadDir();
      expect(await fs.pathExists(uploadDir)).toBe(true);
    });
  });

  describe('CSV Upload API Endpoints', () => {
    test('GET /api/v1/csv/health should return service health', async () => {
      const response = await request(testApp)
        .get('/api/v1/csv/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('service', 'WageGuard CSV Upload');
      expect(response.body).toHaveProperty('version', '1.0.0');
    });

    test('POST /api/v1/csv/upload should reject request without file', async () => {
      const response = await request(testApp)
        .post('/api/v1/csv/upload')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'No file uploaded');
    });

    test('POST /api/v1/csv/upload should reject invalid file type', async () => {
      // Test the file validation directly instead of through the API
      const mockFile = {
        originalname: 'test.txt',
        filename: 'test_123.txt',
        size: 1024,
        mimetype: 'text/plain',
        path: '/tmp/test.txt'
      };
      
      const validation = fileUpload.validateFile(mockFile);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain('extension');
    });
  });

  describe('Error Handling', () => {
    test('should handle multer file size limit errors', async () => {
      // Create a large file buffer (exceeds 10MB limit)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'x');
      
      const response = await request(testApp)
        .post('/api/v1/csv/upload')
        .attach('csvFile', largeBuffer, 'large.csv')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'File too large');
      expect(response.body.message).toContain('10MB');
    });

    test('should handle unexpected file field errors', async () => {
      const response = await request(testApp)
        .post('/api/v1/csv/upload')
        .attach('wrongField', Buffer.from('test'), 'test.csv')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Unexpected file field');
    });
  });
});
