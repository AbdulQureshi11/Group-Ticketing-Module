import jwt from "jsonwebtoken";

/**
 * Verify Token Middleware
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || "super_secret_key", (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: "Invalid or expired token.",
        });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("Token Verification Error:", error);
    res.status(500).json({ success: false, message: "Server error verifying token." });
  }
};


// Role-Based Access Control

export const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User information missing from token.",
        });
      }

      const userRole = req.user.role;

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${roles.join(", ")}`,
        });
      }

      next();
    } catch (error) {
      console.error("Role Verification Error:", error);
      res.status(500).json({
        success: false,
        message: "Server error validating role access.",
      });
    }
  };
};

/**
 * Optional Middleware for Debugging User Info
 * Logs current user details from JWT
 */
export const logUserInfo = (req, res, next) => {
  if (req.user) {
    console.log(`👤 User: ${req.user.username} | Role: ${req.user.role}`);
  }
  next();
};
