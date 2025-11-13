const GroupModel = (DataTypes, sequelize) => {
    const Group = sequelize.define(
        "flight_groups",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            agency_id: { type: DataTypes.UUID, allowNull: true },
            created_by: { type: DataTypes.UUID, allowNull: false },

            carrier_code: { type: DataTypes.STRING(10), allowNull: false },
            flight_number: { type: DataTypes.STRING(20), allowNull: false },
            origin: { type: DataTypes.STRING(10), allowNull: false },
            destination: { type: DataTypes.STRING(10), allowNull: false },

            departure_time_local: { type: DataTypes.DATE, allowNull: true },
            arrival_time_local: { type: DataTypes.DATE, allowNull: true },

            pnr_mode: {
                type: DataTypes.ENUM("GROUP_PNR", "PER_BOOKING_PNR"),
                defaultValue: "PER_BOOKING_PNR",
            },

            sales_start: { type: DataTypes.DATE, allowNull: true },
            sales_end: { type: DataTypes.DATE, allowNull: true },

            baggage: { type: DataTypes.STRING(100), allowNull: true },
            fare_notes: { type: DataTypes.TEXT, allowNull: true },
            terms: { type: DataTypes.TEXT, allowNull: true },

            // No more JSON seat_buckets
            status: {
                type: DataTypes.ENUM("DRAFT", "PUBLISHED", "CLOSED", "CANCELLED"),
                defaultValue: "DRAFT",
            },

            created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        },
        { timestamps: false }
    );

    return Group;
};

export default GroupModel;
