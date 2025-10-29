import { Queue, Worker } from 'bullmq';
import redis from '../../config/redis.js';
import { StatusMachineService } from '../status-machine/statusMachine.service.js';
import { SeatManagementService } from '../seat-management/seatManagement.service.js';
import AuditLog from '../../database/models/AuditLog.js';
import { AuditService } from '../../services/audit.service.js';
import winston from 'winston';

// Configure logger for background jobs
const jobLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/jobs.log' })
  ]
});

// Background job queues
export const jobQueues = {
  statusTransitions: new Queue('status-transitions', { connection: redis }),
  seatExpiry: new Queue('seat-expiry', { connection: redis }),
  notifications: new Queue('notifications', { connection: redis }),
  auditLogging: new Queue('audit-logging', { connection: redis }),
  reportGeneration: new Queue('report-generation', { connection: redis })
};

/**
 * Background Jobs Service - Handles all automated background processing
 */
export class BackgroundJobsService {
  static workers = [];

  /**
   * Initialize all background job workers
   */
  static initializeWorkers() {
    const service = this;
    
    // Status transitions worker
    const statusWorker = new Worker('status-transitions', async (job) => {
      const { type, data } = job.data;
      
      try {
        jobLogger.info(`Processing status transition job: ${type}`, { data });
        
        switch (type) {
          case 'process-automated-transitions':
            return await service.processAutomatedTransitions();
          
          case 'transition-booking':
            return await service.transitionBooking(data);
          
          default:
            throw new Error(`Unknown job type: ${type}`);
        }
      } catch (error) {
        jobLogger.error(`Status transition job failed: ${error.message}`, { 
          jobId: job.id, 
          data, 
          error: error.stack 
        });
        throw error;
      }
    }, { 
      connection: redis,
      concurrency: 5,
      limiter: {
        max: 100,
        duration: 60000 // 1 minute
      }
    });

    // Seat expiry worker
    const seatExpiryWorker = new Worker('seat-expiry', async (job) => {
      const { type, data } = job.data;
      
      try {
        jobLogger.info(`Processing seat expiry job: ${type}`, { data });
        
        switch (type) {
          case 'process-expired-holds':
            return await service.processExpiredHolds();
          
          case 'update-seat-counters':
            return await service.updateSeatCounters(data);
          
          default:
            throw new Error(`Unknown job type: ${type}`);
        }
      } catch (error) {
        jobLogger.error(`Seat expiry job failed: ${error.message}`, { 
          jobId: job.id, 
          data, 
          error: error.stack 
        });
        throw error;
      }
    }, { 
      connection: redis,
      concurrency: 3
    });

    // Notifications worker
    const notificationsWorker = new Worker('notifications', async (job) => {
      const { type, data } = job.data;
      
      try {
        jobLogger.info(`Processing notification job: ${type}`, { data });
        
        switch (type) {
          case 'send-email':
            return await service.sendEmail(data);
          
          case 'send-sms':
            return await service.sendSMS(data);
          
          case 'booking-status-change':
            return await service.sendBookingStatusNotification(data);
          
          case 'send-bulk-expiry-notifications':
            return await service.sendBulkExpiryNotifications(data);
          
          default:
            throw new Error(`Unknown job type: ${type}`);
        }
      } catch (error) {
        jobLogger.error(`Notification job failed: ${error.message}`, { 
          jobId: job.id, 
          data, 
          error: error.stack 
        });
        throw error;
      }
    }, { 
      connection: redis,
      concurrency: 10,
      limiter: {
        max: 200,
        duration: 60000 // 1 minute
      }
    });

    // Audit logging worker
    const auditWorker = new Worker('audit-logging', async (job) => {
      const { type, data } = job.data;
      
      try {
        jobLogger.info(`Processing audit logging job: ${type}`, { data });
        
        switch (type) {
          case 'log-user-action':
            return await service.logUserAction(data);
          
          case 'log-booking-change':
            return await service.logBookingChange(data);
          
          case 'log-system-event':
            return await service.logSystemEvent(data);
          
          default:
            throw new Error(`Unknown job type: ${type}`);
        }
      } catch (error) {
        jobLogger.error(`Audit logging job failed: ${error.message}`, { 
          jobId: job.id, 
          data, 
          error: error.stack 
        });
        throw error;
      }
    }, { 
      connection: redis,
      concurrency: 20
    });

    // Store workers for graceful shutdown
    this.workers.push(statusWorker, seatExpiryWorker, notificationsWorker, auditWorker);

    jobLogger.info('🎯 All background job workers initialized');
  }

  /**
   * Gracefully shutdown all workers
   */
  static async shutdown() {
    jobLogger.info('Shutting down background workers...');
    await Promise.all(this.workers.map(worker => worker.close()));
    this.workers = [];
    jobLogger.info('All workers shut down');
  }

  /**
   * Queue a background job
   * @param {string} queueName - Queue name
   * @param {string} jobType - Job type
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   */
  static async queueJob(queueName, jobType, data, options = {}) {
    try {
      const queue = jobQueues[queueName];
      if (!queue) {
        throw new Error(`Queue not found: ${queueName}`);
      }

      const job = await queue.add(
        jobType, 
        { type: jobType, data }, 
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: 100,
          removeOnFail: 50,
          ...options
        }
      );

      jobLogger.info(`Job queued: ${jobType} in ${queueName}`, { 
        jobId: job.id, 
        data 
      });

      return job;
    } catch (error) {
      jobLogger.error(`Failed to queue job: ${error.message}`, { 
        queueName, 
        jobType, 
        data 
      });
      throw error;
    }
  }

  /**
   * Process automated status transitions
   */
  static async processAutomatedTransitions() {
    try {
      const result = await StatusMachineService.processAutomatedTransitions();
      
      jobLogger.info('Automated status transitions processed', result);
      
      // Queue notifications for affected bookings
      if (result.processed.expired > 0) {
        await this.queueJob('notifications', 'send-bulk-expiry-notifications', {
          expiredBookings: result.processed.expired
        });
      }

      return result;
    } catch (error) {
      jobLogger.error(`Process automated transitions failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process expired holds
   */
  static async processExpiredHolds() {
    try {
      const result = await SeatManagementService.processExpiredHolds();
      
      jobLogger.info('Expired holds processed', result);
      
      return result;
    } catch (error) {
      jobLogger.error(`Process expired holds failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking status notification
   * @param {Object} data - Notification data
   */
  static async sendBookingStatusNotification(data) {
    try {
      const { booking, previousStatus, newStatus, user, agency } = data;
      
      // Queue email notification - validate email exists and is non-empty
      if (user.email && typeof user.email === 'string' && user.email.trim().length > 0) {
        await this.queueJob('notifications', 'send-email', {
          to: user.email,
          subject: `Booking Status Updated: ${previousStatus} → ${newStatus}`,
          template: 'booking-status-change',
          data: {
            userName: user.name,
            bookingId: booking.id,
            previousStatus,
            newStatus,
            flightDetails: booking.flightGroup
          }
        });
      }

      // Queue SMS notification for critical status changes - validate phone exists and is non-empty
      if (user.phone && typeof user.phone === 'string' && user.phone.trim().length > 0 && ['APPROVED', 'REJECTED', 'ISSUED'].includes(newStatus)) {
        await this.queueJob('notifications', 'send-sms', {
          to: user.phone,
          message: `Booking ${booking.id} status: ${newStatus}`
        });
      }

      jobLogger.info(`Booking status notification sent for booking ${booking.id}`);
      
    } catch (error) {
      jobLogger.error(`Send booking status notification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send bulk expiry notifications
   * @param {Object} data - Notification data
   */
  static async sendBulkExpiryNotifications(data) {
    try {
      const { expiredBookings } = data;
      jobLogger.info(`Sending bulk expiry notifications for ${expiredBookings} bookings`);
      // TODO: Implement bulk notification logic
      return { sent: expiredBookings };
    } catch (error) {
      jobLogger.error(`Send bulk expiry notifications failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log user action for audit
   * @param {Object} data - Audit data
   */
  static async logUserAction(data) {
    try {
      jobLogger.info('Logging user action', { userId: data.userId, action: data.action });
      
      // Delegate to AuditService for proper database persistence and Redis caching
      return await AuditService.logUserAction(data);
      
    } catch (error) {
      jobLogger.error(`Log user action failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule recurring jobs
   */
  static scheduleRecurringJobs() {
    // Process automated transitions every 5 minutes
    jobQueues.statusTransitions.add(
      'process-automated-transitions',
      { type: 'process-automated-transitions' },
      {
        repeat: { pattern: '*/5 * * * *' }, // Every 5 minutes
        jobId: 'automated-transitions-scheduler'
      }
    );

    // Process expired holds every hour
    jobQueues.seatExpiry.add(
      'process-expired-holds',
      { type: 'process-expired-holds' },
      {
        repeat: { pattern: '0 * * * *' }, // Every hour
        jobId: 'expired-holds-scheduler'
      }
    );

    jobLogger.info('🕐 Recurring jobs scheduled');
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats() {
    try {
      const stats = {};
      
      for (const [name, queue] of Object.entries(jobQueues)) {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        
        stats[name] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        };
      }

      return stats;
    } catch (error) {
      jobLogger.error(`Get queue stats failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up old jobs
   */
  static async cleanupOldJobs() {
    try {
      for (const queue of Object.values(jobQueues)) {
        await queue.clean(24 * 60 * 60 * 1000, -1); // Clean jobs older than 24 hours (unlimited)
      }
      
      jobLogger.info('Old jobs cleaned up');
    } catch (error) {
      jobLogger.error(`Cleanup old jobs failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transition booking status
   * @param {Object} data - Booking transition data
   */
  static async transitionBooking(data) {
    const { bookingId, newStatus, userId, reason } = data;
    jobLogger.info(`Transitioning booking ${bookingId} to ${newStatus}`);
    
    // Delegate to StatusMachineService
    return await StatusMachineService.transitionStatus(
      bookingId, 
      newStatus, 
      { id: userId }, 
      { reason }
    );
  }

  /**
   * Update seat counters for flight group
   * @param {Object} data - Seat counter data
   */
  static async updateSeatCounters(data) {
    const { flightGroupId } = data;
    jobLogger.info(`Updating seat counters for group ${flightGroupId}`);
    
    // Delegate to SeatManagementService
    return await SeatManagementService.getRealTimeAvailability(flightGroupId);
  }

  /**
   * Send email notification
   * @param {Object} data - Email data
   */
  static async sendEmail(data) {
    const { to, subject, template, variables } = data;
    jobLogger.info(`Sending email to ${to}`);
    
    // TODO: Implement email service integration
    // For now, just log the email would be sent
    jobLogger.info(`Email service not yet implemented - would send: ${subject} to ${to}`);
    return { sent: true, message: 'Email service not implemented' };
  }

  /**
   * Send bulk expiry notifications
   * @param {Object} data - Bulk notification data
   */
  static async sendBulkExpiryNotifications(data) {
    const { expiredBookings } = data;
    jobLogger.info(`Sending bulk expiry notifications for ${expiredBookings} bookings`);
    
    // TODO: Implement bulk notification logic
    return { sent: expiredBookings };
  }

  /**
   * Log booking change to audit
   * @param {Object} data - Booking change data
   */
  static async logBookingChange(data) {
    const { bookingId, action, userId, changes } = data;
    jobLogger.info(`Logging booking change: ${action} for booking ${bookingId}`);
    
    // Delegate to AuditService
    return await AuditService.logBookingChange(data);
  }

  /**
   * Log system event to audit
   * @param {Object} data - System event data
   */
  static async logSystemEvent(data) {
    const { event, severity, details, userId } = data;
    jobLogger.info(`Logging system event: ${event}`);
    
    // Delegate to AuditService
    return await AuditService.logSystemEvent(data);
  }
}
