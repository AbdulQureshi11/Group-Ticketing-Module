// src/app/passenger/passengerModel.js
const PassengerModel = (DataTypes, sequelize) => {
    const Passenger = sequelize.define(
        "passengers",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            booking_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            title: {
                type: DataTypes.STRING(10),
                allowNull: true,
                comment: "Mr / Mrs / Miss / Mstr",
            },
            first_name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            last_name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            pax_type: {
                type: DataTypes.ENUM("ADT", "CHD", "INF"),
                allowNull: false,
                defaultValue: "ADT",
                comment: "Passenger type: Adult, Child, or Infant",
            },
            passport_no: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            passport_expiry: {
                type: DataTypes.DATEONLY,
                allowNull: true,
                comment: "Passport expiry date",
            },
            nationality: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            date_of_birth: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            pnr: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            ticket_no: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            timestamps: false,
        }
    );

    return Passenger;
};

export default PassengerModel;
