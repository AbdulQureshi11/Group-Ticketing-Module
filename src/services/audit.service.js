import winston from 'winston';
import redis from '../config/redis.js';
import { AuditLog } from '../database/index.js';

// Configure audit logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta
      });
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/audit.log',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10
    }),
    new winston.transports.File({ 
      filename: 'logs/security.log',
      level: 'warn',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  ]
});

/**
 * Audit Logging Service - Comprehensive activity tracking
 */
export class AuditService {
  /**
   * Log user action
   * @param {Object} data - Audit data
   */
  static async logUserAction(data) {
    try {
      const {
        userId,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
        success = true,
        errorMessage = null
      } = data;

      const auditEntry = {
        timestamp: new Date().toISOString(),
        type: 'USER_ACTION',
        userId,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
        success,
        errorMessage,
        sessionId: this.generateSessionId(userAgent, ipAddress)
      };

      // Log to Winston
      auditLogger.info('User action', auditEntry);

      // Store in database
      await this.storeAuditEntry(auditEntry);

      // Store in Redis for recent activity (expires after 90 days)
      await redis.setex(
        `audit:user:${userId}:${Date.now()}`,
        90 * 24 * 60 * 60, // 90 days
        JSON.stringify(auditEntry)
      );

      // Store in recent activity list (last 1000 actions)
      await this.addToRecentActivity(auditEntry);

      return auditEntry;

    } catch (error) {
      auditLogger.error('Failed to log user action', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Log booking change
   * @param {Object} data - Booking audit data
   */
  static async logBookingChange(data) {
    try {
      const {
        bookingId,
        action,
        previousStatus,
        newStatus,
        userId,
        details,
        ipAddress,
        userAgent
      } = data;

      const auditEntry = {
        timestamp: new Date().toISOString(),
        type: 'BOOKING_CHANGE',
        bookingId,
        action,
        previousStatus,
        newStatus,
        userId,
        details,
        ipAddress,
        userAgent,
        sessionId: this.generateSessionId(userAgent, ipAddress)
      };

      // Log to Winston
      auditLogger.info('Booking change', auditEntry);

      // Store in database
      await this.storeAuditEntry(auditEntry);

      // Store in Redis for booking history
      await redis.setex(
        `audit:booking:${bookingId}:${Date.now()}`,
        365 * 24 * 60 * 60, // 1 year for booking history
        JSON.stringify(auditEntry)
      );

      return auditEntry;

    } catch (error) {
      auditLogger.error('Failed to log booking change', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Log security event
   * @param {Object} data - Security audit data
   */
  static async logSecurityEvent(data) {
    try {
      const {
        event,
        severity = 'medium', // low, medium, high, critical
        userId,
        ipAddress,
        userAgent,
        details,
        blocked = false
      } = data;

      const auditEntry = {
        timestamp: new Date().toISOString(),
        type: 'SECURITY_EVENT',
        event,
        severity,
        userId,
        ipAddress,
        userAgent,
        details,
        blocked,
        sessionId: this.generateSessionId(userAgent, ipAddress)
      };

      // Log to Winston with appropriate level
      const logLevel = this.getLogLevel(severity);
      auditLogger.log(logLevel, 'Security event', auditEntry);

      // Store in database
      await this.storeAuditEntry(auditEntry);

      // Store in Redis for security monitoring (expires after 1 year)
      await redis.setex(
        `audit:security:${Date.now()}`,
        365 * 24 * 60 * 60,
        JSON.stringify(auditEntry)
      );

      // Add to security events list for monitoring
      await this.addToSecurityEvents(auditEntry);

      return auditEntry;

    } catch (error) {
      auditLogger.error('Failed to log security event', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Log system event
   * @param {Object} data - System audit data
   */
  static async logSystemEvent(data) {
    try {
      const {
        event,
        component,
        level = 'info', // info, warn, error
        details,
        metadata = {}
      } = data;

      const auditEntry = {
        timestamp: new Date().toISOString(),
        type: 'SYSTEM_EVENT',
        event,
        component,
        level,
        details,
        metadata
      };

      // Log to Winston
      auditLogger.log(level, 'System event', auditEntry);

      // Store in database for system monitoring
      await this.storeAuditEntry(auditEntry);

      // Store in Redis for recent system events (expires after 30 days)
      await redis.setex(
        `audit:system:${component}:${Date.now()}`,
        30 * 24 * 60 * 60,
        JSON.stringify(auditEntry)
      );

      return auditEntry;

    } catch (error) {
      auditLogger.error('Failed to log system event', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Get user activity history
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Activity history
   */
  static async getUserActivity(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, startDate, endDate, action } = options;

      // Build Redis key pattern
      const pattern = `audit:user:${userId}:*`;
      
      // Use SCAN instead of KEYS for production safety
      const keys = [];
      let cursor = '0';
      do {
        const [nextCursor, scanKeys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;
        keys.push(...scanKeys);
      } while (cursor !== '0');
      
      // Sort keys by timestamp (they're timestamp-based)
      keys.sort((a, b) => b.split(':').pop() - a.split(':').pop());

      // Get entries
      const entries = await redis.mget(keys.slice(offset, offset + limit));
      const activities = entries
        .filter(entry => entry !== null)
        .map(entry => JSON.parse(entry))
        .filter(activity => {
          // Filter by date range
          if (startDate && new Date(activity.timestamp) < new Date(startDate)) return false;
          if (endDate && new Date(activity.timestamp) > new Date(endDate)) return false;
          // Filter by action
          if (action && activity.action !== action) return false;
          return true;
        });

      return {
        activities,
        total: keys.length,
        hasMore: offset + limit < keys.length
      };

    } catch (error) {
      auditLogger.error('Failed to get user activity', {
        error: error.message,
        userId,
        options
      });
      throw error;
    }
  }

  /**
   * Get booking audit history
   * @param {string} bookingId - Booking ID
   * @returns {Array} Booking history
   */
  static async getBookingHistory(bookingId) {
    try {
      const pattern = `audit:booking:${bookingId}:*`;
      
      // Use SCAN instead of KEYS for production safety
      const keys = [];
      let cursor = '0';
      do {
        const [nextCursor, scanKeys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;
        keys.push(...scanKeys);
      } while (cursor !== '0');
      
      keys.sort((a, b) => a.split(':').pop() - b.split(':').pop());

      const entries = await redis.mget(keys);
      const history = entries
        .filter(entry => entry !== null)
        .map(entry => JSON.parse(entry));

      return history;

    } catch (error) {
      auditLogger.error('Failed to get booking history', {
        error: error.message,
        bookingId
      });
      throw error;
    }
  }

  /**
   * Get security events
   * @param {Object} options - Query options
   * @returns {Array} Security events
   */
  static async getSecurityEvents(options = {}) {
    try {
      const { limit = 100, severity, startDate, endDate } = options;

      const pattern = `audit:security:*`;
      
      // Use SCAN instead of KEYS for production safety
      const keys = [];
      let cursor = '0';
      do {
        const [nextCursor, scanKeys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;
        keys.push(...scanKeys);
      } while (cursor !== '0');
      
      keys.sort((a, b) => b.split(':').pop() - a.split(':').pop());

      const entries = await redis.mget(keys.slice(0, limit));
      const events = entries
        .filter(entry => entry !== null)
        .map(entry => JSON.parse(entry))
        .filter(event => {
          if (severity && event.severity !== severity) return false;
          if (startDate && new Date(event.timestamp) < new Date(startDate)) return false;
          if (endDate && new Date(event.timestamp) > new Date(endDate)) return false;
          return true;
        });

      return events;

    } catch (error) {
      auditLogger.error('Failed to get security events', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param {Object} options - Query options
   * @returns {Object} Audit statistics
   */
  static async getAuditStatistics(options = {}) {
    try {
      const { startDate, endDate } = options;

      // Get all audit keys using SCAN for production safety
      const userKeys = await this.scanKeys('audit:user:*');
      const bookingKeys = await this.scanKeys('audit:booking:*');
      const securityKeys = await this.scanKeys('audit:security:*');
      const systemKeys = await this.scanKeys('audit:system:*');

      const stats = {
        totalUserActions: userKeys.length,
        totalBookingChanges: bookingKeys.length,
        totalSecurityEvents: securityKeys.length,
        totalSystemEvents: systemKeys.length,
        totalEvents: userKeys.length + bookingKeys.length + securityKeys.length + systemKeys.length
      };

      // Get recent activity (last 24 hours)
      const recentActivity = await this.getRecentActivity(24);
      stats.recentActivity24h = recentActivity.length;

      // Get security events by severity
      const securityEvents = await this.getSecurityEvents({ limit: 1000 });
      stats.securityEventsBySeverity = securityEvents.reduce((acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {});

      return stats;

    } catch (error) {
      auditLogger.error('Failed to get audit statistics', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Store audit entry in database
   * @param {Object} entry - Audit entry
   */
  static async storeAuditEntry(entry) {
    try {
      // Store in AuditLog model if it exists
      if (AuditLog) {
        await AuditLog.create({
          type: entry.type,
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: entry.details,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          success: entry.success,
          errorMessage: entry.errorMessage,
          metadata: entry
        });
      }
    } catch (error) {
      // Don't throw error here to avoid breaking main flow
      auditLogger.error('Failed to store audit entry in database', {
        error: error.message,
        entry
      });
    }
  }

  /**
   * Add to recent activity list
   * @param {Object} entry - Audit entry
   */
  static async addToRecentActivity(entry) {
    try {
      const key = 'audit:recent:activity';
      await redis.lpush(key, JSON.stringify(entry));
      await redis.ltrim(key, 0, 999); // Keep last 1000 entries
      await redis.expire(key, 7 * 24 * 60 * 60); // Expire after 7 days
    } catch (error) {
      auditLogger.error('Failed to add to recent activity', {
        error: error.message,
        entry
      });
    }
  }

  /**
   * Add to security events list
   * @param {Object} entry - Security event entry
   */
  static async addToSecurityEvents(entry) {
    try {
      const key = 'audit:security:recent';
      await redis.lpush(key, JSON.stringify(entry));
      await redis.ltrim(key, 0, 499); // Keep last 500 entries
      await redis.expire(key, 30 * 24 * 60 * 60); // Expire after 30 days
    } catch (error) {
      auditLogger.error('Failed to add to security events', {
        error: error.message,
        entry
      });
    }
  }

  /**
   * Get recent activity
   * @param {number} hours - Hours to look back
   * @returns {Array} Recent activity
   */
  static async getRecentActivity(hours = 24) {
    try {
      const key = 'audit:recent:activity';
      const entries = await redis.lrange(key, 0, -1);
      
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      return entries
        .map(entry => JSON.parse(entry))
        .filter(entry => new Date(entry.timestamp) >= cutoffTime);

    } catch (error) {
      auditLogger.error('Failed to get recent activity', {
        error: error.message,
        hours
      });
      return [];
    }
  }

  /**
   * Generate session ID from user agent and IP
   * @param {string} userAgent - User agent string
   * @param {string} ipAddress - IP address
   * @returns {string} Session ID
   */
  static generateSessionId(userAgent, ipAddress) {
    const crypto = require('crypto');
    const data = `${userAgent || ''}-${ipAddress || ''}-${Math.floor(Date.now() / (60 * 60 * 1000))}`; // Hour-based
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Get log level for security severity
   * @param {string} severity - Security severity
   * @returns {string} Winston log level
   */
  static getLogLevel(severity) {
    const levelMap = {
      'low': 'info',
      'medium': 'warn',
      'high': 'error',
      'critical': 'error'
    };
    return levelMap[severity] || 'info';
  }

  /**
   * Clean up old audit entries
   * @param {number} daysOld - Delete entries older than this many days
   */
  static async cleanupOldEntries(daysOld = 90) {
    try {
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      // Get all audit keys using SCAN for production safety
      const allKeys = await this.scanKeys('audit:*');
      
      let deletedCount = 0;
      for (const key of allKeys) {
        const timestamp = parseInt(key.split(':').pop());
        if (timestamp < cutoffTime) {
          await redis.del(key);
          deletedCount++;
        }
      }

      auditLogger.info('Audit cleanup completed', {
        deletedCount,
        cutoffDate: new Date(cutoffTime).toISOString()
      });

      return { deletedCount };

    } catch (error) {
      auditLogger.error('Failed to cleanup old audit entries', {
        error: error.message,
        daysOld
      });
      throw error;
    }
  }

  /**
   * Helper method to scan Redis keys safely (non-blocking)
   * @param {string} pattern - Redis key pattern
   * @returns {Array} Array of matching keys
   */
  static async scanKeys(pattern) {
    const keys = [];
    let cursor = '0';
    do {
      const [nextCursor, scanKeys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        500
      );
      cursor = nextCursor;
      keys.push(...scanKeys);
    } while (cursor !== '0');
    return keys;
  }
}
