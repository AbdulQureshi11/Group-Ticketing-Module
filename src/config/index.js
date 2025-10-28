import { env } from './env.js';
import databaseConfig from './database.js';
import redisConfig from './redis.js';

export { env };
export { databaseConfig };
export { redisConfig };

export default {
  env,
  database: databaseConfig,
  redis: redisConfig
};
