"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("agencies", {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    code: {
      type: Sequelize.STRING(30),
      allowNull: false,
      unique: true,
    },
    parent_agency_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "agencies",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    status: {
      type: Sequelize.ENUM("ACTIVE", "SUSPENDED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });
}
export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("agencies");
}
