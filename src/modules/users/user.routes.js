import express from 'express';
import { createUser, updateUser } from './user.controller.js';
import { authenticateToken, requireRoles } from '../../core/middleware/auth.js';

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticateToken);

/**
 * POST /users
 * Create new user within agency (Admin within agency only)
 * Body: { username, email, password, name, role? }
 */
router.post('/', requireRoles('Admin'), createUser);

/**
 * PATCH /users/:id
 * Update user (activate/deactivate, role update)
 * Admin within agency can update users in their agency
 * Body: { isActive?, role? }
 */
router.patch('/:id', requireRoles('Admin'), updateUser);

export default router;
