import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import { createAgency, getAgencyById } from "./agencyController.js";

const agencyRouter = express.Router();

agencyRouter.post("/", verifyToken, requireRole(["ADMIN"]), createAgency);
agencyRouter.get("/:id", verifyToken, requireRole(["ADMIN"]), getAgencyById);

export default agencyRouter;
