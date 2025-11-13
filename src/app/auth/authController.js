import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../config/models.js";

const { User, Agency } = db;

/**
 * Create default ADMIN agency + user if not exists
 */
export const createDefaultAdmin = async () => {
  try {
    // Step 1️: Ensure ADMIN agency exists
    let adminAgency = await Agency.findOne({ where: { code: "ADMIN" } });
    if (!adminAgency) {
      adminAgency = await Agency.create({
        name: "Global Admin Agency",
        code: "ADMIN",
        status: "ACTIVE",
      });
      console.log("Default ADMIN agency created");
    }

    // Step 2️: Ensure ADMIN user exists and linked to agency
    let adminUser = await User.findOne({ where: { username: "admin" } });
    if (!adminUser) {
      const hash = await bcrypt.hash("admin123", 10);
      adminUser = await User.create({
        username: "admin",
        email: "admin@example.com",
        password_hash: hash,
        role: "ADMIN",
        is_active: true,
        agency_id: adminAgency.id,
      });
      console.log("Default admin user created (username=admin, password=admin123)");
    } else if (!adminUser.agency_id) {
      // Link if missing
      await adminUser.update({ agency_id: adminAgency.id });
      console.log("Existing admin linked to ADMIN agency");
    } else {
      console.log("Default admin already exists and linked");
    }
  } catch (err) {
    console.error("Error creating default admin:", err.message);
  }
};

/**
 * LOGIN (Admin / Manager / Sub-Agent)
 * Enforces AgencyCode + Username + Password scope
 */
export const login = async (req, res) => {
  try {
    let { agencyCode, username, password } = req.body || {};
    agencyCode = (agencyCode || "").trim();
    username = (username || "").trim();

    if (!agencyCode || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields required (agencyCode, username, password)",
      });
    }

    // Step 1️: Find agency (case-insensitive)
    const agency = await Agency.findOne({
      where: db.Sequelize.where(
        db.Sequelize.fn("lower", db.Sequelize.col("code")),
        agencyCode.toLowerCase()
      ),
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Invalid agency code or agency not found.",
      });
    }

    // Step 2️: Find user in that agency
    const user = await User.findOne({
      where: { agency_id: agency.id, username },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found under this agency.",
      });
    }

    // Step 3️: Verify password
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass)
      return res.status(401).json({ success: false, message: "Invalid credentials." });

    if (!user.is_active)
      return res.status(403).json({
        success: false,
        message: "User is inactive or suspended.",
      });

    // Step 4️: Generate tokens
    const accessToken = jwt.sign(
      {
        user_id: user.id,
        agency_id: user.agency_id,
        agency_code: agency.code,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET || "super_secret_key",
      { expiresIn: process.env.JWT_EXPIRES || "12h" }
    );

    const refreshToken = jwt.sign(
      { user_id: user.id },
      process.env.JWT_REFRESH_SECRET || "refresh_secret_key",
      { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
    );

    await user.update({ last_login_at: new Date() });

    // Step 5️: Response
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        agency_id: agency.id,
        agency_code: agency.code,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during login.",
      error: err.message,
    });
  }
};

/**
 * REFRESH TOKEN
 */
export const refreshToken = (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required." });

    jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || "refresh_secret_key",
      (err, decoded) => {
        if (err)
          return res
            .status(403)
            .json({ success: false, message: "Invalid refresh token." });

        const newAccess = jwt.sign(
          { user_id: decoded.user_id },
          process.env.JWT_SECRET || "super_secret_key",
          { expiresIn: process.env.JWT_EXPIRES || "12h" }
        );

        res.json({
          success: true,
          message: "Access token refreshed.",
          accessToken: newAccess,
        });
      }
    );
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error refreshing token.",
      error: err.message,
    });
  }
};

/**
 * LOGOUT
 */
export const logout = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logged out successfully (token cleared client-side).",
  });
};
