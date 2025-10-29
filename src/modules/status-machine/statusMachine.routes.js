import express from 'express';
import { authenticateToken, requireRoles, requireAgencyAccess } from '../../core/middleware/auth.js';
import { 
  transitionBookingStatus, 
  processAutomatedTransitions, 
  getBookingStatusHistory, 
  getAvailableTransitions,
  getStatusRules 
} from './statusMachine.controller.js';

const router = express.Router();

// Apply authentication to all status machine routes
router.use(authenticateToken);

/**
 * POST /status-machine/transition/:bookingId
 * Transition booking status with business rules
 * Accessible by Admin only
 */
router.post('/transition/:bookingId', requireRoles('Admin'), transitionBookingStatus);

/**
 * POST /status-machine/process-automated
 * Process automated status transitions (background job)
 * Accessible by Admin only
 */
router.post('/process-automated', requireRoles('Admin'), processAutomatedTransitions);

/**
 * GET /status-machine/history/:bookingId
 * Get status transition history for a booking
 * Accessible by authenticated users
 */
router.get('/history/:bookingId', requireAgencyAccess('bookingId', 'booking'), getBookingStatusHistory);

/**
 * GET /status-machine/transitions/:status
 * Get available transitions for a status
 * Accessible by authenticated users
 */
router.get('/transitions/:status', getAvailableTransitions);

/**
 * GET /status-machine/rules
 * Get all status transition rules
 * Accessible by authenticated users
 */
router.get('/rules', getStatusRules);

export default router;
