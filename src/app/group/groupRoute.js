import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import {
    createGroup,
    getGroups,
    getGroupById,
    updateGroupStatus,
} from "./groupController.js";

const groupRouter = express.Router();

/**
 * Create group (Admin / Manager)
 * Manager allowed only if AgencySettings.allow_manager_group_create = true
 */
groupRouter.post(
    "/",
    verifyToken,
    requireRole(["ADMIN", "MANAGER"]),
    createGroup
);

/**
 * Get all groups
 */
groupRouter.get(
    "/",
    verifyToken,
    requireRole(["ADMIN", "MANAGER", "SUB_AGENT"]),
    getGroups
);

/**
 * Get single group
 */
groupRouter.get(
    "/:id",
    verifyToken,
    requireRole(["ADMIN", "MANAGER", "SUB_AGENT"]),
    getGroupById
);

/**
 * Publish / Close / Cancel
 */
groupRouter.patch(
    "/:id",
    verifyToken,
    requireRole(["ADMIN", "MANAGER"]),
    updateGroupStatus
);

export default groupRouter;