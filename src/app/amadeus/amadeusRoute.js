import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import {
    searchFlightsController,
    getAirlinesController,
    getAirportsController,
} from "./amadeusController.js";
import { importAmadeusFlight } from "./amadeusImportController.js";

const amadeusRouter = express.Router();

// Live flight search
amadeusRouter.get("/flights", verifyToken, searchFlightsController);

// Airline list
amadeusRouter.get("/airlines", verifyToken, getAirlinesController);

// Airport search
amadeusRouter.get("/airports", verifyToken, getAirportsController);

// Import flight group from Amadeus
amadeusRouter.post(
    "/import",
    verifyToken,
    requireRole(["ADMIN", "MANAGER"]),
    importAmadeusFlight
);

export default amadeusRouter;