import db from "../../config/models.js";
import {
    autoAuditLog,
    adjustSeatCounters,
} from "../../middlewares/validationGuards.js";
import { createNotification } from "../../utils/notificationHelper.js";

const { Booking, Passenger, User, Agency } = db;

// Helper: Find Sub-Agent user for a booking
const getBookingOwner = async (booking) => {
    return await User.findByPk(booking.requested_by);
};

/**
 * Create Booking (Sub-Agent)
 */
export const createBooking = async (req, res) => {
    try {
        const { flight_group_id, pax_counts, remarks, requested_hold_hours } = req.body;
        const user = req.user;

        const booking = await Booking.create({
            flight_group_id,
            agency_id: user.agency_id,
            requested_by: user.user_id,
            pax_counts,
            remarks,
            requested_hold_hours: requested_hold_hours || 6,
            status: "REQUESTED",
        });

        await autoAuditLog("BOOKING_CREATED", user, `Booking created for group ${flight_group_id}`);

        // Notify Admin/Manager of this agency
        await createNotification({
            agency_id: user.agency_id,
            title: "New Booking Request",
            message: `A new booking has been requested by ${user.username}.`,
            type: "BOOKING",
        });

        res.status(201).json({ success: true, message: "Booking created successfully.", data: booking });
    } catch (err) {
        console.error("Create Booking Error:", err);
        res.status(500).json({ success: false, message: "Error creating booking.", error: err.message });
    }
};

/**
 * Get All Bookings
 */
export const getBookings = async (req, res) => {
    try {
        const { role, agency_id } = req.user;
        const filter = {};
        if (role === "SUB_AGENT") filter.agency_id = agency_id;

        const bookings = await Booking.findAll({
            where: filter,
            order: [["created_at", "DESC"]],
        });

        res.status(200).json({ success: true, total: bookings.length, data: bookings });
    } catch (err) {
        console.error("Get Bookings Error:", err);
        res.status(500).json({ success: false, message: "Error fetching bookings.", error: err.message });
    }
};

/**
 * Get Booking By ID
 */
export const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await Booking.findByPk(id);
        if (!booking)
            return res.status(404).json({ success: false, message: "Booking not found." });

        res.status(200).json({ success: true, data: booking });
    } catch (err) {
        console.error("Get Booking Error:", err);
        res.status(500).json({ success: false, message: "Error fetching booking.", error: err.message });
    }
};

/**
 * Approve Booking
 */
export const approveBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const booking = await Booking.findByPk(id);
        if (!booking)
            return res.status(404).json({ success: false, message: "Booking not found." });

        const expiry = new Date(Date.now() + (booking.requested_hold_hours || 6) * 3600 * 1000);

        await booking.update({
            status: "APPROVED",
            approved_at: new Date(),
            hold_expires_at: expiry,
        });

        await adjustSeatCounters(booking, "APPROVE");
        await autoAuditLog("BOOKING_APPROVED", user, `Booking ${id} approved.`);

        const owner = await getBookingOwner(booking);

        await createNotification({
            user_id: owner.id,
            title: "Booking Approved",
            message: `Your booking ${booking.id} has been approved.`,
            type: "BOOKING",
        });

        res.status(200).json({ success: true, message: "Booking approved successfully.", data: booking });
    } catch (err) {
        console.error("Approve Booking Error:", err);
        res.status(500).json({ success: false, message: "Error approving booking.", error: err.message });
    }
};

/**
 * Reject Booking
 */
export const rejectBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        const user = req.user;

        const booking = await Booking.findByPk(id);
        if (!booking)
            return res.status(404).json({ success: false, message: "Booking not found." });

        await booking.update({ status: "REJECTED", remarks });

        await adjustSeatCounters(booking, "REJECT");
        await autoAuditLog("BOOKING_REJECTED", user, `Booking ${id} rejected.`);

        const owner = await getBookingOwner(booking);

        await createNotification({
            user_id: owner.id,
            title: "Booking Rejected",
            message: `Your booking ${booking.id} was rejected.`,
            type: "BOOKING",
        });

        res.status(200).json({ success: true, message: "Booking rejected successfully.", data: booking });
    } catch (err) {
        console.error("Reject Booking Error:", err);
        res.status(500).json({ success: false, message: "Error rejecting booking.", error: err.message });
    }
};

/**
 * Mark Payment Pending
 */
export const markPaymentPending = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const booking = await Booking.findByPk(id);

        await booking.update({ status: "PAYMENT_PENDING" });

        const owner = await getBookingOwner(booking);

        await createNotification({
            user_id: owner.id,
            title: "Payment Pending",
            message: `Your booking ${booking.id} requires payment.`,
            type: "PAYMENT",
        });

        res.status(200).json({ success: true, message: "Booking moved to PAYMENT_PENDING.", data: booking });
    } catch (err) {
        console.error("Payment Pending Error:", err);
        res.status(500).json({ success: false, message: "Error marking payment pending.", error: err.message });
    }
};

/**
 * Mark as Paid
 */
export const markAsPaid = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await Booking.findByPk(id);
        await booking.update({ status: "PAID", payment_received_at: new Date() });

        const owner = await getBookingOwner(booking);

        await createNotification({
            user_id: owner.id,
            title: "Payment Received",
            message: `Payment for booking ${booking.id} has been verified.`,
            type: "PAYMENT",
        });

        res.status(200).json({ success: true, message: "Booking marked as paid.", data: booking });
    } catch (err) {
        console.error("Mark Paid Error:", err);
        res.status(500).json({ success: false, message: "Error marking paid.", error: err.message });
    }
};

/**
 * Issue Booking
 */
export const issueBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { pnr, passengers } = req.body;
        const user = req.user;

        const booking = await Booking.findByPk(id);

        for (const pax of passengers) {
            await Passenger.update(
                { pnr: pnr || pax.pnr, ticket_no: pax.ticket_no },
                { where: { id: pax.id } }
            );
        }

        await booking.update({ status: "ISSUED", issued_at: new Date() });

        await adjustSeatCounters(booking, "ISSUE");
        await autoAuditLog("BOOKING_ISSUED", user, `Booking ${id} issued.`);

        const owner = await getBookingOwner(booking);

        await createNotification({
            user_id: owner.id,
            title: "Tickets Issued",
            message: `Tickets for booking ${booking.id} have been issued.`,
            type: "BOOKING",
        });

        res.status(200).json({ success: true, message: "Booking issued successfully.", data: booking });
    } catch (err) {
        console.error("Issue Booking Error:", err);
        res.status(500).json({ success: false, message: "Error issuing booking.", error: err.message });
    }
};

/**
 * Cancel Booking
 */
export const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const booking = await Booking.findByPk(id);
        await booking.update({ status: "CANCELLED" });

        await autoAuditLog("BOOKING_CANCELLED", user, `Booking ${id} cancelled.`);

        const owner = await getBookingOwner(booking);

        await createNotification({
            user_id: owner.id,
            title: "Booking Cancelled",
            message: `Your booking ${booking.id} has been cancelled.`,
            type: "BOOKING",
        });

        res.status(200).json({ success: true, message: "Booking cancelled.", data: booking });
    } catch (err) {
        console.error("Cancel Error:", err);
        res.status(500).json({ success: false, message: "Error cancelling booking.", error: err.message });
    }
};
