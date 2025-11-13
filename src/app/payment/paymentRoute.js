// src/app/payment/paymentRoute.js
import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import { uploadPaymentProof, verifyPaymentProof } from "./paymentController.js";

const paymentRouter = express.Router();

/**
 * Sub-Agent uploads payment proof
 * Endpoint: POST /api/payments/:id/payment-proof
 */
paymentRouter.post(
    "/:id/payment-proof",
    verifyToken,
    requireRole(["SUB_AGENT"]),
    ...uploadPaymentProof
);

/**
 * Manager/Admin verifies uploaded proof
 * Endpoint: POST /api/payments/:id/verify-proof
 */
paymentRouter.post(
    "/:id/verify-proof",
    verifyToken,
    requireRole(["MANAGER", "ADMIN"]),
    verifyPaymentProof
);

export default paymentRouter;
