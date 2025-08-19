/**
 * Multi-Tenancy Database Migration
 * 
 * Adds organization_id fields to key tables for multi-tenant architecture
 */

const { pool } = require('./database');

const runMultiTenancyMigration = async () => {
  try {
    console.log('🔄 Running multi-tenancy database migration...');

    // 1. Add organization_id to csv_uploads table
    console.log('📝 Adding organization_id to csv_uploads table...');
    await pool.query(`
      ALTER TABLE csv_uploads 
      ADD COLUMN IF NOT EXISTS organization_id INTEGER,
      ADD COLUMN IF NOT EXISTS organization_type VARCHAR(50) DEFAULT 'employer'
    `);

    // 2. Add organization_id to workers table
    console.log('📝 Adding organization_id to workers table...');
    await pool.query(`
      ALTER TABLE workers 
      ADD COLUMN IF NOT EXISTS organization_id INTEGER,
      ADD COLUMN IF NOT EXISTS organization_type VARCHAR(50) DEFAULT 'employer'
    `);

    // 3. Add organization_id to pay_periods table
    console.log('📝 Adding organization_id to pay_periods table...');
    await pool.query(`
      ALTER TABLE pay_periods 
      ADD COLUMN IF NOT EXISTS organization_id INTEGER,
      ADD COLUMN IF NOT EXISTS organization_type VARCHAR(50) DEFAULT 'employer'
    `);

    // 4. Add organization_id to offsets table
    console.log('📝 Adding organization_id to offsets table...');
    await pool.query(`
      ALTER TABLE offsets 
      ADD COLUMN IF NOT EXISTS organization_id INTEGER,
      ADD COLUMN IF NOT EXISTS organization_type VARCHAR(50) DEFAULT 'employer'
    `);

    // 5. Add organization_id to allowances table
    console.log('📝 Adding organization_id to allowances table...');
    await pool.query(`
      ALTER TABLE allowances 
      ADD COLUMN IF NOT EXISTS organization_id INTEGER,
      ADD COLUMN IF NOT EXISTS organization_type VARCHAR(50) DEFAULT 'employer'
    `);

    // 6. Add organization_id to compliance_checks table
    console.log('📝 Adding organization_id to compliance_checks table...');
    await pool.query(`
      ALTER TABLE compliance_checks 
      ADD COLUMN IF NOT EXISTS organization_id INTEGER,
      ADD COLUMN IF NOT EXISTS organization_type VARCHAR(50) DEFAULT 'employer'
    `);

    // 7. Add organization_id to evidence_packs table
    console.log('📝 Adding organization_id to evidence_packs table...');
    await pool.query(`
      ALTER TABLE evidence_packs 
      ADD COLUMN IF NOT EXISTS organization_id INTEGER,
      ADD COLUMN IF NOT EXISTS organization_type VARCHAR(50) DEFAULT 'employer'
    `);

    // 8. Add organization_id to audit_logs table
    console.log('📝 Adding organization_id to audit_logs table...');
    await pool.query(`
      ALTER TABLE audit_logs 
      ADD COLUMN IF NOT EXISTS organization_id INTEGER,
      ADD COLUMN IF NOT EXISTS organization_type VARCHAR(50) DEFAULT 'employer'
    `);

    // 9. Update existing records to set organization_id based on user_id
    console.log('🔄 Updating existing records with organization_id...');
    
    // Update csv_uploads
    await pool.query(`
      UPDATE csv_uploads 
      SET organization_id = user_id, organization_type = 'employer'
      WHERE organization_id IS NULL
    `);

    // Update workers (via csv_uploads)
    await pool.query(`
      UPDATE workers 
      SET organization_id = cu.organization_id, organization_type = cu.organization_type
      FROM csv_uploads cu
      WHERE workers.csv_upload_id = cu.id AND workers.organization_id IS NULL
    `);

    // Update pay_periods (via csv_uploads)
    await pool.query(`
      UPDATE pay_periods 
      SET organization_id = cu.organization_id, organization_type = cu.organization_type
      FROM csv_uploads cu
      WHERE pay_periods.csv_upload_id = cu.id AND pay_periods.organization_id IS NULL
    `);

    // Update offsets (via pay_periods)
    await pool.query(`
      UPDATE offsets 
      SET organization_id = pp.organization_id, organization_type = pp.organization_type
      FROM pay_periods pp
      WHERE offsets.pay_period_id = pp.id AND offsets.organization_id IS NULL
    `);

    // Update allowances (via pay_periods)
    await pool.query(`
      UPDATE allowances 
      SET organization_id = pp.organization_id, organization_type = pp.organization_type
      FROM pay_periods pp
      WHERE allowances.pay_period_id = pp.id AND allowances.organization_id IS NULL
    `);

    // Update compliance_checks (via csv_uploads)
    await pool.query(`
      UPDATE compliance_checks 
      SET organization_id = cu.organization_id, organization_type = cu.organization_type
      FROM csv_uploads cu
      WHERE compliance_checks.csv_upload_id = cu.id AND compliance_checks.organization_id IS NULL
    `);

    // Update evidence_packs
    await pool.query(`
      UPDATE evidence_packs 
      SET organization_id = user_id, organization_type = 'employer'
      WHERE organization_id IS NULL
    `);

    // Update audit_logs
    await pool.query(`
      UPDATE audit_logs 
      SET organization_id = user_id, organization_type = 'employer'
      WHERE organization_id IS NULL AND user_id IS NOT NULL
    `);

    // 10. Make organization_id NOT NULL after populating
    console.log('🔒 Making organization_id NOT NULL...');
    
    await pool.query(`
      ALTER TABLE csv_uploads 
      ALTER COLUMN organization_id SET NOT NULL,
      ALTER COLUMN organization_type SET NOT NULL
    `);

    await pool.query(`
      ALTER TABLE workers 
      ALTER COLUMN organization_id SET NOT NULL,
      ALTER COLUMN organization_type SET NOT NULL
    `);

    await pool.query(`
      ALTER TABLE pay_periods 
      ALTER COLUMN organization_id SET NOT NULL,
      ALTER COLUMN organization_type SET NOT NULL
    `);

    await pool.query(`
      ALTER TABLE offsets 
      ALTER COLUMN organization_id SET NOT NULL,
      ALTER COLUMN organization_type SET NOT NULL
    `);

    await pool.query(`
      ALTER TABLE allowances 
      ALTER COLUMN organization_id SET NOT NULL,
      ALTER COLUMN organization_type SET NOT NULL
    `);

    await pool.query(`
      ALTER TABLE compliance_checks 
      ALTER COLUMN organization_id SET NOT NULL,
      ALTER COLUMN organization_type SET NOT NULL
    `);

    await pool.query(`
      ALTER TABLE evidence_packs 
      ALTER COLUMN organization_id SET NOT NULL,
      ALTER COLUMN organization_type SET NOT NULL
    `);

    // 11. Create indexes for better performance
    console.log('📊 Creating multi-tenancy indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_csv_uploads_organization ON csv_uploads(organization_id, organization_type);
      CREATE INDEX IF NOT EXISTS idx_workers_organization ON workers(organization_id, organization_type);
      CREATE INDEX IF NOT EXISTS idx_pay_periods_organization ON pay_periods(organization_id, organization_type);
      CREATE INDEX IF NOT EXISTS idx_offsets_organization ON offsets(organization_id, organization_type);
      CREATE INDEX IF NOT EXISTS idx_allowances_organization ON allowances(organization_id, organization_type);
      CREATE INDEX IF NOT EXISTS idx_compliance_checks_organization ON compliance_checks(organization_id, organization_type);
      CREATE INDEX IF NOT EXISTS idx_evidence_packs_organization ON evidence_packs(organization_id, organization_type);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organization_id, organization_type);
    `);

    // 12. Add foreign key constraints for organization_id
    console.log('🔗 Adding foreign key constraints...');
    
    // Note: We'll add these constraints after ensuring data integrity
    // For now, we'll add them as deferrable to avoid blocking operations
    
    await pool.query(`
      ALTER TABLE csv_uploads 
      ADD CONSTRAINT fk_csv_uploads_organization 
      FOREIGN KEY (organization_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
    `);

    await pool.query(`
      ALTER TABLE workers 
      ADD CONSTRAINT fk_workers_organization 
      FOREIGN KEY (organization_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
    `);

    await pool.query(`
      ALTER TABLE pay_periods 
      ADD CONSTRAINT fk_pay_periods_organization 
      FOREIGN KEY (organization_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
    `);

    await pool.query(`
      ALTER TABLE offsets 
      ADD CONSTRAINT fk_offsets_organization 
      FOREIGN KEY (organization_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
    `);

    await pool.query(`
      ALTER TABLE allowances 
      ADD CONSTRAINT fk_allowances_organization 
      FOREIGN KEY (organization_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
    `);

    await pool.query(`
      ALTER TABLE compliance_checks 
      ADD CONSTRAINT fk_compliance_checks_organization 
      FOREIGN KEY (organization_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
    `);

    await pool.query(`
      ALTER TABLE evidence_packs 
      ADD CONSTRAINT fk_evidence_packs_organization 
      FOREIGN KEY (organization_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
    `);

    await pool.query(`
      ALTER TABLE audit_logs 
      ADD CONSTRAINT fk_audit_logs_organization 
      FOREIGN KEY (organization_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
    `);

    console.log('✅ Multi-tenancy migration completed successfully!');
    
    // 13. Verify the migration
    console.log('🔍 Verifying migration...');
    
    const verificationQueries = [
      'SELECT COUNT(*) as count FROM csv_uploads WHERE organization_id IS NULL',
      'SELECT COUNT(*) as count FROM workers WHERE organization_id IS NULL',
      'SELECT COUNT(*) as count FROM pay_periods WHERE organization_id IS NULL',
      'SELECT COUNT(*) as count FROM compliance_checks WHERE organization_id IS NULL'
    ];

    for (const query of verificationQueries) {
      const result = await pool.query(query);
      const count = parseInt(result.rows[0].count);
      if (count > 0) {
        console.warn(`⚠️  Warning: ${count} records still have NULL organization_id`);
      } else {
        console.log(`✅ All records have organization_id set`);
      }
    }

  } catch (error) {
    console.error('❌ Multi-tenancy migration failed:', error);
    throw error;
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  runMultiTenancyMigration()
    .then(() => {
      console.log('🎉 Multi-tenancy migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Multi-tenancy migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMultiTenancyMigration };
