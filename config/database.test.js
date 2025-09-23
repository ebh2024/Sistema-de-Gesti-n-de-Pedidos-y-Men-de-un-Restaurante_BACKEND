const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.test' }); // Load test environment variables

const sequelize = new Sequelize(
    process.env.TEST_DB_NAME || 'restaurant_management_test',
    process.env.TEST_DB_USER || 'usuario',
    process.env.TEST_DB_PASSWORD || '',
    {
        host: process.env.TEST_DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: console.log, // Enable logging for debugging
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
        console.log('Conexión a la base de datos de prueba establecida correctamente.');
    } catch (error) {
        console.error('Error al conectar con la base de datos de prueba:', error);
    }
};

// testConnection(); // Don't run connection test automatically in test config

module.exports = sequelize;
