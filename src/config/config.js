import { Sequelize } from "sequelize";

const sequelize = new Sequelize('group-ticketing-system-db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
  });

export default sequelize;