import request from 'supertest';
import express from 'express';

// Create a minimal app for testing
const app = express();
app.get('/health', (req, res) => res.json({ ok: true }));

describe('Health Check API', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('ok', true);
  });
});
