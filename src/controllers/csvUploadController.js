const CSVParserService = require('../services/csvParserService');
const FileUploadService = require('../services/fileUploadService');
const { pool } = require('../config/database');
const { logAuditAction } = require('../utils/database-utils');

/**
 * CSV Upload Controller for WageGuard
 * Handles CSV file uploads, parsing, and database storage
 */
class CSVUploadController {
  constructor() {
    this.csvParser = new CSVParserService();
    this.fileUpload = new FileUploadService();
  }

  /**
   * Handle CSV file upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadCSV(req, res) {
    try {
      console.log('🔄 Processing CSV upload request');
      
      // Validate file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      // Validate uploaded file
      const fileValidation = this.fileUpload.validateFile(req.file);
      if (!fileValidation.isValid) {
        // Clean up invalid file
        await this.fileUpload.cleanupFile(req.file.path);
        
        return res.status(400).json({
          success: false,
          error: 'File validation failed',
          details: fileValidation.errors
        });
      }

      // Get CSV type from request (default to payroll)
      const csvType = req.body.csvType || 'payroll';
      
      // Get client ID for bureau users
      const clientId = req.body.clientId || null;
      
      // Parse CSV file
      const parseResult = await this.csvParser.parseCSV(req.file.path, csvType);
      
      if (!parseResult.success) {
        // Clean up file on parsing failure
        await this.fileUpload.cleanupFile(req.file.path);
        
        return res.status(400).json({
          success: false,
          error: 'CSV parsing failed',
          details: parseResult.error
        });
      }

      // Store file information in database
      const csvUploadId = await this.storeCSVUpload(req, parseResult, fileValidation, clientId);
      
      // Store parsed data in database
      const organizationId = req.user?.isBureau && clientId ? clientId : req.user?.userId || null;
      const organizationType = req.user?.isBureau && clientId ? 'client' : 'employer';
      const dataStored = await this.storeParsedData(csvUploadId, parseResult.data, csvType, organizationId, organizationType);
      
      // Generate processing report
      const report = this.csvParser.generateReport(parseResult);
      
      // Log audit action
      await logAuditAction({
        user_id: req.user?.id,
        action: 'csv_upload',
        table_name: 'csv_uploads',
        record_id: csvUploadId,
        new_values: {
          filename: req.file.originalname,
          csvType,
          totalRows: parseResult.totalRows,
          validRows: parseResult.validRows
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      console.log(`✅ CSV upload completed successfully: ${csvUploadId}`);

      res.status(200).json({
        success: true,
        message: 'CSV file uploaded and processed successfully',
        data: {
          uploadId: csvUploadId,
          filename: req.file.originalname,
          csvType,
          totalRows: parseResult.totalRows,
          validRows: parseResult.validRows,
          invalidRows: parseResult.invalidRows,
          columnMapping: parseResult.columnMapping,
          report
        }
      });

    } catch (error) {
      console.error('❌ CSV upload failed:', error);
      
      // Clean up file on error
      if (req.file) {
        await this.fileUpload.cleanupFile(req.file.path);
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Store CSV upload record in database
   * @param {Object} req - Express request object
   * @param {Object} parseResult - CSV parsing result
   * @param {Object} fileValidation - File validation result
   * @param {number} clientId - Client ID for bureau users
   * @returns {Promise<number>} CSV upload ID
   */
  async storeCSVUpload(req, parseResult, fileValidation, clientId = null) {
    try {
      const query = `
        INSERT INTO csv_uploads (
          user_id, client_id, filename, file_path, original_filename, file_size,
          status, processing_status, column_mapping, total_records, processed_records,
          organization_id, organization_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `;
      
      // Determine organization ID and type
      const organizationId = req.user?.isBureau && clientId 
        ? clientId 
        : req.user?.userId || null;
      const organizationType = req.user?.isBureau && clientId 
        ? 'client' 
        : 'employer';

      const values = [
        req.user?.userId || null,
        clientId,
        req.file.filename,
        req.file.path,
        req.file.originalname,
        req.file.size,
        'uploaded',
        'completed',
        JSON.stringify(parseResult.columnMapping),
        parseResult.totalRows,
        parseResult.validRows,
        organizationId,
        organizationType
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0].id;
      
    } catch (error) {
      console.error('❌ Failed to store CSV upload:', error);
      throw error;
    }
  }

  /**
   * Store parsed CSV data in database
   * @param {number} csvUploadId - CSV upload ID
   * @param {Array} data - Parsed data
   * @param {string} csvType - Type of CSV
   * @param {number} organizationId - Organization ID for multi-tenant isolation
   * @param {string} organizationType - Organization type (employer/client)
   * @returns {Promise<boolean>} Success status
   */
  async storeParsedData(csvUploadId, data, csvType, organizationId, organizationType) {
    try {
      console.log(`🔄 Storing ${data.length} parsed records in database`);
      
      // Store workers
      const workerIds = await this.storeWorkers(csvUploadId, data, organizationId, organizationType);
      
      // Store pay periods
      if (csvType === 'payroll') {
        await this.storePayPeriods(csvUploadId, data, workerIds, organizationId, organizationType);
      }
      
      console.log(`✅ Successfully stored ${data.length} records`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to store parsed data:', error);
      throw error;
    }
  }

  /**
   * Store worker records in database
   * @param {number} csvUploadId - CSV upload ID
   * @param {Array} data - Parsed data
   * @param {number} organizationId - Organization ID for multi-tenant isolation
   * @param {string} organizationType - Organization type (employer/client)
   * @returns {Promise<Object>} Mapping of worker names to IDs
   */
  async storeWorkers(csvUploadId, data, organizationId, organizationType) {
    try {
      const workerIds = {};
      const uniqueWorkers = new Map();
      
      // Extract unique workers
      data.forEach(row => {
        if (row.worker_id && row.worker_name) {
          const key = `${row.worker_id}_${row.worker_name}`;
          if (!uniqueWorkers.has(key)) {
            uniqueWorkers.set(key, {
              external_id: row.worker_id,
              name: row.worker_name
            });
          }
        }
      });
      
      // Insert workers into database
      for (const [key, worker] of uniqueWorkers) {
        const query = `
          INSERT INTO workers (csv_upload_id, external_id, name, organization_id, organization_type)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;
        
        const result = await pool.query(query, [csvUploadId, worker.external_id, worker.name, organizationId, organizationType]);
        workerIds[key] = result.rows[0].id;
      }
      
      console.log(`✅ Stored ${uniqueWorkers.size} unique workers`);
      return workerIds;
      
    } catch (error) {
      console.error('❌ Failed to store workers:', error);
      throw error;
    }
  }

  /**
   * Store pay period records in database
   * @param {number} csvUploadId - CSV upload ID
   * @param {Array} data - Parsed data
   * @param {Object} workerIds - Mapping of worker names to IDs
   * @param {number} organizationId - Organization ID for multi-tenant isolation
   * @param {string} organizationType - Organization type (employer/client)
   * @returns {Promise<boolean>} Success status
   */
  async storePayPeriods(csvUploadId, data, workerIds, organizationId, organizationType) {
    try {
      const payPeriods = [];
      
      // Prepare pay period data
      data.forEach(row => {
        if (row.worker_id && row.worker_name && row.hours && row.pay) {
          const workerKey = `${row.worker_id}_${row.worker_name}`;
          const workerId = workerIds[workerKey];
          
          if (workerId) {
            payPeriods.push({
              csv_upload_id: csvUploadId,
              worker_id: workerId,
              period_start: row.period_start,
              period_end: row.period_end,
              total_hours: row.hours,
              total_pay: row.pay,
              effective_hourly_rate: row.effective_hourly_rate,
              period_type: 'monthly' // Default, can be enhanced later
            });
          }
        }
      });
      
      // Insert pay periods into database
      if (payPeriods.length > 0) {
        const query = `
          INSERT INTO pay_periods (
            csv_upload_id, worker_id, period_start, period_end,
            total_hours, total_pay, effective_hourly_rate, period_type,
            organization_id, organization_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        
        for (const period of payPeriods) {
          await pool.query(query, [
            period.csv_upload_id,
            period.worker_id,
            period.period_start,
            period.period_end,
            period.total_hours,
            period.total_pay,
            period.effective_hourly_rate,
            period.period_type,
            organizationId,
            organizationType
          ]);
        }
        
        console.log(`✅ Stored ${payPeriods.length} pay periods`);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to store pay periods:', error);
      throw error;
    }
  }

  /**
   * Get CSV upload status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUploadStatus(req, res) {
    try {
      const { uploadId } = req.params;
      
      const query = `
        SELECT 
          cu.*,
          COUNT(w.id) as worker_count,
          COUNT(pp.id) as pay_period_count
        FROM csv_uploads cu
        LEFT JOIN workers w ON cu.id = w.csv_upload_id
        LEFT JOIN pay_periods pp ON cu.id = pp.csv_upload_id
        WHERE cu.id = $1 AND cu.user_id = $2
        GROUP BY cu.id
      `;
      
      const result = await pool.query(query, [uploadId, req.user?.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Upload not found'
        });
      }
      
      const upload = result.rows[0];
      
      res.status(200).json({
        success: true,
        data: {
          id: upload.id,
          filename: upload.filename,
          original_filename: upload.original_filename,
          status: upload.status,
          processing_status: upload.processing_status,
          total_records: upload.total_records,
          processed_records: upload.processed_records,
          worker_count: parseInt(upload.worker_count) || 0,
          pay_period_count: parseInt(upload.pay_period_count) || 0,
          created_at: upload.created_at,
          processed_at: upload.processed_at
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to get upload status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * List user's CSV uploads
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async listUploads(req, res) {
    try {
      const query = `
        SELECT 
          cu.*,
          COUNT(w.id) as worker_count,
          COUNT(pp.id) as pay_period_count
        FROM csv_uploads cu
        LEFT JOIN workers w ON cu.id = w.csv_upload_id
        LEFT JOIN pay_periods pp ON cu.id = pp.csv_upload_id
        WHERE cu.user_id = $1
        GROUP BY cu.id
        ORDER BY cu.created_at DESC
      `;
      
      const result = await pool.query(query, [req.user?.id]);
      
      const uploads = result.rows.map(row => ({
        id: row.id,
        filename: row.filename,
        original_filename: row.original_filename,
        status: row.status,
        processing_status: row.processing_status,
        total_records: row.total_records,
        processed_records: row.processed_records,
        worker_count: parseInt(row.worker_count) || 0,
        pay_period_count: parseInt(row.pay_period_count) || 0,
        created_at: row.created_at,
        processed_at: row.processed_at
      }));
      
      res.status(200).json({
        success: true,
        data: uploads
      });
      
    } catch (error) {
      console.error('❌ Failed to list uploads:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Delete CSV upload and associated data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteUpload(req, res) {
    try {
      const { uploadId } = req.params;
      
      // Get upload details
      const uploadQuery = `
        SELECT * FROM csv_uploads 
        WHERE id = $1 AND user_id = $2
      `;
      
      const uploadResult = await pool.query(uploadQuery, [uploadId, req.user?.id]);
      
      if (uploadResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Upload not found'
        });
      }
      
      const upload = uploadResult.rows[0];
      
      // Delete associated data (cascade will handle this)
      const deleteQuery = `
        DELETE FROM csv_uploads WHERE id = $1
      `;
      
      await pool.query(deleteQuery, [uploadId]);
      
      // Clean up file
      await this.fileUpload.cleanupFile(upload.file_path);
      
      // Log audit action
      await logAuditAction({
        user_id: req.user?.id,
        action: 'csv_upload_deleted',
        table_name: 'csv_uploads',
        record_id: uploadId,
        old_values: {
          filename: upload.filename,
          total_records: upload.total_records
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      console.log(`🗑️ Deleted CSV upload: ${uploadId}`);
      
      res.status(200).json({
        success: true,
        message: 'CSV upload deleted successfully'
      });
      
    } catch (error) {
      console.error('❌ Failed to delete upload:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = CSVUploadController;
