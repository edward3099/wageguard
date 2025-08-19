# PRP Calculation Service Documentation

## Overview

The Pay-Reference Period (PRP) Calculation Service is the core deterministic rules engine for WageGuard. It implements UK National Minimum Wage (NMW) and National Living Wage (NLW) compliance calculations based on official government rates and regulations.

## Architecture

### Core Components

1. **PRPCalculationService** - Main service class with business logic
2. **PRPCalculationController** - API controller for HTTP requests
3. **PRPCalculationRoutes** - Express.js route definitions
4. **Database Integration** - PostgreSQL storage for compliance results

### Data Flow

```
CSV Upload → Worker/Period Data → PRP Calculation → Compliance Check → Database Storage
     ↓              ↓                    ↓              ↓              ↓
  CSV Parser → Data Validation → Rate Determination → RAG Status → Audit Log
```

## Features

### 1. Deterministic Rules Engine

- **Age-based Rate Determination**: Automatically selects appropriate NMW/NLW rate based on worker age
- **Apprentice Logic**: Handles special cases for first-year and regular apprentices
- **PRP Type Classification**: Identifies weekly, monthly, quarterly, or annual pay periods
- **Weekly Alignment**: Aligns weekly PRPs to Monday-Sunday boundaries

### 2. Offset Processing

- **Accommodation Offsets**: Maximum £9.99 per day limit
- **Uniform Offsets**: No offset allowed (0.00)
- **Meals Offsets**: No offset allowed (0.00)
- **Deductions**: Tracks and validates deduction amounts
- **Smart Categorization**: Auto-categorizes offsets based on description or type flags

### 3. Allowance Processing

- **Tronc Payments**: Service charge distributions
- **Premium Payments**: Overtime and shift premiums
- **Bonus Payments**: Performance and incentive bonuses
- **High Amount Detection**: Flags unusually high allowance amounts

### 4. Compliance Calculation

- **Effective Hourly Rate**: (Total Pay - Offsets + Allowances) / Total Hours
- **RAG Status**: Red/Amber/Green based on compliance with tolerance
- **Compliance Score**: 0-100 scale with penalty system
- **Issue Detection**: Identifies specific compliance problems
- **Fix Suggestions**: Provides actionable recommendations

## API Endpoints

### 1. Calculate Individual PRP

```http
POST /api/v1/prp/calculate/:workerId/:payPeriodId
```

**Parameters:**
- `workerId`: Worker database ID
- `payPeriodId`: Pay period database ID

**Response:**
```json
{
  "success": true,
  "data": {
    "prp": {
      "start_date": "2024-01-01T00:00:00.000Z",
      "end_date": "2024-01-31T00:00:00.000Z",
      "total_hours": 160,
      "total_pay": 1280.00,
      "effective_hourly_rate": 8.00,
      "required_hourly_rate": 10.42
    },
    "compliance": {
      "rag_status": "RED",
      "compliance_score": 77,
      "issues": [...],
      "fix_suggestions": [...]
    }
  },
  "compliance_check_id": 123
}
```

### 2. Bulk PRP Calculation

```http
POST /api/v1/prp/calculate-bulk/:uploadId
```

**Parameters:**
- `uploadId`: CSV upload database ID

**Response:**
```json
{
  "success": true,
  "data": {
    "total_workers": 10,
    "compliant_workers": 3,
    "amber_workers": 2,
    "non_compliant_workers": 5,
    "summary": {
      "total_hours": 1600,
      "total_pay": 12800.00,
      "average_compliance_score": 78
    },
    "calculations": [...]
  },
  "upload_id": 456
}
```

### 3. Worker PRP History

```http
GET /api/v1/prp/history/:workerId?limit=10&offset=0
```

**Parameters:**
- `workerId`: Worker database ID
- `limit`: Number of records (default: 10)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "worker": {
      "id": 1,
      "name": "John Smith",
      "age": 25,
      "apprentice_status": false
    },
    "history": [...],
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0,
      "has_more": true
    }
  }
}
```

### 4. Compliance Summary

```http
GET /api/v1/prp/summary/:uploadId
```

**Parameters:**
- `uploadId`: CSV upload database ID

**Response:**
```json
{
  "success": true,
  "data": {
    "total_checks": 10,
    "green_count": 3,
    "amber_count": 2,
    "red_count": 5,
    "average_score": 78.5,
    "min_score": 45,
    "max_score": 100
  }
}
```

### 5. Health Check

```http
GET /api/v1/prp/health
```

**Response:**
```json
{
  "success": true,
  "message": "PRP Calculation Service is healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "WageGuard PRP Calculation",
  "version": "1.0.0"
}
```

## UK NMW/NLW Rates (2023-24)

| Rate Type | Age Group | Hourly Rate | Effective Date |
|-----------|-----------|-------------|----------------|
| NLW | 23+ | £10.42 | 2023-04-01 |
| NMW | 21-22 | £10.18 | 2023-04-01 |
| NMW | 18-20 | £7.49 | 2023-04-01 |
| NMW | 16-17 | £5.28 | 2023-04-01 |
| NMW | Apprentices | £5.28 | 2023-04-01 |

## Offset Limits

| Offset Type | Daily Limit | Description |
|-------------|-------------|-------------|
| Accommodation | £9.99 | Maximum per day for housing |
| Uniform | £0.00 | No offset allowed |
| Meals | £0.00 | No offset allowed |
| Deductions | Variable | Tracks but doesn't limit |

## RAG Status Logic

### Green (Compliant)
- Effective hourly rate ≥ Required rate

### Amber (Warning)
- Effective hourly rate within 2% tolerance of required rate
- Default tolerance: 2% (configurable)

### Red (Non-compliant)
- Effective hourly rate below tolerance threshold
- Requires immediate attention

## Compliance Score Calculation

### Perfect Compliance (100 points)
- Effective rate ≥ Required rate

### Partial Compliance (0-99 points)
- Base score: (Effective rate / Required rate) × 100
- Penalty: (Required rate - Effective rate) / Required rate × 50
- Final score: Base score - Penalty, minimum 0

## Error Handling

### Input Validation Errors
- Missing worker ID
- Invalid pay period dates
- Non-positive hours or pay amounts
- Invalid date formats
- Start date after end date

### Calculation Errors
- Worker age below minimum (16)
- Zero or negative hours
- Database connection failures

### Graceful Degradation
- Returns error details in response
- Logs all errors for debugging
- Continues processing other workers in bulk operations

## Performance Considerations

### Batch Processing
- Processes multiple workers efficiently
- Database queries optimized with JOINs
- Transaction support for data consistency

### Memory Management
- Processes data in chunks for large uploads
- Efficient data structures for calculations
- Minimal object creation during processing

### Database Optimization
- Indexed queries on worker_id, pay_period_id
- Prepared statements for repeated queries
- Connection pooling for concurrent requests

## Security Features

### Input Sanitization
- Validates all numeric inputs
- Sanitizes date strings
- Prevents SQL injection through parameterized queries

### Access Control
- All endpoints require authentication (to be implemented)
- User context tracking for audit logs
- IP address and user agent logging

### Data Privacy
- No sensitive data in logs
- Audit trail for compliance purposes
- Secure database connections

## Testing

### Unit Tests
- Comprehensive test coverage for all methods
- Edge case testing for boundary conditions
- Mock data for isolated testing

### Integration Tests
- Database integration testing
- API endpoint testing
- End-to-end workflow testing

### Test Data
- Sample workers with various ages and statuses
- Different pay period scenarios
- Edge case offset and allowance combinations

## Configuration

### Environment Variables
- Database connection settings
- Logging levels
- Rate limits and timeouts

### Service Configuration
- Tolerance percentages for RAG status
- Offset limits and thresholds
- Rate table updates for new tax years

## Monitoring and Logging

### Performance Metrics
- Calculation response times
- Database query performance
- Memory usage patterns

### Error Tracking
- Failed calculation attempts
- Database connection issues
- Input validation failures

### Audit Logging
- All PRP calculations logged
- User actions tracked
- Compliance results stored

## Future Enhancements

### Rate Updates
- Automatic rate table updates
- Historical rate tracking
- Multi-year compliance analysis

### Advanced Calculations
- Holiday pay uplift calculations
- Arrears and back-pay handling
- Complex shift pattern support

### Integration Features
- Real-time compliance monitoring
- Automated alerting for violations
- Integration with payroll systems

## Troubleshooting

### Common Issues

1. **Calculation Returns RED for Compliant Worker**
   - Check offset amounts and limits
   - Verify worker age and apprentice status
   - Review pay period dates and hours

2. **Database Connection Errors**
   - Verify PostgreSQL service is running
   - Check connection string and credentials
   - Ensure database schema is initialized

3. **Performance Issues with Large Uploads**
   - Monitor memory usage
   - Check database query performance
   - Consider implementing pagination

### Debug Mode
- Enable detailed logging
- Review calculation step-by-step
- Validate input data integrity

## Support

### Documentation
- API reference with examples
- Integration guides
- Best practices documentation

### Community
- GitHub issues and discussions
- Developer forums
- Regular updates and announcements

### Contact
- Technical support team
- Feature request submissions
- Bug report handling
