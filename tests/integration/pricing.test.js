import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/config/database.js';
import { User, Agency, FlightGroup } from '../../src/database/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Pricing API', () => {
  let testUser;
  let testAgency;
  let testGroup;
  let accessToken;

  beforeAll(async () => {
    // Create test data
    testAgency = await sequelize.models.Agency.create({
      code: 'PRICE001',
      name: 'Pricing Test Agency',
      contactEmail: 'pricing@example.com',
    });

    testUser = await User.create({
      username: 'priceuser',
      password: await bcrypt.hash('pricepass123', 10),
      email: 'price@example.com',
      role: 'user',
      agencyId: testAgency.id,
    });

    const departureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const returnDate = new Date(Date.now() + 39 * 24 * 60 * 60 * 1000);

    testGroup = await FlightGroup.create({
      title: 'Pricing Test Group',
      description: 'Test flight group for pricing',
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
    await FlightGroup.destroy({ where: { id: testGroup.id } });
    await User.destroy({ where: { id: testUser.id } });
    await sequelize.models.Agency.destroy({ where: { id: testAgency.id } });
  });

  describe('GET /pricing/flight-groups/:id', () => {
    it('should return pricing breakdown for flight group', async () => {
      const response = await request(app)
        .get(`/pricing/flight-groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('flightGroupId', testGroup.id);
      expect(response.body.data).toHaveProperty('basePrice');
      expect(response.body.data).toHaveProperty('currency');
      expect(response.body.data).toHaveProperty('pricing');
    });

    it('should return 404 for non-existent flight group', async () => {
      const response = await request(app)
        .get('/pricing/flight-groups/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get(`/pricing/flight-groups/${testGroup.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /pricing/calculate', () => {
    it('should calculate pricing for passenger breakdown', async () => {
      const calculationData = {
        flightGroupId: testGroup.id,
        paxCounts: { adt: 2, chd: 1, inf: 0 },
        passengerDetails: [
          { type: 'adt', age: 30 },
          { type: 'adt', age: 35 },
          { type: 'chd', age: 10 }
        ]
      };

      const response = await request(app)
        .post('/pricing/calculate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(calculationData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalPrice');
      expect(response.body.data).toHaveProperty('breakdown');
      expect(Array.isArray(response.body.data.breakdown)).toBe(true);
    });

    it('should reject invalid passenger counts', async () => {
      const calculationData = {
        flightGroupId: testGroup.id,
        paxCounts: { adt: -1, chd: 0, inf: 0 },
        passengerDetails: []
      };

      const response = await request(app)
        .post('/pricing/calculate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(calculationData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
