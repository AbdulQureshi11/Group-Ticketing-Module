import request from 'supertest';
import app from '../../src/app.js';

describe('PNR Management API', () => {
  it('should return PNR management endpoint message', async () => {
    const response = await request(app)
      .get('/pnr')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'PNR management endpoint');
  });
});
