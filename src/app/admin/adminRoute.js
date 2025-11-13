import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import {
    getPendingRequests,
    approveSubAgent,
    rejectSubAgent,
    adminDashboard,
} from "./adminController.js";

const adminRouter = express.Router();

// Get all pending sub-agent requests
adminRouter.get("/subagent/requests", verifyToken, requireRole(["ADMIN"]), getPendingRequests);

// Approve sub-agent
adminRouter.post("/subagent/approve/:id", verifyToken, requireRole(["ADMIN"]), approveSubAgent);

// Reject sub-agent
adminRouter.post("/subagent/reject/:id", verifyToken, requireRole(["ADMIN"]), rejectSubAgent);

// Admin Dashboard (added at the end, sequence preserved)
adminRouter.get("/dashboard", verifyToken, requireRole(["ADMIN"]), adminDashboard);

export default adminRouter;