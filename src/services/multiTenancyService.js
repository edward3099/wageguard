/**
 * Multi-Tenancy Service
 * 
 * Demonstrates the multi-tenant architecture for WageGuard
 * Provides mock data and organization isolation logic
 */

class MultiTenancyService {
  constructor() {
    // Mock data for demonstration
    this.mockOrganizations = {
      employers: [
        {
          id: 1,
          name: 'Acme Corp',
          type: 'employer',
          industry: 'Manufacturing',
          userCount: 150,
          complianceScore: 87.5,
          lastUpload: '2024-01-15'
        },
        {
          id: 2,
          name: 'TechStart Ltd',
          type: 'employer',
          industry: 'Technology',
          userCount: 45,
          complianceScore: 92.3,
          lastUpload: '2024-01-20'
        }
      ],
      bureaus: [
        {
          id: 101,
          name: 'Payroll Solutions Pro',
          type: 'bureau',
          clientCount: 12,
          totalWorkers: 1250,
          averageComplianceScore: 89.2,
          lastActivity: '2024-01-22'
        },
        {
          id: 102,
          name: 'Compliance Partners',
          type: 'bureau',
          clientCount: 8,
          totalWorkers: 890,
          averageComplianceScore: 91.7,
          lastActivity: '2024-01-21'
        }
      ]
    };

    this.mockClients = {
      101: [ // Payroll Solutions Pro clients
        {
          id: 1,
          name: 'Green Foods Ltd',
          industry: 'Food & Beverage',
          workerCount: 120,
          uploadCount: 8,
          complianceStatus: 'GREEN',
          lastUpload: '2024-01-15',
          ragSummary: { red: 0, amber: 2, green: 118 }
        },
        {
          id: 2,
          name: 'Blue Manufacturing',
          industry: 'Manufacturing',
          workerCount: 85,
          uploadCount: 6,
          complianceStatus: 'AMBER',
          lastUpload: '2024-01-18',
          ragSummary: { red: 3, amber: 12, green: 70 }
        },
        {
          id: 3,
          name: 'City Services',
          industry: 'Facilities',
          workerCount: 200,
          uploadCount: 12,
          complianceStatus: 'GREEN',
          lastUpload: '2024-01-20',
          ragSummary: { red: 1, amber: 5, green: 194 }
        }
      ],
      102: [ // Compliance Partners clients
        {
          id: 4,
          name: 'Healthcare Plus',
          industry: 'Healthcare',
          workerCount: 95,
          uploadCount: 7,
          complianceStatus: 'GREEN',
          lastUpload: '2024-01-17',
          ragSummary: { red: 0, amber: 3, green: 92 }
        },
        {
          id: 5,
          name: 'Retail Chain',
          industry: 'Retail',
          workerCount: 150,
          uploadCount: 10,
          complianceStatus: 'AMBER',
          lastUpload: '2024-01-19',
          ragSummary: { red: 2, amber: 18, green: 130 }
        }
      ]
    };

    this.mockComplianceData = {
      1: { // Green Foods Ltd
        monthlyTrends: [
          { month: '2024-01', uploads: 1, workers: 120, avgScore: 95.2 },
          { month: '2023-12', uploads: 1, workers: 118, avgScore: 94.8 },
          { month: '2023-11', uploads: 1, workers: 115, avgScore: 93.5 }
        ],
        recentIssues: [
          { type: 'AMBER', description: 'Overtime calculation needs review', count: 2 },
          { type: 'GREEN', description: 'All other compliance checks passed', count: 118 }
        ]
      },
      2: { // Blue Manufacturing
        monthlyTrends: [
          { month: '2024-01', uploads: 1, workers: 85, avgScore: 87.3 },
          { month: '2023-12', uploads: 1, workers: 82, avgScore: 86.1 },
          { month: '2023-11', uploads: 1, workers: 80, avgScore: 84.9 }
        ],
        recentIssues: [
          { type: 'RED', description: 'Accommodation offset exceeds limit', count: 3 },
          { type: 'AMBER', description: 'Uniform deductions need verification', count: 12 },
          { type: 'GREEN', description: 'Other compliance checks passed', count: 70 }
        ]
      }
    };
  }

  /**
   * Get organization summary based on user type
   * @param {Object} user - User object with role and organization info
   * @returns {Object} Organization summary
   */
  getOrganizationSummary(user) {
    if (user.isBureau) {
      return this.getBureauSummary(user.bureauId);
    } else {
      return this.getEmployerSummary(user.userId);
    }
  }

  /**
   * Get bureau summary with client overview
   * @param {number} bureauId - Bureau ID
   * @returns {Object} Bureau summary
   */
  getBureauSummary(bureauId) {
    const bureau = this.mockOrganizations.bureaus.find(b => b.id === bureauId);
    if (!bureau) {
      throw new Error('Bureau not found');
    }

    const clients = this.mockClients[bureauId] || [];
    const totalWorkers = clients.reduce((sum, client) => sum + client.workerCount, 0);
    const totalUploads = clients.reduce((sum, client) => sum + client.uploadCount, 0);
    
    // Calculate overall compliance metrics
    let totalRed = 0, totalAmber = 0, totalGreen = 0;
    clients.forEach(client => {
      totalRed += client.ragSummary.red;
      totalAmber += client.ragSummary.amber;
      totalGreen += client.ragSummary.green;
    });

    const overallComplianceScore = totalWorkers > 0 
      ? Math.round(((totalGreen + totalAmber * 0.5) / totalWorkers) * 100) 
      : 0;

    return {
      ...bureau,
      clients,
      totalWorkers,
      totalUploads,
      overallComplianceScore,
      ragSummary: { red: totalRed, amber: totalAmber, green: totalGreen },
      clientComplianceBreakdown: clients.map(client => ({
        id: client.id,
        name: client.name,
        complianceStatus: client.complianceStatus,
        workerCount: client.workerCount,
        ragSummary: client.ragSummary
      }))
    };
  }

  /**
   * Get employer summary
   * @param {number} employerId - Employer ID
   * @returns {Object} Employer summary
   */
  getEmployerSummary(employerId) {
    const employer = this.mockOrganizations.employers.find(e => e.id === employerId);
    if (!employer) {
      throw new Error('Employer not found');
    }

    return {
      ...employer,
      type: 'employer',
      recentActivity: 'Last upload: 2024-01-15',
      complianceTrend: 'Improving',
      nextReviewDate: '2024-02-15'
    };
  }

  /**
   * Get client details with compliance summary
   * @param {number} bureauId - Bureau ID
   * @param {number} clientId - Client ID
   * @returns {Object} Client details
   */
  getClientDetails(bureauId, clientId) {
    const clients = this.mockClients[bureauId];
    if (!clients) {
      throw new Error('Bureau not found');
    }

    const client = clients.find(c => c.id === clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    const complianceData = this.mockComplianceData[clientId];
    
    return {
      ...client,
      complianceData,
      riskAssessment: this.assessClientRisk(client),
      recommendations: this.generateClientRecommendations(client, complianceData)
    };
  }

  /**
   * Assess client risk based on compliance data
   * @param {Object} client - Client object
   * @returns {Object} Risk assessment
   */
  assessClientRisk(client) {
    const totalWorkers = client.workerCount;
    const redPercentage = (client.ragSummary.red / totalWorkers) * 100;
    const amberPercentage = (client.ragSummary.amber / totalWorkers) * 100;

    let riskLevel = 'LOW';
    let riskScore = 0;

    if (redPercentage > 5) {
      riskLevel = 'HIGH';
      riskScore = 80 + redPercentage;
    } else if (redPercentage > 2 || amberPercentage > 15) {
      riskLevel = 'MEDIUM';
      riskScore = 40 + (redPercentage * 2) + amberPercentage;
    } else {
      riskLevel = 'LOW';
      riskScore = redPercentage + (amberPercentage * 0.5);
    }

    return {
      level: riskLevel,
      score: Math.min(100, Math.round(riskScore)),
      redPercentage: Math.round(redPercentage * 100) / 100,
      amberPercentage: Math.round(amberPercentage * 100) / 100,
      factors: this.identifyRiskFactors(client)
    };
  }

  /**
   * Identify specific risk factors for a client
   * @param {Object} client - Client object
   * @returns {Array} Risk factors
   */
  identifyRiskFactors(client) {
    const factors = [];
    
    if (client.ragSummary.red > 0) {
      factors.push({
        type: 'CRITICAL',
        description: `${client.ragSummary.red} workers have RED compliance status`,
        impact: 'High - Immediate action required'
      });
    }

    if (client.ragSummary.amber > client.workerCount * 0.1) {
      factors.push({
        type: 'WARNING',
        description: `${client.ragSummary.amber} workers have AMBER compliance status (>10%)`,
        impact: 'Medium - Review and monitoring needed'
      });
    }

    if (client.uploadCount < 2) {
      factors.push({
        type: 'INFO',
        description: 'Limited upload history for trend analysis',
        impact: 'Low - More data needed for accurate assessment'
      });
    }

    return factors;
  }

  /**
   * Generate recommendations for client improvement
   * @param {Object} client - Client object
   * @param {Object} complianceData - Compliance data
   * @returns {Array} Recommendations
   */
  generateClientRecommendations(client, complianceData) {
    const recommendations = [];

    if (client.ragSummary.red > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Immediate review of RED compliance issues',
        description: 'Address critical compliance violations within 48 hours',
        timeline: '48 hours',
        impact: 'Prevent potential legal issues and penalties'
      });
    }

    if (client.ragSummary.amber > client.workerCount * 0.1) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Review AMBER compliance patterns',
        description: 'Identify common causes and implement preventive measures',
        timeline: '1 week',
        impact: 'Reduce risk of escalation to RED status'
      });
    }

    if (complianceData && complianceData.monthlyTrends.length > 1) {
      const recentTrend = complianceData.monthlyTrends[0];
      const previousTrend = complianceData.monthlyTrends[1];
      
      if (recentTrend.avgScore < previousTrend.avgScore) {
        recommendations.push({
          priority: 'MEDIUM',
          action: 'Investigate declining compliance trend',
          description: 'Review recent changes in payroll processes or worker classifications',
          timeline: '1 week',
          impact: 'Reverse negative compliance trend'
        });
      }
    }

    recommendations.push({
      priority: 'LOW',
      action: 'Schedule regular compliance reviews',
      description: 'Establish monthly compliance review meetings',
      timeline: 'Ongoing',
      impact: 'Maintain consistent compliance standards'
    });

    return recommendations;
  }

  /**
   * Get multi-tenant data isolation rules
   * @returns {Object} Data isolation rules
   */
  getDataIsolationRules() {
    return {
      principles: [
        'All data queries must include organization_id filter',
        'Users can only access data from their own organization',
        'Bureaus can access data from all their clients',
        'Employers can only access their own data',
        'Cross-organization data access is strictly prohibited'
      ],
      implementation: [
        'Database queries use WHERE organization_id = $1',
        'API endpoints validate user organization access',
        'Middleware enforces organization boundaries',
        'Audit logs track all data access attempts',
        'Regular security reviews ensure isolation integrity'
      ],
      benefits: [
        'Complete data privacy between organizations',
        'Regulatory compliance (GDPR, SOC2)',
        'Reduced security breach impact',
        'Simplified backup and recovery',
        'Clear audit trails for compliance'
      ]
    };
  }

  /**
   * Get organization switching capabilities
   * @param {Object} user - User object
   * @returns {Object} Switching capabilities
   */
  getOrganizationSwitching(user) {
    if (!user.isBureau) {
      return {
        canSwitch: false,
        reason: 'Only bureau users can switch between client organizations',
        currentOrganization: user.companyName
      };
    }

    const clients = this.mockClients[user.bureauId] || [];
    return {
      canSwitch: true,
      currentOrganization: 'Bureau Dashboard',
      availableOrganizations: clients.map(client => ({
        id: client.id,
        name: client.name,
        type: 'client',
        lastAccessed: client.lastUpload,
        complianceStatus: client.complianceStatus
      })),
      switchingInstructions: [
        'Use the organization switcher in the top navigation',
        'Select the client organization you want to view',
        'All data and operations will be scoped to that client',
        'Return to bureau dashboard to see overview of all clients'
      ]
    };
  }
}

module.exports = MultiTenancyService;
