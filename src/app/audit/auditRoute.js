import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import { logAction, getAuditLogs } from "./auditController.js";

const auditRouter = express.Router();

// Manual log (any user)
auditRouter.post("/", verifyToken, logAction);

// Admin can fetch all audit logs
auditRouter.get("/", verifyToken, requireRole(["ADMIN"]), getAuditLogs);

export default auditRouter;
