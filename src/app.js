import express from "express";
import morgan from "morgan"; // optional; useful in dev

import { testConnection } from "./config/database.js";

import authRoutes from './modules/auth/auth.routes.js';
import agencyRoutes from './modules/agencies/agency.routes.js';
import userRoutes from './modules/users/user.routes.js';
import groupRoutes from './modules/groups/group.routes.js';
import bookingRoutes from './modules/bookings/booking.routes.js';
import passengerRoutes from './modules/passengers/passenger.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import pricingRoutes from './modules/pricing/pricing.routes.js';
import seatManagementRoutes from './modules/seat-management/seatManagement.routes.js';
import pnrManagementRoutes from './modules/pnr-management/pnrManagement.routes.js';
import statusMachineRoutes from './modules/status-machine/statusMachine.routes.js';
import backgroundJobsRoutes from './modules/background-jobs/backgroundJobs.routes.js';
import { errorHandler } from './core/middleware/errorHandler.js';
import { expressRateLimiter } from './core/middleware/rateLimiter.js';

const app = express();

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Test database connection on startup
testConnection();

app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(morgan ? morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev') : (req, res, next) => next());

// Rate limiting
app.use(expressRateLimiter);

// health
app.get("/health", (req, res) => res.json({ ok: true }));

// Register routes
app.use("/auth", authRoutes);
app.use("/agencies", agencyRoutes);
app.use("/users", userRoutes);
app.use("/groups", groupRoutes);
app.use("/bookings", bookingRoutes);
app.use("/passengers", passengerRoutes);
app.use("/settings", settingsRoutes);
app.use("/reports", reportRoutes);
app.use("/pricing", pricingRoutes);
app.use("/seat-management", seatManagementRoutes);
app.use("/pnr", pnrManagementRoutes);
app.use("/status-machine", statusMachineRoutes);
app.use("/jobs", backgroundJobsRoutes);

// error handler
app.use(errorHandler);

export default app;
