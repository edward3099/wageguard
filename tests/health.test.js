const request = require('supertest');
const app = require('../src/server');

describe('Health Check Endpoint', () => {
  test('GET /health should return 200 and health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('service', 'WageGuard Backend');
    expect(response.body).toHaveProperty('version', '1.0.0');
  });
});

describe('Root Endpoint', () => {
  test('GET / should return API information', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.body).toHaveProperty('message', 'WageGuard Backend API');
    expect(response.body).toHaveProperty('version', '1.0.0');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body.endpoints).toHaveProperty('health', '/health');
  });
});

describe('404 Handler', () => {
  test('GET /nonexistent should return 404', async () => {
    const response = await request(app)
      .get('/nonexistent')
      .expect(404);
    
    expect(response.body).toHaveProperty('error', 'Endpoint not found');
    expect(response.body).toHaveProperty('path', '/nonexistent');
  });
});
