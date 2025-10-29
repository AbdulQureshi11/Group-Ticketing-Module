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
    try {
      await redis.setex(key, expirySeconds, JSON.stringify(value));
    } catch (error) {
      console.error(`Redis setWithExpiry failed for key ${key}:`, error);
      return false;
    }
  },

  // Get and parse JSON value
  getJSON: async (key) => {
    try {
      const value = await redis.get(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      console.error(`Redis getJSON failed to parse value for key ${key}:`, error);
      // Attempt to delete corrupted key
      try {
        await redis.del(key);
      } catch (delError) {
        console.error(`Failed to delete corrupted key ${key}:`, delError);
      }
      return null;
    }
  },

  // Delete key
  delete: async (key) => {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Redis delete failed for key ${key}:`, error);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis exists failed for key ${key}:`, error);
      return false;
    }
  },

  // Increment counter
  increment: async (key) => {
    try {
      return await redis.incr(key);
    } catch (error) {
      console.error(`Redis increment failed for key ${key}:`, error);
      return null;
    }
  },

  // Set multiple values
  mset: async (keyValuePairs) => {
    try {
      const flattened = keyValuePairs.flat();
      await redis.mset(...flattened);
    } catch (error) {
      console.error('Redis mset failed:', error);
      return false;
    }
  },

  // Get multiple values
  mget: async (keys) => {
    try {
      const values = await redis.mget(...keys);
      return values.map((value, index) => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch (parseError) {
          console.error(`Redis mget failed to parse value for key ${keys[index]}:`, parseError);
          return null;
        }
      });
    } catch (error) {
      console.error('Redis mget failed:', error);
      return keys.map(() => null);
    }
  }
};

export default redis;
