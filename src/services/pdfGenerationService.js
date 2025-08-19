/**
 * PDF Generation Service
 * 
 * Generates professional PDF evidence packs for compliance reporting
 * Uses html-pdf-node for reliable HTML to PDF conversion
 */

const htmlPdf = require('html-pdf-node');
const fs = require('fs').promises;
const path = require('path');

class PdfGenerationService {
  constructor() {
    this.options = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; padding: 5px 15px; width: 100%; text-align: center; color: #666;">
          <span>WageGuard Compliance Evidence Pack</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; padding: 5px 15px; width: 100%; text-align: center; color: #666;">
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span> | Generated on <span class="date"></span></span>
        </div>
      `
    };
  }

  /**
   * Generate PDF from evidence pack data
   * @param {Object} evidencePack - Complete evidence pack data
   * @param {Object} options - Generation options
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generatePDF(evidencePack, options = {}) {
    try {
      console.log('📄 Generating PDF evidence pack');

      // Generate HTML content
      const htmlContent = await this.generateHTML(evidencePack);
      
      // Configure PDF options
      const pdfOptions = {
        ...this.options,
        ...options,
        path: options.outputPath // If specified, will save to file
      };

      // Generate PDF
      const file = { content: htmlContent };
      const pdfBuffer = await htmlPdf.generatePdf(file, pdfOptions);

      console.log('✅ PDF generated successfully');
      return pdfBuffer;

    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate HTML content for PDF
   * @param {Object} evidencePack - Evidence pack data
   * @returns {Promise<string>} HTML content
   */
  async generateHTML(evidencePack) {
    const {
      metadata,
      uploadInfo,
      summary,
      workers,
      complianceRules,
      explanations,
      generated
    } = evidencePack;

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${metadata.title}</title>
      <style>
        ${this.getCSS()}
      </style>
    </head>
    <body>
      <!-- Cover Page -->
      <div class="page cover-page">
        ${this.generateCoverPage(metadata, uploadInfo, generated)}
      </div>

      <!-- Executive Summary -->
      <div class="page-break"></div>
      <div class="page">
        ${this.generateExecutiveSummary(metadata, summary, uploadInfo)}
      </div>

      <!-- Compliance Overview -->
      <div class="page-break"></div>
      <div class="page">
        ${this.generateComplianceOverview(summary, complianceRules)}
      </div>

      <!-- Worker Details -->
      <div class="page-break"></div>
      <div class="page">
        ${this.generateWorkerDetails(workers)}
      </div>

      <!-- Explanations -->
      ${explanations.length > 0 ? `
      <div class="page-break"></div>
      <div class="page">
        ${this.generateExplanations(explanations)}
      </div>
      ` : ''}

      <!-- Compliance Rules Reference -->
      <div class="page-break"></div>
      <div class="page">
        ${this.generateComplianceRules(complianceRules)}
      </div>

      <!-- Appendix -->
      <div class="page-break"></div>
      <div class="page">
        ${this.generateAppendix(metadata, generated)}
      </div>
    </body>
    </html>
    `;

    return html;
  }

  /**
   * Generate CSS styles for the PDF
   * @returns {string} CSS styles
   */
  getCSS() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Arial', sans-serif;
        font-size: 11pt;
        line-height: 1.4;
        color: #333;
      }

      .page {
        min-height: 100vh;
        padding: 20px;
      }

      .page-break {
        page-break-before: always;
      }

      .cover-page {
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .cover-page h1 {
        font-size: 36pt;
        margin-bottom: 20px;
        font-weight: bold;
      }

      .cover-page h2 {
        font-size: 24pt;
        margin-bottom: 40px;
        font-weight: normal;
        opacity: 0.9;
      }

      .cover-page .metadata {
        background: rgba(255, 255, 255, 0.1);
        padding: 30px;
        border-radius: 10px;
        margin: 40px auto;
        max-width: 600px;
      }

      h1 {
        font-size: 24pt;
        margin-bottom: 20px;
        color: #2c3e50;
        border-bottom: 3px solid #3498db;
        padding-bottom: 10px;
      }

      h2 {
        font-size: 18pt;
        margin: 30px 0 15px 0;
        color: #34495e;
      }

      h3 {
        font-size: 14pt;
        margin: 20px 0 10px 0;
        color: #2980b9;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin: 20px 0;
      }

      .summary-card {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #3498db;
      }

      .summary-card.risk-high {
        border-left-color: #e74c3c;
      }

      .summary-card.risk-medium {
        border-left-color: #f39c12;
      }

      .summary-card.risk-low {
        border-left-color: #27ae60;
      }

      .summary-card h4 {
        font-size: 12pt;
        margin-bottom: 5px;
        color: #2c3e50;
      }

      .summary-card .value {
        font-size: 18pt;
        font-weight: bold;
        color: #2980b9;
      }

      .compliance-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        font-size: 10pt;
      }

      .compliance-table th,
      .compliance-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }

      .compliance-table th {
        background: #34495e;
        color: white;
        font-weight: bold;
      }

      .compliance-table tbody tr:nth-child(even) {
        background: #f8f9fa;
      }

      .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 9pt;
        font-weight: bold;
        text-align: center;
      }

      .status-green {
        background: #d4edda;
        color: #155724;
      }

      .status-amber {
        background: #fff3cd;
        color: #856404;
      }

      .status-red {
        background: #f8d7da;
        color: #721c24;
      }

      .explanation-box {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 15px;
        margin: 15px 0;
      }

      .explanation-box h4 {
        color: #e74c3c;
        margin-bottom: 10px;
      }

      .disclaimer {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
        font-size: 10pt;
        color: #6c757d;
      }

      .disclaimer strong {
        color: #495057;
      }

      .risk-assessment {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }

      .risk-level {
        font-size: 16pt;
        font-weight: bold;
        margin-bottom: 10px;
      }

      .risk-level.high {
        color: #e74c3c;
      }

      .risk-level.medium {
        color: #f39c12;
      }

      .risk-level.low {
        color: #27ae60;
      }

      .risk-level.critical {
        color: #c0392b;
      }

      .recommendations {
        margin-top: 15px;
      }

      .recommendations ul {
        margin-left: 20px;
      }

      .recommendations li {
        margin: 5px 0;
      }

      .footer-info {
        font-size: 9pt;
        color: #6c757d;
        text-align: center;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #dee2e6;
      }
    `;
  }

  /**
   * Generate cover page HTML
   */
  generateCoverPage(metadata, uploadInfo, generated) {
    return `
      <h1>${metadata.title}</h1>
      <h2>${metadata.subtitle}</h2>
      
      <div class="metadata">
        <div style="margin-bottom: 15px;">
          <strong>Organization:</strong> ${metadata.organization.type === 'bureau' ? 'Payroll Bureau' : 'Employer'}<br>
          <strong>File:</strong> ${uploadInfo.filename}<br>
          <strong>Upload Date:</strong> ${new Date(uploadInfo.uploadDate).toLocaleDateString()}<br>
          <strong>Generated:</strong> ${new Date(generated.timestamp).toLocaleString()}
        </div>
        
        <div style="margin-top: 30px;">
          <strong>Compliance Framework:</strong><br>
          ${metadata.compliance.framework}
        </div>
        
        <div style="margin-top: 30px; font-size: 12pt;">
          <em>${metadata.report.purpose}</em>
        </div>
      </div>
    `;
  }

  /**
   * Generate executive summary HTML
   */
  generateExecutiveSummary(metadata, summary, uploadInfo) {
    return `
      <h1>Executive Summary</h1>
      
      <div class="summary-grid">
        <div class="summary-card">
          <h4>Total Workers</h4>
          <div class="value">${summary.totalWorkers}</div>
        </div>
        <div class="summary-card">
          <h4>Compliance Rate</h4>
          <div class="value">${summary.complianceRate}%</div>
        </div>
        <div class="summary-card">
          <h4>Compliant Workers</h4>
          <div class="value" style="color: #27ae60;">${summary.compliant}</div>
        </div>
        <div class="summary-card">
          <h4>Non-Compliant Workers</h4>
          <div class="value" style="color: #e74c3c;">${summary.nonCompliant}</div>
        </div>
      </div>

      <div class="risk-assessment">
        <div class="risk-level ${summary.riskLevel.level.toLowerCase()}">
          Risk Level: ${summary.riskLevel.level}
        </div>
        <p>${summary.riskLevel.description}</p>
        
        <div class="recommendations">
          <h3>Recommendations</h3>
          <ul>
            ${summary.riskLevel.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      </div>

      ${summary.financialImpact.totalShortfall > 0 ? `
      <h2>Financial Impact</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <h4>Total Shortfall</h4>
          <div class="value" style="color: #e74c3c;">£${summary.financialImpact.totalShortfall.toFixed(2)}</div>
        </div>
        <div class="summary-card">
          <h4>Average Shortfall</h4>
          <div class="value">£${summary.financialImpact.averageShortfall.toFixed(2)}</div>
        </div>
      </div>
      ` : ''}

      <h2>Report Scope</h2>
      <p><strong>Purpose:</strong> ${metadata.report.purpose}</p>
      <p><strong>Scope:</strong> ${metadata.report.scope}</p>
      <p><strong>Methodology:</strong> ${metadata.report.methodology}</p>
      <p><strong>Limitations:</strong> ${metadata.report.limitations}</p>
    `;
  }

  /**
   * Generate compliance overview HTML
   */
  generateComplianceOverview(summary, complianceRules) {
    return `
      <h1>Compliance Overview</h1>
      
      <h2>Compliance Distribution</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <h4>Green (Compliant)</h4>
          <div class="value" style="color: #27ae60;">${summary.compliant}</div>
          <small>${summary.totalWorkers > 0 ? ((summary.compliant / summary.totalWorkers) * 100).toFixed(1) : 0}%</small>
        </div>
        <div class="summary-card">
          <h4>Amber (Review Required)</h4>
          <div class="value" style="color: #f39c12;">${summary.reviewRequired}</div>
          <small>${summary.totalWorkers > 0 ? ((summary.reviewRequired / summary.totalWorkers) * 100).toFixed(1) : 0}%</small>
        </div>
        <div class="summary-card">
          <h4>Red (Non-Compliant)</h4>
          <div class="value" style="color: #e74c3c;">${summary.nonCompliant}</div>
          <small>${summary.totalWorkers > 0 ? ((summary.nonCompliant / summary.totalWorkers) * 100).toFixed(1) : 0}%</small>
        </div>
      </div>

      <h2>Applied Compliance Standards</h2>
      ${complianceRules.map(rule => `
        <div style="margin-bottom: 20px;">
          <h3>${rule.title}</h3>
          <p>${rule.description}</p>
          ${rule.rates ? `
            <div style="margin: 10px 0;">
              <strong>Current Rates:</strong>
              <ul>
                ${Object.entries(rule.rates).map(([category, rate]) => `<li>${category}: ${rate}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${rule.rules ? `
            <div style="margin: 10px 0;">
              <strong>Key Rules:</strong>
              <ul>
                ${rule.rules.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          <small><em>Source: ${rule.source} | Last Updated: ${new Date(rule.lastUpdated).toLocaleDateString()}</em></small>
        </div>
      `).join('')}
    `;
  }

  /**
   * Generate worker details HTML
   */
  generateWorkerDetails(workers) {
    return `
      <h1>Worker Compliance Details</h1>
      
      <table class="compliance-table">
        <thead>
          <tr>
            <th>Worker ID</th>
            <th>Name</th>
            <th>Hours</th>
            <th>Total Pay</th>
            <th>Effective Rate</th>
            <th>Status</th>
            <th>Shortfall</th>
            <th>Issue</th>
          </tr>
        </thead>
        <tbody>
          ${workers.map(worker => `
            <tr>
              <td>${worker.worker_id}</td>
              <td>${worker.worker_name || 'N/A'}</td>
              <td>${worker.total_hours.toFixed(1)}</td>
              <td>£${worker.total_pay.toFixed(2)}</td>
              <td>£${worker.effective_hourly_rate.toFixed(2)}</td>
              <td>
                <span class="status-badge status-${worker.rag_status.toLowerCase()}">
                  ${worker.rag_status}
                </span>
              </td>
              <td>${worker.shortfall_amount > 0 ? `£${worker.shortfall_amount.toFixed(2)}` : '-'}</td>
              <td style="font-size: 9pt;">${worker.rag_reason}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Generate explanations HTML
   */
  generateExplanations(explanations) {
    return `
      <h1>Compliance Issue Explanations</h1>
      
      <p>The following AI-generated explanations provide detailed guidance for resolving identified compliance issues:</p>
      
      ${explanations.map(exp => `
        <div class="explanation-box">
          <h4>Worker ${exp.workerId} - ${exp.explanation.title}</h4>
          <p><strong>Category:</strong> ${exp.explanation.category} | <strong>Urgency:</strong> ${exp.explanation.urgency}</p>
          <p>${exp.explanation.detailedExplanation}</p>
          
          ${exp.explanation.actionRequired && exp.explanation.actionRequired.length > 0 ? `
            <div style="margin-top: 15px;">
              <strong>Required Actions:</strong>
              <ul>
                ${exp.explanation.actionRequired.map(action => `<li>${action}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div style="margin-top: 10px; font-size: 10pt; color: #6c757d;">
            <em>Generated: ${new Date(exp.generated).toLocaleString()}</em>
          </div>
        </div>
      `).join('')}
      
      <div class="disclaimer">
        <strong>Disclaimer:</strong> These explanations are generated for guidance purposes only and do not constitute legal advice. 
        For complex compliance issues, please consult with qualified employment law professionals.
      </div>
    `;
  }

  /**
   * Generate compliance rules reference HTML
   */
  generateComplianceRules(complianceRules) {
    return `
      <h1>Compliance Rules Reference</h1>
      
      <p>This section provides detailed information about the compliance rules and regulations applied in this assessment:</p>
      
      ${complianceRules.map(rule => `
        <div style="margin-bottom: 30px;">
          <h2>${rule.title}</h2>
          <p>${rule.description}</p>
          
          ${rule.rates ? `
            <h3>Current Rates</h3>
            <table class="compliance-table" style="max-width: 500px;">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(rule.rates).map(([category, rate]) => `
                  <tr>
                    <td>${category}</td>
                    <td><strong>${rate}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          ${rule.rules ? `
            <h3>Key Rules</h3>
            <ul>
              ${rule.rules.map(r => `<li>${r}</li>`).join('')}
            </ul>
          ` : ''}
          
          <p style="margin-top: 15px;">
            <strong>Source:</strong> ${rule.source}<br>
            <strong>Reference:</strong> <a href="${rule.url}" style="color: #3498db;">${rule.url}</a><br>
            <strong>Last Updated:</strong> ${new Date(rule.lastUpdated).toLocaleDateString()}
          </p>
        </div>
      `).join('')}
    `;
  }

  /**
   * Generate appendix HTML
   */
  generateAppendix(metadata, generated) {
    return `
      <h1>Appendix</h1>
      
      <h2>Report Information</h2>
      <div style="margin: 20px 0;">
        <p><strong>Generated By:</strong> WageGuard Compliance System v${generated.version}</p>
        <p><strong>Generated On:</strong> ${new Date(generated.timestamp).toLocaleString()}</p>
        <p><strong>Requested By:</strong> ${generated.requestedBy}</p>
        <p><strong>Report Format:</strong> ${generated.format.toUpperCase()}</p>
      </div>
      
      <h2>Legal Framework</h2>
      <ul>
        ${metadata.compliance.regulations.map(reg => `<li>${reg}</li>`).join('')}
      </ul>
      
      <h2>Methodology</h2>
      <p>${metadata.report.methodology}</p>
      
      <h2>Contact Information</h2>
      <p>For questions about this report or compliance assistance:</p>
      <ul>
        <li>ACAS (Advisory, Conciliation and Arbitration Service): <a href="https://www.acas.org.uk">www.acas.org.uk</a></li>
        <li>HMRC National Minimum Wage Enquiries: 0300 123 1100</li>
        <li>GOV.UK Minimum Wage Information: <a href="https://www.gov.uk/national-minimum-wage-rates">www.gov.uk/national-minimum-wage-rates</a></li>
      </ul>
      
      <div class="disclaimer">
        <strong>Important Disclaimer:</strong> ${metadata.disclaimer}
      </div>
      
      <div class="footer-info">
        This report was generated by WageGuard - UK National Minimum Wage Compliance Software<br>
        Generated on ${new Date().toLocaleString()} | Report ID: ${generated.timestamp}
      </div>
    `;
  }
}

module.exports = PdfGenerationService;
