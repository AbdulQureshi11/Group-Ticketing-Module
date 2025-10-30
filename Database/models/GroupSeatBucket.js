import { DataTypes } from "sequelize";

export default (sequelize) => {
  const GroupSeatBucket = sequelize.define(
    "GroupSeatBucket",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      flight_group_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      pax_type: {
        type: DataTypes.ENUM("ADT", "CHD", "INF"),
        allowNull: false,
      },
      total_seats: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      seats_on_hold: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      seats_issued: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      base_fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      tax_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      fee_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
      },
    },
    {
      tableName: "Group_Seat_Buckets",
      underscored: true,
      timestamps: true,
    }
  );

  GroupSeatBucket.associate = function (models) {
    GroupSeatBucket.belongsTo(models.FlightGroup, {
      foreignKey: "flight_group_id",
      as: "flightGroup",
    });
  };

  return GroupSeatBucket;
};
