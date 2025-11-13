import db from "../../config/models.js";
const { Agency } = db;

/**
 * Create a new agency (Admin only)
 */
export const createAgency = async (req, res) => {
    try {
        const { name, code, country, city, phone } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                success: false,
                message: "Agency name and code are required.",
            });
        }

        // Check duplicate code
        const existing = await Agency.findOne({ where: { code } });
        if (existing)
            return res.status(400).json({ success: false, message: "Agency code already exists." });

        const agency = await Agency.create({
            name,
            code,
            country,
            city,
            phone,
        });

        res.status(201).json({
            success: true,
            message: "Agency created successfully.",
            data: agency,
        });
    } catch (error) {
        console.error("Create Agency Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error creating agency.",
            error: error.message,
        });
    }
};

/**
 * Get single agency by ID
 */
export const getAgencyById = async (req, res) => {
    try {
        const { id } = req.params;
        const agency = await Agency.findByPk(id);

        if (!agency)
            return res.status(404).json({ success: false, message: "Agency not found." });

        res.status(200).json({ success: true, data: agency });
    } catch (error) {
        console.error("Get Agency Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching agency.",
            error: error.message,
        });
    }
};