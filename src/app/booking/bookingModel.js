// src/app/booking/bookingModel.js
const BookingModel = (DataTypes, sequelize) => {
    const Booking = sequelize.define(
        "bookings",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            flight_group_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            agency_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            requested_by: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            // FSM States per PRD
            status: {
                type: DataTypes.ENUM(
                    "REQUESTED",          // created by sub-agent
                    "APPROVED",           // approved by manager/admin
                    "PAYMENT_PENDING",    // awaiting proof
                    "PAID",               // verified payment
                    "ISSUED",             // tickets issued
                    "EXPIRED",            // hold expired automatically
                    "REJECTED",
                    "CANCELLED"
                ),
                defaultValue: "REQUESTED",
            },

            pax_counts: { type: DataTypes.JSON, allowNull: false },
            remarks: { type: DataTypes.TEXT, allowNull: true },
            requested_hold_hours: { type: DataTypes.INTEGER, allowNull: true },

            // expiry timestamp
            hold_expires_at: { type: DataTypes.DATE, allowNull: true },

            approved_at: { type: DataTypes.DATE, allowNull: true },
            payment_received_at: { type: DataTypes.DATE, allowNull: true },
            issued_at: { type: DataTypes.DATE, allowNull: true },
            created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        },
        { timestamps: false }
    );

    return Booking;
};

export default BookingModel;
