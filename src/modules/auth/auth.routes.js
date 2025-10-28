import express from "express";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import { login, refresh, logout } from "./auth.controller.js";

const router = express.Router();

// Rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: {
    success: false,
    message: "Too many login attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation for login
const loginValidation = [
  body("agencyCode")
    .trim()
    .notEmpty()
    .withMessage("Agency code is required")
    .isLength({ min: 3, max: 10 })
    .withMessage("Agency code must be between 3 and 10 characters")
    .matches(/^[A-Z0-9]+$/)
    .withMessage("Agency code must contain only uppercase letters and numbers"),
  
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  next();
};

// Apply rate limiting and validation to login route
router.post("/login", 
  loginLimiter,
  loginValidation,
  handleValidationErrors,
  login
);

router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
