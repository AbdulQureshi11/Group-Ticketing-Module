import bcrypt from "bcryptjs";
import db from "../../config/models.js";
const { User, Agency } = db;

/**
 * Create user (Admin within agency)
 */
export const createUser = async (req, res) => {
    try {
        const { agency_id, username, password, email, phone, role } = req.body;

        if (!agency_id || !username || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "agency_id, username, password, and role are required.",
            });
        }

        // Check if agency exists
        const agency = await Agency.findByPk(agency_id);
        if (!agency) return res.status(404).json({ success: false, message: "Agency not found." });

        // Check duplicate username
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser)
            return res.status(400).json({ success: false, message: "Username already exists." });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            agency_id,
            username,
            password_hash: hashedPassword,
            email,
            phone,
            role,
            is_active: true,
        });

        res.status(201).json({
            success: true,
            message: "User created successfully.",
            data: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
                agency_id: newUser.agency_id,
            },
        });
    } catch (error) {
        console.error("Create User Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error creating user.",
            error: error.message,
        });
    }
};

/**
 * Update user (activate/deactivate or change role)
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active, role } = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        await user.update({
            ...(is_active !== undefined && { is_active }),
            ...(role && { role }),
        });

        res.status(200).json({
            success: true,
            message: "User updated successfully.",
            data: user,
        });
    } catch (error) {
        console.error("Update User Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error updating user.",
            error: error.message,
        });
    }
};