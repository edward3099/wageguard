/**
 * Evidence Pack Service Tests
 * 
 * Tests the evidence pack generation, PDF creation, and CSV export functionality
 */

const EvidencePackService = require('../src/services/evidencePackService');
const PdfGenerationService = require('../src/services/pdfGenerationService');
const CsvGenerationService = require('../src/services/csvGenerationService');

// Mock the database pool
jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Mock the LLM services to avoid API key requirements
jest.mock('../src/services/complianceExplanationService', () => {
  return jest.fn().mockImplementation(() => ({
    generateExplanation: jest.fn().mockResolvedValue({
      success: true,
      explanation: {
        title: 'Mock Explanation',
        category: 'critical',
        detailedExplanation: 'This is a mock explanation for testing.',
        actionRequired: ['Take corrective action'],
        impact: 'Critical - immediate action required',
        urgency: 'immediate',
        references: ['National Minimum Wage Act 1998']
      }
    })
  }));
});

describe('Evidence Pack Services', () => {
  let evidencePackService;
  let pdfService;
  let csvService;

  beforeEach(() => {
    evidencePackService = new EvidencePackService();
    pdfService = new PdfGenerationService();
    csvService = new CsvGenerationService();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('EvidencePackService', () => {
    test('should assess risk level correctly', () => {
      // Test LOW risk
      let risk = evidencePackService.assessRiskLevel(98, 0, 0);
      expect(risk.level).toBe('LOW');
      expect(risk.description).toContain('Minimal compliance risk');

      // Test MEDIUM risk
      risk = evidencePackService.assessRiskLevel(92, 2, 50);
      expect(risk.level).toBe('MEDIUM');
      expect(risk.description).toContain('Some compliance issues');

      // Test HIGH risk
      risk = evidencePackService.assessRiskLevel(80, 8, 1500);
      expect(risk.level).toBe('HIGH');
      expect(risk.description).toContain('Significant compliance violations');

      // Test CRITICAL risk
      risk = evidencePackService.assessRiskLevel(65, 15, 8000);
      expect(risk.level).toBe('CRITICAL');
      expect(risk.description).toContain('Severe compliance violations');
    });

    test('should generate audit metadata correctly', () => {
      const uploadInfo = {
        id: 123,
        filename: 'test-payroll.csv',
        uploadDate: '2024-01-15T10:00:00Z',
        organizationId: 1,
        organizationType: 'employer'
      };

      const options = {
        requestedBy: 'test@example.com',
        format: 'pdf'
      };

      const metadata = evidencePackService.generateAuditMetadata(uploadInfo, options);

      expect(metadata.title).toBe('WageGuard Compliance Evidence Pack');
      expect(metadata.subtitle).toContain('test-payroll.csv');
      expect(metadata.organization.id).toBe(1);
      expect(metadata.organization.type).toBe('employer');
      expect(metadata.compliance.framework).toContain('National Minimum Wage');
      expect(metadata.disclaimer).toContain('guidance purposes only');
    });

    test('should get compliance rules', async () => {
      const rules = await evidencePackService.getComplianceRules();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      
      const nmwRule = rules.find(rule => rule.id === 'NMW_2024');
      expect(nmwRule).toBeDefined();
      expect(nmwRule.title).toContain('National Minimum Wage');
      expect(nmwRule.rates).toBeDefined();
      expect(nmwRule.source).toBe('GOV.UK');
    });

    test('should get package statistics correctly', () => {
      const mockEvidencePack = {
        workers: [{}, {}, {}], // 3 workers
        explanations: [{}], // 1 explanation
        complianceRules: [{}, {}], // 2 rules
        summary: {
          riskLevel: { level: 'MEDIUM' },
          complianceRate: 85.5
        },
        generated: {
          timestamp: '2024-01-15T10:00:00Z',
          format: 'pdf'
        }
      };

      const stats = evidencePackService.getPackageStatistics(mockEvidencePack);

      expect(stats.totalWorkers).toBe(3);
      expect(stats.totalExplanations).toBe(1);
      expect(stats.complianceRules).toBe(2);
      expect(stats.riskLevel).toBe('MEDIUM');
      expect(stats.complianceRate).toBe(85.5);
      expect(stats.format).toBe('pdf');
    });
  });

  describe('PdfGenerationService', () => {
    test('should generate CSS styles', () => {
      const css = pdfService.getCSS();
      
      expect(css).toContain('font-family');
      expect(css).toContain('.cover-page');
      expect(css).toContain('.compliance-table');
      expect(css).toContain('.status-badge');
      expect(css).toContain('.risk-level');
    });

    test('should generate cover page HTML', () => {
      const metadata = {
        title: 'Test Evidence Pack',
        subtitle: 'Test Report',
        organization: { type: 'employer' },
        compliance: { framework: 'UK NMW/NLW' },
        report: { purpose: 'Test purpose' }
      };

      const uploadInfo = {
        filename: 'test.csv',
        uploadDate: '2024-01-15T10:00:00Z'
      };

      const generated = {
        timestamp: '2024-01-15T10:30:00Z'
      };

      const html = pdfService.generateCoverPage(metadata, uploadInfo, generated);

      expect(html).toContain('Test Evidence Pack');
      expect(html).toContain('Test Report');
      expect(html).toContain('test.csv');
      expect(html).toContain('UK NMW/NLW');
    });

    test('should generate executive summary HTML', () => {
      const metadata = {
        report: {
          purpose: 'Test purpose',
          scope: 'Test scope',
          methodology: 'Test methodology',
          limitations: 'Test limitations'
        }
      };

      const summary = {
        totalWorkers: 10,
        complianceRate: 85.5,
        compliant: 8,
        nonCompliant: 2,
        riskLevel: {
          level: 'MEDIUM',
          description: 'Some issues identified',
          recommendations: ['Review flagged workers', 'Implement corrections']
        },
        financialImpact: {
          totalShortfall: 125.50,
          averageShortfall: 62.75
        }
      };

      const uploadInfo = {
        filename: 'test.csv'
      };

      const html = pdfService.generateExecutiveSummary(metadata, summary, uploadInfo);

      expect(html).toContain('Executive Summary');
      expect(html).toContain('10'); // totalWorkers
      expect(html).toContain('85.5%'); // complianceRate
      expect(html).toContain('MEDIUM'); // risk level
      expect(html).toContain('£125.50'); // total shortfall
    });

    test('should generate worker details table', () => {
      const workers = [
        {
          worker_id: 'W001',
          worker_name: 'Test Worker 1',
          total_hours: 40,
          total_pay: 400,
          effective_hourly_rate: 10.00,
          rag_status: 'GREEN',
          shortfall_amount: 0,
          rag_reason: 'Compliant'
        },
        {
          worker_id: 'W002',
          worker_name: 'Test Worker 2',
          total_hours: 35,
          total_pay: 280,
          effective_hourly_rate: 8.00,
          rag_status: 'RED',
          shortfall_amount: 87.00,
          rag_reason: 'Below minimum wage'
        }
      ];

      const html = pdfService.generateWorkerDetails(workers);

      expect(html).toContain('Worker Compliance Details');
      expect(html).toContain('W001');
      expect(html).toContain('Test Worker 1');
      expect(html).toContain('£10.00');
      expect(html).toContain('status-green');
      expect(html).toContain('W002');
      expect(html).toContain('£8.00');
      expect(html).toContain('status-red');
      expect(html).toContain('£87.00');
    });
  });

  describe('CsvGenerationService', () => {
    test('should generate summary CSV', async () => {
      const evidencePack = {
        metadata: {
          title: 'Test Evidence Pack'
        },
        uploadInfo: {
          filename: 'test.csv',
          uploadDate: '2024-01-15T10:00:00Z',
          totalRecords: 10,
          processedRecords: 10,
          organizationType: 'employer'
        },
        summary: {
          totalWorkers: 10,
          compliant: 8,
          reviewRequired: 1,
          nonCompliant: 1,
          complianceRate: 80,
          financialImpact: {
            totalShortfall: 50.00,
            averageShortfall: 50.00,
            currency: 'GBP'
          },
          riskLevel: {
            level: 'MEDIUM',
            description: 'Some issues',
            recommendations: ['Review workers']
          }
        },
        generated: {
          timestamp: '2024-01-15T10:30:00Z',
          requestedBy: 'test@example.com',
          version: '1.0.0'
        }
      };

      const csv = await csvService.generateSummaryCSV(evidencePack);

      expect(csv).toContain('EVIDENCE PACK SUMMARY');
      expect(csv).toContain('Test Evidence Pack');
      expect(csv).toContain('test.csv');
      expect(csv).toContain('10'); // totalWorkers
      expect(csv).toContain('80'); // complianceRate
      expect(csv).toContain('MEDIUM'); // risk level
    });

    test('should generate worker details CSV', async () => {
      const workers = [
        {
          worker_id: 'W001',
          worker_name: 'Test Worker 1',
          age: 25,
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          total_hours: 40,
          total_pay: 400,
          effective_hourly_rate: 10.00,
          rag_status: 'GREEN',
          shortfall_amount: 0,
          rag_reason: 'Compliant',
          period_type: 'monthly'
        }
      ];

      const csv = await csvService.generateWorkerDetailsCSV(workers);

      expect(csv).toContain('WORKER COMPLIANCE DETAILS');
      expect(csv).toContain('Worker ID');
      expect(csv).toContain('W001');
      expect(csv).toContain('Test Worker 1');
      expect(csv).toContain('40.00'); // hours
      expect(csv).toContain('400.00'); // pay
      expect(csv).toContain('10.00'); // rate
      expect(csv).toContain('GREEN');
    });

    test('should generate simplified worker CSV', async () => {
      const workers = [
        {
          worker_id: 'W001',
          worker_name: 'Test Worker',
          total_hours: 40,
          total_pay: 400,
          effective_hourly_rate: 10.00,
          rag_status: 'GREEN',
          shortfall_amount: 0,
          rag_reason: 'Compliant'
        }
      ];

      const csv = await csvService.generateSimplifiedWorkerCSV(workers);

      expect(csv).toContain('Worker_ID');
      expect(csv).toContain('W001');
      expect(csv).toContain('Yes'); // Compliant
      expect(csv).toContain('GREEN');
    });

    test('should generate audit trail CSV', async () => {
      const evidencePack = {
        metadata: {},
        uploadInfo: {
          id: 123,
          filename: 'test.csv',
          organizationType: 'employer'
        },
        summary: {
          totalWorkers: 10,
          complianceRate: 85,
          riskLevel: { level: 'MEDIUM' }
        },
        generated: {
          timestamp: '2024-01-15T10:30:00Z',
          requestedBy: 'test@example.com',
          format: 'pdf',
          version: '1.0.0'
        }
      };

      const csv = await csvService.generateAuditTrailCSV(evidencePack);

      expect(csv).toContain('Timestamp');
      expect(csv).toContain('Evidence Pack Generated');
      expect(csv).toContain('test@example.com');
      expect(csv).toContain('123'); // upload ID
      expect(csv).toContain('employer');
      expect(csv).toContain('MEDIUM');
    });

    test('should generate CSV package', async () => {
      const evidencePack = {
        workers: [
          {
            worker_id: 'W001',
            worker_name: 'Test Worker',
            total_hours: 40,
            total_pay: 320,
            effective_hourly_rate: 8.00,
            rag_status: 'RED',
            shortfall_amount: 96.80,
            rag_reason: 'Below minimum wage'
          },
          {
            worker_id: 'W002',
            worker_name: 'Test Worker 2',
            total_hours: 40,
            total_pay: 440,
            effective_hourly_rate: 11.00,
            rag_status: 'AMBER',
            shortfall_amount: 0,
            rag_reason: 'Review recommended'
          }
        ],
        explanations: [],
        complianceRules: [],
        metadata: {},
        uploadInfo: { id: 123, filename: 'test.csv', organizationType: 'employer' },
        summary: { totalWorkers: 2, complianceRate: 50, riskLevel: { level: 'HIGH' } },
        generated: { timestamp: '2024-01-15T10:30:00Z', requestedBy: 'test', format: 'csv', version: '1.0.0' }
      };

      const csvFiles = await csvService.generateCSVPackage(evidencePack);

      expect(csvFiles['evidence_pack_complete.csv']).toBeDefined();
      expect(csvFiles['workers_summary.csv']).toBeDefined();
      expect(csvFiles['audit_trail.csv']).toBeDefined();
      expect(csvFiles['non_compliant_workers.csv']).toBeDefined(); // W001 is RED
      expect(csvFiles['review_required_workers.csv']).toBeDefined(); // W002 is AMBER

      // Check that the files contain expected content
      expect(csvFiles['non_compliant_workers.csv']).toContain('W001');
      expect(csvFiles['review_required_workers.csv']).toContain('W002');
    });
  });

  describe('Integration Tests', () => {
    test('should create consistent data across PDF and CSV formats', async () => {
      const testEvidencePack = {
        metadata: {
          title: 'Integration Test Evidence Pack',
          subtitle: 'Test Report',
          organization: { id: 1, type: 'employer' },
          compliance: { framework: 'UK NMW/NLW', regulations: ['NMW Act 1998'] },
          report: { purpose: 'Test', scope: 'Test', methodology: 'Test', limitations: 'Test' },
          disclaimer: 'Test disclaimer'
        },
        uploadInfo: {
          id: 123,
          filename: 'integration-test.csv',
          uploadDate: '2024-01-15T10:00:00Z',
          totalWorkers: 2
        },
        summary: {
          totalWorkers: 2,
          compliant: 1,
          reviewRequired: 0,
          nonCompliant: 1,
          complianceRate: 50,
          financialImpact: { totalShortfall: 50, averageShortfall: 50, currency: 'GBP' },
          riskLevel: { level: 'HIGH', description: 'Issues found', recommendations: ['Fix issues'] }
        },
        workers: [
          {
            worker_id: 'INT001',
            worker_name: 'Integration Test Worker 1',
            total_hours: 40,
            total_pay: 320,
            effective_hourly_rate: 8.00,
            rag_status: 'RED',
            shortfall_amount: 96.80,
            rag_reason: 'Below minimum wage'
          },
          {
            worker_id: 'INT002',
            worker_name: 'Integration Test Worker 2',
            total_hours: 40,
            total_pay: 440,
            effective_hourly_rate: 11.00,
            rag_status: 'GREEN',
            shortfall_amount: 0,
            rag_reason: 'Compliant'
          }
        ],
        complianceRules: [
          {
            id: 'TEST_RULE',
            title: 'Test Rule',
            description: 'Test description',
            rates: { 'Test Rate': '£10.42' },
            source: 'Test Source',
            url: 'https://example.com',
            lastUpdated: '2024-01-01'
          }
        ],
        explanations: [],
        generated: {
          timestamp: '2024-01-15T10:30:00Z',
          requestedBy: 'integration-test',
          format: 'both',
          version: '1.0.0'
        }
      };

      // Generate both formats
      const csvContent = await csvService.generateCSV(testEvidencePack);
      const htmlContent = await pdfService.generateHTML(testEvidencePack);

      // Check that both contain key information
      expect(csvContent).toContain('Integration Test Evidence Pack');
      expect(csvContent).toContain('INT001');
      expect(csvContent).toContain('INT002');
      expect(csvContent).toContain('50'); // compliance rate

      expect(htmlContent).toContain('Integration Test Evidence Pack');
      expect(htmlContent).toContain('INT001');
      expect(htmlContent).toContain('INT002');
      expect(htmlContent).toContain('50%'); // compliance rate

      // Check that both show the same risk level
      expect(csvContent).toContain('HIGH');
      expect(htmlContent).toContain('HIGH');
    });
  });
});
