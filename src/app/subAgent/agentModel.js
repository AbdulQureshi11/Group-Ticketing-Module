const SubAgentRequestModel = (DataTypes, sequelize) => {
  const SubAgentRequest = sequelize.define("sub_agent_requests", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    agency_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
      defaultValue: "PENDING",
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
    {
      timestamps: false,
    });

  return SubAgentRequest;
};

export default SubAgentRequestModel;
