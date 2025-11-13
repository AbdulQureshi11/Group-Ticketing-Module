const SettingsModel = (DataTypes, sequelize) => {
    const AgencySettings = sequelize.define("agency_settings", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        agency_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        allow_manager_group_create: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        default_hold_hours: {
            type: DataTypes.INTEGER,
            defaultValue: 24,
        },
        default_currency: {
            type: DataTypes.STRING(3),
            defaultValue: "PKR",
        },
        notify_email: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        notify_phone: {
            type: DataTypes.STRING(30),
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });

    return AgencySettings;
};

export default SettingsModel;
