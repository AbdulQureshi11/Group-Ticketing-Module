import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import {
    registerSubAgent,
    getAllSubAgentRequests,
} from "./agentController.js";

const agentRouter = express.Router();

/**
 * Public — Submit Sub-Agent registration form
 * Endpoint: POST /api/agent/register
 */
agentRouter.post("/register", registerSubAgent);

/**
 * Admin — View all Sub-Agent registration requests
 * Endpoint: GET /api/agent/requests?status=PENDING
 */
agentRouter.get(
    "/requests",
    verifyToken,
    requireRole(["ADMIN"]),
    getAllSubAgentRequests
);

export default agentRouter;