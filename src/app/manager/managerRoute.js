import express from "express";
import {
  createManager,
  viewBookingRequests,
  manageBookingRequest,
  verifyPaymentProofs,
  listAgencyGroups,
  managerDashboard,
} from "./managerController.js";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";

const managerRouter = express.Router();

//ADMIN ROUTES


// Create a new Manager (Admin Only)
managerRouter.post("/", verifyToken, requireRole(["ADMIN"]), createManager);


//   MANAGER ROUTES

/**
 * Manager Dashboard
 */
managerRouter.get(
  "/dashboard",
  verifyToken,
  requireRole(["MANAGER"]),
  managerDashboard
);

/**
 * View Booking Requests (Manager's Agency)
 */
managerRouter.get(
  "/bookings",
  verifyToken,
  requireRole(["MANAGER"]),
  viewBookingRequests
);

/**
 * Approve or Reject a Booking
 */
managerRouter.post(
  "/bookings/:id/action",
  verifyToken,
  requireRole(["MANAGER"]),
  manageBookingRequest
);

/**
 * Verify Payment Proof
 */
managerRouter.post(
  "/payments/:id/verify",
  verifyToken,
  requireRole(["MANAGER"]),
  verifyPaymentProofs
);

/**
 * List All Flight Groups (Manager's Agency)
 */
managerRouter.get(
  "/groups",
  verifyToken,
  requireRole(["MANAGER"]),
  listAgencyGroups
);

export default managerRouter;
