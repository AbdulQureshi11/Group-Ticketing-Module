"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("flight_groups", {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    agency_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "agencies",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    carrier_code: {
      type: Sequelize.STRING(2),
      allowNull: false,
    },
    flight_number: {
      type: Sequelize.STRING(6),
      allowNull: false,
    },
    pnr_mode: {
      type: Sequelize.ENUM("GROUP_PNR", "PER_BOOKING_PNR"),
      allowNull: false,
      defaultValue: "PER_BOOKING_PNR",
    },
    origin: {
      type: Sequelize.STRING(3),
      allowNull: false,
    },
    destination: {
      type: Sequelize.STRING(3),
      allowNull: false,
    },
    departure_time_utc: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    arrival_time_utc: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    departure_time_local: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    arrival_time_local: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    baggage_rule: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    fare_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    terms: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    sales_start: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    sales_end: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM("DRAFT", "PUBLISHED", "CLOSED", "CANCELLED"),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    created_by: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
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

  await queryInterface.addIndex(
    "flight_groups",
    ["status", "sales_start", "sales_end"],
    { name: "idx_pub" }
  );
  await queryInterface.addIndex(
    "flight_groups",
    ["origin", "destination", "departure_time_utc"],
    { name: "idx_route_time" }
  );
}
export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("flight_groups");
}
