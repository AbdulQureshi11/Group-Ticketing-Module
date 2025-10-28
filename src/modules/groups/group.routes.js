import express from "express";
import { getGroups, getGroupById, createGroup, patchGroup, createAllocation } from "./group.controller.js";
import { authenticateToken, requireRoles, requireAgencyAccess, requireGroupCreationAccess } from "../../core/middleware/auth.js";

const router = express.Router();

// Apply authentication to all group routes
router.use(authenticateToken);

/**
 * GET /groups
 * List groups with filters (status, route, date, agency)
 * Accessible by authenticated users - filtered by agency for non-admins
 */
router.get("/", getGroups);

/**
 * POST /groups
 * Create new group (Admin | Manager if enabled per agency setting)
 * Body: { flight, route, totalSeats, salesWindow, departureDate }
 */
router.post("/", requireGroupCreationAccess, createGroup);

/**
 * GET /groups/:id
 * View group details
 * Accessible by authenticated users within their agency or admins
 */
router.get("/:id", requireAgencyAccess(), getGroupById);

/**
 * PATCH /groups/:id
 * Edit/publish/close/cancel group
 * Admin | Manager if enabled per agency setting
 * Body: { status?, flight?, route?, totalSeats?, salesWindow?, departureDate?, basePrice?, currency? }
 */
router.patch("/:id", requireGroupCreationAccess, requireAgencyAccess(), patchGroup);

/**
 * POST /groups/:id/allocations
 * Create seat reservations/allocations
 * Body: { seats: number, notes?: string }
 */
router.post("/:id/allocations", requireAgencyAccess(), createAllocation);

export default router;
