import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sequelize } from './config/database.js';
import { checkRedisHealth } from './config/redis.js';
import { BackgroundJobsService } from './modules/background-jobs/backgroundJobs.service.js';
import listEndpoints from 'express-list-endpoints';

import app from "./app.js";

/**
 * Log all registered routes and their HTTP methods using express-list-endpoints
 */
function logRoutes() {
  try {
    console.log('\n📋 Registered Routes:');
    console.log('='.repeat(50));

    // Use express-list-endpoints for robust route detection
    const endpoints = listEndpoints(app);
    
    // Group routes by path for better readability
    const groupedRoutes = {};
    
    endpoints.forEach(endpoint => {
      const path = endpoint.path;
      if (!groupedRoutes[path]) {
        groupedRoutes[path] = [];
      }
      groupedRoutes[path].push(endpoint.methods.join(', ').toUpperCase());
    });

    // Display routes
    Object.entries(groupedRoutes)
      .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
      .forEach(([path, methods]) => {
        console.log(`   ${methods.join(' | ')} ${path}`);
      });

    console.log(`\n📊 Total Routes: ${endpoints.length}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.warn('⚠️  Could not log routes:', error.message);
    console.log('   This is a non-critical issue - the server will continue to run');
  }
}

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Check Redis health (optional for development)
    console.log('🔍 Checking Redis connection...');
    const redisHealthy = await checkRedisHealth();
    if (!redisHealthy) {
      console.warn('⚠️  Redis connection failed - background jobs will not work');
      console.warn('   To enable background jobs, start Redis server or set REDIS_HOST');
    } else {
      console.log('✅ Redis connection healthy');
      
      // Initialize background job workers
      console.log('🎯 Initializing background job workers...');
      BackgroundJobsService.initializeWorkers();
      
      // Schedule recurring jobs
      console.log('🕐 Scheduling recurring background jobs...');
      BackgroundJobsService.scheduleRecurringJobs();
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
      if (redisHealthy) {
        console.log('🚀 Background services initialized successfully');
      } else {
        console.log('⚠️  Running without background services (Redis not available)');
      }
      
      // Only log routes in development
      if (process.env.NODE_ENV !== 'production') {
        logRoutes();
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
