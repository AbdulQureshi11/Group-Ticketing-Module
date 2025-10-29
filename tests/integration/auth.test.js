import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/config/database.js';
import { User, RefreshToken } from '../../src/database/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Authentication API', () => {
  let testUser;
  let testAgency;

  beforeAll(async () => {
    // Create test data
    testAgency = await sequelize.models.Agency.create({
      code: 'TEST001',
      name: 'Test Agency',
      contactEmail: 'test@example.com',
    });

    testUser = await User.create({
      username: 'testuser',
      password: await bcrypt.hash('testpass123', 10),
      email: 'test@example.com',
      role: 'user',
      agencyId: testAgency.id,
    });
  });

  afterAll(async () => {
    // Cleanup
    await User.destroy({ where: {} });
    await sequelize.models.Agency.destroy({ where: {} });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          agencyCode: 'TEST001',
          username: 'testuser',
          password: 'testpass123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          agencyCode: 'TEST001',
          username: 'testuser',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken;

    beforeAll(async () => {
      // Get a valid refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          agencyCode: 'TEST001',
          username: 'testuser',
          password: 'testpass123'
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid_token' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken;
    let refreshToken;

    beforeAll(async () => {
      // Get valid tokens
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          agencyCode: 'TEST001',
          username: 'testuser',
          password: 'testpass123'
        });

      accessToken = loginResponse.body.data.accessToken;
      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });
  });
});
