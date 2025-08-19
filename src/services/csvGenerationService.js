/**
 * CSV Generation Service
 * 
 * Generates comprehensive CSV exports for compliance data
 * Uses csv-stringify for reliable CSV formatting
 */

const { stringify } = require('csv-stringify');
const { promisify } = require('util');

class CsvGenerationService {
  constructor() {
    this.stringifyAsync = promisify(stringify);
  }

  /**
   * Generate CSV from evidence pack data
   * @param {Object} evidencePack - Complete evidence pack data
   * @param {Object} options - Generation options
   * @returns {Promise<string>} CSV content
   */
  async generateCSV(evidencePack, options = {}) {
    try {
      console.log('📊 Generating CSV evidence pack');

      const csvSections = [];

      // Generate summary section
      const summaryCSV = await this.generateSummaryCSV(evidencePack);
      csvSections.push(summaryCSV);

      // Generate worker details section
      const workerCSV = await this.generateWorkerDetailsCSV(evidencePack.workers);
      csvSections.push(workerCSV);

      // Generate explanations section if available
      if (evidencePack.explanations && evidencePack.explanations.length > 0) {
        const explanationsCSV = await this.generateExplanationsCSV(evidencePack.explanations);
        csvSections.push(explanationsCSV);
      }

      // Generate compliance rules section
      const rulesCSV = await this.generateComplianceRulesCSV(evidencePack.complianceRules);
      csvSections.push(rulesCSV);

      // Combine all sections
      const fullCSV = csvSections.join('\n\n');

      console.log('✅ CSV generated successfully');
      return fullCSV;

    } catch (error) {
      console.error('❌ CSV generation failed:', error);
      throw new Error(`CSV generation failed: ${error.message}`);
    }
  }

  /**
   * Generate summary section CSV
   * @param {Object} evidencePack - Evidence pack data
   * @returns {Promise<string>} CSV content
   */
  async generateSummaryCSV(evidencePack) {
    const { metadata, uploadInfo, summary, generated } = evidencePack;

    // Report metadata
    const metadataRows = [
      ['EVIDENCE PACK SUMMARY', ''],
      ['Report Title', metadata.title],
      ['Generated', new Date(generated.timestamp).toLocaleString()],
      ['Requested By', generated.requestedBy],
      ['Version', generated.version],
      ['', ''],
      ['UPLOAD INFORMATION', ''],
      ['Filename', uploadInfo.filename],
      ['Upload Date', new Date(uploadInfo.uploadDate).toLocaleDateString()],
      ['Processed Date', uploadInfo.processedDate ? new Date(uploadInfo.processedDate).toLocaleDateString() : 'N/A'],
      ['Total Records', uploadInfo.totalRecords],
      ['Processed Records', uploadInfo.processedRecords],
      ['Organization Type', uploadInfo.organizationType],
      ['', ''],
      ['COMPLIANCE SUMMARY', ''],
      ['Total Workers', summary.totalWorkers],
      ['Compliant Workers', summary.compliant],
      ['Review Required', summary.reviewRequired],
      ['Non-Compliant Workers', summary.nonCompliant],
      ['Compliance Rate (%)', summary.complianceRate],
      ['', ''],
      ['FINANCIAL IMPACT', ''],
      ['Total Shortfall (£)', summary.financialImpact?.totalShortfall || 0],
      ['Average Shortfall (£)', summary.financialImpact?.averageShortfall || 0],
      ['Currency', summary.financialImpact?.currency || 'GBP'],
      ['', ''],
      ['RISK ASSESSMENT', ''],
      ['Risk Level', summary.riskLevel?.level || 'UNKNOWN'],
      ['Risk Description', summary.riskLevel?.description || 'No assessment available'],
      ['Recommendations', summary.riskLevel?.recommendations?.join('; ') || 'No recommendations available']
    ];

    return await this.stringifyAsync(metadataRows, {
      header: false,
      columns: ['Field', 'Value']
    });
  }

  /**
   * Generate worker details CSV
   * @param {Array} workers - Worker data
   * @returns {Promise<string>} CSV content
   */
  async generateWorkerDetailsCSV(workers) {
    // Add header section
    const headerRows = [
      ['WORKER COMPLIANCE DETAILS', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '']
    ];

    // Worker data with headers
    const workerData = workers.map(worker => ({
      'Worker ID': worker.worker_id,
      'Worker Name': worker.worker_name || 'N/A',
      'Age': worker.age || 'N/A',
      'Period Start': worker.period_start ? new Date(worker.period_start).toLocaleDateString() : 'N/A',
      'Period End': worker.period_end ? new Date(worker.period_end).toLocaleDateString() : 'N/A',
      'Total Hours': worker.total_hours.toFixed(2),
      'Total Pay (£)': worker.total_pay.toFixed(2),
      'Effective Hourly Rate (£)': worker.effective_hourly_rate.toFixed(2),
      'RAG Status': worker.rag_status,
      'Shortfall Amount (£)': worker.shortfall_amount > 0 ? worker.shortfall_amount.toFixed(2) : '0.00',
      'Issue Description': worker.rag_reason,
      'Period Type': worker.period_type || 'monthly'
    }));

    // Generate header section
    const headerCSV = await this.stringifyAsync(headerRows, { header: false });

    // Generate worker data
    const workerCSV = await this.stringifyAsync(workerData, { 
      header: true,
      columns: [
        'Worker ID',
        'Worker Name', 
        'Age',
        'Period Start',
        'Period End',
        'Total Hours',
        'Total Pay (£)',
        'Effective Hourly Rate (£)',
        'RAG Status',
        'Shortfall Amount (£)',
        'Issue Description',
        'Period Type'
      ]
    });

    return headerCSV + '\n' + workerCSV;
  }

  /**
   * Generate explanations CSV
   * @param {Array} explanations - Explanation data
   * @returns {Promise<string>} CSV content
   */
  async generateExplanationsCSV(explanations) {
    // Add header section
    const headerRows = [
      ['COMPLIANCE ISSUE EXPLANATIONS', '', '', '', '', ''],
      ['', '', '', '', '', '']
    ];

    // Process explanations data
    const explanationData = explanations.map(exp => {
      const explanation = exp.explanation;
      return {
        'Worker ID': exp.workerId,
        'Issue Code': exp.issueCode,
        'Title': explanation.title,
        'Category': explanation.category,
        'Urgency': explanation.urgency,
        'Impact': explanation.impact,
        'Detailed Explanation': explanation.detailedExplanation.replace(/\n/g, ' '),
        'Required Actions': explanation.actionRequired ? explanation.actionRequired.join('; ') : 'None specified',
        'References': explanation.references ? explanation.references.join('; ') : 'Standard compliance references',
        'Generated': new Date(exp.generated).toLocaleString()
      };
    });

    // Generate header section
    const headerCSV = await this.stringifyAsync(headerRows, { header: false });

    // Generate explanations data
    const explanationsCSV = await this.stringifyAsync(explanationData, {
      header: true,
      columns: [
        'Worker ID',
        'Issue Code',
        'Title',
        'Category',
        'Urgency',
        'Impact',
        'Detailed Explanation',
        'Required Actions',
        'References',
        'Generated'
      ]
    });

    return headerCSV + '\n' + explanationsCSV;
  }

  /**
   * Generate compliance rules CSV
   * @param {Array} complianceRules - Compliance rules data
   * @returns {Promise<string>} CSV content
   */
  async generateComplianceRulesCSV(complianceRules) {
    // Add header section
    const headerRows = [
      ['COMPLIANCE RULES REFERENCE', '', '', '', ''],
      ['', '', '', '', '']
    ];

    // Process rules data
    const rulesData = [];
    
    complianceRules.forEach(rule => {
      // Add main rule entry
      rulesData.push({
        'Rule ID': rule.id,
        'Title': rule.title,
        'Description': rule.description,
        'Source': rule.source,
        'URL': rule.url,
        'Last Updated': new Date(rule.lastUpdated).toLocaleDateString(),
        'Type': 'Main Rule',
        'Details': ''
      });

      // Add rates if available
      if (rule.rates) {
        Object.entries(rule.rates).forEach(([category, rate]) => {
          rulesData.push({
            'Rule ID': rule.id,
            'Title': '',
            'Description': '',
            'Source': '',
            'URL': '',
            'Last Updated': '',
            'Type': 'Rate',
            'Details': `${category}: ${rate}`
          });
        });
      }

      // Add sub-rules if available
      if (rule.rules) {
        rule.rules.forEach(subRule => {
          rulesData.push({
            'Rule ID': rule.id,
            'Title': '',
            'Description': '',
            'Source': '',
            'URL': '',
            'Last Updated': '',
            'Type': 'Sub-Rule',
            'Details': subRule
          });
        });
      }
    });

    // Generate header section
    const headerCSV = await this.stringifyAsync(headerRows, { header: false });

    // Generate rules data
    const rulesCSV = await this.stringifyAsync(rulesData, {
      header: true,
      columns: [
        'Rule ID',
        'Title',
        'Description',
        'Source',
        'URL',
        'Last Updated',
        'Type',
        'Details'
      ]
    });

    return headerCSV + '\n' + rulesCSV;
  }

  /**
   * Generate a simplified worker summary CSV (alternative format)
   * @param {Array} workers - Worker data
   * @returns {Promise<string>} CSV content
   */
  async generateSimplifiedWorkerCSV(workers) {
    const simplifiedData = workers.map(worker => ({
      'Worker_ID': worker.worker_id,
      'Worker_Name': worker.worker_name || '',
      'Total_Hours': worker.total_hours,
      'Total_Pay': worker.total_pay,
      'Hourly_Rate': worker.effective_hourly_rate,
      'Status': worker.rag_status,
      'Compliant': worker.rag_status === 'GREEN' ? 'Yes' : 'No',
      'Shortfall': worker.shortfall_amount,
      'Issue': worker.rag_reason
    }));

    return await this.stringifyAsync(simplifiedData, {
      header: true,
      columns: [
        'Worker_ID',
        'Worker_Name',
        'Total_Hours',
        'Total_Pay',
        'Hourly_Rate',
        'Status',
        'Compliant',
        'Shortfall',
        'Issue'
      ]
    });
  }

  /**
   * Generate audit trail CSV
   * @param {Object} evidencePack - Evidence pack data
   * @returns {Promise<string>} CSV content
   */
  async generateAuditTrailCSV(evidencePack) {
    const { metadata, uploadInfo, generated } = evidencePack;

    const auditData = [
      {
        'Timestamp': new Date(generated.timestamp).toISOString(),
        'Action': 'Evidence Pack Generated',
        'User': generated.requestedBy,
        'Upload_ID': uploadInfo.id,
        'Filename': uploadInfo.filename,
        'Organization_Type': uploadInfo.organizationType,
        'Total_Workers': evidencePack.summary.totalWorkers,
        'Compliance_Rate': evidencePack.summary.complianceRate,
        'Risk_Level': evidencePack.summary.riskLevel.level,
        'Format': generated.format,
        'Version': generated.version
      }
    ];

    return await this.stringifyAsync(auditData, {
      header: true,
      columns: [
        'Timestamp',
        'Action',
        'User',
        'Upload_ID',
        'Filename',
        'Organization_Type',
        'Total_Workers',
        'Compliance_Rate',
        'Risk_Level',
        'Format',
        'Version'
      ]
    });
  }

  /**
   * Generate multiple CSV files as a package
   * @param {Object} evidencePack - Evidence pack data
   * @returns {Promise<Object>} Multiple CSV files
   */
  async generateCSVPackage(evidencePack) {
    const csvFiles = {};

    // Main comprehensive export
    csvFiles['evidence_pack_complete.csv'] = await this.generateCSV(evidencePack);

    // Simplified worker data for easy analysis
    csvFiles['workers_summary.csv'] = await this.generateSimplifiedWorkerCSV(evidencePack.workers);

    // Audit trail
    csvFiles['audit_trail.csv'] = await this.generateAuditTrailCSV(evidencePack);

    // Non-compliant workers only
    const nonCompliantWorkers = evidencePack.workers.filter(w => w.rag_status === 'RED');
    if (nonCompliantWorkers.length > 0) {
      csvFiles['non_compliant_workers.csv'] = await this.generateWorkerDetailsCSV(nonCompliantWorkers);
    }

    // Review required workers
    const reviewWorkers = evidencePack.workers.filter(w => w.rag_status === 'AMBER');
    if (reviewWorkers.length > 0) {
      csvFiles['review_required_workers.csv'] = await this.generateWorkerDetailsCSV(reviewWorkers);
    }

    return csvFiles;
  }
}

module.exports = CsvGenerationService;
