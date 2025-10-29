import express from 'express';
import { addPassengers, updatePassenger } from './passenger.controller.js';
import { authenticateToken, requireAgencyAccess } from '../../core/middleware/auth.js';
import { validatePassengerAddition, validatePassengerUpdate } from '../../core/middleware/validation.js';

const router = express.Router();

// Apply authentication to all passenger routes
router.use(authenticateToken);

/**
 * POST /passengers/bookings/:id
 * Add passengers to a booking
 * Accessible by authenticated users within their agency
 * Booking ID is used for agency access control
 */
router.post('/bookings/:id', validatePassengerAddition, requireAgencyAccess('id', 'booking'), addPassengers);

/**
 * PATCH /passengers/:id
 * Update passenger details (PNR, ticket number, etc.)
 * Accessible by authenticated users within their agency
 * Agency access is checked via the associated booking
 */
router.patch('/:id', validatePassengerUpdate, requireAgencyAccess('id', 'passenger'), updatePassenger);

export default router;
