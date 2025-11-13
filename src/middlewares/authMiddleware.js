import jwt from "jsonwebtoken";

/**
 * Verify Access Token
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });

    jwt.verify(token, process.env.JWT_SECRET || "super_secret_key", (err, decoded) => {
      if (err)
        return res
          .status(403)
          .json({ success: false, message: "Invalid or expired token." });

      // Always attach a complete user object
      req.user = {
        user_id: decoded.user_id,
        agency_id: decoded.agency_id || null,
        username: decoded.username,
        role: decoded.role,
      };

      next();
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error verifying token." });
  }
};

/**
 * Role-Based Access Control
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Insufficient permissions.",
        });
      }
      next();
    } catch (error) {
      console.error("Role check failed:", error);
      return res
        .status(500)
        .json({ success: false, message: "Role check failed." });
    }
  };
};

/**
 * (Optional) Log user info for debugging
 */
export const logUserInfo = (req, res, next) => {
  if (req.user) {
    console.log(
      `User: ${req.user.username} | Role: ${req.user.role} | Agency: ${req.user.agency_id}`
    );
  }
  next();
};
