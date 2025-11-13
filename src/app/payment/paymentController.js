import db from "../../config/models.js";
import { upload } from "../../utils/upload.js";
import { autoAuditLog } from "../../middlewares/validationGuards.js";
import { createNotification } from "../../utils/notificationHelper.js";

const { PaymentProof, Booking, User } = db;

const getBookingOwner = async (booking) => {
    return await User.findByPk(booking.requested_by);
};

export const uploadPaymentProof = [
    upload.single("proof"),

    async (req, res) => {
        try {
            const { id } = req.params;
            const user = req.user;

            const booking = await Booking.findByPk(id);
            if (!booking)
                return res.status(404).json({ success: false, message: "Booking not found." });

            if (!req.file)
                return res.status(400).json({ success: false, message: "Proof file is required." });

            // Normalize and clean body keys (remove extra spaces)
            const cleanBody = {};
            Object.keys(req.body).forEach((key) => {
                cleanBody[key.trim().toLowerCase()] = req.body[key]?.trim?.() || req.body[key];
            });

            console.log("CLEAN BODY:", cleanBody);

            const bank_name = cleanBody.bank_name || null;
            const amount = cleanBody.amount ? Number(cleanBody.amount) : null;
            const currency = cleanBody.currency || null;
            const reference_no = cleanBody.reference_no || null;

            console.log({ bank_name, amount, currency, reference_no });

            const proof = await PaymentProof.create({
                booking_id: id,
                uploaded_by: user.user_id,
                bank_name,
                amount,
                currency,
                reference_no,
                file_path: req.file.path,
                file_url: `/uploads/payments/${req.file.filename}`,
            });

            await booking.update({ status: "PAYMENT_PENDING" });

            await autoAuditLog(
                "PAYMENT_PROOF_UPLOADED",
                user,
                `Payment proof uploaded for booking ${id}`
            );

            await createNotification({
                agency_id: user.agency_id,
                title: "Payment Proof Uploaded",
                message: `Payment proof uploaded for booking ${booking.id}.`,
                type: "PAYMENT",
            });

            return res.status(201).json({
                success: true,
                message: "Payment proof uploaded successfully.",
                data: proof,
            });

        } catch (err) {
            console.error("Upload Payment Proof Error:", err);
            return res.status(500).json({
                success: false,
                message: "Error uploading payment proof.",
                error: err.message,
            });
        }
    },
];


// ---------------------------
// Verify Payment Proof
// ---------------------------
export const verifyPaymentProof = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const proof = await PaymentProof.findByPk(id);
        if (!proof)
            return res.status(404).json({ success: false, message: "Payment proof not found." });

        const booking = await Booking.findByPk(proof.booking_id);
        const owner = await getBookingOwner(booking);

        await proof.update({
            verified: true,
            verified_by: user.user_id,
            verified_at: new Date(),
        });

        await booking.update({
            status: "PAID",
            payment_received_at: new Date(),
        });

        await autoAuditLog(
            "PAYMENT_VERIFIED",
            user,
            `Payment verified for booking ${booking.id}`
        );

        await createNotification({
            user_id: owner.id,
            title: "Payment Verified",
            message: `Payment for booking ${booking.id} has been verified.`,
            type: "PAYMENT",
        });

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully.",
        });

    } catch (err) {
        console.error("Verify Payment Error:", err);
        return res.status(500).json({
            success: false,
            message: "Error verifying payment.",
            error: err.message,
        });
    }
};
