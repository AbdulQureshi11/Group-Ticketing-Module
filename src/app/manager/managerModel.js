const ManagerModel = (DataTypes, sequelize) => {
  const Manager = sequelize.define(
    "managers",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      agency_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM("ADMIN", "MANAGER", "SUB_AGENT"),
        defaultValue: "MANAGER",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
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

  return Manager;
};

export default ManagerModel;
