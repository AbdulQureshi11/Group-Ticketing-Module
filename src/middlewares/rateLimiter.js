import rateLimit from "express-rate-limit";

/**
 * General limiter for /api/auth/*
 * e.g. max 200 req / 10 minutes per IP
 */
export const authRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests, please try again later.",
    },
});

/**
 * Strict limiter for /api/auth/login
 * e.g. 10 attempts / 10 minutes per IP
 */
export const strictLoginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts, please try again later.",
    },
    skipSuccessfulRequests: true, // successful logins don't count toward limit
});
