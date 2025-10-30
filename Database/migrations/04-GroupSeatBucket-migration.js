"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("group_seat_buckets", {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    flight_group_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "flight_groups",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    pax_type: {
      type: Sequelize.ENUM("ADT", "CHD", "INF"),
      allowNull: false,
    },
    total_seats: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    seats_on_hold: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    seats_issued: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    base_fare: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    },
    tax_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    fee_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: Sequelize.STRING(3),
      allowNull: false,
    },
    created_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      allowNull: false,
    },
    updated_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      allowNull: false,
    },
  });

  // Unique combination to prevent duplicate pax type buckets in same flight group
  await queryInterface.addConstraint("group_seat_buckets", {
    fields: ["flight_group_id", "pax_type"],
    type: "unique",
    name: "uk_bucket",
  });
}
export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("group_seat_buckets");
}
