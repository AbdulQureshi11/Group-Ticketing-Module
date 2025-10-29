import express from 'express';
import { SeatManagementController } from './seatManagement.controller.js';
import { authenticateToken, requireRoles } from '../../core/middleware/auth.js';

const router = express.Router();

// Apply authentication to all seat management routes
router.use(authenticateToken);

/**
 * GET /seat-management/availability/:groupId
 * Get real-time seat availability for a flight group
 */
router.get('/availability/:groupId', SeatManagementController.getSeatAvailability);

/**
 * GET /seat-management/utilization/:groupId
 * Get seat utilization statistics for a flight group
 */
router.get('/utilization/:groupId', SeatManagementController.getSeatUtilization);

/**
 * POST /seat-management/hold
 * Hold seats for a flight group (manual operation)
 */
router.post('/hold', SeatManagementController.holdSeats);

/**
 * POST /seat-management/release
 * Release held seats for a flight group (manual operation)
 */
router.post('/release', SeatManagementController.releaseSeats);

/**
 * POST /seat-management/issue
 * Issue seats for a flight group (convert held to issued)
 */
router.post('/issue', SeatManagementController.issueSeats);

/**
 * POST /seat-management/allocate
 * Allocate seats to an agency for a flight group (complex allocation logic)
 */
router.post('/allocate', SeatManagementController.allocateSeats);

/**
 * POST /seat-management/process-expired
 * Process expired seat holds (admin only)
 */
router.post('/process-expired', requireRoles('ADMIN'), SeatManagementController.processExpiredHolds);

export default router;
