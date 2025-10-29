import express from 'express';
import { authenticateToken, requireRoles } from '../../core/middleware/auth.js';
import { 
  getJobStats,
  processAutomatedTransitions,
  processExpiredHolds,
  queueNotification,
  queueAuditLog,
  cleanupOldJobs,
  getJobsHealth
} from './backgroundJobs.controller.js';

const router = express.Router();

// Apply authentication to all background jobs routes
router.use(authenticateToken);

/**
 * GET /jobs/stats
 * Get background job statistics
 * Accessible by Admin/Manager only
 */
router.get('/stats', requireRoles('Admin', 'Manager'), getJobStats);

/**
 * GET /jobs/health
 * Get background jobs system health
 * Accessible by Admin/Manager only
 */
router.get('/health', requireRoles('Admin', 'Manager'), getJobsHealth);

/**
 * POST /jobs/process-automated
 * Manually trigger automated transitions processing
 * Accessible by Admin only
 */
router.post('/process-automated', requireRoles('Admin'), processAutomatedTransitions);

/**
 * POST /jobs/process-expired-holds
 * Manually trigger expired holds processing
 * Accessible by Admin only
 */
router.post('/process-expired-holds', requireRoles('Admin'), processExpiredHolds);

/**
 * POST /jobs/send-notification
 * Queue a notification job
 * Accessible by Admin/Manager only
 */
router.post('/send-notification', requireRoles('Admin', 'Manager'), queueNotification);

/**
 * POST /jobs/log-audit
 * Queue an audit logging job
 * Accessible by Admin only
 */
router.post('/log-audit', requireRoles('Admin'), queueAuditLog);

/**
 * POST /jobs/cleanup
 * Clean up old jobs
 * Accessible by Admin only
 */
router.post('/cleanup', requireRoles('Admin'), cleanupOldJobs);

export default router;
