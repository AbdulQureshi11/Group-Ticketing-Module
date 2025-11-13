const AuditLogModel = (DataTypes, sequelize) => {
    const AuditLog = sequelize.define("audit_logs", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        username: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        action: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ip_address: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });

    return AuditLog;
};

export default AuditLogModel;
