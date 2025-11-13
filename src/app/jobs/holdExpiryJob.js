import cron from "node-cron";
import db from "../../config/models.js";
import { sendMail, notifyBookingStatus } from "../../utils/mailer.js";

const { Booking, FlightGroup } = db;

/**
 * Runs every 10 minutes, expires bookings past hold_expires_at.
 */
export const startHoldExpiryJob = () => {
    console.log("HoldExpiryJob started — runs every 10 min");

    cron.schedule("*/10 * * * *", async () => {
        console.log("Checking for expired bookings...");
        try {
            const now = new Date();

            const expiredBookings = await Booking.findAll({
                where: {
                    status: ["APPROVED", "PAYMENT_PENDING"],
                    hold_expires_at: { [db.Sequelize.Op.lte]: now },
                },
            });

            if (!expiredBookings.length)
                return console.log("No expired bookings found.");

            for (const booking of expiredBookings) {
                await booking.update({ status: "EXPIRED" });

                const group = await FlightGroup.findByPk(booking.flight_group_id);
                if (group && group.seat_buckets) {
                    const buckets = Array.isArray(group.seat_buckets)
                        ? [...group.seat_buckets]
                        : JSON.parse(group.seat_buckets || "[]");

                    const paxTotal =
                        (booking.pax_counts?.adt || 0) +
                        (booking.pax_counts?.chd || 0) +
                        (booking.pax_counts?.inf || 0);

                    if (buckets[0]) buckets[0].seats += paxTotal;
                    await group.update({ seat_buckets: buckets });
                }

                await notifyBookingStatus(booking, "EXPIRED");
                console.log(`Booking ${booking.id} marked as EXPIRED.`);
            }
        } catch (err) {
            console.error("HoldExpiryJob Error:", err.message);
        }
    });
};