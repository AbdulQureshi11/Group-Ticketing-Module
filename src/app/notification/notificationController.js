// src/app/notification/notificationController.js
import db from "../../config/models.js";

const { Notification } = db;
const { Op } = db.Sequelize;

/**
 * GET /api/notifications
 * - Admin: can see all (optionally filter by agency_id)
 * - Others: see notifications for their user_id OR agency_id
 */
export const getNotifications = async (req, res) => {
    try {
        const { role, user_id, agency_id } = req.user;
        const { is_read } = req.query;

        const where = {};

        if (is_read === "true") where.is_read = true;
        if (is_read === "false") where.is_read = false;

        if (role === "ADMIN") {
            // admin can see all, optional future filters
        } else {
            where[Op.or] = [
                { user_id },
                { agency_id: agency_id || null },
            ];
        }

        const list = await Notification.findAll({
            where,
            order: [["created_at", "DESC"]],
        });

        res.status(200).json({
            success: true,
            total: list.length,
            data: list,
        });
    } catch (err) {
        console.error("Get Notifications Error:", err);
        res.status(500).json({
            success: false,
            message: "Error fetching notifications.",
            error: err.message,
        });
    }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as read
 */
export const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, user_id, agency_id } = req.user;

        const notification = await Notification.findByPk(id);
        if (!notification)
            return res
                .status(404)
                .json({ success: false, message: "Notification not found." });

        // simple ownership check (admin bypass)
        if (role !== "ADMIN") {
            if (
                notification.user_id &&
                notification.user_id !== user_id &&
                notification.agency_id !== agency_id
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You are not allowed to modify this notification.",
                });
            }
        }

        await notification.update({ is_read: true });

        res.status(200).json({
            success: true,
            message: "Notification marked as read.",
        });
    } catch (err) {
        console.error("Mark Notification Read Error:", err);
        res.status(500).json({
            success: false,
            message: "Error updating notification.",
            error: err.message,
        });
    }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications of current user/agency as read
 */
export const markAllNotificationsRead = async (req, res) => {
    try {
        const { role, user_id, agency_id } = req.user;

        const where = {};
        if (role === "ADMIN") {
            // admin → mark all as read (optional)
        } else {
            where[Op.or] = [
                { user_id },
                { agency_id: agency_id || null },
            ];
        }

        await Notification.update(
            { is_read: true },
            { where }
        );

        res.status(200).json({
            success: true,
            message: "All notifications marked as read.",
        });
    } catch (err) {
        console.error("Mark All Notification Read Error:", err);
        res.status(500).json({
            success: false,
            message: "Error marking all notifications read.",
            error: err.message,
        });
    }
};
