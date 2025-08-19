import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplianceResults, exportEvidencePack } from '../store/slices/complianceSlice';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import ComplianceExplanationModal from '../components/ComplianceExplanationModal';

const Compliance = () => {
  const { uploadId } = useParams();
  const dispatch = useDispatch();
  const { results, loading, error } = useSelector((state) => state.compliance);
  
  // Table state
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Explanation modal state
  const [explanationModal, setExplanationModal] = useState({
    isOpen: false,
    issueCode: null,
    workerData: null,
    issueDetails: null
  });

  // Export loading state
  const [exportLoading, setExportLoading] = useState({
    pdf: false,
    csv: false
  });

  useEffect(() => {
    if (uploadId) {
      dispatch(fetchComplianceResults(uploadId));
    }
  }, [uploadId, dispatch]);

  const handleExport = async (format) => {
    try {
      setExportLoading(prev => ({ ...prev, [format]: true }));
      
      // Use the evidence pack API for export
      const response = await fetch('/api/v1/evidence-pack/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if available
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        },
        body: JSON.stringify({
          uploadId,
          format: format.toLowerCase(),
          options: {
            includeExplanations: true,
            riskAssessment: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Handle file download based on format
      if (format.toLowerCase() === 'pdf') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `evidence_pack_${uploadId}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format.toLowerCase() === 'csv') {
        const text = await response.text();
        const blob = new Blob([text], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `evidence_pack_${uploadId}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
      console.log(`✅ Successfully exported ${format.toUpperCase()} evidence pack`);
    } catch (error) {
      console.error(`❌ Export failed:`, error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setExportLoading(prev => ({ ...prev, [format]: false }));
    }
  };

  // Handle explanation modal
  const openExplanationModal = (worker) => {
    // Determine issue code based on worker status and data
    let issueCode = 'DATA_INSUFFICIENT';
    
    if (worker.rag_status === 'RED') {
      if (worker.rag_reason?.includes('accommodation')) {
        issueCode = 'ACCOMMODATION_OFFSET_EXCEEDED';
      } else if (worker.rag_reason?.includes('deduction')) {
        issueCode = 'EXCESSIVE_DEDUCTIONS';
      } else if (worker.effectiveHourlyRate && worker.requiredRate && worker.effectiveHourlyRate < worker.requiredRate) {
        issueCode = 'RATE_BELOW_MINIMUM';
      }
    }

    setExplanationModal({
      isOpen: true,
      issueCode,
      workerData: {
        worker_id: worker.worker_id,
        worker_name: worker.worker_name,
        age: worker.age
      },
      issueDetails: {
        effectiveHourlyRate: worker.effectiveHourlyRate,
        requiredRate: worker.requiredRate,
        totalPay: worker.totalPay,
        hoursWorked: worker.hoursWorked,
        rag_reason: worker.rag_reason,
        rag_status: worker.rag_status,
        rag_severity: worker.rag_severity
      }
    });
  };

  const closeExplanationModal = () => {
    setExplanationModal({
      isOpen: false,
      issueCode: null,
      workerData: null,
      issueDetails: null
    });
  };

  const handleExplanationRequested = (issueCode, workerData) => {
    console.log('🤖 Explanation requested for:', issueCode, workerData);
    // In a real app, this could track analytics or log the request
  };

  // Enhanced mock data for demonstration
  const mockResults = {
    summary: {
      totalWorkers: 50,
      compliant: 42,
      reviewRequired: 5,
      nonCompliant: 3,
      complianceRate: 84.0,
      payPeriod: 'March 2024',
      uploadDate: '2024-03-15',
    },
    workers: [
      {
        id: 'W001',
        worker_id: 'EMP001',
        worker_name: 'John Smith',
        age: 28,
        rag_status: 'GREEN',
        rag_severity: null,
        rag_reason: 'Effective rate £16.00 meets required rate £10.42',
        effectiveHourlyRate: 16.00,
        requiredRate: 10.42,
        hoursWorked: 160,
        totalPay: 2560.00,
        totalOffsets: 0,
        totalDeductions: 25.00,
        fix_suggestions: [],
        primary_fix_suggestion: null,
      },
      {
        id: 'W002',
        worker_id: 'EMP002',
        worker_name: 'Jane Doe',
        age: 22,
        rag_status: 'RED',
        rag_severity: 'HIGH',
        rag_reason: 'Effective rate £9.50 is below required rate £10.18 (shortfall: 6.68%)',
        effectiveHourlyRate: 9.50,
        requiredRate: 10.18,
        hoursWorked: 168,
        totalPay: 1596.00,
        totalOffsets: 0,
        totalDeductions: 0,
        fix_suggestions: [
          'Effective rate is £9.50, which is £0.68 below the required £10.18. Suggestion: Add arrears top-up of £114.24.',
          'Review hours calculation - ensure all working time is captured accurately.'
        ],
        primary_fix_suggestion: 'Add arrears top-up of £114.24 to meet minimum wage requirements',
      },
      {
        id: 'W003',
        worker_id: 'EMP003',
        worker_name: 'Bob Wilson',
        age: 19,
        rag_status: 'AMBER',
        rag_severity: null,
        rag_reason: 'Zero hours worked but non-zero pay detected',
        effectiveHourlyRate: 0,
        requiredRate: 8.60,
        hoursWorked: 0,
        totalPay: 150.00,
        totalOffsets: 0,
        totalDeductions: 0,
        fix_suggestions: [
          'Review zero hours with pay - may indicate missing timesheet data',
          'Verify this payment is for legitimate purposes (bonus, holiday pay, etc.)'
        ],
        primary_fix_suggestion: 'Review timesheet data for potential missing hours',
      },
      {
        id: 'W004',
        worker_id: 'EMP004',
        worker_name: 'Sarah Johnson',
        age: 17,
        rag_status: 'GREEN',
        rag_severity: null,
        rag_reason: 'Effective rate £5.50 meets required rate £4.81',
        effectiveHourlyRate: 5.50,
        requiredRate: 4.81,
        hoursWorked: 96,
        totalPay: 528.00,
        totalOffsets: 0,
        totalDeductions: 0,
        fix_suggestions: [],
        primary_fix_suggestion: null,
      },
      {
        id: 'W005',
        worker_id: 'EMP005',
        worker_name: 'Mike Brown',
        age: 35,
        rag_status: 'RED',
        rag_severity: 'CRITICAL',
        rag_reason: 'Effective rate £8.50 is below required rate £10.42 (shortfall: 18.42%)',
        effectiveHourlyRate: 8.50,
        requiredRate: 10.42,
        hoursWorked: 150,
        totalPay: 1275.00,
        totalOffsets: 0,
        totalDeductions: 0,
        fix_suggestions: [
          'Effective rate is £8.50, which is £1.92 below the required £10.42. Suggestion: Add arrears top-up of £288.00.',
          'URGENT: This is a critical compliance violation requiring immediate attention.'
        ],
        primary_fix_suggestion: 'URGENT: Add arrears top-up of £288.00 to address critical underpayment',
      },
    ],
  };

  const getStatusColor = (status, severity = null) => {
    switch (status) {
      case 'GREEN':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'AMBER':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RED':
        if (severity === 'CRITICAL') {
          return 'bg-red-200 text-red-900 border-red-400 font-bold';
        } else if (severity === 'HIGH') {
          return 'bg-red-100 text-red-800 border-red-300';
        } else {
          return 'bg-red-50 text-red-700 border-red-200';
        }
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status, severity = null) => {
    switch (status) {
      case 'GREEN':
        return 'Compliant';
      case 'AMBER':
        return 'Review Required';
      case 'RED':
        if (severity === 'CRITICAL') {
          return 'CRITICAL - Non-Compliant';
        } else if (severity === 'HIGH') {
          return 'HIGH - Non-Compliant';
        } else {
          return 'Non-Compliant';
        }
      default:
        return 'Unknown';
    }
  };

  // Column definitions for TanStack Table
  const columnHelper = createColumnHelper();
  const columns = useMemo(() => [
    columnHelper.accessor('worker_name', {
      header: 'Worker',
      cell: (info) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{info.getValue()}</div>
          <div className="text-sm text-gray-500">{info.row.original.worker_id}</div>
        </div>
      ),
    }),
    columnHelper.accessor('rag_status', {
      header: 'Status',
      cell: (info) => {
        const status = info.getValue();
        const severity = info.row.original.rag_severity;
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md border ${getStatusColor(status, severity)}`}>
            {getStatusText(status, severity)}
          </span>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        if (filterValue === 'all') return true;
        return row.getValue(columnId) === filterValue;
      },
    }),
    columnHelper.accessor('effectiveHourlyRate', {
      header: 'Effective Rate',
      cell: (info) => `£${info.getValue()?.toFixed(2) || '0.00'}`,
    }),
    columnHelper.accessor('requiredRate', {
      header: 'Required Rate',
      cell: (info) => `£${info.getValue()?.toFixed(2) || '0.00'}`,
    }),
    columnHelper.accessor('hoursWorked', {
      header: 'Hours',
      cell: (info) => info.getValue() || 0,
    }),
    columnHelper.accessor('totalPay', {
      header: 'Total Pay',
      cell: (info) => `£${info.getValue()?.toFixed(2) || '0.00'}`,
    }),
    columnHelper.accessor('rag_reason', {
      header: 'Issues',
      cell: (info) => {
        const reason = info.getValue();
        const status = info.row.original.rag_status;
        return (
          <div className="text-sm">
            {status === 'GREEN' ? (
              <span className="text-green-600">No issues</span>
            ) : (
              <span className={status === 'RED' ? 'text-red-600' : 'text-yellow-600'}>
                {reason}
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('primary_fix_suggestion', {
      header: 'Fix Suggestions',
      cell: (info) => {
        const suggestion = info.getValue();
        const allSuggestions = info.row.original.fix_suggestions || [];
        
        if (!suggestion && allSuggestions.length === 0) {
          return <span className="text-gray-500 text-sm">No suggestions</span>;
        }
        
        return (
          <div className="text-sm">
            {suggestion && (
              <div className={`font-medium mb-1 ${suggestion.includes('URGENT') ? 'text-red-700' : 'text-blue-600'}`}>
                {suggestion}
              </div>
            )}
            {allSuggestions.length > 1 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                  +{allSuggestions.length - 1} more suggestions
                </summary>
                <ul className="mt-1 text-xs text-gray-600 space-y-1">
                  {allSuggestions.slice(1).map((sug, index) => (
                    <li key={index} className="list-disc list-inside">
                      {sug}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const worker = info.row.original;
        const hasIssues = worker.rag_status === 'RED' || worker.rag_status === 'AMBER';
        
        if (!hasIssues) {
          return <span className="text-gray-400 text-sm">No action needed</span>;
        }
        
        return (
          <button
            onClick={() => openExplanationModal(worker)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              worker.rag_status === 'RED' 
                ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300' 
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
            }`}
            title="Get AI explanation for this compliance issue"
          >
            🤖 Explain
          </button>
        );
      },
    }),
  ], []);

  // Prepare data for the table
  const tableData = results?.workers || mockResults.workers;
  
  // Filter data based on status filter
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return tableData;
    return tableData.filter(worker => worker.rag_status === statusFilter);
  }, [tableData, statusFilter]);

  // Create table instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading compliance results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-50 border border-danger-200 rounded-md p-4">
        <p className="text-danger-800">Error loading compliance results: {error}</p>
      </div>
    );
  }

  const summaryData = results || mockResults;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compliance Results</h1>
            <p className="text-gray-600 mt-2">
              NMW/NLW compliance check for {summaryData.summary.payPeriod}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleExport('pdf')}
              disabled={exportLoading.pdf || exportLoading.csv}
              className="btn-primary"
            >
              {exportLoading.pdf ? 'Generating PDF...' : '📄 Export Evidence Pack (PDF)'}
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exportLoading.pdf || exportLoading.csv}
              className="btn-secondary"
            >
              {exportLoading.csv ? 'Generating CSV...' : '📊 Export Evidence Pack (CSV)'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total Workers</p>
          <p className="text-2xl font-semibold text-gray-900">{(results?.summary || mockResults.summary).totalWorkers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Compliant</p>
          <p className="text-2xl font-semibold text-green-600">{(results?.summary || mockResults.summary).compliant}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Review Required</p>
          <p className="text-2xl font-semibold text-yellow-600">{(results?.summary || mockResults.summary).reviewRequired || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Non-Compliant</p>
          <p className="text-2xl font-semibold text-red-600">{(results?.summary || mockResults.summary).nonCompliant}</p>
        </div>
      </div>

      {/* Workers Table with Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">Worker Compliance Details</h2>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Filter */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search workers..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="GREEN">✅ Compliant</option>
              <option value="AMBER">⚠️ Review Required</option>
              <option value="RED">❌ Non-Compliant</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center space-x-2">
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        <span className="text-gray-400">
                          {{
                            asc: '↑',
                            desc: '↓',
                          }[header.column.getIsSorted()] ?? '↕'}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Info */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-700">
            Showing {table.getFilteredRowModel().rows.length} of {tableData.length} workers
          </div>
          <div className="text-sm text-gray-500">
            {table.getFilteredRowModel().rows.length > 0 && (
              <>
                {table.getFilteredRowModel().rows.filter(row => row.original.rag_status === 'GREEN').length} compliant, {' '}
                {table.getFilteredRowModel().rows.filter(row => row.original.rag_status === 'AMBER').length} review required, {' '}
                {table.getFilteredRowModel().rows.filter(row => row.original.rag_status === 'RED').length} non-compliant
              </>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Notes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Compliance Notes</h2>
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-600">
            This compliance check was performed against the UK National Minimum Wage (NMW) and National Living Wage (NLW) 
            rates effective for the pay period {(results?.summary || mockResults.summary).payPeriod}. All calculations are based on our deterministic 
            rules engine and do not constitute legal advice.
          </p>
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-900">RAG Status Legend:</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-md border bg-green-100 text-green-800 border-green-200">
                  GREEN
                </span>
                <span className="text-gray-600">Compliant - meets or exceeds minimum wage requirements</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-md border bg-yellow-100 text-yellow-800 border-yellow-200">
                  AMBER
                </span>
                <span className="text-gray-600">Review Required - potential issues or missing data</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-md border bg-red-100 text-red-800 border-red-300">
                  RED
                </span>
                <span className="text-gray-600">Non-Compliant - below minimum wage requirements</span>
              </div>
            </div>
          </div>
          <p className="text-gray-600 mt-4">
            For detailed explanations of any compliance issues and specific fix suggestions, click the "🤖 Explain" 
            button next to any non-compliant worker. You can export a complete audit-ready evidence pack using the 
            export buttons above. The evidence pack includes:
          </p>
          <ul className="text-gray-600 mt-2 ml-6 list-disc">
            <li><strong>PDF Report:</strong> Professional document with executive summary, detailed analysis, AI explanations, and compliance references</li>
            <li><strong>CSV Export:</strong> Comprehensive data export with all worker details, compliance metrics, and structured explanations</li>
            <li><strong>Risk Assessment:</strong> Detailed risk analysis with specific recommendations for improvement</li>
            <li><strong>Regulatory References:</strong> Current NMW/NLW rates and applicable regulations with GOV.UK citations</li>
          </ul>
          <p className="text-gray-600 mt-3">
            Critical violations are highlighted in bold and require immediate attention before payroll submission.
          </p>
        </div>
      </div>

      {/* Compliance Explanation Modal */}
      <ComplianceExplanationModal
        isOpen={explanationModal.isOpen}
        onClose={closeExplanationModal}
        issueCode={explanationModal.issueCode}
        workerData={explanationModal.workerData}
        issueDetails={explanationModal.issueDetails}
        onExplanationRequested={handleExplanationRequested}
      />
    </div>
  );
};

export default Compliance;
