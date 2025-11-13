// src/app/auth/authModel.js
const UserModel = (DataTypes, sequelize) => {
  const User = sequelize.define(
    "users",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      agency_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      username: {
        type: DataTypes.STRING(80),
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
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("ADMIN", "MANAGER", "SUB_AGENT"),
        allowNull: false,
        defaultValue: "SUB_AGENT",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "users",
    }
  );

  return User;
};

export default UserModel;
