import request from 'supertest';
import app from '../../src/app.js';

describe('Seat Management API', () => {
  describe('Seat Availability', () => {
    it('should require authentication for seat availability', async () => {
      const response = await request(app)
        .get('/seat-management/availability/123')
        .expect(401);
    });
  });

  describe('Hold Seats', () => {
    it('should require authentication for holding seats', async () => {
      const response = await request(app)
        .post('/seat-management/hold')
        .send({
          flightGroupId: 123,
          passengers: { adults: 1, children: 0, infants: 0 }
        })
        .expect(401);
    });
  });

  describe('Release Seats', () => {
    it('should require authentication for releasing seats', async () => {
      const response = await request(app)
        .post('/seat-management/release')
        .send({
          flightGroupId: 123,
          passengers: { adults: 1, children: 0, infants: 0 }
        })
        .expect(401);
    });
  });

  describe('Issue Seats', () => {
    it('should require authentication for issuing seats', async () => {
      const response = await request(app)
        .post('/seat-management/issue')
        .send({
          flightGroupId: 123,
          passengers: { adults: 1, children: 0, infants: 0 }
        })
        .expect(401);
    });
  });
});
