import nodemailer from "nodemailer";

export const mailTransporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: process.env.MAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

/**
 * Generic mail sender
 */
export const sendMail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from:
                process.env.MAIL_FROM ||
                `"Group Ticketing System" <${process.env.MAIL_USER}>`,
            to,
            subject,
            html,
        };

        const info = await mailTransporter.sendMail(mailOptions);
        console.log(`Email sent → ${to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("Email send error:", error.message);
        return false;
    }
};

/**
 * 🔔 Booking Status Notifications
 * Dynamic helper — use across controllers.
 */
export const notifyBookingStatus = async (booking, newStatus) => {
    const subjects = {
        APPROVED: "Booking Approved",
        REJECTED: "Booking Rejected",
        PAYMENT_PENDING: "Awaiting Payment Proof",
        PAID: "Payment Verified",
        ISSUED: "Tickets Issued",
        EXPIRED: "Booking Expired",
        CANCELLED: "Booking Cancelled",
    };

    const subject = subjects[newStatus] || "Booking Update";
    const html = `
      <div style="font-family:Arial;padding:10px;">
        <h2>${subject}</h2>
        <p>Booking ID: <b>${booking.id}</b></p>
        <p>Current Status: <b>${newStatus}</b></p>
        <p>Date: ${new Date().toLocaleString()}</p>
        <hr/>
        <p>This is an automated notification from Group Ticketing System.</p>
      </div>
  `;

    await sendMail(
        "agency@example.com",
        subject,
        html
    );
};