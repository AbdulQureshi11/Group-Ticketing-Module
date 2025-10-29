import express from 'express';
import { createBooking } from './booking.controller.js';
import { getBookings, getBookingById } from './booking.query.controller.js';
import { approveBooking, rejectBooking, uploadPaymentProof, markBookingPaid, issueBooking, cancelBooking } from './booking.status.controller.js';
import { authenticateToken, requireRoles, requireAgencyAccess } from '../../core/middleware/auth.js';
import { validateBookingCreation } from '../../core/middleware/validation.js';

const router = express.Router();

// Apply authentication to all booking routes
router.use(authenticateToken);

/**
 * POST /bookings
 * Create new booking
 * Accessible by authenticated users within their agency
 */
router.post('/', validateBookingCreation, createBooking);

/**
 * GET /bookings
 * List bookings with filters
 * Accessible by authenticated users - filtered by agency for non-admins
 */
router.get('/', getBookings);

/**
 * GET /bookings/:id
 * Get booking details
 * Accessible by authenticated users within their agency or admins
 */
router.get('/:id', requireAgencyAccess('id', 'booking'), getBookingById);

/**
 * POST /bookings/:id/approve
 * Approve booking (Admin/Manager only)
 * Accessible by admins/managers within their agency
 */
router.post('/:id/approve', requireRoles('Admin', 'Manager'), requireAgencyAccess('id', 'booking'), approveBooking);

/**
 * POST /bookings/:id/reject
 * Reject booking (Admin/Manager only)
 * Accessible by admins/managers within their agency
 */
router.post('/:id/reject', requireRoles('Admin', 'Manager'), requireAgencyAccess('id', 'booking'), rejectBooking);

/**
 * POST /bookings/:id/payment-proof
 * Upload payment proof
 * Accessible by authenticated users within their agency
 */
router.post('/:id/payment-proof', requireAgencyAccess('id', 'booking'), uploadPaymentProof);

/**
 * POST /bookings/:id/mark-paid
 * Mark booking as paid (Admin/Manager only)
 * Accessible by admins/managers within their agency
 */
router.post('/:id/mark-paid', requireRoles('Admin', 'Manager'), requireAgencyAccess('id', 'booking'), markBookingPaid);

/**
 * POST /bookings/:id/issue
 * Issue tickets (Admin/Manager only)
 * Accessible by admins/managers within their agency
 */
router.post('/:id/issue', requireRoles('Admin', 'Manager'), requireAgencyAccess('id', 'booking'), issueBooking);

/**
 * POST /bookings/:id/cancel
 * Cancel booking
 * Accessible by authenticated users within their agency
 */
router.post('/:id/cancel', requireAgencyAccess('id', 'booking'), cancelBooking);

export default router;
