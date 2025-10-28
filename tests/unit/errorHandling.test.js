import request from 'supertest';
import app from '../../src/app.js';

describe('Error Handling', () => {
  describe('404 Not Found', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      const response = await request(app)
        .patch('/health')
        .expect(405);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Validation Errors', () => {
    it('should handle validation errors properly', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });
});
