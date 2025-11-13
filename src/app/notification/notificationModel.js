// src/app/notification/notificationModel.js
const NotificationModel = (DataTypes, sequelize) => {
    const Notification = sequelize.define(
        "notifications",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: true,
                comment: "User who will see this notification",
            },
            agency_id: {
                type: DataTypes.UUID,
                allowNull: true,
                comment: "Agency scope (optional)",
            },
            title: {
                type: DataTypes.STRING(200),
                allowNull: false,
            },
            message: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            type: {
                type: DataTypes.ENUM("INFO", "BOOKING", "PAYMENT", "AGENCY", "SYSTEM"),
                defaultValue: "INFO",
            },
            is_read: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            timestamps: false,
            tableName: "notifications",
        }
    );

    return Notification;
};

export default NotificationModel;
