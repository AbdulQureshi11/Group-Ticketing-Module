import express from 'express';
import { PNRManagementController } from './pnrManagement.controller.js';
import { authenticateToken } from '../../core/middleware/auth.js';

const router = express.Router();

// Apply authentication to all PNR management routes
router.use(authenticateToken);

// Placeholder routes
router.get('/', (req, res) => {
  res.json({ message: 'PNR management endpoint' });
});

export default router;
