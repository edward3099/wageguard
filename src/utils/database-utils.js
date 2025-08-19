const { pool } = require('../config/database');

/**
 * Database utility functions for WageGuard
 */

/**
 * Get compliance rules for a specific date and worker characteristics
 * @param {Date} checkDate - Date to check compliance for
 * @param {number} workerAge - Worker's age
 * @param {boolean} isApprentice - Whether worker is an apprentice
 * @param {boolean} isFirstYearApprentice - Whether worker is first year apprentice
 * @returns {Promise<Array>} Array of applicable compliance rules
 */
const getApplicableComplianceRules = async (checkDate, workerAge, isApprentice, isFirstYearApprentice) => {
  try {
    const query = `
      SELECT * FROM compliance_rules 
      WHERE is_active = true 
        AND effective_date <= $1 
        AND (expiry_date IS NULL OR expiry_date >= $1)
        AND (min_age IS NULL OR min_age <= $2)
        AND (max_age IS NULL OR max_age >= $2)
        AND (apprentice_applicable = true OR $3 = false)
      ORDER BY rule_type, min_age DESC
    `;
    
    const result = await pool.query(query, [checkDate, workerAge, isApprentice]);
    return result.rows;
  } catch (error) {
    console.error('Error getting compliance rules:', error);
    throw error;
  }
};

/**
 * Calculate effective hourly rate after offsets
 * @param {number} totalPay - Total pay for the period
 * @param {number} totalHours - Total hours worked
 * @param {Array} offsets - Array of offset objects
 * @returns {number} Effective hourly rate
 */
const calculateEffectiveHourlyRate = (totalPay, totalHours, offsets = []) => {
  if (totalHours <= 0) return 0;
  
  // Calculate total offsets
  const totalOffsets = offsets.reduce((sum, offset) => {
    if (offset.amount && offset.amount > 0) {
      return sum + offset.amount;
    }
    return sum;
  }, 0);
  
  // Effective pay = total pay - total offsets
  const effectivePay = totalPay - totalOffsets;
  
  // Effective hourly rate = effective pay / total hours
  return effectivePay / totalHours;
};

/**
 * Determine RAG status based on compliance
 * @param {number} effectiveRate - Effective hourly rate
 * @param {number} requiredRate - Required minimum rate
 * @param {number} tolerance - Tolerance percentage (default 5%)
 * @returns {string} RAG status: 'RED', 'AMBER', or 'GREEN'
 */
const determineRAGStatus = (effectiveRate, requiredRate, tolerance = 0.05) => {
  if (effectiveRate >= requiredRate) {
    return 'GREEN';
  }
  
  const toleranceAmount = requiredRate * tolerance;
  if (effectiveRate >= (requiredRate - toleranceAmount)) {
    return 'AMBER';
  }
  
  return 'RED';
};

/**
 * Get compliance issues for a worker
 * @param {number} effectiveRate - Effective hourly rate
 * @param {number} requiredRate - Required minimum rate
 * @param {Array} offsets - Array of offset objects
 * @param {Array} allowances - Array of allowance objects
 * @returns {Array} Array of compliance issues
 */
const getComplianceIssues = (effectiveRate, requiredRate, offsets = [], allowances = []) => {
  const issues = [];
  
  // Check hourly rate compliance
  if (effectiveRate < requiredRate) {
    const shortfall = requiredRate - effectiveRate;
    issues.push({
      type: 'hourly_rate',
      severity: 'high',
      message: `Hourly rate £${effectiveRate.toFixed(2)} is below required rate £${requiredRate.toFixed(2)}`,
      shortfall: shortfall,
      fix_suggestion: `Increase hourly rate by £${shortfall.toFixed(2)} or reduce offsets by £${(shortfall * 40).toFixed(2)} for a 40-hour week`
    });
  }
  
  // Check accommodation offset compliance
  const accommodationOffsets = offsets.filter(o => o.is_accommodation);
  accommodationOffsets.forEach(offset => {
    if (offset.daily_rate > 9.99) {
      issues.push({
        type: 'accommodation_offset',
        severity: 'medium',
        message: `Accommodation offset £${offset.daily_rate.toFixed(2)} exceeds maximum £9.99 per day`,
        fix_suggestion: 'Reduce accommodation offset to £9.99 per day maximum'
      });
    }
  });
  
  // Check for excessive deductions
  const deductions = offsets.filter(o => o.is_deduction);
  const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
  if (totalDeductions > 0) {
    issues.push({
      type: 'deductions',
      severity: 'medium',
      message: `Total deductions £${totalDeductions.toFixed(2)} may affect compliance`,
      fix_suggestion: 'Review deductions to ensure they don\'t reduce pay below minimum wage'
    });
  }
  
  return issues;
};

/**
 * Create compliance check record
 * @param {Object} checkData - Compliance check data
 * @returns {Promise<Object>} Created compliance check record
 */
const createComplianceCheck = async (checkData) => {
  try {
    const query = `
      INSERT INTO compliance_checks (
        pay_period_id, worker_id, csv_upload_id, rag_status, 
        compliance_score, issues, fix_suggestions, 
        compliance_rules_applied, evidence_summary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      checkData.pay_period_id,
      checkData.worker_id,
      checkData.csv_upload_id,
      checkData.rag_status,
      checkData.compliance_score,
      JSON.stringify(checkData.issues),
      JSON.stringify(checkData.fix_suggestions),
      JSON.stringify(checkData.compliance_rules_applied),
      checkData.evidence_summary
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating compliance check:', error);
    throw error;
  }
};

/**
 * Get compliance summary for a CSV upload
 * @param {number} csvUploadId - CSV upload ID
 * @returns {Promise<Object>} Compliance summary
 */
const getComplianceSummary = async (csvUploadId) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_checks,
        COUNT(CASE WHEN rag_status = 'GREEN' THEN 1 END) as green_count,
        COUNT(CASE WHEN rag_status = 'AMBER' THEN 1 END) as amber_count,
        COUNT(CASE WHEN rag_status = 'RED' THEN 1 END) as red_count,
        AVG(compliance_score) as average_score
      FROM compliance_checks 
      WHERE csv_upload_id = $1
    `;
    
    const result = await pool.query(query, [csvUploadId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting compliance summary:', error);
    throw error;
  }
};

/**
 * Log database action for audit purposes
 * @param {Object} auditData - Audit log data
 * @returns {Promise<Object>} Created audit log record
 */
const logAuditAction = async (auditData) => {
  try {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, table_name, record_id, 
        old_values, new_values, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      auditData.user_id,
      auditData.action,
      auditData.table_name,
      auditData.record_id,
      auditData.old_values ? JSON.stringify(auditData.old_values) : null,
      auditData.new_values ? JSON.stringify(auditData.new_values) : null,
      auditData.ip_address,
      auditData.user_agent
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error logging audit action:', error);
    // Don't throw error for audit logging failures
    return null;
  }
};

module.exports = {
  getApplicableComplianceRules,
  calculateEffectiveHourlyRate,
  determineRAGStatus,
  getComplianceIssues,
  createComplianceCheck,
  getComplianceSummary,
  logAuditAction
};
