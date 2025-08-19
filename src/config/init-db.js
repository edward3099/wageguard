const { pool } = require('./database');

const initDatabase = async () => {
  try {
    console.log('🔄 Initializing WageGuard database...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'employer',
        company_name VARCHAR(255),
        is_bureau BOOLEAN DEFAULT FALSE,
        bureau_settings JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create bureaus table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bureaus (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        description TEXT,
        settings JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create clients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        bureau_id INTEGER REFERENCES bureaus(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        industry VARCHAR(100),
        settings JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create csv_uploads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS csv_uploads (
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
      );
    `);
    
    // Create workers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workers (
        id SERIAL PRIMARY KEY,
        csv_upload_id INTEGER REFERENCES csv_uploads(id) ON DELETE CASCADE,
        external_id VARCHAR(255),
        name VARCHAR(255),
        age INTEGER,
        apprentice_status BOOLEAN DEFAULT FALSE,
        first_year_apprentice BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create pay_periods table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pay_periods (
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
      );
    `);
    
    // Create offsets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS offsets (
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
      );
    `);
    
    // Create allowances table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS allowances (
        id SERIAL PRIMARY KEY,
        pay_period_id INTEGER REFERENCES pay_periods(id) ON DELETE CASCADE,
        allowance_type VARCHAR(50) NOT NULL,
        description TEXT,
        amount DECIMAL(10,2) NOT NULL,
        is_tronc BOOLEAN DEFAULT FALSE,
        is_premium BOOLEAN DEFAULT FALSE,
        is_bonus BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create compliance_checks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS compliance_checks (
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
      );
    `);
    
    // Create compliance_rules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS compliance_rules (
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
      );
    `);
    
    // Create evidence_packs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evidence_packs (
        id SERIAL PRIMARY KEY,
        csv_upload_id INTEGER REFERENCES csv_uploads(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255),
        file_path VARCHAR(500),
        export_format VARCHAR(20) NOT NULL,
        summary_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
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
      );
    `);
    
    // Insert default compliance rules
    await pool.query(`
      INSERT INTO compliance_rules (rule_name, rule_description, rule_type, rule_logic, min_age, effective_date) VALUES
      ('NMW_23_24_21_22', 'National Minimum Wage for workers aged 21-22', 'hourly_rate', '{"min_rate": 10.18}', 21, '2023-04-01'),
      ('NMW_23_24_18_20', 'National Minimum Wage for workers aged 18-20', 'hourly_rate', '{"min_rate": 7.49}', 18, '2023-04-01'),
      ('NMW_23_24_16_17', 'National Minimum Wage for workers aged 16-17', 'hourly_rate', '{"min_rate": 5.28}', 16, '2023-04-01'),
      ('NMW_23_24_APPRENTICE', 'National Minimum Wage for apprentices', 'hourly_rate', '{"min_rate": 5.28}', 16, '2023-04-01'),
      ('NLW_23_24', 'National Living Wage for workers aged 23+', 'hourly_rate', '{"min_rate": 10.42}', 23, '2023-04-01'),
      ('ACCOMMODATION_OFFSET', 'Maximum accommodation offset per day', 'offset', '{"max_daily": 9.99}', 16, '2023-04-01'),
      ('UNIFORM_OFFSET', 'Maximum uniform offset per day', 'offset', '{"max_daily": 0.00}', 16, '2023-04-01'),
      ('MEALS_OFFSET', 'Maximum meals offset per day', 'offset', '{"max_daily": 0.00}', 16, '2023-04-01')
      ON CONFLICT (rule_name) DO NOTHING;
    `);
    
    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_csv_uploads_user_id ON csv_uploads(user_id);
      CREATE INDEX IF NOT EXISTS idx_csv_uploads_client_id ON csv_uploads(client_id);
      CREATE INDEX IF NOT EXISTS idx_workers_csv_upload_id ON workers(csv_upload_id);
      CREATE INDEX IF NOT EXISTS idx_pay_periods_csv_upload_id ON pay_periods(csv_upload_id);
      CREATE INDEX IF NOT EXISTS idx_pay_periods_worker_id ON pay_periods(worker_id);
      CREATE INDEX IF NOT EXISTS idx_offsets_pay_period_id ON offsets(pay_period_id);
      CREATE INDEX IF NOT EXISTS idx_allowances_pay_period_id ON allowances(pay_period_id);
      CREATE INDEX IF NOT EXISTS idx_compliance_checks_pay_period_id ON compliance_checks(pay_period_id);
      CREATE INDEX IF NOT EXISTS idx_compliance_checks_rag_status ON compliance_checks(rag_status);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `);
    
    console.log('✅ WageGuard database schema created successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Run initialization if this file is executed directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('🎉 WageGuard database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 WageGuard database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initDatabase };
