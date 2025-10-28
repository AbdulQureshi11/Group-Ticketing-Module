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
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
  });
});

describe('Rate Limiting', () => {
  it('should allow requests within rate limit', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('ok', true);
  });
});
