# PostgreSQL Setup Guide for WageGuard

## Prerequisites
- macOS (this guide is for macOS)
- Homebrew (recommended package manager)

## Installation Options

### Option 1: Homebrew (Recommended)
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
```

### Option 2: Official PostgreSQL Installer
1. Download from [postgresql.org](https://www.postgresql.org/download/macosx/)
2. Run the installer
3. Follow the setup wizard

### Option 3: Docker
```bash
# Pull PostgreSQL image
docker pull postgres:15

# Run PostgreSQL container
docker run --name wageguard-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=wageguard \
  -p 5432:5432 \
  -d postgres:15
```

## Initial Setup

### 1. Create Database and User
```bash
# Connect to PostgreSQL as superuser
psql postgres

# Create database
CREATE DATABASE wageguard;

# Create user (optional, you can use postgres user)
CREATE USER wageguard_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE wageguard TO wageguard_user;

# Exit psql
\q
```

### 2. Test Connection
```bash
# Test connection to wageguard database
psql -h localhost -U postgres -d wageguard

# You should see the psql prompt
wageguard=#
```

## Environment Configuration

### 1. Create .env File
Copy the example environment file and update with your settings:
```bash
cp env.example .env
```

### 2. Update .env File
```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=wageguard
DB_PASSWORD=your_password_here
DB_PORT=5432

# Other settings...
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
```

## Database Initialization

### 1. Run Database Setup
```bash
# Initialize database schema
npm run init-db

# Expected output:
# 🔄 Initializing WageGuard database...
# ✅ WageGuard database schema created successfully
# 🎉 WageGuard database initialization completed
```

### 2. Verify Tables Created
```bash
# Connect to database
psql -h localhost -U postgres -d wageguard

# List tables
\dt

# Check specific table structure
\d users
\d compliance_rules
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start if not running
brew services start postgresql@15

# Check port
lsof -i :5432
```

#### 2. Authentication Failed
```bash
# Check pg_hba.conf file
# Usually located at: /usr/local/var/postgresql@15/pg_hba.conf

# Ensure local connections are allowed:
# local   all             all                                     trust
# host    all             all             127.0.0.1/32            trust
# host    all             all             ::1/128                 trust
```

#### 3. Permission Denied
```bash
# Check user permissions
psql -h localhost -U postgres -d wageguard -c "\du"

# Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wageguard_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wageguard_user;
```

### Reset Database
```bash
# Drop and recreate database
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS wageguard;"
psql -h localhost -U postgres -c "CREATE DATABASE wageguard;"

# Reinitialize
npm run init-db
```

## Development Workflow

### 1. Start PostgreSQL
```bash
# Start service
brew services start postgresql@15

# Verify running
psql -h localhost -U postgres -c "SELECT version();"
```

### 2. Start Backend
```bash
# Start backend server
npm run dev

# Backend should connect to database successfully
```

### 3. Database Changes
```bash
# After schema changes, reinitialize
npm run init-db

# Or run specific SQL files
psql -h localhost -U postgres -d wageguard -f path/to/sql/file.sql
```

## Production Considerations

### 1. Security
- Use strong passwords
- Limit database access to application servers only
- Enable SSL connections
- Regular security updates

### 2. Performance
- Configure connection pooling
- Set appropriate memory settings
- Monitor query performance
- Create indexes for frequently queried fields

### 3. Backup
```bash
# Create backup
pg_dump -h localhost -U postgres wageguard > wageguard_backup.sql

# Restore backup
psql -h localhost -U postgres -d wageguard < wageguard_backup.sql
```

## Useful Commands

### Database Management
```bash
# List databases
psql -h localhost -U postgres -l

# List tables in current database
\dt

# Describe table structure
\d table_name

# Show table data
SELECT * FROM table_name LIMIT 5;

# Exit psql
\q
```

### Service Management
```bash
# Start PostgreSQL
brew services start postgresql@15

# Stop PostgreSQL
brew services stop postgresql@15

# Restart PostgreSQL
brew services restart postgresql@15

# Check status
brew services list | grep postgresql
```

## Next Steps

After successful PostgreSQL setup:
1. ✅ Database schema is ready
2. 🔄 Move to Task 18: CSV Data Ingestion and Parsing Service
3. 🔄 Move to Task 19: Core Rules Engine Implementation
4. 🔄 Test full backend functionality

## Support

If you encounter issues:
1. Check PostgreSQL logs: `tail -f /usr/local/var/log/postgresql@15.log`
2. Verify connection settings in `.env`
3. Ensure PostgreSQL service is running
4. Check firewall and network settings
