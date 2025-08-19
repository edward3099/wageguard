import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { uploadCSV, clearUploadError } from '../store/slices/uploadSlice';

const Upload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, uploadProgress, currentUpload } = useSelector((state) => state.upload);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      // Clear previous errors and success states
      dispatch(clearUploadError());
      setUploadSuccess(false);
      
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        dispatch(uploadCSV(file));
      }
    }
  }, [dispatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  // Handle successful upload
  useEffect(() => {
    if (currentUpload && !loading && !error) {
      setUploadSuccess(true);
      // Auto-navigate to compliance results after 2 seconds
      const timer = setTimeout(() => {
        navigate('/compliance', { state: { uploadId: currentUpload.data?.uploadId } });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentUpload, loading, error, navigate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Payroll CSV</h1>
        <p className="text-gray-600 mt-2">
          Upload your payroll, rota, or timesheet data for NMW/NLW compliance checking
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragActive
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            
            <div className="text-gray-600">
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop the CSV file here' : 'Drag and drop your CSV file here'}
              </p>
              <p className="text-sm mt-1">or click to browse</p>
            </div>
            
            <p className="text-xs text-gray-500">
              Supports CSV files with payroll, rota, or timesheet data
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-danger-50 border border-danger-200 rounded-md">
            <p className="text-danger-800 text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{uploadProgress}%</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {uploadProgress < 100 ? 'Uploading file...' : 'Processing CSV data...'}
            </p>
          </div>
        )}

        {uploadSuccess && !loading && (
          <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-md">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-success-800 font-medium">Upload successful!</p>
                <p className="text-success-700 text-sm">
                  {currentUpload?.data && (
                    <>
                      Processed {currentUpload.data.validRows} of {currentUpload.data.totalRows} rows. 
                      Redirecting to results...
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">File Requirements</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Required Columns</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Worker ID or Name</li>
              <li>• Pay Period Start Date</li>
              <li>• Pay Period End Date</li>
              <li>• Total Hours Worked</li>
              <li>• Total Pay (before deductions)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">NMW Deductions</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Uniform costs</li>
              <li>• Tools/equipment costs</li>
              <li>• Training fees</li>
              <li>• Other deductions</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Enhancements</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Accommodation charges</li>
              <li>• Shift premiums</li>
              <li>• Holiday pay</li>
              <li>• Bonuses & commission</li>
              <li>• Tips & tronc</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sample CSV */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Sample CSV Format</h2>
        <div className="bg-gray-50 rounded-md p-4 overflow-x-auto">
          <pre className="text-sm text-gray-800">
{`worker_id,worker_name,hours,pay,period_start,period_end,uniform_deduction,accommodation_charge,bonus
W001,John Smith,40,420.00,2024-01-01,2024-01-31,15.00,45.00,50.00
W002,Jane Doe,35,280.00,2024-01-01,2024-01-31,12.00,0.00,0.00
W003,Mike Johnson,42,336.00,2024-01-01,2024-01-31,18.00,60.00,0.00`}
          </pre>
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>💡 Pro Tip:</strong> The system automatically detects column names and maps them appropriately. 
            Use names like "accommodation_charge", "uniform_deduction", "tools_deduction", etc. for best results.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Upload;
