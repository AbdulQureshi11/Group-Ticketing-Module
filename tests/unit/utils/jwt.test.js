import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../../src/core/utils/jwt.js';

describe('JWT Utilities', () => {
  const testPayload = {
    id: 1,
    username: 'testuser',
    role: 'user',
    agencyId: 1
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(testPayload);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should contain correct payload', () => {
      const token = generateAccessToken(testPayload);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.id).toBe(testPayload.id);
      expect(decoded.username).toBe(testPayload.username);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.agencyId).toBe(testPayload.agencyId);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const token = generateRefreshToken(testPayload);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return payload', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(testPayload.id);
      expect(decoded.username).toBe(testPayload.username);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      // Create expired token
      const expiredToken = jwt.sign(testPayload, process.env.JWT_SECRET, {
        expiresIn: '-1h'
      });

      expect(() => {
        verifyToken(expiredToken);
      }).toThrow();
    });
  });
});
