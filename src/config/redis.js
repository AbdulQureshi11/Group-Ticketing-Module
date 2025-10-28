import Redis from 'ioredis';

// Redis configuration for background jobs and caching
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create Redis client
const redis = new Redis(redisConfig);

// Redis connection events
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('close', () => {
  console.log('🔌 Redis connection closed');
});

// Redis health check
export const checkRedisHealth = async () => {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
};

// Redis utility functions
export const redisUtils = {
  // Set key with expiration
  setWithExpiry: async (key, value, expirySeconds) => {
    await redis.setex(key, expirySeconds, JSON.stringify(value));
  },

  // Get and parse JSON value
  getJSON: async (key) => {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  // Delete key
  delete: async (key) => {
    await redis.del(key);
  },

  // Check if key exists
  exists: async (key) => {
    const result = await redis.exists(key);
    return result === 1;
  },

  // Increment counter
  increment: async (key) => {
    return await redis.incr(key);
  },

  // Set multiple values
  mset: async (keyValuePairs) => {
    const flattened = keyValuePairs.flat();
    await redis.mset(...flattened);
  },

  // Get multiple values
  mget: async (keys) => {
    const values = await redis.mget(...keys);
    return values.map(value => value ? JSON.parse(value) : null);
  }
};

export default redis;
