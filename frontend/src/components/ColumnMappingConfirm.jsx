import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const ColumnMappingConfirm = ({ 
  csvHeaders, 
  csvType = 'payroll', 
  onConfirm, 
  onCancel,
  isLoading = false 
}) => {
  const [mappings, setMappings] = useState([]);
  const [schemaFields, setSchemaFields] = useState([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [error, setError] = useState(null);
  const [overallConfidence, setOverallConfidence] = useState(0);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Load schema and generate initial mappings
  useEffect(() => {
    if (csvHeaders && csvHeaders.length > 0) {
      loadSchemaAndMappings();
    }
  }, [csvHeaders, csvType]);

  const loadSchemaAndMappings = async () => {
    setLoadingMappings(true);
    setError(null);

    try {
      // Load schema information
      const schemaResponse = await fetch(`${API_BASE_URL}/api/v1/mapping/schema/${csvType}`);
      const schemaData = await schemaResponse.json();

      if (schemaData.success) {
        setSchemaFields(schemaData.schema.fields);
      }

      // Generate mapping suggestions
      const mappingResponse = await fetch(`${API_BASE_URL}/api/v1/mapping/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvHeaders,
          csvType
        })
      });

      const mappingData = await mappingResponse.json();

      if (mappingData.success) {
        setMappings(mappingData.mappings);
        setOverallConfidence(mappingData.metadata.overallConfidence);
      } else {
        throw new Error(mappingData.error || 'Failed to generate mappings');
      }

    } catch (err) {
      setError(`Failed to load mappings: ${err.message}`);
      console.error('Mapping error:', err);
    } finally {
      setLoadingMappings(false);
    }
  };

  const handleMappingChange = (csvHeader, newField) => {
    setMappings(prev => prev.map(mapping => 
      mapping.csvHeader === csvHeader 
        ? { ...mapping, suggestedField: newField, confidence: newField ? 100 : 0 }
        : mapping
    ));
  };

  const addUnmappedHeader = (header) => {
    setMappings(prev => [...prev, {
      csvHeader: header,
      suggestedField: '',
      confidence: 0,
      reasoning: 'User added'
    }]);
  };

  const removeMapping = (csvHeader) => {
    setMappings(prev => prev.filter(mapping => mapping.csvHeader !== csvHeader));
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    if (confidence > 0) return 'Low';
    return 'None';
  };

  const validateMappings = () => {
    const errors = [];
    const usedFields = new Set();

    for (const mapping of mappings) {
      if (mapping.suggestedField) {
        if (usedFields.has(mapping.suggestedField)) {
          errors.push(`Field "${mapping.suggestedField}" is mapped to multiple columns`);
        }
        usedFields.add(mapping.suggestedField);
      }
    }

    return errors;
  };

  const handleConfirm = () => {
    const errors = validateMappings();
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    const finalMappings = mappings.filter(m => m.suggestedField);
    onConfirm(finalMappings);
  };

  const getMappedHeaders = () => mappings.map(m => m.csvHeader);
  const getUnmappedHeaders = () => csvHeaders.filter(h => !getMappedHeaders().includes(h));

  if (loadingMappings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating intelligent column mappings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Mapping Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={loadSchemaAndMappings}
                className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Confirm Column Mappings</h2>
        <p className="text-sm text-gray-600">
          Review and adjust the suggested mappings for your CSV columns. High confidence suggestions 
          are automatically mapped, but you can change any mapping as needed.
        </p>
        
        {/* Overall Confidence */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700">Overall Confidence:</span>
            <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${getConfidenceColor(overallConfidence)}`}>
              {overallConfidence}% ({getConfidenceText(overallConfidence)})
            </span>
          </div>
          <div className="text-sm text-gray-500">
            CSV Type: <span className="font-medium capitalize">{csvType}</span>
          </div>
        </div>
      </div>

      {/* Mappings Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CSV Column
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Maps To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mappings.map((mapping, index) => (
              <tr key={mapping.csvHeader} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{mapping.csvHeader}</div>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={mapping.suggestedField}
                    onChange={(e) => handleMappingChange(mapping.csvHeader, e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">-- No mapping --</option>
                    {schemaFields.map(field => (
                      <option key={field.name} value={field.name}>
                        {field.name} {field.required ? '*' : ''} - {field.description}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getConfidenceColor(mapping.confidence)}`}>
                    {mapping.confidence}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => removeMapping(mapping.csvHeader)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unmapped Headers */}
      {getUnmappedHeaders().length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Unmapped Columns</h3>
          <div className="flex flex-wrap gap-2">
            {getUnmappedHeaders().map(header => (
              <div key={header} className="flex items-center space-x-2 bg-gray-100 rounded px-3 py-1">
                <span className="text-sm text-gray-700">{header}</span>
                <button
                  onClick={() => addUnmappedHeader(header)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Map
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            These columns couldn't be automatically mapped. Click "Map" to manually assign them.
          </p>
        </div>
      )}

      {/* Required Fields Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Required Fields</h4>
        <div className="text-sm text-blue-800">
          {schemaFields
            .filter(field => field.required)
            .map(field => (
              <div key={field.name} className="flex items-center justify-between">
                <span>{field.name}: {field.description}</span>
                <span className={
                  mappings.some(m => m.suggestedField === field.name) 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }>
                  {mappings.some(m => m.suggestedField === field.name) ? '✓ Mapped' : '✗ Missing'}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading || mappings.filter(m => m.suggestedField).length === 0}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Confirm Mappings'}
        </button>
      </div>
    </div>
  );
};

ColumnMappingConfirm.propTypes = {
  csvHeaders: PropTypes.arrayOf(PropTypes.string).isRequired,
  csvType: PropTypes.oneOf(['payroll', 'rota', 'timesheet']),
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

export default ColumnMappingConfirm;
