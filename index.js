// Core Imports
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./src/config/config.js";


// Load Environment Variables First
dotenv.config();

// Controller Imports

import { createDefaultAdmin } from "./src/app/auth/authController.js";
import { startHoldExpiryJob } from "./src/app/jobs/holdExpiryJob.js";


// Route Imports
import authRoutes from "./src/app/auth/authRoute.js";
import adminRouter from "./src/app/admin/adminRoute.js";
import managerRouter from "./src/app/manager/managerRoute.js";
import agentRouter from "./src/app/subAgent/agentRoute.js";
import agencyRouter from "./src/app/agency/agencyRouter.js";
import userRouter from "./src/app/user/userRouter.js";
import groupRouter from "./src/app/group/groupRoute.js";
import bookingRouter from "./src/app/booking/bookingRoute.js";
import passengerRouter from "./src/app/passenger/passengerRoute.js";
import paymentRouter from "./src/app/payment/paymentRoute.js";
import auditRouter from "./src/app/audit/auditRoute.js";
import settingsRouter from "./src/app/setting/settingsRoute.js";
import reportsRouter from "./src/app/reports/reportsRoute.js";
import amadeusRouter from "./src/app/amadeus/amadeusRoute.js";
import notificationRouter from "./src/app/notification/notificationRoute.js";


// App Configuration
const app = express();
const port = process.env.PORT || 9000;


// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static folder for uploaded files
app.use("/uploads", express.static("uploads"));


// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRouter);
app.use("/api/manager", managerRouter);
app.use("/api/agent", agentRouter);
app.use("/api/agencies", agencyRouter);
app.use("/api/users", userRouter);
app.use("/api/groups", groupRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/passengers", passengerRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/audit", auditRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/amadeus", amadeusRouter); // Live flight data (Remember Adding this in Future)
app.use("/api/notifications", notificationRouter);


// Health Check Endpoint

app.get("/", (req, res) => {
  res.send("Group Ticketing API is running successfully!");
});

// Database + Server Initialization
sequelize
  .sync({ alter: true })
  .then(async () => {
    console.log("Database connected & synced successfully");

    // Ensure admin exists
    await createDefaultAdmin();

    // Start Express Server
    app.listen(port, () => console.log(`Server running on port ${port}`));

    // Start Background Jobs
    startHoldExpiryJob();
  })
  .catch((err) => console.error("Database connection failed:", err.message));