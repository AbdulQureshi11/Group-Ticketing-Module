import request from 'supertest';
import app from '../../src/app.js';
import * as pnrService from '../../src/modules/pnr-management/pnrManagement.service.js';

// Mock the auth middleware
jest.mock('../../src/core/middleware/auth.js', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, role: 'ADMIN', agencyId: 'agency1' };
    next();
  },
  requireRoles: (...roles) => (req, res, next) => next()
}));

describe('PNR Management API', () => {
  describe('PNR Validation', () => {
    it('should validate a valid PNR format', async () => {
      const mockValidate = jest.spyOn(pnrService, 'validatePNR').mockResolvedValue({ isValid: true, format: 'valid' });

      const response = await request(app)
        .get('/pnr/validate/ABC123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(mockValidate).toHaveBeenCalledWith('ABC123');
      mockValidate.mockRestore();
    });

    it('should reject invalid PNR format', async () => {
      const mockValidate = jest.spyOn(pnrService, 'validatePNR').mockResolvedValue({ isValid: false, error: 'Invalid format' });

      const response = await request(app)
        .get('/pnr/validate/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(mockValidate).toHaveBeenCalledWith('invalid');
      mockValidate.mockRestore();
    });

    it('should return 400 for missing PNR parameter', async () => {
      const response = await request(app)
        .get('/pnr/validate/')
        .expect(404); // Route not found for empty param
    });
  });

  describe('PNR Generation', () => {
    it('should generate a new PNR', async () => {
      const mockGenerate = jest.spyOn(pnrService, 'generateUniquePNR').mockResolvedValue('XYZ789');

      const response = await request(app)
        .post('/pnr/generate')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data.pnr', 'XYZ789');
      expect(mockGenerate).toHaveBeenCalled();
      mockGenerate.mockRestore();
    });
  });

  describe('PNR Search', () => {
    it('should search bookings by PNR', async () => {
      const mockSearch = jest.spyOn(pnrService, 'searchBookingsByPNR').mockResolvedValue([]);

      const response = await request(app)
        .get('/pnr/search/ABC123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockSearch).toHaveBeenCalledWith('ABC123');
      mockSearch.mockRestore();
    });
  });
});
