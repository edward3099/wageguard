# WageGuard - UK National Minimum Wage Compliance Platform

![WageGuard Logo](https://img.shields.io/badge/WageGuard-NMW%2FNLW%20Compliance-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue?style=for-the-badge&logo=postgresql)

**WageGuard** is a comprehensive UK National Minimum/Living Wage (NMW/NLW) compliance platform that prevents underpaid wages **before payroll submission**. It combines a deterministic rules engine with AI-powered assistance to deliver audit-ready compliance reporting.

## 🎯 **Key Features**

### ✨ **Core Compliance Engine**
- **Deterministic rules engine** implementing UK NMW/NLW legislation
- **Pay-Reference Period (PRP)** calculations with complex deductions
- **RAG status assignment** (Red/Amber/Green) for immediate compliance visibility
- **Precise fix suggestions** with exact shortfall calculations
- **Real-time compliance checking** before payroll submission

### 🤖 **AI-Powered Assistant**
- **Secure LLM integration** with data masking and prompt injection prevention
- **Intelligent CSV mapping** with confidence scores for messy headers
- **Plain-English explanations** for compliance issues
- **Multi-provider support** (Anthropic Claude, OpenAI GPT, Google Gemini)

### 📊 **Professional Reporting**
- **Audit-ready PDF reports** with executive summaries and detailed analysis
- **Comprehensive CSV exports** for data analysis and processing
- **Evidence pack generation** suitable for HMRC submissions
- **Risk assessment** with actionable recommendations

### 🏢 **Multi-Tenant Architecture**
- **Employer accounts** for single organizations
- **Bureau support** for managing multiple clients
- **Complete data isolation** with organization-aware queries
- **Client management** with compliance summaries

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/wageguard.git
cd wageguard
npm install
cd frontend && npm install && cd ..
```

### 2. Database Setup
```bash
# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql

# Create database
createdb wageguard

# Initialize schema
npm run init-db
```

### 3. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit .env with your settings:
# - Database connection details
# - AI provider API keys (at least one required)
# - JWT secrets for authentication
```

### 4. Start Development Servers
```bash
# Backend (runs on http://localhost:3001)
npm run dev

# Frontend (runs on http://localhost:5173)
cd frontend && npm run dev
```

### 5. Test with Sample Data
```bash
# Run tests to verify setup
npm test

# Upload sample CSV files from sample-data/ directory
```

## 📋 **Usage Guide**

### For Employers
1. **Upload payroll CSV** with worker hours and pay data
2. **Review compliance results** in the interactive dashboard
3. **Get AI explanations** for any flagged issues
4. **Export evidence pack** for audit purposes
5. **Fix issues** before submitting payroll

### For Payroll Bureaus
1. **Create client accounts** for each organization
2. **Upload client payroll data** with proper isolation
3. **Generate client-specific reports** and evidence packs
4. **Manage compliance** across multiple clients
5. **Export consolidated** bureau-level reporting

## 🏗️ **Architecture**

### Backend Stack
- **Node.js + Express** - REST API server
- **PostgreSQL** - Primary database with multi-tenancy
- **JWT Authentication** - Secure user management
- **Comprehensive testing** - 100+ unit tests

### Frontend Stack
- **React 18** - Modern UI components
- **Redux Toolkit** - State management
- **TanStack Table** - Advanced data tables
- **Tailwind CSS** - Responsive styling
- **Vite** - Fast development build tool

### AI Integration
- **Multi-provider support** - Anthropic, OpenAI, Google
- **Data masking** - PII protection before LLM calls
- **Prompt injection prevention** - Input sanitization
- **Structured output validation** - Schema compliance

## 📁 **Project Structure**

```
wageguard/
├── src/                          # Backend source code
│   ├── controllers/              # API controllers
│   ├── services/                 # Business logic services
│   ├── routes/                   # Express routes
│   ├── config/                   # Configuration and setup
│   └── utils/                    # Utility functions
├── frontend/                     # React frontend application
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Page components
│   │   ├── store/                # Redux store
│   │   └── utils/                # Frontend utilities
│   └── public/                   # Static assets
├── tests/                        # Test suites
├── docs/                         # Documentation
├── sample-data/                  # Sample CSV files
└── .taskmaster/                  # Project management data
```

## 🧪 **Testing**

```bash
# Run all tests
npm test

# Run specific test suites
npm test tests/csv-upload.test.js
npm test tests/prp-calculation.test.js
npm test tests/evidence-pack.test.js

# Generate coverage report
npm run test:coverage
```

## 📈 **API Documentation**

### Core Endpoints
- `POST /api/v1/csv/upload` - Upload and process CSV files
- `GET /api/v1/prp/calculate/:uploadId` - Calculate compliance
- `POST /api/v1/evidence-pack/export` - Generate evidence packs
- `POST /api/v1/compliance/explain` - Get AI explanations

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile

### Multi-Tenancy (Bureaus)
- `POST /api/v1/clients` - Create client
- `GET /api/v1/clients` - List clients
- `GET /api/v1/clients/:id/compliance-summary` - Client compliance

See [API Documentation](docs/api-documentation.md) for complete details.

## 🔧 **Configuration**

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/wageguard

# AI Providers (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key

# Authentication
JWT_SECRET=your_secure_jwt_secret
SESSION_SECRET=your_session_secret

# Server
PORT=3001
NODE_ENV=development
```

### AI Model Configuration
```bash
# Configure AI models
npm run configure-models

# Set specific models
npm run set-model --main=claude-3-sonnet --research=gpt-4
```

## 🚀 **Deployment**

### Production Deployment
1. **Environment Setup**
   ```bash
   NODE_ENV=production
   DATABASE_URL=your_production_db_url
   ```

2. **Build Frontend**
   ```bash
   cd frontend && npm run build
   ```

3. **Database Migration**
   ```bash
   npm run init-db
   npm run migrate
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t wageguard-backend .
docker build -t wageguard-frontend ./frontend
```

### Cloud Deployment
- **Heroku** - See [Heroku deployment guide](docs/heroku-deployment.md)
- **AWS** - See [AWS deployment guide](docs/aws-deployment.md)
- **Railway/Render** - One-click deployment ready

## 📊 **Compliance Features**

### UK NMW/NLW Support
- ✅ **Current rates** (April 2024) with automatic updates
- ✅ **Age-based rates** (16-17, 18-20, 21-22, 23+, Apprentice)
- ✅ **Accommodation offsets** (£9.99 daily maximum)
- ✅ **Permitted deductions** handling
- ✅ **Working time calculations** per regulations
- ✅ **Holiday pay uplift** calculations
- ✅ **Tronc exclusions** for tip payments

### Evidence Pack Contents
- **Executive Summary** with risk assessment
- **Worker-by-worker analysis** with RAG status
- **Financial impact** calculations and shortfalls
- **AI-generated explanations** for issues
- **Regulatory references** with GOV.UK citations
- **Audit trail** for compliance verification

## 🛡️ **Security Features**

- **PII Data Masking** - Sensitive data never sent to AI providers
- **Prompt Injection Prevention** - Input validation and sanitization
- **JWT Authentication** - Secure user sessions
- **Data Isolation** - Multi-tenant security
- **Audit Logging** - Complete action trails
- **Input Validation** - Comprehensive data validation

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

- **Documentation** - See [docs/](docs/) directory
- **Issues** - Report bugs via GitHub Issues
- **Discussions** - Ask questions in GitHub Discussions
- **Email** - Contact: support@wageguard.dev (example)

## 🎯 **Roadmap**

- [ ] **Advanced Analytics** - Trend analysis and reporting
- [ ] **Mobile App** - Native iOS and Android applications
- [ ] **Integrations** - Direct payroll software integrations
- [ ] **Advanced AI** - Predictive compliance analytics
- [ ] **Bulk Processing** - Large dataset optimization
- [ ] **White-label** - Customizable branding options

## ⭐ **Show Your Support**

If this project helps you with NMW/NLW compliance, please consider giving it a star! ⭐

---

**Built with ❤️ for UK employers and payroll bureaus to ensure fair wages for all workers.**