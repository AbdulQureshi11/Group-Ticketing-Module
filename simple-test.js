import { sequelize } from './src/config/database.js';

async function test() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    console.log('Testing model import...');
    const { default: Agency } = await import('./src/database/models/Agency.js');
    console.log('✅ Agency model imported successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

test();
