import db from "../../config/models.js";
const { AuditLog } = db;

export const logAction = async (req, res) => {
    try {
        const { action, description } = req.body;
        const user = req.user;

        const log = await AuditLog.create({
            user_id: user?.user_id,
            username: user?.username,
            action,
            description,
            ip_address: req.ip,
        });

        res.status(201).json({ success: true, message: "Action logged.", data: log });
    } catch (err) {
        console.error("Audit Log Error:", err);
        res.status(500).json({ success: false, message: "Error logging action." });
    }
};

export const getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.findAll({ order: [["created_at", "DESC"]] });
        res.status(200).json({ success: true, total: logs.length, data: logs });
    } catch (err) {
        console.error("Get Logs Error:", err);
        res.status(500).json({ success: false, message: "Error fetching logs." });
    }
};
