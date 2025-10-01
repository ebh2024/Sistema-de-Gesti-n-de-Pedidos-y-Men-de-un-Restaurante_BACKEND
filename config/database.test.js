const { Sequelize } = require('sequelize');
const logger = require('../utils/logger'); // Import the logger
require('dotenv').config({ path: '.env.test' }); // Load test environment variables

const sequelize = new Sequelize(
    process.env.TEST_DB_NAME || 'restaurant_management_test',
    process.env.TEST_DB_USER || 'usuario',
    process.env.DB_PASSWORD || '', // Use DB_PASSWORD for consistency, or TEST_DB_PASSWORD
    {
        host: process.env.TEST_DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, // Disable logging for cleaner test output, or use logger.debug
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Test the connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Conexión a la base de datos de prueba establecida correctamente.');
    } catch (error) {
        logger.error(`Error al conectar con la base de datos de prueba: ${error.message}`, { stack: error.stack });
    }
};

// testConnection(); // Don't run connection test automatically in test config

module.exports = sequelize;
