import express from 'express';
import { authenticateToken } from '../../core/middleware/auth.js';
import { 
  getFlightGroupPricing, 
  calculateBookingPricing, 
  checkSeatAvailability, 
  validateBookingRequest 
} from './pricing.controller.js';

const router = express.Router();

// Apply authentication to all pricing routes
router.use(authenticateToken);

/**
 * GET /pricing/flight-groups/:id
 * Get pricing breakdown for a flight group
 * Accessible by authenticated users
 */
router.get('/flight-groups/:id', getFlightGroupPricing);

/**
 * POST /pricing/calculate
 * Calculate pricing for a booking request
 * Accessible by authenticated users
 */
router.post('/calculate', calculateBookingPricing);

/**
 * POST /pricing/check-availability
 * Check seat availability for a booking request
 * Accessible by authenticated users
 */
router.post('/check-availability', checkSeatAvailability);

/**
 * POST /pricing/validate-booking
 * Validate a complete booking request (pricing + availability)
 * Accessible by authenticated users
 */
router.post('/validate-booking', validateBookingRequest);

export default router;
