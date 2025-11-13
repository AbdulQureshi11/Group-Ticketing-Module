import express from "express";
import { login, refreshToken, logout } from "./authController.js";
import { authRateLimiter, strictLoginLimiter } from "../../middlewares/rateLimiter.js";

const router = express.Router();

// Global limiter for /auth
router.use(authRateLimiter);

// Login (strict limiter)
router.post("/login", strictLoginLimiter, login);

// Refresh access token
router.post("/refresh", refreshToken);

// Logout
router.post("/logout", logout);

export default router;
