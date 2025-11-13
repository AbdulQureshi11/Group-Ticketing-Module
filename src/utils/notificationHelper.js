// src/utils/notificationHelper.js
import db from "../config/models.js";

const { Notification } = db;

export const createNotification = async ({
    user_id = null,
    agency_id = null,
    title,
    message,
    type = "INFO",
}) => {
    try {
        if (!title || !message) return;

        await Notification.create({
            user_id,
            agency_id,
            title,
            message,
            type,
        });
    } catch (err) {
        console.error("Notification create error:", err.message);
    }
};
