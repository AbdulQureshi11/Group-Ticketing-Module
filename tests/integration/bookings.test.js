import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/config/database.js';
import { User, Agency, FlightGroup, BookingRequest } from '../../src/database/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Bookings API', () => {
  let testUser;
  let testAgency;
  let testGroup;
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
      role: 'user',
      agencyId: testAgency.id,
    });

    const departureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const returnDate = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000); // 40 days from now

    testGroup = await FlightGroup.create({
      title: 'Test Flight Group',
      description: 'Test flight group for bookings',
      origin: 'NYC',
      destination: 'LAX',
      departureDate,
      returnDate,
      totalSeats: 100,
      basePrice: 500,
      currency: 'USD',
      status: 'PUBLISHED',
      agencyId: testAgency.id
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
    await BookingRequest.destroy({ where: {} });
    await FlightGroup.destroy({ where: {} });
    await User.destroy({ where: {} });
    await sequelize.models.Agency.destroy({ where: {} });
  });

  describe('POST /bookings', () => {
    it('should create booking request with valid data', async () => {
      const bookingData = {
        flightGroupId: testGroup.id,
        paxCounts: { adt: 2, chd: 1, inf: 0 },
        remarks: 'Test booking',
        requestedHoldHours: 24
      };

      const response = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('REQUESTED');
    });

    it('should reject invalid flight group ID', async () => {
      const bookingData = {
        flightGroupId: 99999,
        paxCounts: { adt: 1, chd: 0, inf: 0 },
        remarks: 'Test booking'
      };

      const response = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /bookings', () => {
    it('should return bookings list for authenticated user', async () => {
      const response = await request(app)
        .get('/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter bookings by status', async () => {
      const response = await request(app)
        .get('/bookings?status=REQUESTED')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /bookings/:id', () => {
    let testBooking;

    beforeAll(async () => {
      testBooking = await BookingRequest.create({
        flightGroupId: testGroup.id,
        requestingAgencyId: testAgency.code,
        paxCounts: JSON.stringify({ adt: 2, chd: 1, inf: 0 }),
        totalPassengers: 3,
        status: 'REQUESTED',
        remarks: 'Test booking for details',
        requestedHoldHours: 24,
        holdExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    });

    it('should return booking details', async () => {
      const response = await request(app)
        .get(`/bookings/${testBooking.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.id).toBe(testBooking.id);
      expect(response.body.data.status).toBe(testBooking.status);
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .get('/bookings/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /bookings/:id/approve', () => {
    let testBooking;
    let adminToken;

    beforeAll(async () => {
      // Create admin user
      const adminUser = await User.create({
        username: 'adminuser',
        password: await bcrypt.hash('adminpass123', 10),
        email: 'admin@example.com',
        role: 'admin',
        agencyId: testAgency.id,
      });

      adminToken = jwt.sign(
        {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role,
          agencyId: adminUser.agencyId,
          agencyCode: testAgency.code
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      testBooking = await BookingRequest.create({
        flightGroupId: testGroup.id,
        requestingAgencyId: testAgency.code,
        paxCounts: JSON.stringify({ adt: 1, chd: 0, inf: 0 }),
        totalPassengers: 1,
        status: 'REQUESTED',
        remarks: 'Test booking for approval',
        requestedHoldHours: 24,
        holdExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    });

    it('should approve booking as admin', async () => {
      const response = await request(app)
        .post(`/bookings/${testBooking.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approvedSeats: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.status).toBe('APPROVED');
    });

    it('should reject approval by non-admin', async () => {
      const response = await request(app)
        .post(`/bookings/${testBooking.id}/approve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ approvedSeats: 1 })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /bookings/:id/reject', () => {
    let testBooking;
    let adminToken;

    beforeAll(async () => {
      // Create admin user if needed or reuse from previous test reliably
      let adminUser = await User.findOne({ where: { username: 'adminuser' } });
      if (!adminUser) {
        adminUser = await User.create({
          username: 'adminuser',
          password: await bcrypt.hash('adminpass123', 10),
          email: 'admin@example.com',
          role: 'admin',
          agencyId: testAgency.id,
        });
      }
      
      adminToken = jwt.sign(
        {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role,
          agencyId: adminUser.agencyId,
          agencyCode: testAgency.code
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      testBooking = await BookingRequest.create({
        flightGroupId: testGroup.id,
        requestingAgencyId: testAgency.code,
        paxCounts: JSON.stringify({ adt: 1, chd: 0, inf: 0 }),
        totalPassengers: 1,
        status: 'REQUESTED',
        remarks: 'Test booking for rejection',
        requestedHoldHours: 24,
        holdExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    });

    it('should reject booking as admin', async () => {
      const response = await request(app)
        .post(`/bookings/${testBooking.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test rejection' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.status).toBe('REJECTED');
    });
  });
});
