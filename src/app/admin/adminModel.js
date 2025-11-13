// src/app/admin/adminModel.js
const AdminRequestModel = (DataTypes, sequelize) => {
  const AdminRequest = sequelize.define("admin_requests", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM("ADMIN", "MANAGER", "SUB_AGENT"),
      defaultValue: "ADMIN",
    },
  });

  return AdminRequest;
};

export default AdminRequestModel;