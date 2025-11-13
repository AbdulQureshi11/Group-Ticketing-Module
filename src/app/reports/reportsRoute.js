import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import {
    reportGroups,
    reportBookings,
    reportSales,
} from "./reportsController.js";

const reportsRouter = express.Router();

// Only Admin & Manager can access reports
reportsRouter.get("/groups", verifyToken, requireRole(["ADMIN", "MANAGER"]), reportGroups);
reportsRouter.get("/bookings", verifyToken, requireRole(["ADMIN", "MANAGER"]), reportBookings);
reportsRouter.get("/sales", verifyToken, requireRole(["ADMIN", "MANAGER"]), reportSales);

export default reportsRouter;
