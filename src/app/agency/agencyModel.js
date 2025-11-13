// src/app/agency/agencyModel.js
const AgencyModel = (DataTypes, sequelize) => {
    const Agency = sequelize.define("agencies", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING(30),
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING(150),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
            defaultValue: "ACTIVE",
        },
    });
    return Agency;
};

export default AgencyModel;
