const GroupSeatBucketModel = (DataTypes, sequelize) => {
    const GroupSeatBucket = sequelize.define("group_seat_buckets", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        flight_group_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        class: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        total_seats: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        seats_on_hold: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        seats_issued: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        base_price: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
        },
        tax: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
        },
        fee: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
        },
        currency: {
            type: DataTypes.STRING(10),
            defaultValue: "PKR",
        },
    });

    return GroupSeatBucket;
};

export default GroupSeatBucketModel;
