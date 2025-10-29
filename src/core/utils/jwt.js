import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Validate required environment variables with fallbacks
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || '';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Validate required secrets at module load
if (!JWT_SECRET || !REFRESH_TOKEN_SECRET) {
  console.error('❌ JWT secrets are not properly configured in environment variables');
  // Don't throw immediately to allow for dynamic configuration in tests
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

/**
 * Generate an access token with the given payload
 * @param {Object} payload - The payload to include in the token
 * @returns {string} Signed JWT token
 */
export const generateAccessToken = (payload) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'group-ticketing-api',
    audience: 'user'
  });
};

/**
 * Generate a refresh token with the given payload
 * @param {Object} payload - The payload to include in the token
 * @returns {string} Signed JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  if (!REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is not configured');
  }
  
  return jwt.sign(
    { ...payload, type: 'refresh' }, // Add token type to prevent token misuse
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      algorithm: 'HS256',
      issuer: 'group-ticketing-api',
      audience: 'refresh'
    }
  );
};

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'group-ticketing-api',
    audience: 'user'
  });
};

/**
 * Verify and decode a refresh token
 * @param {string} token - The refresh token to verify
 * @returns {Object} Decoded refresh token payload
 */
export const verifyRefreshToken = (token) => {
  if (!REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is not configured');
  }
  
  return jwt.verify(token, REFRESH_TOKEN_SECRET, {
    algorithms: ['HS256'],
    issuer: 'group-ticketing-api',
    audience: 'refresh'
  });
};

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Length of the random string in bytes (default: 32)
 * @returns {string} Hex-encoded random string
 */
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};
