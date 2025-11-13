import db from "../../config/models.js";
const { AgencySettings } = db;

/**
 * GET /settings/agency
 * Fetch or auto-create current agency settings for logged-in user
 */
export const getAgencySettings = async (req, res) => {
    try {
        const { agency_id, username, role } = req.user;

        // Safety check: user must have an agency
        if (!agency_id) {
            return res.status(400).json({
                success: false,
                message: `User '${username}' (role: ${role}) is not linked to any agency.`,
            });
        }

        // Find existing settings
        let settings = await AgencySettings.findOne({ where: { agency_id } });

        // Auto-create default settings if not found
        if (!settings) {
            settings = await AgencySettings.create({
                agency_id,
                allow_manager_group_create: false,
                default_hold_hours: 24,
                default_currency: "PKR",
                notify_email: null,
                notify_phone: null,
            });
            console.log(`🆕 Default settings created for agency ${agency_id}`);
        }

        res.status(200).json({
            success: true,
            message: "Agency settings fetched successfully.",
            data: settings,
        });
    } catch (err) {
        console.error("Get Agency Settings Error:", err);
        res.status(500).json({
            success: false,
            message: "Error fetching agency settings.",
            error: err.message,
        });
    }
};

/**
 * PATCH /settings/agency
 * Update settings (Admin or Manager only)
 */
export const updateAgencySettings = async (req, res) => {
    try {
        const { agency_id, role, username } = req.user;

        // Safety check: must have agency linked
        if (!agency_id) {
            return res.status(400).json({
                success: false,
                message: `User '${username}' (role: ${role}) is not linked to any agency.`,
            });
        }

        // Only Admin/Manager can update
        if (!["ADMIN", "MANAGER"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admin or Manager can update settings.",
            });
        }

        // Find existing settings or create default
        let settings = await AgencySettings.findOne({ where: { agency_id } });
        if (!settings) {
            settings = await AgencySettings.create({
                agency_id,
                allow_manager_group_create: false,
                default_hold_hours: 24,
                default_currency: "PKR",
                notify_email: null,
                notify_phone: null,
            });
        }

        // Extract fields from body
        const {
            allow_manager_group_create,
            default_hold_hours,
            default_currency,
            notify_email,
            notify_phone,
        } = req.body;

        // Update values safely
        await settings.update({
            allow_manager_group_create:
                allow_manager_group_create ?? settings.allow_manager_group_create,
            default_hold_hours: default_hold_hours ?? settings.default_hold_hours,
            default_currency: default_currency ?? settings.default_currency,
            notify_email: notify_email ?? settings.notify_email,
            notify_phone: notify_phone ?? settings.notify_phone,
            updated_at: new Date(),
        });

        res.status(200).json({
            success: true,
            message: "Settings updated successfully.",
            data: settings,
        });
    } catch (err) {
        console.error("Update Agency Settings Error:", err);
        res.status(500).json({
            success: false,
            message: "Error updating settings.",
            error: err.message,
        });
    }
};
