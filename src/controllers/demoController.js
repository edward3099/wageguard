/**
 * Demo Controller
 * 
 * Showcases the multi-tenancy architecture for WageGuard
 * Provides mock data and demonstrations of organization isolation
 */

const MultiTenancyService = require('../services/multiTenancyService');

class DemoController {
  constructor() {
    this.multiTenancyService = new MultiTenancyService();
  }

  /**
   * Get multi-tenancy architecture overview
   * GET /api/demo/multi-tenancy
   */
  async getMultiTenancyOverview(req, res) {
    try {
      const overview = {
        title: 'WageGuard Multi-Tenancy Architecture',
        description: 'Complete organization isolation for payroll bureaus and employers',
        architecture: {
          type: 'Multi-tenant SaaS',
          isolation: 'Database-level organization separation',
          security: 'JWT-based authentication with organization scoping',
          scalability: 'Horizontal scaling with tenant isolation'
        },
        userTypes: {
          employers: {
            description: 'Single organization users',
            capabilities: [
              'Upload and process their own payroll data',
              'View compliance results for their organization',
              'Generate evidence packs for audits',
              'Access only their own data'
            ]
          },
          bureaus: {
            description: 'Multi-client payroll service providers',
            capabilities: [
              'Manage multiple client organizations',
              'Switch between client contexts',
              'View aggregated compliance metrics',
              'Client-specific data isolation'
            ]
          }
        },
        dataIsolation: this.multiTenancyService.getDataIsolationRules(),
        benefits: [
          'Complete data privacy between organizations',
          'Regulatory compliance (GDPR, SOC2, ISO 27001)',
          'Reduced security breach impact',
          'Simplified backup and recovery',
          'Clear audit trails for compliance',
          'Scalable architecture for growth'
        ]
      };

      res.json({
        success: true,
        overview
      });

    } catch (error) {
      console.error('Demo overview error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while generating demo overview'
      });
    }
  }

  /**
   * Get bureau dashboard demo
   * GET /api/demo/bureau-dashboard
   */
  async getBureauDashboard(req, res) {
    try {
      // Mock bureau user
      const mockBureauUser = {
        userId: 101,
        isBureau: true,
        bureauId: 101,
        companyName: 'Payroll Solutions Pro'
      };

      const dashboard = {
        user: mockBureauUser,
        summary: this.multiTenancyService.getBureauSummary(101),
        organizationSwitching: this.multiTenancyService.getOrganizationSwitching(mockBureauUser),
        recentActivity: [
          {
            type: 'upload',
            client: 'Green Foods Ltd',
            timestamp: '2024-01-22T10:30:00Z',
            workers: 120,
            status: 'GREEN'
          },
          {
            type: 'compliance_check',
            client: 'Blue Manufacturing',
            timestamp: '2024-01-21T15:45:00Z',
            workers: 85,
            status: 'AMBER'
          },
          {
            type: 'evidence_export',
            client: 'City Services',
            timestamp: '2024-01-20T14:20:00Z',
            format: 'PDF',
            records: 200
          }
        ],
        alerts: [
          {
            type: 'warning',
            client: 'Blue Manufacturing',
            message: '3 workers have RED compliance status',
            priority: 'high',
            timestamp: '2024-01-21T16:00:00Z'
          },
          {
            type: 'info',
            client: 'Green Foods Ltd',
            message: 'Monthly compliance review due in 3 days',
            priority: 'medium',
            timestamp: '2024-01-22T09:00:00Z'
          }
        ]
      };

      res.json({
        success: true,
        dashboard
      });

    } catch (error) {
      console.error('Bureau dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while generating bureau dashboard'
      });
    }
  }

  /**
   * Get employer dashboard demo
   * GET /api/demo/employer-dashboard
   */
  async getEmployerDashboard(req, res) {
    try {
      // Mock employer user
      const mockEmployerUser = {
        userId: 1,
        isBureau: false,
        companyName: 'Acme Corp'
      };

      const dashboard = {
        user: mockEmployerUser,
        summary: this.multiTenancyService.getEmployerSummary(1),
        recentUploads: [
          {
            id: 1,
            filename: 'payroll-jan-2024.csv',
            uploadDate: '2024-01-15T09:00:00Z',
            workers: 150,
            status: 'processed',
            complianceScore: 87.5
          },
          {
            id: 2,
            filename: 'payroll-dec-2023.csv',
            uploadDate: '2023-12-15T09:00:00Z',
            workers: 148,
            status: 'processed',
            complianceScore: 85.2
          }
        ],
        complianceOverview: {
          currentScore: 87.5,
          trend: 'improving',
          lastCheck: '2024-01-15',
          nextReview: '2024-02-15',
          ragBreakdown: {
            red: 2,
            amber: 15,
            green: 133
          }
        },
        quickActions: [
          {
            name: 'Upload New Payroll',
            description: 'Process latest payroll data',
            action: 'upload',
            icon: '📁'
          },
          {
            name: 'Generate Evidence Pack',
            description: 'Export compliance evidence',
            action: 'export',
            icon: '📋'
          },
          {
            name: 'View Compliance Report',
            description: 'Detailed compliance analysis',
            action: 'report',
            icon: '📊'
          }
        ]
      };

      res.json({
        success: true,
        dashboard
      });

    } catch (error) {
      console.error('Employer dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while generating employer dashboard'
      });
    }
  }

  /**
   * Get client details demo
   * GET /api/demo/client/:clientId
   */
  async getClientDetails(req, res) {
    try {
      const { clientId } = req.params;
      const bureauId = 101; // Mock bureau ID

      const clientDetails = this.multiTenancyService.getClientDetails(bureauId, parseInt(clientId));

      res.json({
        success: true,
        clientDetails
      });

    } catch (error) {
      console.error('Client details error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching client details'
      });
    }
  }

  /**
   * Get organization switching demo
   * GET /api/demo/organization-switching
   */
  async getOrganizationSwitching(req, res) {
    try {
      const mockUsers = [
        {
          userId: 101,
          isBureau: true,
          bureauId: 101,
          companyName: 'Payroll Solutions Pro'
        },
        {
          userId: 1,
          isBureau: false,
          companyName: 'Acme Corp'
        }
      ];

      const switchingExamples = mockUsers.map(user => ({
        user: user.companyName,
        type: user.isBureau ? 'Bureau' : 'Employer',
        capabilities: this.multiTenancyService.getOrganizationSwitching(user)
      }));

      res.json({
        success: true,
        title: 'Organization Switching Capabilities',
        description: 'Demonstrates how different user types can navigate between organizations',
        examples: switchingExamples,
        implementation: {
          frontend: 'Organization switcher in top navigation',
          backend: 'JWT token includes organization context',
          database: 'All queries filtered by organization_id',
          security: 'Middleware validates organization access'
        }
      });

    } catch (error) {
      console.error('Organization switching error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while generating organization switching demo'
      });
    }
  }

  /**
   * Get security and compliance demo
   * GET /api/demo/security-compliance
   */
  async getSecurityCompliance(req, res) {
    try {
      const securityOverview = {
        title: 'Security & Compliance Features',
        authentication: {
          method: 'JWT-based authentication',
          features: [
            'Secure password hashing with bcrypt',
            'Token expiration and refresh',
            'Organization-scoped access control',
            'Audit logging of all actions'
          ]
        },
        dataIsolation: {
          principle: 'Complete organization separation',
          implementation: [
            'Database-level organization_id filtering',
            'API endpoint organization validation',
            'Middleware organization access control',
            'Cross-organization data access prevention'
          ]
        },
        compliance: {
          standards: [
            'GDPR - Data privacy and protection',
            'SOC2 - Security and availability',
            'ISO 27001 - Information security',
            'UK NMW/NLW - Payroll compliance'
          ],
          features: [
            'Audit trails for all data access',
            'Evidence pack generation',
            'Compliance scoring and reporting',
            'Risk assessment and recommendations'
          ]
        },
        security: {
          measures: [
            'Input validation and sanitization',
            'SQL injection prevention',
            'XSS protection',
            'CSRF token validation',
            'Rate limiting and DDoS protection'
          ]
        }
      };

      res.json({
        success: true,
        securityOverview
      });

    } catch (error) {
      console.error('Security compliance error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while generating security compliance demo'
      });
    }
  }
}

module.exports = new DemoController();
