"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    "users",
    {
      id: {
        type: Sequelize.UUID, // ✅ CHAR(36) to match MySQL UUID
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      agency_id: {
        type: Sequelize.UUID, // ✅ Match agencies.id exactly!
        allowNull: false,
        references: {
          model: "agencies", // ✅ lowercase, matches actual table
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      username: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      role: {
        type: Sequelize.ENUM("ADMIN", "MANAGER", "SUB_AGENT"),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      engine: "InnoDB", // ✅ REQUIRED for foreign keys
    }
  );

  await queryInterface.addConstraint("users", {
    fields: ["agency_id", "username"],
    type: "unique",
    name: "uk_user_agency",
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("users");
}
