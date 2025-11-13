import bcrypt from "bcryptjs";
import db from "../../config/models.js";
import { createNotification } from "../../utils/notificationHelper.js";

const { SubAgentRequest, User, Agency, Booking, FlightGroup } = db;

/* ======================================================
   Get all pending Sub-Agent registration requests
====================================================== */
export const getPendingRequests = async (req, res) => {
  try {
    const pending = await SubAgentRequest.findAll({
      where: { status: "PENDING" },
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({
      success: true,
      message: "Pending Sub-Agent requests fetched successfully.",
      total: pending.length,
      data: pending,
    });
  } catch (err) {
    console.error("Error fetching pending requests:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching Sub-Agent requests.",
      error: err.message,
    });
  }
};

/* ======================================================
   APPROVE Sub-Agent registration request
   - Create Agency with full details
   - Create User
   - Notifications added
====================================================== */
export const approveSubAgent = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await SubAgentRequest.findByPk(id);
    if (!request)
      return res.status(404).json({ success: false, message: "Sub-Agent request not found." });

    if (request.status !== "PENDING")
      return res.status(400).json({
        success: false,
        message: "Request already processed.",
      });

    // Create Agency
    const newAgency = await Agency.create({
      name: request.agency_name,
      code: `AG-${Math.floor(1000 + Math.random() * 9000)}`,
      address: request.address || null,
      phone: request.phone || null,
      email: request.email || null,
      status: "ACTIVE",
    });

    // Create User
    const newUser = await User.create({
      agency_id: newAgency.id,
      username: request.username,
      email: request.email,
      phone: request.phone,
      password_hash: request.password_hash,
      role: "SUB_AGENT",
      is_active: true,
    });

    // Update Request
    await request.update({
      status: "APPROVED",
      approved_at: new Date(),
      remarks: "Approved and linked Agency created.",
    });

    // Notifications
    await createNotification({
      user_id: newUser.id,
      title: "Account Approved",
      message: "Your Sub-Agent request has been approved by Admin.",
      type: "AGENCY",
    });

    await createNotification({
      agency_id: newAgency.id,
      title: "New Sub-Agent Registered",
      message: `A new sub-agent (${newUser.username}) has joined your agency.`,
      type: "AGENCY",
    });

    res.status(200).json({
      success: true,
      message: "Sub-Agent approved successfully.",
      data: {
        agency_id: newAgency.id,
        agency_name: newAgency.name,
        agency_code: newAgency.code,
        sub_agent_id: newUser.id,
        username: newUser.username,
      },
    });
  } catch (err) {
    console.error("Approve Sub-Agent Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error approving Sub-Agent.",
      error: err.message,
    });
  }
};

/* ======================================================
   REJECT
====================================================== */
export const rejectSubAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const request = await SubAgentRequest.findByPk(id);
    if (!request)
      return res.status(404).json({ success: false, message: "Sub-Agent request not found." });

    if (request.status !== "PENDING")
      return res.status(400).json({ success: false, message: "Request already processed." });

    await request.update({
      status: "REJECTED",
      remarks: remarks || "Rejected by admin",
      approved_at: new Date(),
    });

    // Notification to user email holder (request)
    await createNotification({
      title: "Registration Rejected",
      message: "Your Sub-Agent request has been rejected by Admin.",
      type: "AGENCY",
    });

    res.status(200).json({
      success: true,
      message: "Sub-Agent request rejected successfully.",
    });
  } catch (err) {
    console.error("Reject Sub-Agent Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error rejecting Sub-Agent.",
      error: err.message,
    });
  }
};

/* ======================================================
   ADMIN DASHBOARD
====================================================== */
export const adminDashboard = async (req, res) => {
  try {
    const totalAgencies = await Agency.count();
    const totalUsers = await User.count();
    const totalGroups = await FlightGroup.count();
    const totalBookings = await Booking.count();

    const pendingBookings = await Booking.count({ where: { status: "PENDING" } });
    const approvedBookings = await Booking.count({ where: { status: "APPROVED" } });
    const paidBookings = await Booking.count({ where: { status: "PAID" } });
    const issuedBookings = await Booking.count({ where: { status: "ISSUED" } });
    const cancelledBookings = await Booking.count({ where: { status: "CANCELLED" } });

    res.status(200).json({
      success: true,
      message: "Admin Dashboard Summary",
      data: {
        totalAgencies,
        totalUsers,
        totalGroups,
        totalBookings,
        pendingBookings,
        approvedBookings,
        paidBookings,
        issuedBookings,
        cancelledBookings,
      },
    });
  } catch (err) {
    console.error("Admin Dashboard Error:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data.",
      error: err.message,
    });
  }
};
