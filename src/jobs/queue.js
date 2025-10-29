// Queue management placeholder
import Queue from 'bull';

// Create queues here
export const emailQueue = new Queue('email', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
});

export const pnrQueue = new Queue('pnrSync', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
});

// Add more queues as needed

export default {
  emailQueue,
  notificationQueue,
  pnrQueue,
};
