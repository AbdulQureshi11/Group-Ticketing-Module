import { test, describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/config/database.js';
import { User, Agency } from '../../src/database/index.js';
import bcrypt from 'bcryptjs';

describe('API Integration Tests', () => {
  let testAgency;
  let testUser;
  let authToken;

  before(async () => {
    // Setup test data
    testAgency = await sequelize.models.Agency.create({
      code: 'APITEST',
      name: 'API Test Agency',
      contactEmail: 'api@test.com',
    });

    testUser = await User.create({
      username: 'apitest',
      password: await bcrypt.hash('testpass123', 10),
      email: 'api@test.com',
      role: 'user',
      agencyId: testAgency.id,
    });
  });

  after(async () => {
    // Cleanup
    await User.destroy({ where: {} });
    await sequelize.models.Agency.destroy({ where: {} });
  });

  describe('Authentication Flow', () => {
    it('should complete login flow', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          agencyCode: 'APITEST',
          username: 'apitest',
          password: 'testpass123'
        })
        .expect(200);

      assert.strictEqual(response.body.success, true);
      assert(response.body.data.accessToken);
      assert(response.body.data.refreshToken);

      // Store token for other tests
      authToken = response.body.data.accessToken;
    });

    it('should access protected route with token', async () => {
      const response = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      assert.strictEqual(response.body.success, true);
      assert(Array.isArray(response.body.data));
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/groups')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      assert.strictEqual(response.body.success, false);
    });
  });

  describe('Health and Security', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      assert.strictEqual(response.body.ok, true);
    });

    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      assert.strictEqual(response.body.success, false);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow normal requests', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      assert.strictEqual(response.body.ok, true);
    });
  });
});
