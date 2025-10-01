const { Sequelize } = require('sequelize');
const logger = require('../utils/logger'); // Import the logger
require('dotenv').config(); // Ensure environment variables are loaded

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
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
        logger.info('Conexión a la base de datos establecida correctamente.');
    } catch (error) {
        logger.error(`Error al conectar con la base de datos: ${error.message}`, { stack: error.stack });
        // Optionally, exit the process if DB connection is critical for app startup
        // process.exit(1);
    }
};

testConnection();

module.exports = sequelize;
