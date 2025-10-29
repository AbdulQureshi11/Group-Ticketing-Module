import express from 'express';
import { getAgency, createAgency } from './agency.controller.js';
import { authenticateToken, requireRoles, requireAgencyAccess } from '../../core/middleware/auth.js';
import { validateAgencyCreation } from '../../core/middleware/validation.js';

const router = express.Router();

// Apply authentication to all agency routes
router.use(authenticateToken);

/**
 * GET /agencies/:id
 * Get agency details by ID
 * Accessible by authenticated users within their agency or admins
 */
router.get('/:id', requireAgencyAccess('id'), getAgency);

/**
 * POST /agencies
 * Create new agency (Admin only)
 * Body: { code, name, contactEmail, contactPhone? }
 */
router.post('/', requireRoles('Admin'), validateAgencyCreation, createAgency);

export default router;
