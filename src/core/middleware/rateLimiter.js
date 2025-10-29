import rateLimit from 'express-rate-limit';

// Create a rate limiter middleware
const createRateLimiter = () => {
  const requestCounts = new Map();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = process.env.NODE_ENV === 'production' ? 100 : 1000;

  // Cleanup function to remove expired entries
  const cleanup = () => {
    const now = Date.now();
    for (const [key, data] of requestCounts) {
      if (now > data.resetTime) {
        requestCounts.delete(key);
      }
    }
  };

  // Run cleanup every windowMs
  const cleanupInterval = setInterval(cleanup, windowMs);

  const middleware = (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      const userData = requestCounts.get(key);
      if (now > userData.resetTime) {
        userData.count = 1;
        userData.resetTime = now + windowMs;
      } else if (userData.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later'
        });
      } else {
        userData.count++;
      }
    }
    next();
  };

  // Attach cleanup method for proper resource management
  middleware.cleanup = () => clearInterval(cleanupInterval);

  return middleware;
};

// Express-rate-limit alternative (more robust)
const expressRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : process.env.NODE_ENV === 'test' ? 10 : 1000, // limit each IP to 10 requests per windowMs in test
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export { createRateLimiter, expressRateLimiter };
export default expressRateLimiter;
