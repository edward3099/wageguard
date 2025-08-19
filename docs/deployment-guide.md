# WageGuard Deployment Guide

This guide covers deploying WageGuard to various hosting platforms.

## 🚀 Quick Deploy Options

### 1. Heroku (Recommended for beginners)

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-wageguard-app

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:essential-0

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
heroku config:set ANTHROPIC_API_KEY=your_api_key

# Deploy
git push heroku main

# Initialize database
heroku run npm run init-db
```

### 2. Railway

1. Connect your GitHub repository to Railway
2. Set environment variables in the Railway dashboard
3. Railway will automatically deploy from your main branch

### 3. Render

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Add PostgreSQL database
5. Configure environment variables

### 4. Vercel + PlanetScale

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add PlanetScale database
# Set DATABASE_URL in Vercel dashboard
```

## 🐳 Docker Deployment

### Local Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f wageguard

# Scale services
docker-compose up -d --scale wageguard=3
```

### Production Docker

```bash
# Build production image
docker build -t wageguard:latest .

# Run with environment file
docker run -d \
  --name wageguard \
  --env-file .env.production \
  -p 3001:3001 \
  wageguard:latest
```

## ☁️ AWS Deployment

### AWS ECS with Fargate

1. **Build and push to ECR**
```bash
# Create ECR repository
aws ecr create-repository --repository-name wageguard

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and tag
docker build -t wageguard .
docker tag wageguard:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/wageguard:latest

# Push
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/wageguard:latest
```

2. **Create ECS Task Definition**
```json
{
  "family": "wageguard",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "wageguard",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/wageguard:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:wageguard/database-url"
        }
      ]
    }
  ]
}
```

### AWS Lambda (Serverless)

1. **Install Serverless Framework**
```bash
npm install -g serverless
npm install serverless-http
```

2. **Create serverless.yml**
```yaml
service: wageguard

provider:
  name: aws
  runtime: nodejs18.x
  environment:
    NODE_ENV: production
    DATABASE_URL: ${env:DATABASE_URL}

functions:
  app:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
      - http:
          path: /
          method: ANY
          cors: true
```

3. **Create lambda.js**
```javascript
const serverless = require('serverless-http');
const app = require('./src/server.js');

module.exports.handler = serverless(app);
```

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/database

# Authentication
JWT_SECRET=your_secure_jwt_secret
SESSION_SECRET=your_session_secret

# AI Providers (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key

# Server
PORT=3001
NODE_ENV=production
```

### Optional Environment Variables

```bash
# Logging
LOG_LEVEL=info

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/tmp/uploads

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX=100
```

## 📊 Database Setup

### PostgreSQL Cloud Providers

#### Supabase
```bash
# Get connection string from Supabase dashboard
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

#### PlanetScale (MySQL alternative)
```bash
# Use PlanetScale connection string
DATABASE_URL=mysql://[username]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}
```

#### Railway PostgreSQL
```bash
# Railway provides DATABASE_URL automatically
# No additional configuration needed
```

### Database Migration

```bash
# Production database initialization
npm run init-db

# Run migrations
npm run migrate

# Verify setup
npm run test:db
```

## 🔐 Security Considerations

### Production Security Checklist

- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS/SSL certificates
- [ ] Set secure CORS origins
- [ ] Configure rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable database SSL connections
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Use least-privilege IAM roles

### SSL/HTTPS Setup

#### Let's Encrypt with Nginx
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Cloudflare SSL
1. Add domain to Cloudflare
2. Set SSL mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Configure origin certificates

## 📈 Monitoring & Logging

### Application Monitoring

```javascript
// Add to src/server.js
const { createPrometheusMetrics } = require('./utils/metrics');

// Prometheus metrics endpoint
app.get('/metrics', createPrometheusMetrics());
```

### Log Aggregation

#### Winston + CloudWatch
```bash
npm install winston winston-cloudwatch
```

```javascript
const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

const logger = winston.createLogger({
  transports: [
    new CloudWatchTransport({
      logGroupName: 'wageguard',
      logStreamName: 'app',
      awsRegion: 'us-east-1'
    })
  ]
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions (Included)

The included `.github/workflows/ci.yml` provides:
- Automated testing on push/PR
- Security scanning
- Docker image building
- Deployment to production

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: node:18
  services:
    - postgres:14
  script:
    - npm ci
    - npm test

build:
  stage: build
  image: docker:latest
  script:
    - docker build -t wageguard .
    - docker push $CI_REGISTRY_IMAGE

deploy:
  stage: deploy
  script:
    - echo "Deploy to production"
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check connection
psql $DATABASE_URL -c "SELECT version();"

# Reset connection pool
npm run db:reset
```

#### Memory Issues
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

#### File Upload Issues
```bash
# Check disk space
df -h

# Check permissions
ls -la uploads/
```

### Health Checks

```bash
# Application health
curl http://localhost:3001/health

# Database health
curl http://localhost:3001/api/v1/health/db

# AI services health
curl http://localhost:3001/api/v1/llm/health
```

### Performance Optimization

```bash
# Enable compression
npm install compression

# Add caching headers
npm install express-cache-controller

# Database query optimization
npm run analyze:queries
```

## 📞 Support

For deployment issues:
1. Check the [troubleshooting section](#troubleshooting)
2. Review application logs
3. Create an issue on GitHub
4. Contact support team

---

**Next Steps:** After deployment, configure monitoring, set up backups, and test the application thoroughly in the production environment.
