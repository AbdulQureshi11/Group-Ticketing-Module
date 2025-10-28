// PNR sync worker placeholder
// Assuming a pnrQueue exists, or create one
import Queue from 'bull';

const pnrQueue = new Queue('pnrSync', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
});

pnrQueue.process(async (job) => {
  // Process PNR sync job
  console.log('Processing PNR sync job:', job.data);
  // Add PNR sync logic here
});

export default pnrQueue;
