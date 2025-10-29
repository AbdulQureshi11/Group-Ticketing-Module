import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/config/database.js';

describe('Health Check API', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('ok', true);
  });
});

describe('Security Headers', () => {
  it('should include security headers', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('0');
  });
});

describe('Rate Limiting', () => {
  it('should allow requests within rate limit', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('ok', true);
  });

  it('should block requests exceeding rate limit', async () => {
    // Make requests up to the limit
    const limit = 10; // Adjust based on test config
    const requests = [];
    for (let i = 0; i <= limit; i++) {
      requests.push(request(app).get('/health'));
    }
    
    const responses = await Promise.all(requests);
    const blockedResponse = responses.find(r => r.status === 429);
    
    expect(blockedResponse).toBeDefined();
    expect(blockedResponse.body).toHaveProperty('success', false);
    expect(blockedResponse.body.message).toContain('Too many requests');
  });
});
