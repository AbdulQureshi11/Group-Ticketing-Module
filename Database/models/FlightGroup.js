import { DataTypes } from "sequelize";

export default (sequelize) => {
  const FlightGroup = sequelize.define(
    "FlightGroup",
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
      carrier_code: {
        type: DataTypes.STRING(2),
        allowNull: false,
      },
      flight_number: {
        type: DataTypes.STRING(6),
        allowNull: false,
      },
      pnr_mode: {
        type: DataTypes.ENUM("GROUP_PNR", "PER_BOOKING_PNR"),
        allowNull: false,
        defaultValue: "PER_BOOKING_PNR",
      },
      origin: {
        type: DataTypes.STRING(3),
        allowNull: false,
      },
      destination: {
        type: DataTypes.STRING(3),
        allowNull: false,
      },
      departure_time_utc: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      arrival_time_utc: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      departure_time_local: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      arrival_time_local: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      baggage_rule: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      fare_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      terms: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sales_start: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      sales_end: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("DRAFT", "PUBLISHED", "CLOSED", "CANCELLED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "Flight_Groups",
      underscored: true,
      timestamps: true,
    }
  );

  FlightGroup.associate = function (models) {
    FlightGroup.belongsTo(models.Agency, {
      foreignKey: "agency_id",
      as: "agency",
    });
    FlightGroup.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });
    FlightGroup.hasMany(models.GroupSeatBucket, {
      foreignKey: "flight_group_id",
      as: "seatBuckets",
    });
  };

  return FlightGroup;
};
