import bcrypt from "bcryptjs";
import db from "../../config/models.js";

const { User, Booking, FlightGroup, PaymentProof } = db;

/**
 * Create Manager (Admin Only)
 */
export const createManager = async (req, res) => {
  try {
    const { agency_id, username, password, email, phone } = req.body;

    if (!agency_id || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "agency_id, username, and password are required.",
      });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const manager = await User.create({
      agency_id,
      username,
      password_hash: hashedPassword,
      email,
      phone,
      role: "MANAGER",
      is_active: true,
    });

    return res.status(201).json({
      success: true,
      message: "Manager account created successfully.",
      data: {
        id: manager.id,
        username: manager.username,
        role: manager.role,
        email: manager.email,
        phone: manager.phone,
      },
    });
  } catch (error) {
    console.error("createManager Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error creating manager." });
  }
};

/**
 * Manager Dashboard — Summary for their agency
 */
export const managerDashboard = async (req, res) => {
  try {
    const { agency_id } = req.user;

    const totalBookings = await Booking.count({ where: { agency_id } });
    const approvedBookings = await Booking.count({ where: { agency_id, status: "APPROVED" } });
    const paidBookings = await Booking.count({ where: { agency_id, status: "PAID" } });
    const issuedBookings = await Booking.count({ where: { agency_id, status: "ISSUED" } });

    return res.status(200).json({
      success: true,
      message: "Manager Dashboard Summary",
      data: {
        totalBookings,
        approvedBookings,
        paidBookings,
        issuedBookings,
      },
    });
  } catch (error) {
    console.error("Manager Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading manager dashboard.",
      error: error.message,
    });
  }
};

/**
 * View Booking Requests for Manager’s Agency
 */
export const viewBookingRequests = async (req, res) => {
  try {
    const { agency_id } = req.user;
    const bookings = await Booking.findAll({
      where: { agency_id },
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      total: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("View Booking Requests Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booking requests.",
      error: error.message,
    });
  }
};

/**
 * Approve / Reject Booking (Manager)
 */
export const manageBookingRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body; // action = "approve" or "reject"
    const { agency_id } = req.user;

    const booking = await Booking.findByPk(id);
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found." });

    if (booking.agency_id !== agency_id)
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only manage your agency's bookings.",
      });

    if (action === "approve") {
      await booking.update({ status: "APPROVED", approved_at: new Date() });
    } else if (action === "reject") {
      await booking.update({
        status: "REJECTED",
        remarks: remarks || "Rejected by Manager",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use 'approve' or 'reject'.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Booking ${action}d successfully.`,
      data: booking,
    });
  } catch (error) {
    console.error("Manage Booking Request Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating booking.",
      error: error.message,
    });
  }
};

/**
 * Verify Payment Proof (Manager)
 */
export const verifyPaymentProofs = async (req, res) => {
  try {
    const { id } = req.params; // payment proof id
    const { agency_id } = req.user;

    const proof = await PaymentProof.findByPk(id, { include: Booking });
    if (!proof)
      return res.status(404).json({ success: false, message: "Payment proof not found." });

    if (proof.Booking.agency_id !== agency_id)
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only verify payments for your agency.",
      });

    await proof.update({ verified: true });

    return res.status(200).json({
      success: true,
      message: "Payment proof verified successfully.",
      data: proof,
    });
  } catch (error) {
    console.error("Verify Payment Proof Error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying payment proof.",
      error: error.message,
    });
  }
};

/**
 * List Flight Groups for Manager’s Agency
 */
export const listAgencyGroups = async (req, res) => {
  try {
    const { agency_id } = req.user;

    const groups = await FlightGroup.findAll({
      where: { created_by: agency_id },
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      total: groups.length,
      data: groups,
    });
  } catch (error) {
    console.error("List Agency Groups Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching groups.",
      error: error.message,
    });
  }
};