import express from 'express';
import {
  validatePNR,
  generatePNR,
  searchByPNR,
  getBookingPNRInfo,
  assignPNRToBooking
} from './pnrManagement.controller.js';
import { authenticateToken, requireRoles } from '../../core/middleware/auth.js';

const router = express.Router();

// Apply authentication to all PNR management routes
router.use(authenticateToken);

/**
 * GET /pnr/validate/:pnr
 * Validate PNR format
 */
router.get('/validate/:pnr', validatePNR);

/**
 * POST /pnr/generate
 * Generate a new unique PNR (Admin/Manager only)
 */
router.post('/generate', requireRoles('ADMIN', 'MANAGER'), generatePNR);

/**
 * GET /pnr/search/:pnr
 * Search bookings by PNR
 */
router.get('/search/:pnr', searchByPNR);

/**
 * GET /pnr/booking/:bookingId
 * Get PNR information for a specific booking
 */
router.get('/booking/:bookingId', getBookingPNRInfo);

/**
 * POST /pnr/assign/:bookingId
 * Assign PNR to a booking (Admin/Manager only - used in booking workflow)
 */
router.post('/assign/:bookingId', requireRoles('ADMIN', 'MANAGER'), assignPNRToBooking);

export default router;
