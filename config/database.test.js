const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.test' }); // Cargar variables de entorno de prueba

const sequelize = new Sequelize(
    process.env.TEST_DB_NAME || 'restaurant_management_test',
    process.env.TEST_DB_USER || 'usuario',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.TEST_DB_HOST || 'localhost',
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



module.exports = sequelize;
