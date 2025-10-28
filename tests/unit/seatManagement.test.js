import request from 'supertest';
import app from '../../src/app.js';

describe('Seat Management API', () => {
  it('should return seat management endpoint message', async () => {
    const response = await request(app)
      .get('/seat-management')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Seat management endpoint');
  });
});
