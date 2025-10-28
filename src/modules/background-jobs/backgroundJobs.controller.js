import { BackgroundJobsService } from './backgroundJobs.service.js';
import { redisUtils } from '../../config/redis.js';

/**
 * GET /jobs/stats
 * Get background job statistics
 */
export const getJobStats = async (req, res) => {
  try {
    const stats = await BackgroundJobsService.getQueueStats();

    res.json({
      success: true,
      message: 'Job statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Get job stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /jobs/process-automated
 * Manually trigger automated transitions processing
 */
export const processAutomatedTransitions = async (req, res) => {
  try {
    const job = await BackgroundJobsService.queueJob(
      'statusTransitions',
      'process-automated-transitions',
      {},
      { priority: 10 }
    );

    res.json({
      success: true,
      message: 'Automated transitions processing queued',
      data: {
        jobId: job.id,
        queuedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Process automated transitions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /jobs/process-expired-holds
 * Manually trigger expired holds processing
 */
export const processExpiredHolds = async (req, res) => {
  try {
    const job = await BackgroundJobsService.queueJob(
      'seatExpiry',
      'process-expired-holds',
      {},
      { priority: 5 }
    );

    res.json({
      success: true,
      message: 'Expired holds processing queued',
      data: {
        jobId: job.id,
        queuedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Process expired holds error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /jobs/send-notification
 * Queue a notification job
 */
export const queueNotification = async (req, res) => {
  try {
    const { type, recipient, subject, message, template, data } = req.body;

    // Validate required fields
    if (!type || !recipient) {
      return res.status(400).json({
        success: false,
        message: 'type and recipient are required'
      });
    }

    const jobData = {
      type,
      recipient,
      subject,
      message,
      template,
      data
    };

    const job = await BackgroundJobsService.queueJob(
      'notifications',
      type,
      jobData,
      { priority: 3 }
    );

    res.json({
      success: true,
      message: 'Notification queued successfully',
      data: {
        jobId: job.id,
        type,
        recipient,
        queuedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Queue notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /jobs/log-audit
 * Queue an audit logging job
 */
export const queueAuditLog = async (req, res) => {
  try {
    const { type, userId, action, resource, details } = req.body;

    // Validate required fields
    if (!type || !userId || !action) {
      return res.status(400).json({
        success: false,
        message: 'type, userId, and action are required'
      });
    }

    const jobData = {
      type,
      userId,
      action,
      resource,
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const job = await BackgroundJobsService.queueJob(
      'auditLogging',
      type,
      jobData,
      { priority: 1 }
    );

    res.json({
      success: true,
      message: 'Audit log queued successfully',
      data: {
        jobId: job.id,
        type,
        userId,
        action,
        queuedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Queue audit log error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /jobs/cleanup
 * Clean up old jobs
 */
export const cleanupOldJobs = async (req, res) => {
  try {
    const result = await BackgroundJobsService.cleanupOldJobs();

    res.json({
      success: true,
      message: 'Old jobs cleaned up successfully',
      data: result
    });

  } catch (error) {
    console.error('Cleanup old jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * GET /jobs/health
 * Get background jobs system health
 */
export const getJobsHealth = async (req, res) => {
  try {
    const stats = await BackgroundJobsService.getQueueStats();
    
    // Calculate health metrics
    const totalJobs = Object.values(stats).reduce((sum, queue) => 
      sum + queue.waiting + queue.active + queue.failed, 0
    );
    
    const totalFailed = Object.values(stats).reduce((sum, queue) => 
      sum + queue.failed, 0
    );
    
    const healthStatus = {
      healthy: totalFailed < 10 && totalJobs < 1000,
      totalJobs,
      totalFailed,
      queueStats: stats,
      timestamp: new Date().toISOString()
    };

    const statusCode = healthStatus.healthy ? 200 : 503;

    res.status(statusCode).json({
      success: healthStatus.healthy,
      message: healthStatus.healthy ? 'Jobs system is healthy' : 'Jobs system has issues',
      data: healthStatus
    });

  } catch (error) {
    console.error('Get jobs health error:', error);
    res.status(503).json({
      success: false,
      message: 'Jobs system health check failed',
      error: error.message
    });
  }
};
