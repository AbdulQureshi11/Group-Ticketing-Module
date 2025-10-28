import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../../core/utils/jwt.js';
import { User, RefreshToken, Agency } from '../../database/index.js';
import { Op } from 'sequelize';

/**
 * POST /auth/login
 * Validate credentials against database users and return JWT tokens
 */
export const login = async (req, res) => {
  try {
    const { agencyCode, username, password } = req.body;

    if (!agencyCode || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: agencyCode, username, password"
      });
    }

    // Find user by joining with Agency to validate agency code
    const user = await User.findOne({
      where: {
        username: username,
        isActive: true
      },
      include: [{
        model: Agency,
        as: 'agency',
        where: {
          code: agencyCode,
          status: 'ACTIVE'
        }
      }],
      attributes: { exclude: ['deletedAt'] }
    });

    if (!user) {
      // Log failed login attempt (security)
      console.warn(`FAILED LOGIN: Username "${username}" from IP ${req.ip} - User not found`);
      
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Log failed login attempt (security)
      console.warn(`FAILED LOGIN: Username "${username}" from IP ${req.ip} - Invalid password`);
      
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      agencyId: user.agencyId,
      agencyCode: user.agency.code
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in database
    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdByIp: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Remove password from response
    const userResponse = {
      id: user.id,
      username: user.username,
      role: user.role,
      agencyId: user.agencyId,
      agencyCode: user.agency.code,
      agencyName: user.agency.name,
      email: user.email,
      phone: user.phone
    };

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * POST /auth/refresh
 * Generate new access token using refresh token
 */
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required"
      });
    }

    // Verify token
    const decoded = verifyToken(refreshToken);
    
    // Check if refresh token exists and is not revoked in database
    const storedToken = await RefreshToken.findOne({
      where: { 
        token: refreshToken,
        userId: decoded.id,
        revoked: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    
    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token"
      });
    }
    
    // Verify user still exists and is active
    const user = await User.findOne({
      where: {
        id: decoded.id,
        username: decoded.username,
        isActive: true
      },
      include: [{
        model: Agency,
        as: 'agency',
        where: {
          id: decoded.agencyId,
          code: decoded.agencyCode,
          status: 'ACTIVE'
        }
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive"
      });
    }

    // Rotate refresh token (revoke old, issue new)
    await storedToken.update({ 
      revoked: true,
      revokedAt: new Date()
    });
    
    const tokenPayload = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      agencyId: decoded.agencyId,
      agencyCode: decoded.agencyCode
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    
    // Store new refresh token
    await RefreshToken.create({
      token: newRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdByIp: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Refresh token verification failed:', error.message || 'Unknown error');
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token"
    });
  }
};

/**
 * POST /auth/logout
 * Logout placeholder (in a real app, you might blacklist the token)
 */
export const logout = async (req, res) => {
  // In a stateless JWT system, logout is handled client-side by removing tokens
  // For server-side logout, you might implement token blacklisting

  res.json({
    success: true,
    message: "Logged out successfully"
  });
};
