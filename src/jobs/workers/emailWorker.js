// Email worker placeholder
import { emailQueue } from '../queue.js';

emailQueue.process(async (job) => {
  // Process email job
  console.log('Processing email job:', job.data);
  // Add email sending logic here
});

export default emailQueue;
