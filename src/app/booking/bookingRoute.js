import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import {
    createBooking,
    getBookings,
    getBookingById,
    approveBooking,
    rejectBooking,
    markAsPaid,
    issueBooking,
    cancelBooking,
    markPaymentPending,
} from "./bookingController.js";

import {
    validateSeatAvailability,
    validateStatusTransition,
} from "../../middlewares/validationGuards.js";

const bookingRouter = express.Router();

/**
 * Create Booking (Sub-Agent)
 */
bookingRouter.post(
    "/",
    verifyToken,
    requireRole(["SUB_AGENT"]),
    createBooking
);

/**
 * Get All Bookings
 */
bookingRouter.get(
    "/",
    verifyToken,
    requireRole(["ADMIN", "MANAGER", "SUB_AGENT"]),
    getBookings
);

/**
 * Get Single Booking by ID
 */
bookingRouter.get(
    "/:id",
    verifyToken,
    requireRole(["ADMIN", "MANAGER", "SUB_AGENT"]),
    getBookingById
);

/**
 *   Approve Booking (Manager/Admin)
 * - Adds hold_expires_at
 * - Valid seat and status checks
 */
bookingRouter.post(
    "/:id/approve",
    verifyToken,
    requireRole(["ADMIN", "MANAGER"]),
    validateSeatAvailability,
    validateStatusTransition,
    approveBooking
);

/**
 * Mark as Payment Pending (Manager/Admin)
 * - New FSM state per PRD
 */
bookingRouter.post(
    "/:id/payment-pending",
    verifyToken,
    requireRole(["ADMIN", "MANAGER"]),
    validateStatusTransition,
    markPaymentPending
);

/**
 * Reject Booking (Manager/Admin)
 */
bookingRouter.post(
    "/:id/reject",
    verifyToken,
    requireRole(["ADMIN", "MANAGER"]),
    rejectBooking
);

/**
 * Mark Booking as Paid (Manager/Admin)
 * - Valid status transition
 */
bookingRouter.post(
    "/:id/mark-paid",
    verifyToken,
    requireRole(["ADMIN", "MANAGER"]),
    validateStatusTransition,
    markAsPaid
);

/**
 *   Issue Booking (Admin/Manager)
 * - Checks valid status (must be PAID)
 * - Updates passengers & sets ISSUED
 */
bookingRouter.post(
    "/:id/issue",
    verifyToken,
    requireRole(["ADMIN", "MANAGER"]),
    validateStatusTransition,
    issueBooking
);

/**
 * Cancel Booking (Admin/Manager)
 */
bookingRouter.post(
    "/:id/cancel",
    verifyToken,
    requireRole(["ADMIN", "MANAGER"]),
    cancelBooking
);

export default bookingRouter;