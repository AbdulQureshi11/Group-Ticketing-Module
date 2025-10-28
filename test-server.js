import express from 'express';

// Mock database test to skip actual connection
const testConnection = () => {
  console.log('🟡 Database connection test skipped for basic functionality test');
  return Promise.resolve();
};

// Mock Redis health check
const checkRedisHealth = () => {
  console.log('🟡 Redis health check skipped for basic functionality test');
  return Promise.resolve(false);
};

// Import routes (these should work without database)
import authRoutes from "./src/routes/auth.js";
import groupRoutes from "./src/routes/groupRoutes.js";

const app = express();

// Basic middleware
app.use(express.json());

// Add routes
app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);

// Test endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running (database connection skipped)',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3001; // Use different port

app.listen(PORT, () => {
  console.log(`🧪 Test server running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('   GET /health - Health check');
  console.log('   POST /auth/login - Authentication test');
  console.log('   GET /groups - Groups listing test');
  console.log('\n⚠️  Note: Database-dependent endpoints will fail until database is connected');
});
