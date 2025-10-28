import express from 'express';
import { SeatManagementController } from './seatManagement.controller.js';
import { authenticateToken } from '../../core/middleware/auth.js';

const router = express.Router();

// Apply authentication to all seat management routes
router.use(authenticateToken);

// Placeholder routes
router.get('/', (req, res) => {
  res.json({ message: 'Seat management endpoint' });
});

export default router;
