// src/app/passenger/passengerController.js
import db from "../../config/models.js";
import { autoAuditLog } from "../../middlewares/validationGuards.js";

const { Passenger, Booking } = db;

/**
 * Add Passengers to Booking
 */
export const addPassengers = async (req, res) => {
    try {
        const { id } = req.params; // booking_id
        const { passengers } = req.body; // array of passenger objects
        const user = req.user;

        if (!Array.isArray(passengers) || passengers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Passengers array is required.",
            });
        }

        const booking = await Booking.findByPk(id);
        if (!booking)
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });

        if (booking.status === "ISSUED")
            return res.status(400).json({
                success: false,
                message: "Cannot add passengers after issuance.",
            });

        // map validated passenger data
        const mapped = passengers.map((p) => ({
            booking_id: id,
            title: p.title || null,
            first_name: p.first_name,
            last_name: p.last_name,
            pax_type: p.pax_type || "ADT",
            passport_no: p.passport_no,
            passport_expiry: p.passport_expiry || null,
            nationality: p.nationality || null,
            date_of_birth: p.date_of_birth || null,
        }));

        const createdPassengers = await Passenger.bulkCreate(mapped);

        await autoAuditLog(
            "PASSENGERS_ADDED",
            user,
            `Added ${createdPassengers.length} passengers to booking ${id}`
        );

        res.status(201).json({
            success: true,
            message: "Passengers added successfully.",
            total: createdPassengers.length,
            data: createdPassengers,
        });
    } catch (err) {
        console.error("Add Passengers Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error adding passengers.",
            error: err.message,
        });
    }
};

/**
 * Update Passenger Details (Name / PNR / Ticket)
 */
export const updatePassenger = async (req, res) => {
    try {
        const { id } = req.params; // passenger_id
        const {
            pnr,
            ticket_no,
            first_name,
            last_name,
            passport_no,
            passport_expiry,
            nationality,
            date_of_birth,
            pax_type,
            title,
        } = req.body;

        const user = req.user;
        const passenger = await Passenger.findByPk(id);

        if (!passenger)
            return res
                .status(404)
                .json({ success: false, message: "Passenger not found." });

        await passenger.update({
            pnr,
            ticket_no,
            first_name,
            last_name,
            passport_no,
            passport_expiry,
            nationality,
            date_of_birth,
            pax_type,
            title,
        });

        await autoAuditLog(
            "PASSENGER_UPDATED",
            user,
            `Updated passenger ${id} (${pnr || "no PNR"})`
        );

        res.status(200).json({
            success: true,
            message: "Passenger updated successfully.",
            data: passenger,
        });
    } catch (err) {
        console.error("Update Passenger Error:", err);
        res.status(500).json({
            success: false,
            message: "Error updating passenger.",
            error: err.message,
        });
    }
};

/**
 * List Passengers for a Booking
 */
export const listPassengers = async (req, res) => {
    try {
        const { id } = req.params; // booking_id
        const user = req.user;

        const booking = await Booking.findByPk(id);
        if (!booking)
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });

        const passengers = await Passenger.findAll({
            where: { booking_id: id },
            order: [["created_at", "ASC"]],
        });

        await autoAuditLog(
            "PASSENGERS_VIEWED",
            user,
            `Viewed ${passengers.length} passengers for booking ${id}`
        );

        res.status(200).json({
            success: true,
            total: passengers.length,
            data: passengers,
        });
    } catch (err) {
        console.error("List Passenger Error:", err);
        res.status(500).json({
            success: false,
            message: "Error fetching passengers.",
            error: err.message,
        });
    }
};
