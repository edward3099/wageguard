/**
 * Evidence Pack Service
 * 
 * Aggregates all compliance data into structured evidence packs
 * for audit-ready PDF and CSV export functionality
 */

const { pool } = require('../config/database');
const ComplianceExplanationService = require('./complianceExplanationService');

class EvidencePackService {
  constructor() {
    this.explanationService = new ComplianceExplanationService();
  }

  /**
   * Generate a complete evidence pack for a CSV upload
   * @param {number} uploadId - CSV upload ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Evidence pack data
   */
  async generateEvidencePack(uploadId, options = {}) {
    try {
      console.log(`📋 Generating evidence pack for upload ${uploadId}`);

      // Gather all required data
      const uploadInfo = await this.getUploadInfo(uploadId);
      const summary = await this.getComplianceSummary(uploadId);
      const workers = await this.getWorkerDetails(uploadId);
      const complianceRules = await this.getComplianceRules();
      const explanations = await this.generateExplanations(workers, options);
      
      // Generate audit metadata
      const auditMetadata = this.generateAuditMetadata(uploadInfo, options);
      
      // Structure the evidence pack
      const evidencePack = {
        metadata: auditMetadata,
        uploadInfo,
        summary,
        workers,
        complianceRules,
        explanations,
        generated: {
          timestamp: new Date().toISOString(),
          requestedBy: options.requestedBy || 'system',
          format: options.format || 'unknown',
          version: '1.0.0'
        }
      };

      console.log(`✅ Evidence pack generated with ${workers.length} workers and ${explanations.length} explanations`);
      return {
        success: true,
        evidencePack
      };

    } catch (error) {
      console.error('❌ Failed to generate evidence pack:', error);
      return {
        success: false,
        error: 'Failed to generate evidence pack',
        details: error.message
      };
    }
  }

  /**
   * Get CSV upload information
   * @param {number} uploadId - Upload ID
   * @returns {Promise<Object>} Upload information
   */
  async getUploadInfo(uploadId) {
    const query = `
      SELECT 
        cu.*,
        COUNT(DISTINCT w.id) as total_workers,
        COUNT(DISTINCT pp.id) as total_pay_periods
      FROM csv_uploads cu
      LEFT JOIN workers w ON cu.id = w.csv_upload_id
      LEFT JOIN pay_periods pp ON cu.id = pp.csv_upload_id
      WHERE cu.id = $1
      GROUP BY cu.id
    `;

    const result = await pool.query(query, [uploadId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Upload ${uploadId} not found`);
    }

    const upload = result.rows[0];
    return {
      id: upload.id,
      filename: upload.original_filename || upload.filename,
      uploadDate: upload.created_at,
      processedDate: upload.processed_at,
      status: upload.status,
      totalRecords: upload.total_records,
      processedRecords: upload.processed_records,
      totalWorkers: parseInt(upload.total_workers) || 0,
      totalPayPeriods: parseInt(upload.total_pay_periods) || 0,
      organizationId: upload.organization_id,
      organizationType: upload.organization_type
    };
  }

  /**
   * Get compliance summary statistics
   * @param {number} uploadId - Upload ID
   * @returns {Promise<Object>} Compliance summary
   */
  async getComplianceSummary(uploadId) {
    // For now, generate summary from worker data
    // In a full implementation, this could be pre-calculated
    const workers = await this.getWorkerDetails(uploadId);
    
    const totalWorkers = workers.length;
    const compliant = workers.filter(w => w.rag_status === 'GREEN').length;
    const reviewRequired = workers.filter(w => w.rag_status === 'AMBER').length;
    const nonCompliant = workers.filter(w => w.rag_status === 'RED').length;
    
    const complianceRate = totalWorkers > 0 ? ((compliant / totalWorkers) * 100) : 0;
    
    // Calculate financial impact
    const totalShortfall = workers
      .filter(w => w.rag_status === 'RED' && w.shortfall_amount)
      .reduce((sum, w) => sum + parseFloat(w.shortfall_amount || 0), 0);

    return {
      totalWorkers,
      compliant,
      reviewRequired,
      nonCompliant,
      complianceRate: parseFloat(complianceRate.toFixed(2)),
      financialImpact: {
        totalShortfall: parseFloat(totalShortfall.toFixed(2)),
        averageShortfall: nonCompliant > 0 ? parseFloat((totalShortfall / nonCompliant).toFixed(2)) : 0,
        currency: 'GBP'
      },
      riskLevel: this.assessRiskLevel(complianceRate, nonCompliant, totalShortfall)
    };
  }

  /**
   * Get detailed worker compliance data
   * @param {number} uploadId - Upload ID
   * @returns {Promise<Array>} Worker details
   */
  async getWorkerDetails(uploadId) {
    const query = `
      SELECT 
        w.*,
        pp.period_start,
        pp.period_end,
        pp.total_hours,
        pp.total_pay,
        pp.effective_hourly_rate,
        pp.period_type,
        CASE 
          WHEN pp.effective_hourly_rate < 10.42 THEN 'RED'
          WHEN pp.effective_hourly_rate < 11.00 THEN 'AMBER'
          ELSE 'GREEN'
        END as rag_status,
        CASE 
          WHEN pp.effective_hourly_rate < 10.42 THEN 
            ROUND(((10.42 - pp.effective_hourly_rate) * pp.total_hours)::numeric, 2)
          ELSE 0
        END as shortfall_amount,
        CASE 
          WHEN pp.effective_hourly_rate < 10.42 THEN 
            'Effective rate below minimum wage requirement'
          WHEN pp.effective_hourly_rate < 11.00 THEN 
            'Pay meets minimum wage but review recommended'
          ELSE 'Compliant with minimum wage requirements'
        END as rag_reason
      FROM workers w
      LEFT JOIN pay_periods pp ON w.id = pp.worker_id
      WHERE w.csv_upload_id = $1
      ORDER BY w.external_id, w.name
    `;

    const result = await pool.query(query, [uploadId]);
    
    return result.rows.map(row => ({
      id: row.id,
      worker_id: row.external_id,
      worker_name: row.name,
      age: row.age,
      period_start: row.period_start,
      period_end: row.period_end,
      total_hours: parseFloat(row.total_hours || 0),
      total_pay: parseFloat(row.total_pay || 0),
      effective_hourly_rate: parseFloat(row.effective_hourly_rate || 0),
      rag_status: row.rag_status,
      rag_reason: row.rag_reason,
      shortfall_amount: parseFloat(row.shortfall_amount || 0),
      period_type: row.period_type || 'monthly'
    }));
  }

  /**
   * Get compliance rules and references
   * @returns {Promise<Array>} Compliance rules
   */
  async getComplianceRules() {
    // For now, return static rules
    // In a full implementation, this could come from a database
    return [
      {
        id: 'NMW_2024',
        title: 'National Minimum Wage Rates 2024',
        description: 'Current UK minimum wage rates effective from April 2024',
        rates: {
          'National Living Wage (23 and over)': '£11.44',
          'Adult Rate (21-22)': '£10.42', 
          'Young Worker Rate (18-20)': '£7.49',
          'Apprentice Rate': '£6.40'
        },
        source: 'GOV.UK',
        url: 'https://www.gov.uk/national-minimum-wage-rates',
        lastUpdated: '2024-04-01'
      },
      {
        id: 'NMW_DEDUCTIONS',
        title: 'Permitted Deductions from National Minimum Wage',
        description: 'Rules for what can and cannot be deducted from minimum wage pay',
        rules: [
          'Accommodation offset: Maximum £9.99 per day',
          'Uniform costs: Cannot be deducted if it reduces pay below NMW',
          'Training costs: Cannot be deducted if it reduces pay below NMW',
          'Tools and equipment: Cannot be deducted if it reduces pay below NMW'
        ],
        source: 'HMRC National Minimum Wage Manual',
        url: 'https://www.gov.uk/hmrc-internal-manuals/national-minimum-wage-manual',
        lastUpdated: '2024-01-01'
      },
      {
        id: 'WORKING_TIME',
        title: 'Working Time Regulations',
        description: 'Rules for calculating working time for minimum wage purposes',
        rules: [
          'Working time includes time when workers are at work, available and carrying out duties',
          'Rest breaks of 20 minutes or more are not counted as working time',
          'Travelling time to and from work is not normally counted',
          'Sleep-in shifts have specific calculation rules'
        ],
        source: 'Working Time Regulations 1998',
        url: 'https://www.legislation.gov.uk/uksi/1998/1833',
        lastUpdated: '2024-01-01'
      }
    ];
  }

  /**
   * Generate explanations for compliance issues
   * @param {Array} workers - Worker data
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} Generated explanations
   */
  async generateExplanations(workers, options = {}) {
    if (!options.includeExplanations) {
      return [];
    }

    const explanations = [];
    const issueWorkers = workers.filter(w => w.rag_status === 'RED' || w.rag_status === 'AMBER');

    for (const worker of issueWorkers) {
      try {
        // Determine issue code based on worker data
        let issueCode = 'DATA_INSUFFICIENT';
        if (worker.rag_status === 'RED' && worker.effective_hourly_rate < 10.42) {
          issueCode = 'RATE_BELOW_MINIMUM';
        }

        // Generate explanation
        const explanationResult = await this.explanationService.generateExplanation(
          issueCode,
          {
            worker_id: worker.worker_id,
            worker_name: worker.worker_name,
            age: worker.age
          },
          {
            effective_hourly_rate: worker.effective_hourly_rate,
            required_hourly_rate: 10.42,
            total_hours: worker.total_hours,
            total_pay: worker.total_pay,
            shortfall_amount: worker.shortfall_amount
          }
        );

        if (explanationResult.success) {
          explanations.push({
            workerId: worker.worker_id,
            issueCode,
            explanation: explanationResult.explanation,
            generated: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Failed to generate explanation for worker ${worker.worker_id}:`, error);
      }
    }

    return explanations;
  }

  /**
   * Generate audit metadata
   * @param {Object} uploadInfo - Upload information
   * @param {Object} options - Generation options
   * @returns {Object} Audit metadata
   */
  generateAuditMetadata(uploadInfo, options) {
    return {
      title: 'WageGuard Compliance Evidence Pack',
      subtitle: `NMW/NLW Compliance Report for ${uploadInfo.filename}`,
      organization: {
        id: uploadInfo.organizationId,
        type: uploadInfo.organizationType
      },
      payPeriod: {
        uploadDate: uploadInfo.uploadDate,
        processedDate: uploadInfo.processedDate,
        filename: uploadInfo.filename
      },
      compliance: {
        framework: 'UK National Minimum Wage / National Living Wage',
        regulations: [
          'National Minimum Wage Act 1998',
          'National Minimum Wage Regulations 2015',
          'Employment Rights Act 1996'
        ],
        checkDate: new Date().toISOString()
      },
      report: {
        purpose: 'Pre-submission compliance verification',
        scope: 'Complete payroll compliance check against NMW/NLW requirements',
        methodology: 'Deterministic rules engine with comprehensive data validation',
        limitations: 'Based on uploaded payroll data only - may not reflect all employment arrangements'
      },
      disclaimer: 'This report is generated for compliance guidance purposes only and does not constitute legal advice. For complex compliance matters, consult qualified employment law professionals.'
    };
  }

  /**
   * Assess overall risk level based on compliance metrics
   * @param {number} complianceRate - Overall compliance rate percentage
   * @param {number} nonCompliantCount - Number of non-compliant workers
   * @param {number} totalShortfall - Total financial shortfall
   * @returns {Object} Risk assessment
   */
  assessRiskLevel(complianceRate, nonCompliantCount, totalShortfall) {
    let level = 'LOW';
    let description = 'Minimal compliance risk';
    let recommendations = ['Continue current payroll practices'];

    if (complianceRate < 95 || nonCompliantCount > 0 || totalShortfall > 0) {
      level = 'MEDIUM';
      description = 'Some compliance issues identified';
      recommendations = [
        'Review flagged worker records',
        'Implement recommended corrections',
        'Monitor future payroll submissions'
      ];
    }

    if (complianceRate < 85 || nonCompliantCount > 5 || totalShortfall > 1000) {
      level = 'HIGH';
      description = 'Significant compliance violations requiring immediate attention';
      recommendations = [
        'Immediate review and correction of all flagged issues',
        'Calculate and process back-pay obligations',
        'Review payroll processes to prevent future violations',
        'Consider professional compliance consultation'
      ];
    }

    if (complianceRate < 70 || nonCompliantCount > 10 || totalShortfall > 5000) {
      level = 'CRITICAL';
      description = 'Severe compliance violations with potential legal and financial consequences';
      recommendations = [
        'URGENT: Stop payroll processing until issues are resolved',
        'Engage legal counsel immediately',
        'Conduct comprehensive payroll audit',
        'Implement immediate corrective measures',
        'Prepare for potential HMRC investigation'
      ];
    }

    return {
      level,
      description,
      recommendations,
      metrics: {
        complianceRate,
        nonCompliantCount,
        totalShortfall
      }
    };
  }

  /**
   * Get summary statistics for evidence pack
   * @param {Object} evidencePack - Evidence pack data
   * @returns {Object} Summary statistics
   */
  getPackageStatistics(evidencePack) {
    return {
      totalWorkers: evidencePack.workers.length,
      totalExplanations: evidencePack.explanations.length,
      complianceRules: evidencePack.complianceRules.length,
      riskLevel: evidencePack.summary.riskLevel.level,
      complianceRate: evidencePack.summary.complianceRate,
      generatedAt: evidencePack.generated.timestamp,
      format: evidencePack.generated.format
    };
  }
}

module.exports = EvidencePackService;
