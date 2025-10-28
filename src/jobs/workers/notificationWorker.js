// Notification worker placeholder
import { notificationQueue } from '../queue.js';

notificationQueue.process(async (job) => {
  // Process notification job
  console.log('Processing notification job:', job.data);
  // Add notification logic here
});

export default notificationQueue;
