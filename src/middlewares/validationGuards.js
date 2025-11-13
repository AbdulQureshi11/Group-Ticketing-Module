import db from "../config/models.js";
const { Booking, GroupSeatBucket, PaymentProof, AuditLog } = db;

/**
 * Seat availability check (normalized bucket system)
 */
export const validateSeatAvailability = async (req, res, next) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findByPk(id);
        if (!booking)
            return res.status(404).json({ success: false, message: "Booking not found." });

        const buckets = await GroupSeatBucket.findAll({
            where: { flight_group_id: booking.flight_group_id },
        });
        if (!buckets.length)
            return res
                .status(400)
                .json({ success: false, message: "No seat buckets defined for this group." });

        const paxTotal =
            (booking.pax_counts?.adt || 0) +
            (booking.pax_counts?.chd || 0) +
            (booking.pax_counts?.inf || 0);

        const totalFree = buckets.reduce(
            (sum, b) => sum + (b.total_seats - b.seats_on_hold - b.seats_issued),
            0
        );

        if (paxTotal > totalFree) {
            return res.status(400).json({
                success: false,
                message: `Insufficient seats. Requested ${paxTotal}, available ${totalFree}.`,
            });
        }

        next();
    } catch (err) {
        console.error("Seat Availability Error:", err.message);
        res.status(500).json({ success: false, message: "Seat check failed." });
    }
};

/**
 * FSM status transition validator
 */
export const validateStatusTransition = async (req, res, next) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findByPk(id);
        if (!booking)
            return res.status(404).json({ success: false, message: "Booking not found." });

        const path = req.originalUrl.toLowerCase();

        const validTransitions = {
            "/approve": ["REQUESTED", "PENDING"],
            "/mark-payment-pending": ["APPROVED"],
            "/mark-paid": ["PAYMENT_PENDING", "APPROVED"],
            "/issue": ["PAID"],
            "/reject": ["REQUESTED", "APPROVED", "PAYMENT_PENDING"],
            "/cancel": ["REQUESTED", "APPROVED", "PAID", "PAYMENT_PENDING"],
        };

        const action = Object.keys(validTransitions).find((a) => path.includes(a));
        if (!action) return next();

        const allowed = validTransitions[action];
        if (!allowed.includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid transition. Booking is '${booking.status}', allowed: ${allowed.join(
                    ", "
                )}.`,
            });
        }

        // require verified payment proof before issue
        if (path.includes("/issue")) {
            const verified = await PaymentProof.findOne({
                where: { booking_id: id, verified: true },
            });
            if (!verified)
                return res.status(400).json({
                    success: false,
                    message: "Cannot issue booking. Payment proof not verified.",
                });
        }

        next();
    } catch (err) {
        console.error("Status Transition Error:", err.message);
        res.status(500).json({ success: false, message: "Error validating transition." });
    }
};

/**
 * Seat counter updates (normalized buckets)
 */
export const adjustSeatCounters = async (booking, actionType) => {
    try {
        const buckets = await GroupSeatBucket.findAll({
            where: { flight_group_id: booking.flight_group_id },
        });
        if (!buckets.length) return;

        const paxTotal =
            (booking.pax_counts?.adt || 0) +
            (booking.pax_counts?.chd || 0) +
            (booking.pax_counts?.inf || 0);

        const b = buckets[0];

        switch (actionType) {
            case "APPROVE":
                b.seats_on_hold += paxTotal;
                break;
            case "REJECT":
            case "EXPIRE":
                b.seats_on_hold = Math.max(b.seats_on_hold - paxTotal, 0);
                break;
            case "ISSUE":
                b.seats_on_hold = Math.max(b.seats_on_hold - paxTotal, 0);
                b.seats_issued += paxTotal;
                break;
            default:
                return;
        }

        await b.save();
        console.log(`Seats updated (${actionType}): ${paxTotal}`);
    } catch (err) {
        console.error("Seat Counter Adjust Error:", err.message);
    }
};

/**
 * Auto audit logger
 */
export const autoAuditLog = async (action, user, description = null) => {
    try {
        await AuditLog.create({
            user_id: user?.user_id || null,
            username: user?.username || "system",
            action,
            description,
            ip_address: "system",
        });
    } catch (err) {
        console.error("Auto Audit Error:", err.message);
    }
};
