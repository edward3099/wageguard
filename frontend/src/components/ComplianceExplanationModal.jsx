import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const ComplianceExplanationModal = ({ 
  isOpen, 
  onClose, 
  issueCode, 
  workerData, 
  issueDetails,
  onExplanationRequested 
}) => {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset state when modal opens/closes or data changes
  useEffect(() => {
    if (isOpen && issueCode) {
      generateExplanation();
    } else {
      setExplanation(null);
      setError(null);
    }
  }, [isOpen, issueCode, workerData, issueDetails]);

  const generateExplanation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Notify parent component that explanation was requested
      if (onExplanationRequested) {
        onExplanationRequested(issueCode, workerData);
      }

      // For now, we'll use mock data since the backend might not be running
      // In production, this would make an API call to /api/v1/compliance/explain
      const mockExplanation = generateMockExplanation(issueCode, issueDetails);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setExplanation(mockExplanation);
    } catch (err) {
      setError('Failed to generate explanation. Please try again.');
      console.error('Explanation generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateMockExplanation = (code, details) => {
    const explanations = {
      'RATE_BELOW_MINIMUM': {
        title: 'Pay Below Minimum Wage',
        category: 'critical',
        detailedExplanation: `This worker's effective hourly rate of £${details?.effectiveHourlyRate?.toFixed(2) || '8.50'} is below the required minimum wage rate of £${details?.requiredRate?.toFixed(2) || '10.42'}. This means the worker is being underpaid by approximately £${((details?.requiredRate || 10.42) - (details?.effectiveHourlyRate || 8.50)).toFixed(2)} per hour.

Under UK law, all workers must be paid at least the National Minimum Wage or National Living Wage rates. This is a legal requirement and failure to comply can result in penalties and back-pay obligations.`,
        actionRequired: [
          'Calculate the total underpayment amount for the pay period',
          'Issue an immediate top-up payment to bring the worker up to minimum wage',
          'Review payroll processes to prevent future underpayments',
          'Ensure all future payments meet minimum wage requirements'
        ],
        impact: 'Critical - immediate action required to avoid legal penalties',
        urgency: 'immediate',
        references: [
          'National Minimum Wage Act 1998',
          'GOV.UK Minimum Wage Rates',
          'HMRC National Minimum Wage Manual'
        ]
      },
      'ACCOMMODATION_OFFSET_EXCEEDED': {
        title: 'Accommodation Offset Violation',
        category: 'critical',
        detailedExplanation: `The accommodation charge of £${details?.accommodation_offset?.toFixed(2) || '12.50'} per day exceeds the legal limit of £${details?.daily_limit?.toFixed(2) || '9.99'} per day. When employers provide accommodation, they can only offset a maximum amount per day against minimum wage pay.

The excess charge of £${((details?.accommodation_offset || 12.50) - (details?.daily_limit || 9.99)).toFixed(2)} per day means the worker's effective pay falls below minimum wage requirements.`,
        actionRequired: [
          'Reduce accommodation charges to the legal limit',
          'Calculate and refund excess charges for the pay period',
          'Update accommodation agreements to comply with legal limits',
          'Review accommodation charging policies across all workers'
        ],
        impact: 'Critical - accommodation charges must not reduce pay below minimum wage',
        urgency: 'immediate'
      },
      'EXCESSIVE_DEDUCTIONS': {
        title: 'Excessive Deductions',
        category: 'critical',
        detailedExplanation: `Total deductions of £${details?.total_deductions?.toFixed(2) || '200'} represent ${details?.deduction_percentage?.toFixed(1) || '57.1'}% of the worker's pay. When deductions bring a worker's pay below minimum wage, this is generally not permitted under UK employment law.

Common prohibited deductions include uniform costs, training expenses, and tool charges. These costs cannot be deducted if they would bring pay below minimum wage.`,
        actionRequired: [
          'Review all deductions for legitimacy and legal compliance',
          'Remove or reduce deductions that bring pay below minimum wage',
          'Refund any illegitimate deductions from previous pay periods',
          'Update deduction policies to ensure compliance'
        ],
        impact: 'Critical - illegal deductions must be corrected immediately',
        urgency: 'immediate'
      },
      'DATA_INSUFFICIENT': {
        title: 'Insufficient Data',
        category: 'warning',
        detailedExplanation: `There is insufficient data to perform a complete compliance check for this worker. Missing information such as working hours, worker age, or pay components prevents accurate minimum wage verification.

While this may not indicate an immediate compliance violation, incomplete records could hide potential issues and make it difficult to demonstrate compliance during an audit.`,
        actionRequired: [
          'Review worker records to identify missing information',
          'Collect complete timesheet and pay data',
          'Ensure all required fields are populated in payroll systems',
          'Re-run compliance check once data is complete'
        ],
        impact: 'Medium - complete data needed for accurate compliance verification',
        urgency: 'medium'
      }
    };

    return explanations[code] || {
      title: 'Compliance Issue Detected',
      category: 'warning',
      detailedExplanation: `A compliance issue has been flagged for review (Code: ${code}). Please consult your payroll administrator or compliance specialist for specific guidance on resolving this issue.`,
      actionRequired: ['Review issue details with payroll administrator', 'Consult compliance documentation'],
      impact: 'Review required',
      urgency: 'medium'
    };
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'action':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'info':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'immediate':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '📋';
      case 'low':
        return '📝';
      default:
        return '📋';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {explanation && (
                <span className="text-2xl">{getUrgencyIcon(explanation.urgency)}</span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Compliance Issue Explanation
              </h3>
              <p className="text-sm text-gray-500">
                Worker: {workerData?.worker_name || workerData?.worker_id || 'Unknown'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Generating explanation...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {explanation && !loading && (
            <div className="space-y-6">
              {/* Issue Title and Category */}
              <div className={`rounded-md p-4 border ${getCategoryColor(explanation.category)}`}>
                <h4 className="text-lg font-semibold mb-2">{explanation.title}</h4>
                <p className="text-sm font-medium capitalize">
                  Category: {explanation.category} | Urgency: {explanation.urgency}
                </p>
              </div>

              {/* Detailed Explanation */}
              <div>
                <h5 className="text-md font-medium text-gray-900 mb-2">What this means:</h5>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-line">{explanation.detailedExplanation}</p>
                </div>
              </div>

              {/* Action Required */}
              {explanation.actionRequired && explanation.actionRequired.length > 0 && (
                <div>
                  <h5 className="text-md font-medium text-gray-900 mb-2">Action Required:</h5>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {explanation.actionRequired.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Impact */}
              <div>
                <h5 className="text-md font-medium text-gray-900 mb-2">Impact:</h5>
                <p className="text-sm text-gray-700">{explanation.impact}</p>
              </div>

              {/* References */}
              {explanation.references && explanation.references.length > 0 && (
                <div>
                  <h5 className="text-md font-medium text-gray-900 mb-2">Relevant Regulations:</h5>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {explanation.references.map((ref, index) => (
                      <li key={index}>{ref}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <p className="text-xs text-gray-600">
                  <strong>Disclaimer:</strong> This explanation is generated for guidance purposes only and does not constitute legal advice. 
                  For complex compliance issues, please consult with qualified employment law professionals.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
          {explanation && (
            <button
              onClick={() => {
                // In a real app, this could export or save the explanation
                console.log('Explanation exported:', explanation);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save Explanation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

ComplianceExplanationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  issueCode: PropTypes.string,
  workerData: PropTypes.object,
  issueDetails: PropTypes.object,
  onExplanationRequested: PropTypes.func
};

export default ComplianceExplanationModal;
