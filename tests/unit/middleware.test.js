import request from 'supertest';
import app from '../../src/app.js';

describe('Middleware', () => {
  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Helmet Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      // X-XSS-Protection set to '0' for legacy browser support
      expect(response.headers['x-xss-protection']).toBe('0');
    });
  });
});
