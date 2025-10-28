import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/config/database.js';
import { User, Agency, FlightGroup } from '../../src/database/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Groups API', () => {
  let testUser;
  let testAgency;
  let accessToken;

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
      role: 'admin',
      agencyId: testAgency.id,
    });

    // Generate access token
    accessToken = jwt.sign(
      {
        id: testUser.id,
        username: testUser.username,
        role: testUser.role,
        agencyId: testUser.agencyId,
        agencyCode: testAgency.code
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup
    await FlightGroup.destroy({ where: {} });
    await User.destroy({ where: {} });
    await sequelize.models.Agency.destroy({ where: {} });
  });

  describe('GET /groups', () => {
    it('should return groups list for authenticated user', async () => {
      const response = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/groups')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /groups', () => {
    it('should create new group with valid data', async () => {
      const groupData = {
        title: 'Test Group',
        description: 'Test flight group',
        origin: 'NYC',
        destination: 'LAX',
        departureDate: '2024-12-01T10:00:00Z',
        returnDate: '2024-12-10T15:00:00Z',
        totalSeats: 100,
        basePrice: 500,
        currency: 'USD'
      };

      const response = await request(app)
        .post('/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(groupData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(groupData.title);
    });

    it('should reject invalid data', async () => {
      const response = await request(app)
        .post('/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /groups/:id', () => {
    let testGroup;

    beforeAll(async () => {
      testGroup = await FlightGroup.create({
        title: 'Test Group Details',
        description: 'Test flight group for details',
        origin: 'NYC',
        destination: 'LAX',
        departureDate: new Date('2024-12-01T10:00:00Z'),
        returnDate: new Date('2024-12-10T15:00:00Z'),
        totalSeats: 100,
        basePrice: 500,
        currency: 'USD',
        status: 'DRAFT',
        agencyId: testAgency.id
      });
    });

    it('should return group details', async () => {
      const response = await request(app)
        .get(`/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.id).toBe(testGroup.id);
      expect(response.body.data.title).toBe(testGroup.title);
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app)
        .get('/groups/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PATCH /groups/:id', () => {
    let testGroup;

    beforeAll(async () => {
      testGroup = await FlightGroup.create({
        title: 'Test Group Update',
        description: 'Test flight group for update',
        origin: 'NYC',
        destination: 'LAX',
        departureDate: new Date('2024-12-01T10:00:00Z'),
        returnDate: new Date('2024-12-10T15:00:00Z'),
        totalSeats: 100,
        basePrice: 500,
        currency: 'USD',
        status: 'DRAFT',
        agencyId: testAgency.id
      });
    });

    it('should update group successfully', async () => {
      const updateData = {
        title: 'Updated Test Group',
        description: 'Updated description'
      };

      const response = await request(app)
        .patch(`/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.title).toBe(updateData.title);
    });
  });
});
