// src/app/passenger/passengerRoute.js
import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import {
    addPassengers,
    updatePassenger,
    listPassengers,
} from "./passengerController.js";

const passengerRouter = express.Router();

/**
 * Add passengers to booking
 * POST /api/passengers/:id
 */
passengerRouter.post(
    "/:id",
    verifyToken,
    requireRole(["SUB_AGENT"]),
    addPassengers
);

/**
 * Update passenger info (PNR / ticket / name)
 * PATCH /api/passengers/:id
 */
passengerRouter.patch(
    "/:id",
    verifyToken,
    requireRole(["MANAGER", "ADMIN"]),
    updatePassenger
);

/**
 * List passengers for booking
 * GET /api/passengers/:id
 */
passengerRouter.get(
    "/:id",
    verifyToken,
    requireRole(["ADMIN", "MANAGER", "SUB_AGENT"]),
    listPassengers
);

export default passengerRouter;
