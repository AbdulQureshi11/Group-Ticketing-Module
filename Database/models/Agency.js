import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Agency = sequelize.define(
    "Agency",
    {
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
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      parent_agency_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "agencies",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "SUSPENDED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "agencies",
      timestamps: true,
      underscored: true,
    }
  );

  // Self-referential Association
  Agency.associate = (models) => {
    Agency.hasMany(models.Agency, {
      as: "subAgencies",
      foreignKey: "parent_agency_id",
    });

    Agency.belongsTo(models.Agency, {
      as: "parentAgency",
      foreignKey: "parent_agency_id",
    });

    Agency.hasMany(models.User, {
      as: "users",
      foreignKey: "agency_id",
    });
  };

  return Agency;
};
