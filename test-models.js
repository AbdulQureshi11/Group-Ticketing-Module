import { sequelize } from './src/config/database.js';
import models from './src/models/index.js';

async function testModels() {
  try {
    console.log('Testing model imports...');
    console.log('Available models:', Object.keys(models));
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    console.log('✅ All models loaded successfully');
  } catch (error) {
    console.error('❌ Model loading failed:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testModels();
