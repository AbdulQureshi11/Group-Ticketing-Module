"use strict";
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const User = sequelize.define(
    "user",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      agency_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING(80),
        allowNull: false,
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
        allowNull: false,
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
      tableName: "Users",
      underscored: true,
      timestamps: true,
    }
  );

  User.associate = function (models) {
    User.belongsTo(models.Agency, {
      foreignKey: "agency_id",
      as: "agency",
    });
  };

  return User;
};
