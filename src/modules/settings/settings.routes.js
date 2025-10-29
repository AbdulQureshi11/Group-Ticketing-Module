import express from 'express';
import { getAgencySettings, updateAgencySettings } from './settings.controller.js';
import { authenticateToken, requireRoles, requireAdminSettingsAccess } from '../../core/middleware/auth.js';
import { validateSettingsUpdate } from '../../core/middleware/validation.js';

const router = express.Router();

// Apply authentication to all settings routes
router.use(authenticateToken);
router.use(requireRoles('Admin', 'Manager'));

/**
 * GET /settings/agency
 * Fetch current agency settings
 * Accessible by authenticated users within their agency
 */
router.get('/agency', getAgencySettings);

/**
 * PATCH /settings/agency
 * Update agency settings (Admin for sensitive settings, Manager for others)
 * Accessible by admins/managers within their agency
 */
router.patch('/agency', requireAdminSettingsAccess, validateSettingsUpdate, updateAgencySettings);

export default router;
