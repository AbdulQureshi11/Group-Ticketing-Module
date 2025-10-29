// Email worker placeholder
import { emailQueue } from '../queue.js';
import logger from '../../core/utils/logger.js';

emailQueue.process(async (job) => {
  try {
    logger.info(`Processing email job ${job.id}`, { jobData: job.data });
    // Add email sending logic here
  } catch (error) {
    logger.error(`Email job ${job.id} failed`, { error: error.message, jobData: job.data });
    throw error;
  }
});

export default emailQueue;
