import express from "express";
import bodyParser from "body-parser";
import { Sequelize } from "sequelize";

// Initialize Express
const app = express();
app.use(bodyParser.json());

// Initialize Sequelize
const sequelize = new Sequelize("group-ticketing-system-db1", "root", "", {
  host: "127.0.0.1",
  dialect: "mysql",
  logging: false,
});

// Test DB connection
sequelize
  .authenticate()
  .then(() => console.log("Database connected successfully!"))
  .catch((err) => console.error("Unable to connect to database:", err));

// Start server
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
