const PRPCalculationService = require('../services/prpCalculationService');
const { pool } = require('../config/database');
const { logAuditAction } = require('../utils/database-utils');

/**
 * PRP Calculation Controller for WageGuard
 * Handles API requests for Pay-Reference Period calculations
 */
class PRPCalculationController {
  constructor() {
    this.prpService = new PRPCalculationService();
  }

  /**
   * Calculate PRP for a specific worker and pay period
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async calculateWorkerPRP(req, res) {
    try {
      const { workerId, payPeriodId } = req.params;

      console.log(`🔄 Calculating PRP for worker ${workerId}, pay period ${payPeriodId}`);

      // Fetch worker data
      const worker = await this.getWorker(workerId);
      if (!worker) {
        return res.status(404).json({
          success: false,
          error: 'Worker not found'
        });
      }

      // Fetch pay period data
      const payPeriod = await this.getPayPeriod(payPeriodId);
      if (!payPeriod) {
        return res.status(404).json({
          success: false,
          error: 'Pay period not found'
        });
      }

      // Fetch offsets for this pay period
      const offsets = await this.getOffsets(payPeriodId);

      // Fetch allowances for this pay period
      const allowances = await this.getAllowances(payPeriodId);

      // Calculate PRP
      const prpResult = this.prpService.calculatePRP(worker, payPeriod, offsets, allowances);

      if (!prpResult.success) {
        return res.status(400).json({
          success: false,
          error: 'PRP calculation failed',
          details: prpResult.error
        });
      }

      // Store compliance check result
      const complianceCheckId = await this.storeComplianceCheck(workerId, payPeriodId, prpResult);

      // Log audit action
      await logAuditAction({
        user_id: req.user?.id,
        action: 'prp_calculation',
        table_name: 'compliance_checks',
        record_id: complianceCheckId,
        new_values: {
          worker_id: workerId,
          pay_period_id: payPeriodId,
          rag_status: prpResult.compliance.rag_status,
          compliance_score: prpResult.compliance.compliance_score
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      console.log(`✅ PRP calculation completed for worker ${workerId}`);

      res.status(200).json({
        success: true,
        data: prpResult,
        compliance_check_id: complianceCheckId
      });

    } catch (error) {
      console.error('❌ PRP calculation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Calculate PRP for all workers in a CSV upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async calculateBulkPRP(req, res) {
    try {
      const { uploadId } = req.params;

      console.log(`🔄 Calculating bulk PRP for CSV upload ${uploadId}`);

      // Fetch all workers for this upload
      const workers = await this.getWorkersByUpload(uploadId);
      if (workers.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No workers found for this upload'
        });
      }

      // Fetch all pay periods for this upload
      const payPeriods = await this.getPayPeriodsByUpload(uploadId);
      if (payPeriods.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No pay periods found for this upload'
        });
      }

      // Fetch all offsets for this upload
      const offsets = await this.getOffsetsByUpload(uploadId);

      // Fetch all allowances for this upload
      const allowances = await this.getAllowancesByUpload(uploadId);

      // Calculate PRP for all workers
      const bulkResult = this.prpService.batchCalculatePRP(workers, payPeriods, offsets, allowances);

      if (!bulkResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Bulk PRP calculation failed'
        });
      }

      // Store all compliance check results
      const complianceCheckIds = [];
      for (const calculation of bulkResult.calculations) {
        const complianceCheckId = await this.storeComplianceCheck(
          calculation.worker.id,
          calculation.prp.pay_period_id || null,
          calculation
        );
        complianceCheckIds.push(complianceCheckId);
      }

      // Update CSV upload status
      await this.updateUploadStatus(uploadId, 'processed');

      // Log audit action
      await logAuditAction({
        user_id: req.user?.id,
        action: 'bulk_prp_calculation',
        table_name: 'csv_uploads',
        record_id: uploadId,
        new_values: {
          total_workers: bulkResult.total_workers,
          compliant_workers: bulkResult.compliant_workers,
          amber_workers: bulkResult.amber_workers,
          non_compliant_workers: bulkResult.non_compliant_workers,
          average_compliance_score: bulkResult.summary.average_compliance_score
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      console.log(`✅ Bulk PRP calculation completed for upload ${uploadId}`);

      res.status(200).json({
        success: true,
        data: {
          ...bulkResult,
          compliance_check_ids: complianceCheckIds
        },
        upload_id: uploadId
      });

    } catch (error) {
      console.error('❌ Bulk PRP calculation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get PRP calculation history for a worker
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWorkerPRPHistory(req, res) {
    try {
      const { workerId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      console.log(`🔄 Fetching PRP history for worker ${workerId}`);

      // Verify worker exists
      const worker = await this.getWorker(workerId);
      if (!worker) {
        return res.status(404).json({
          success: false,
          error: 'Worker not found'
        });
      }

      // Fetch compliance check history
      const history = await this.getComplianceHistory(workerId, limit, offset);

      res.status(200).json({
        success: true,
        data: {
          worker: {
            id: worker.id,
            name: worker.name,
            age: worker.age,
            apprentice_status: worker.apprentice_status
          },
          history: history.checks,
          pagination: {
            total: history.total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            has_more: history.total > parseInt(offset) + parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Failed to fetch worker PRP history:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get compliance summary for a CSV upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getComplianceSummary(req, res) {
    try {
      const { uploadId } = req.params;

      console.log(`🔄 Fetching compliance summary for upload ${uploadId}`);

      // Fetch compliance summary
      const summary = await this.getComplianceSummaryByUpload(uploadId);

      if (!summary) {
        return res.status(404).json({
          success: false,
          error: 'Compliance summary not found'
        });
      }

      res.status(200).json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('❌ Failed to fetch compliance summary:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Database helper methods

  /**
   * Get worker by ID
   * @param {number} workerId - Worker ID
   * @returns {Promise<Object|null>} Worker data
   */
  async getWorker(workerId) {
    try {
      const query = `
        SELECT id, external_id, name, age, apprentice_status, first_year_apprentice
        FROM workers
        WHERE id = $1
      `;
      const result = await pool.query(query, [workerId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching worker:', error);
      throw error;
    }
  }

  /**
   * Get pay period by ID
   * @param {number} payPeriodId - Pay period ID
   * @returns {Promise<Object|null>} Pay period data
   */
  async getPayPeriod(payPeriodId) {
    try {
      const query = `
        SELECT id, worker_id, period_start, period_end, total_hours, total_pay, effective_hourly_rate
        FROM pay_periods
        WHERE id = $1
      `;
      const result = await pool.query(query, [payPeriodId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching pay period:', error);
      throw error;
    }
  }

  /**
   * Get offsets for a pay period
   * @param {number} payPeriodId - Pay period ID
   * @returns {Promise<Array>} Array of offsets
   */
  async getOffsets(payPeriodId) {
    try {
      const query = `
        SELECT id, offset_type, description, amount, daily_rate, days_applied,
               is_accommodation, is_uniform, is_meals, is_deduction
        FROM offsets
        WHERE pay_period_id = $1
      `;
      const result = await pool.query(query, [payPeriodId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching offsets:', error);
      throw error;
    }
  }

  /**
   * Get allowances for a pay period
   * @param {number} payPeriodId - Pay period ID
   * @returns {Promise<Array>} Array of allowances
   */
  async getAllowances(payPeriodId) {
    try {
      const query = `
        SELECT id, allowance_type, description, amount, is_tronc, is_premium, is_bonus
        FROM allowances
        WHERE pay_period_id = $1
      `;
      const result = await pool.query(query, [payPeriodId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching allowances:', error);
      throw error;
    }
  }

  /**
   * Get workers by CSV upload ID
   * @param {number} uploadId - CSV upload ID
   * @returns {Promise<Array>} Array of workers
   */
  async getWorkersByUpload(uploadId) {
    try {
      const query = `
        SELECT id, external_id, name, age, apprentice_status, first_year_apprentice
        FROM workers
        WHERE csv_upload_id = $1
      `;
      const result = await pool.query(query, [uploadId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching workers by upload:', error);
      throw error;
    }
  }

  /**
   * Get pay periods by CSV upload ID
   * @param {number} uploadId - CSV upload ID
   * @returns {Promise<Array>} Array of pay periods
   */
  async getPayPeriodsByUpload(uploadId) {
    try {
      const query = `
        SELECT id, worker_id, period_start, period_end, total_hours, total_pay, effective_hourly_rate
        FROM pay_periods
        WHERE csv_upload_id = $1
      `;
      const result = await pool.query(query, [uploadId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching pay periods by upload:', error);
      throw error;
    }
  }

  /**
   * Get offsets by CSV upload ID
   * @param {number} uploadId - CSV upload ID
   * @returns {Promise<Array>} Array of offsets
   */
  async getOffsetsByUpload(uploadId) {
    try {
      const query = `
        SELECT o.id, o.offset_type, o.description, o.amount, o.daily_rate, o.days_applied,
               o.is_accommodation, o.is_uniform, o.is_meals, o.is_deduction, pp.worker_id
        FROM offsets o
        JOIN pay_periods pp ON o.pay_period_id = pp.id
        WHERE pp.csv_upload_id = $1
      `;
      const result = await pool.query(query, [uploadId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching offsets by upload:', error);
      throw error;
    }
  }

  /**
   * Get allowances by CSV upload ID
   * @param {number} uploadId - CSV upload ID
   * @returns {Promise<Array>} Array of allowances
   */
  async getAllowancesByUpload(uploadId) {
    try {
      const query = `
        SELECT a.id, a.allowance_type, a.description, a.amount, a.is_tronc, a.is_premium, a.is_bonus, pp.worker_id
        FROM allowances a
        JOIN pay_periods pp ON a.pay_period_id = pp.id
        WHERE pp.csv_upload_id = $1
      `;
      const result = await pool.query(query, [uploadId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching allowances by upload:', error);
      throw error;
    }
  }

  /**
   * Store compliance check result
   * @param {number} workerId - Worker ID
   * @param {number} payPeriodId - Pay period ID
   * @param {Object} prpResult - PRP calculation result
   * @returns {Promise<number>} Compliance check ID
   */
  async storeComplianceCheck(workerId, payPeriodId, prpResult) {
    try {
      const query = `
        INSERT INTO compliance_checks (
          worker_id, pay_period_id, csv_upload_id, rag_status, compliance_score,
          issues, fix_suggestions, compliance_rules_applied, evidence_summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;

      const values = [
        workerId,
        payPeriodId,
        prpResult.csv_upload_id || null,
        prpResult.compliance.rag_status,
        prpResult.compliance.compliance_score,
        JSON.stringify(prpResult.compliance.issues),
        JSON.stringify(prpResult.compliance.fix_suggestions),
        JSON.stringify(prpResult.calculation_metadata.rules_applied),
        `PRP calculation completed at ${prpResult.calculation_metadata.calculated_at}`
      ];

      const result = await pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('Error storing compliance check:', error);
      throw error;
    }
  }

  /**
   * Update CSV upload status
   * @param {number} uploadId - CSV upload ID
   * @param {string} status - New status
   * @returns {Promise<void>}
   */
  async updateUploadStatus(uploadId, status) {
    try {
      const query = `
        UPDATE csv_uploads
        SET processing_status = $2, processed_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      await pool.query(query, [uploadId, status]);
    } catch (error) {
      console.error('Error updating upload status:', error);
      throw error;
    }
  }

  /**
   * Get compliance history for a worker
   * @param {number} workerId - Worker ID
   * @param {number} limit - Number of records to return
   * @param {number} offset - Number of records to skip
   * @returns {Promise<Object>} Compliance history with pagination
   */
  async getComplianceHistory(workerId, limit, offset) {
    try {
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM compliance_checks
        WHERE worker_id = $1
      `;
      const countResult = await pool.query(countQuery, [workerId]);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const query = `
        SELECT cc.*, pp.period_start, pp.period_end, pp.total_hours, pp.total_pay
        FROM compliance_checks cc
        LEFT JOIN pay_periods pp ON cc.pay_period_id = pp.id
        WHERE cc.worker_id = $1
        ORDER BY cc.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(query, [workerId, limit, offset]);

      return {
        checks: result.rows,
        total
      };
    } catch (error) {
      console.error('Error fetching compliance history:', error);
      throw error;
    }
  }

  /**
   * Get compliance summary for a CSV upload
   * @param {number} uploadId - CSV upload ID
   * @returns {Promise<Object|null>} Compliance summary
   */
  async getComplianceSummaryByUpload(uploadId) {
    try {
      const query = `
        SELECT
          COUNT(*) as total_checks,
          COUNT(CASE WHEN rag_status = 'GREEN' THEN 1 END) as green_count,
          COUNT(CASE WHEN rag_status = 'AMBER' THEN 1 END) as amber_count,
          COUNT(CASE WHEN rag_status = 'RED' THEN 1 END) as red_count,
          AVG(compliance_score) as average_score,
          MIN(compliance_score) as min_score,
          MAX(compliance_score) as max_score
        FROM compliance_checks cc
        JOIN pay_periods pp ON cc.pay_period_id = pp.id
        WHERE pp.csv_upload_id = $1
      `;
      const result = await pool.query(query, [uploadId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching compliance summary:', error);
      throw error;
    }
  }
}

module.exports = PRPCalculationController;
