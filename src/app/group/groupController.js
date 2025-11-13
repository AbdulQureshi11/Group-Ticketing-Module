import db from "../../config/models.js";
import { createNotification } from "../../utils/notificationHelper.js";

const { FlightGroup, GroupSeatBucket, AgencySettings, User } = db;
const { Op } = db.Sequelize;

/**
 * Check if Manager is allowed to create flight groups
 */
const checkManagerPermission = async (user) => {
    if (user.role === "ADMIN") return true;

    if (user.role === "MANAGER") {
        let settings = await AgencySettings.findOne({
            where: { agency_id: user.agency_id },
        });

        // Auto-create settings if missing
        if (!settings) {
            settings = await AgencySettings.create({
                agency_id: user.agency_id,
                allow_manager_group_create: false,
                default_hold_hours: 24,
                default_currency: "PKR",
            });
        }

        return settings.allow_manager_group_create === true;
    }

    return false;
};

/**
 * Create Flight Group
 */
export const createGroup = async (req, res) => {
    try {
        const user = req.user;

        const allowed = await checkManagerPermission(user);
        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to create flight groups.",
            });
        }

        const {
            carrier_code,
            flight_number,
            origin,
            destination,
            departure_time_local,
            arrival_time_local,
            pnr_mode,
            sales_start,
            sales_end,
            baggage,
            fare_notes,
            terms,
            seat_buckets,
            status,
        } = req.body;

        if (!carrier_code || !flight_number || !origin || !destination) {
            return res.status(400).json({
                success: false,
                message: "Carrier code, flight number, origin and destination are required.",
            });
        }

        const newGroup = await FlightGroup.create({
            carrier_code,
            flight_number,
            origin,
            destination,
            departure_time_local,
            arrival_time_local,
            pnr_mode: pnr_mode || "PER_BOOKING_PNR",
            sales_start,
            sales_end,
            baggage,
            fare_notes,
            terms,
            created_by: user.user_id,
            status: status || "DRAFT",
        });

        // Add seat buckets
        if (Array.isArray(seat_buckets)) {
            for (const bucket of seat_buckets) {
                await GroupSeatBucket.create({
                    flight_group_id: newGroup.id,
                    class: bucket.class,
                    total_seats: bucket.total_seats || 0,
                    base_price: bucket.base_price || 0,
                    tax: bucket.tax || 0,
                    fee: bucket.fee || 0,
                    currency: bucket.currency || "PKR",
                });
            }
        }

        // Notify agency (Admins / Managers / Sub-Agents)
        await createNotification({
            agency_id: user.agency_id,
            title: "New Group Created",
            message: `A new flight group ${flight_number} has been created.`,
            type: "AGENCY",
        });

        res.status(201).json({
            success: true,
            message: "Flight group created successfully.",
            data: newGroup,
        });
    } catch (err) {
        console.error("Create Group Error:", err);
        return res.status(500).json({
            success: false,
            message: "Error creating flight group.",
            error: err.message,
        });
    }
};

/**
 * Get all groups
 */
export const getGroups = async (req, res) => {
    try {
        const { status, origin, destination, startDate, endDate } = req.query;

        const where = {};
        if (status) where.status = status;
        if (origin) where.origin = origin;
        if (destination) where.destination = destination;
        if (startDate && endDate)
            where.sales_start = { [Op.between]: [startDate, endDate] };

        const groups = await FlightGroup.findAll({
            where,
            include: [{ model: GroupSeatBucket, as: "buckets" }],
            order: [["created_at", "DESC"]],
        });

        return res.status(200).json({
            success: true,
            total: groups.length,
            data: groups,
        });
    } catch (err) {
        console.error("Get Groups Error:", err);
        return res.status(500).json({
            success: false,
            message: "Error fetching flight groups.",
            error: err.message,
        });
    }
};

/**
 * Get group by ID
 */
export const getGroupById = async (req, res) => {
    try {
        const { id } = req.params;

        const group = await FlightGroup.findByPk(id, {
            include: [{ model: GroupSeatBucket, as: "buckets" }],
        });

        if (!group)
            return res
                .status(404)
                .json({ success: false, message: "Flight group not found." });

        return res.status(200).json({ success: true, data: group });
    } catch (err) {
        console.error("Get Group Error:", err);
        return res.status(500).json({
            success: false,
            message: "Error fetching group.",
            error: err.message,
        });
    }
};

/**
 * Update group status (Publish / Close / Cancel)
 */
export const updateGroupStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const group = await FlightGroup.findByPk(id);
        if (!group)
            return res.status(404).json({
                success: false,
                message: "Flight group not found.",
            });

        await group.update({
            status,
            updated_at: new Date(),
        });

        // Notify all users under same agency
        const users = await User.findAll({
            where: { agency_id: group.created_by },
        });

        for (const u of users) {
            await createNotification({
                user_id: u.id,
                title: "Group Status Updated",
                message: `Group ${group.flight_number} is now ${status}.`,
                type: "AGENCY",
            });
        }

        res.status(200).json({
            success: true,
            message: `Group status updated to ${status}.`,
            data: group,
        });
    } catch (err) {
        console.error("Update Group Status Error:", err);
        return res.status(500).json({
            success: false,
            message: "Error updating group status.",
            error: err.message,
        });
    }
};
