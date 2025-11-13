import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import { getAgencySettings, updateAgencySettings } from "./settingsController.js";

const settingsRouter = express.Router();

// Get current agency settings
settingsRouter.get("/agency", verifyToken, requireRole(["ADMIN", "MANAGER"]), getAgencySettings);

// Update agency settings
settingsRouter.patch("/agency", verifyToken, requireRole(["ADMIN", "MANAGER"]), updateAgencySettings);

export default settingsRouter;