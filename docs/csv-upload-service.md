# CSV Upload Service Documentation

## Overview
The CSV Upload Service is a core component of WageGuard that handles the secure upload, parsing, and processing of CSV files containing payroll, rota, and timesheet data. It provides a robust, secure, and scalable solution for ingesting large amounts of worker data for compliance checking.

## Architecture

### Components
1. **FileUploadService** - Handles file uploads, validation, and storage
2. **CSVParserService** - Parses and validates CSV content
3. **CSVUploadController** - Orchestrates the upload process
4. **CSV Upload Routes** - API endpoints for file operations

### Data Flow
```
File Upload → Validation → CSV Parsing → Data Processing → Database Storage → Response
```

## Features

### File Upload
- **Secure Uploads**: Uses multer with configurable storage
- **File Validation**: Type, size, and extension checking
- **User Isolation**: Separate upload directories per user
- **Unique Naming**: Timestamped filenames with random strings
- **Size Limits**: Configurable maximum file size (default: 10MB)

### CSV Parsing
- **Multiple Formats**: Supports payroll, rota, and timesheet CSV types
- **Flexible Headers**: Automatic column mapping for common variations
- **Data Validation**: Comprehensive validation of parsed data
- **Error Handling**: Detailed error reporting with row-level information
- **Data Processing**: Automatic type conversion and derived field calculation

### Database Integration
- **Structured Storage**: Data stored in normalized database tables
- **Audit Logging**: Complete audit trail of all operations
- **Transaction Safety**: Database operations wrapped in transactions
- **Performance**: Optimized queries with proper indexing

## API Endpoints

### 1. Upload CSV File
```http
POST /api/v1/csv/upload
Content-Type: multipart/form-data

Body:
- csvFile: CSV file (required)
- csvType: string (optional, default: 'payroll')
```

**Response:**
```json
{
  "success": true,
  "message": "CSV file uploaded and processed successfully",
  "data": {
    "uploadId": 123,
    "filename": "payroll_data.csv",
    "csvType": "payroll",
    "totalRows": 100,
    "validRows": 98,
    "invalidRows": 2,
    "columnMapping": {...},
    "report": {...}
  }
}
```

### 2. List User Uploads
```http
GET /api/v1/csv/uploads
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "filename": "wageguard_1234567890_abc123.csv",
      "original_filename": "payroll_data.csv",
      "status": "uploaded",
      "processing_status": "completed",
      "total_records": 100,
      "processed_records": 98,
      "worker_count": 50,
      "pay_period_count": 98,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 3. Get Upload Status
```http
GET /api/v1/csv/uploads/:uploadId
Authorization: Bearer <token>
```

### 4. Delete Upload
```http
DELETE /api/v1/csv/uploads/:uploadId
Authorization: Bearer <token>
```

### 5. Health Check
```http
GET /api/v1/csv/health
```

## CSV Format Requirements

### Payroll CSV
**Required Columns:**
- `worker_id` - Unique worker identifier
- `worker_name` - Worker's full name
- `hours` - Total hours worked (numeric)
- `pay` - Total pay amount (numeric)
- `period_start` - Pay period start date
- `period_end` - Pay period end date

**Supported Column Variations:**
- `worker_id`: `employee_id`, `staff_id`, `id`, `worker`, `employee`
- `worker_name`: `employee_name`, `staff_name`, `name`, `full_name`
- `hours`: `hours_worked`, `total_hours`, `worked_hours`, `hrs`
- `pay`: `total_pay`, `gross_pay`, `wages`, `salary`, `amount`
- `period_start`: `start_date`, `from_date`, `week_start`, `month_start`
- `period_end`: `end_date`, `to_date`, `week_end`, `month_end`

### Rota CSV
**Required Columns:**
- `worker_id` - Unique worker identifier
- `worker_name` - Worker's full name
- `date` - Work date
- `start_time` - Shift start time
- `end_time` - Shift end time
- `break_minutes` - Break time in minutes

### Timesheet CSV
**Required Columns:**
- `worker_id` - Unique worker identifier
- `worker_name` - Worker's full name
- `date` - Work date
- `hours_worked` - Hours worked on date
- `pay_rate` - Hourly pay rate
- `total_pay` - Total pay for date

## Data Processing

### Automatic Conversions
- **Numeric Fields**: Strings converted to numbers
- **Dates**: Multiple date format support
- **Calculations**: Effective hourly rate calculation

### Validation Rules
- **Required Fields**: All required columns must be present
- **Data Types**: Hours and pay must be valid numbers
- **Value Ranges**: Hours and pay cannot be negative
- **File Integrity**: File must not be empty

### Error Handling
- **Row-level Errors**: Specific errors for each problematic row
- **File-level Errors**: Issues affecting the entire file
- **Detailed Messages**: Clear error descriptions with suggestions

## Security Features

### File Security
- **Type Validation**: Only CSV files accepted
- **Size Limits**: Configurable maximum file sizes
- **Path Traversal**: Prevention of directory traversal attacks
- **User Isolation**: Files stored in user-specific directories

### Data Security
- **Input Sanitization**: All input validated and sanitized
- **SQL Injection**: Parameterized queries prevent injection
- **Audit Logging**: Complete audit trail of all operations
- **Access Control**: Users can only access their own files

## Performance Considerations

### File Processing
- **Streaming**: Large files processed using streams
- **Memory Management**: Efficient memory usage for large files
- **Batch Processing**: Database operations batched for efficiency

### Database Optimization
- **Indexes**: Proper indexing on frequently queried fields
- **Connection Pooling**: Efficient database connection management
- **Transaction Management**: Optimized transaction handling

## Error Handling

### Common Errors
1. **File Too Large**: Exceeds maximum file size limit
2. **Invalid File Type**: Non-CSV file uploaded
3. **Missing Columns**: Required columns not found
4. **Data Validation**: Invalid data in CSV rows
5. **Database Errors**: Issues with data storage

### Error Responses
```json
{
  "success": false,
  "error": "File validation failed",
  "details": [
    "File size 15MB exceeds maximum 10MB",
    "File extension .txt is not allowed"
  ]
}
```

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run CSV upload tests only
npm test tests/csv-upload.test.js

# Run tests with coverage
npm run test:coverage
```

### Test Coverage
- **Unit Tests**: Individual service testing
- **Integration Tests**: API endpoint testing
- **Error Handling**: Edge case and error scenario testing
- **File Operations**: File upload and processing testing

## Configuration

### Environment Variables
```env
# File upload settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_PATH=./uploads   # Upload directory

# Database settings
DB_USER=postgres
DB_HOST=localhost
DB_NAME=wageguard
DB_PASSWORD=your_password
DB_PORT=5432
```

### Service Configuration
```javascript
// File upload service configuration
const fileUpload = new FileUploadService({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['text/csv', 'application/csv'],
  uploadDir: './uploads'
});

// CSV parser configuration
const csvParser = new CSVParserService({
  expectedColumns: {...},
  columnMappings: {...}
});
```

## Monitoring and Logging

### Log Levels
- **INFO**: Successful operations and general information
- **WARN**: Non-critical issues and warnings
- **ERROR**: Errors and failures
- **DEBUG**: Detailed debugging information

### Metrics
- **Upload Count**: Number of successful uploads
- **Processing Time**: Time taken to process files
- **Error Rate**: Percentage of failed uploads
- **File Sizes**: Distribution of uploaded file sizes

## Troubleshooting

### Common Issues

#### 1. File Upload Fails
- Check file size limits
- Verify file type and extension
- Ensure proper form field name (`csvFile`)
- Check server disk space

#### 2. CSV Parsing Errors
- Verify CSV format and required columns
- Check for special characters in data
- Ensure proper date formats
- Validate numeric field values

#### 3. Database Errors
- Check database connection
- Verify table schema exists
- Check user permissions
- Review database logs

### Debug Mode
Enable debug logging for troubleshooting:
```javascript
process.env.LOG_LEVEL = 'debug';
```

## Future Enhancements

### Planned Features
- **Async Processing**: Background job processing for large files
- **Progress Tracking**: Real-time upload and processing progress
- **Batch Operations**: Support for multiple file uploads
- **Data Preview**: Preview of parsed data before processing
- **Template Generation**: CSV template generation for users

### Performance Improvements
- **Parallel Processing**: Multi-threaded CSV parsing
- **Caching**: Redis-based caching for frequently accessed data
- **Compression**: Support for compressed CSV files
- **Streaming**: Real-time data processing and validation

## Support and Maintenance

### Regular Maintenance
- **File Cleanup**: Automatic cleanup of old temporary files
- **Database Optimization**: Regular database maintenance
- **Log Rotation**: Log file management and rotation
- **Performance Monitoring**: Regular performance analysis

### Updates and Patches
- **Security Updates**: Regular security patches
- **Feature Updates**: New functionality and improvements
- **Bug Fixes**: Bug resolution and stability improvements
- **Compatibility**: Support for new CSV formats and standards
