import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/config/database.js';
import { User, Agency, FlightGroup, BookingRequest } from '../../src/database/index.js';
import bcrypt from 'bcryptjs';

describe('End-to-End Workflows', () => {
  let agencyToken;
  let adminToken;
  let testAgency;
  let testGroup;
  let testBooking;

  beforeAll(async () => {
    // Setup test data
    testAgency = await sequelize.models.Agency.create({
      code: 'E2E001',
      name: 'E2E Test Agency',
      contactEmail: 'e2e@example.com',
    });

    const agencyUser = await User.create({
      username: 'agencyuser',
      password: await bcrypt.hash('agencypass123', 10),
      email: 'agency@example.com',
      role: 'user',
      agencyId: testAgency.id,
    });

    const adminUser = await User.create({
      username: 'adminuser',
      password: await bcrypt.hash('adminpass123', 10),
      email: 'admin@example.com',
      role: 'admin',
      agencyId: testAgency.id,
    });

    // Login to get tokens
    const agencyLogin = await request(app)
      .post('/auth/login')
      .send({
        agencyCode: 'E2E001',
        username: 'agencyuser',
        password: 'agencypass123'
      });

    agencyToken = agencyLogin.body.data.accessToken;

    const adminLogin = await request(app)
      .post('/auth/login')
      .send({
        agencyCode: 'E2E001',
        username: 'adminuser',
        password: 'adminpass123'
      });

    adminToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await BookingRequest.destroy({ where: {} });
    await FlightGroup.destroy({ where: {} });
    await User.destroy({ where: {} });
    await sequelize.models.Agency.destroy({ where: {} });
  });

  it('should complete full booking workflow', async () => {
    // Step 1: Create a flight group (admin only)
    const groupData = {
      title: 'E2E Test Group',
      description: 'End-to-end test flight group',
      origin: 'NYC',
      destination: 'LAX',
      departureDate: '2024-12-15T10:00:00Z',
      returnDate: '2024-12-20T15:00:00Z',
      totalSeats: 50,
      basePrice: 600,
      currency: 'USD'
    };

    const groupResponse = await request(app)
      .post('/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(groupData)
      .expect(201);

    testGroup = groupResponse.body.data;

    // Step 2: Create booking request
    const bookingData = {
      flightGroupId: testGroup.id,
      paxCounts: { adt: 2, chd: 1, inf: 0 },
      remarks: 'E2E test booking',
      requestedHoldHours: 48
    };

    const bookingResponse = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${agencyToken}`)
      .send(bookingData)
      .expect(201);

    testBooking = bookingResponse.body.data;
    expect(testBooking.status).toBe('REQUESTED');

    // Step 3: Approve booking (admin)
    const approvalResponse = await request(app)
      .post(`/bookings/${testBooking.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approvedSeats: 3 })
      .expect(200);

    expect(approvalResponse.body.data.status).toBe('APPROVED');

    // Step 4: Mark as paid
    const paymentResponse = await request(app)
      .post(`/bookings/${testBooking.id}/mark-paid`)
      .set('Authorization', `Bearer ${agencyToken}`)
      .send({
        paymentProof: 'Test payment proof',
        paymentMethod: 'BANK_TRANSFER'
      })
      .expect(200);

    expect(paymentResponse.body.data.status).toBe('PAID');

    // Step 5: Issue tickets
    const issueResponse = await request(app)
      .post(`/bookings/${testBooking.id}/issue`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pnr: 'ABC123',
        ticketNumbers: ['1234567890', '1234567891', '1234567892']
      })
      .expect(200);

    expect(issueResponse.body.data.status).toBe('ISSUED');

    // Step 6: Verify final state
    const finalResponse = await request(app)
      .get(`/bookings/${testBooking.id}`)
      .set('Authorization', `Bearer ${agencyToken}`)
      .expect(200);

    expect(finalResponse.body.data.status).toBe('ISSUED');
    expect(finalResponse.body.data.pnr).toBe('ABC123');
  });

  it('should handle booking rejection workflow', async () => {
    // Create another booking
    const bookingData = {
      flightGroupId: testGroup.id,
      paxCounts: { adt: 1, chd: 0, inf: 0 },
      remarks: 'Test rejection booking',
      requestedHoldHours: 24
    };

    const bookingResponse = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${agencyToken}`)
      .send(bookingData)
      .expect(201);

    const booking = bookingResponse.body.data;

    // Reject booking
    const rejectResponse = await request(app)
      .post(`/bookings/${booking.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Test rejection reason' })
      .expect(200);

    expect(rejectResponse.body.data.status).toBe('REJECTED');
  });
});
