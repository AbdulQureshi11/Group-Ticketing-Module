// PNR sync worker placeholder
import { pnrQueue } from '../queue.js';
import logger from '../../core/utils/logger.js';

pnrQueue.process(async (job) => {
  try {
    logger.info(`Processing PNR sync job ${job.id}`, { jobData: job.data });
    // Add PNR sync logic here
  } catch (error) {
    logger.error(`PNR sync job ${job.id} failed`, { error: error.message, jobData: job.data });
    throw error;
  }
});

export default pnrQueue;
