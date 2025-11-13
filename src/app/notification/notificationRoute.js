// src/app/notification/notificationRoute.js
import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from "./notificationController.js";

const notificationRouter = express.Router();

// List notifications
notificationRouter.get(
    "/",
    verifyToken,
    requireRole(["ADMIN", "MANAGER", "SUB_AGENT"]),
    getNotifications
);

// Mark single notification as read
notificationRouter.patch(
    "/:id/read",
    verifyToken,
    requireRole(["ADMIN", "MANAGER", "SUB_AGENT"]),
    markNotificationRead
);

// Mark all as read
notificationRouter.patch(
    "/read-all",
    verifyToken,
    requireRole(["ADMIN", "MANAGER", "SUB_AGENT"]),
    markAllNotificationsRead
);

export default notificationRouter;
