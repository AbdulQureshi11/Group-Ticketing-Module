import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/config/database.js';
import { User, Agency } from '../../src/database/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Background Jobs API', () => {
  let adminToken;

  beforeAll(async () => {
    // Create admin user
    const testAgency = await sequelize.models.Agency.create({
      code: 'JOB001',
      name: 'Jobs Test Agency',
      contactEmail: 'jobs@example.com',
    });

    const adminUser = await User.create({
      username: 'jobadmin',
      password: await bcrypt.hash('jobpass123', 10),
      email: 'jobadmin@example.com',
      role: 'admin',
      agencyId: testAgency.id,
    });

    // Generate admin token
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
  });

  afterAll(async () => {
    // Cleanup
    await User.destroy({ where: {} });
    await sequelize.models.Agency.destroy({ where: {} });
  });

  describe('GET /jobs/stats', () => {
    it('should return job statistics for admin', async () => {
      const response = await request(app)
        .get('/jobs/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('emailQueue');
      expect(response.body.data).toHaveProperty('notificationQueue');
    });

    it('should reject non-admin access', async () => {
      // Create regular user
      const testAgency = await sequelize.models.Agency.findOne({ where: { code: 'JOB001' } });
      const regularUser = await User.create({
        username: 'jobuser',
        password: await bcrypt.hash('userpass123', 10),
        email: 'jobuser@example.com',
        role: 'user',
        agencyId: testAgency.id,
      });

      const userToken = jwt.sign(
        {
          id: regularUser.id,
          username: regularUser.username,
          role: regularUser.role,
          agencyId: regularUser.agencyId,
          agencyCode: testAgency.code
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/jobs/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);

      // Cleanup
      await User.destroy({ where: { username: 'jobuser' } });
    });
  });

  describe('POST /jobs/email/send', () => {
    it('should queue email job', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test email content</p>'
      };

      const response = await request(app)
        .post('/jobs/email/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('jobId');
    });

    it('should reject invalid email data', async () => {
      const response = await request(app)
        .post('/jobs/email/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /jobs/notification/send', () => {
    it('should queue notification job', async () => {
      const notificationData = {
        userId: 1,
        type: 'BOOKING_UPDATE',
        title: 'Booking Updated',
        message: 'Your booking has been updated successfully'
      };

      const response = await request(app)
        .post('/jobs/notification/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('jobId');
    });
  });
});
