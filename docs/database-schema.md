# WageGuard Database Schema Documentation

## Overview
The WageGuard database is designed to support UK NMW/NLW compliance checking with a focus on pay-reference periods, offsets, allowances, and deterministic compliance rules.

## Database Tables

### 1. Users Table
**Purpose**: Store user authentication and profile information
```sql
users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employer',
  company_name VARCHAR(255),
  is_bureau BOOLEAN DEFAULT FALSE,
  bureau_settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Key Fields**:
- `role`: 'employer', 'bureau', 'admin'
- `is_bureau`: Flag for payroll bureau users
- `bureau_settings`: JSON configuration for bureau-specific features

### 2. Bureaus Table
**Purpose**: Manage payroll bureau relationships
```sql
bureaus (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### 3. Clients Table
**Purpose**: Store client information for bureaus
```sql
clients (
  id SERIAL PRIMARY KEY,
  bureau_id INTEGER REFERENCES bureaus(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### 4. CSV Uploads Table
**Purpose**: Track file uploads and processing status
```sql
csv_uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_filename VARCHAR(255),
  file_size BIGINT,
  status VARCHAR(50) DEFAULT 'uploaded',
  processing_status VARCHAR(50) DEFAULT 'pending',
  column_mapping JSONB,
  total_records INTEGER,
  processed_records INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
)
```

**Key Fields**:
- `status`: 'uploaded', 'processing', 'completed', 'error'
- `processing_status`: 'pending', 'mapping', 'validating', 'compliance_check'
- `column_mapping`: JSON object mapping CSV columns to database fields

### 5. Workers Table
**Purpose**: Store individual worker information
```sql
workers (
  id SERIAL PRIMARY KEY,
  csv_upload_id INTEGER REFERENCES csv_uploads(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  name VARCHAR(255),
  age INTEGER,
  apprentice_status BOOLEAN DEFAULT FALSE,
  first_year_apprentice BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Key Fields**:
- `apprentice_status`: Whether worker is an apprentice
- `first_year_apprentice`: Special flag for first-year apprentices

### 6. Pay Periods Table
**Purpose**: Store pay reference period calculations
```sql
pay_periods (
  id SERIAL PRIMARY KEY,
  csv_upload_id INTEGER REFERENCES csv_uploads(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_hours DECIMAL(10,2) NOT NULL,
  total_pay DECIMAL(10,2) NOT NULL,
  effective_hourly_rate DECIMAL(10,4),
  required_hourly_rate DECIMAL(10,4),
  period_type VARCHAR(50) DEFAULT 'monthly',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Key Fields**:
- `effective_hourly_rate`: Calculated rate after offsets
- `required_hourly_rate`: Minimum required rate based on age/apprentice status
- `period_type`: 'weekly', 'monthly', 'custom'

### 7. Offsets Table
**Purpose**: Store accommodation, uniform, and other offsets
```sql
offsets (
  id SERIAL PRIMARY KEY,
  pay_period_id INTEGER REFERENCES pay_periods(id) ON DELETE CASCADE,
  offset_type VARCHAR(50) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  daily_rate DECIMAL(10,2),
  days_applied INTEGER,
  is_accommodation BOOLEAN DEFAULT FALSE,
  is_uniform BOOLEAN DEFAULT FALSE,
  is_meals BOOLEAN DEFAULT FALSE,
  is_deduction BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Key Fields**:
- `offset_type`: 'accommodation', 'uniform', 'meals', 'deduction'
- `daily_rate`: Daily rate for accommodation offsets
- `days_applied`: Number of days the offset applies to

### 8. Allowances Table
**Purpose**: Store troncs, premiums, and bonuses
```sql
allowances (
  id SERIAL PRIMARY KEY,
  pay_period_id INTEGER REFERENCES pay_periods(id) ON DELETE CASCADE,
  allowance_type VARCHAR(50) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  is_tronc BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  is_bonus BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### 9. Compliance Checks Table
**Purpose**: Store compliance check results and RAG status
```sql
compliance_checks (
  id SERIAL PRIMARY KEY,
  pay_period_id INTEGER REFERENCES pay_periods(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  csv_upload_id INTEGER REFERENCES csv_uploads(id) ON DELETE CASCADE,
  rag_status VARCHAR(10) NOT NULL CHECK (rag_status IN ('RED', 'AMBER', 'GREEN')),
  compliance_score DECIMAL(5,2),
  issues JSONB,
  fix_suggestions JSONB,
  compliance_rules_applied JSONB,
  evidence_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Key Fields**:
- `rag_status`: 'RED' (non-compliant), 'AMBER' (at risk), 'GREEN' (compliant)
- `compliance_score`: Percentage compliance score
- `issues`: JSON array of specific compliance issues
- `fix_suggestions`: JSON array of suggested fixes

### 10. Compliance Rules Table
**Purpose**: Store UK NMW/NLW rules and rates
```sql
compliance_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(255) NOT NULL,
  rule_description TEXT,
  rule_type VARCHAR(50) NOT NULL,
  rule_logic JSONB,
  min_age INTEGER,
  max_age INTEGER,
  apprentice_applicable BOOLEAN DEFAULT TRUE,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Default Rules**:
- NMW rates for different age groups (16-17, 18-20, 21-22)
- NLW rate for workers 23+
- Apprentice rate
- Maximum accommodation offset (£9.99/day)
- Uniform and meals offset limits

### 11. Evidence Packs Table
**Purpose**: Store exported compliance evidence
```sql
evidence_packs (
  id SERIAL PRIMARY KEY,
  csv_upload_id INTEGER REFERENCES csv_uploads(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255),
  file_path VARCHAR(500),
  export_format VARCHAR(20) NOT NULL,
  summary_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### 12. Audit Logs Table
**Purpose**: Track all database changes for compliance
```sql
audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Database Indexes

Performance indexes are created on:
- Foreign key relationships
- Frequently queried fields (RAG status, dates)
- Search fields (user IDs, upload IDs)

## Data Flow

1. **Upload**: CSV file uploaded → `csv_uploads` table
2. **Processing**: File parsed → `workers` and `pay_periods` tables
3. **Offsets/Allowances**: Applied → `offsets` and `allowances` tables
4. **Compliance Check**: Rules engine runs → `compliance_checks` table
5. **Export**: Evidence pack generated → `evidence_packs` table

## Compliance Logic

The database supports:
- **Deterministic Rules**: All compliance calculations use stored rules
- **Age-based Rates**: Different minimum rates for different age groups
- **Apprentice Handling**: Special rates and rules for apprentices
- **Offset Calculations**: Accommodation, uniform, and meal deductions
- **Allowance Processing**: Troncs, premiums, and bonuses
- **RAG Status**: Red/Amber/Green compliance indicators

## Security Features

- **Audit Logging**: All changes tracked in `audit_logs`
- **User Isolation**: Users can only access their own data
- **Bureau Separation**: Bureau users isolated from each other
- **Data Validation**: Constraints and checks on critical fields
