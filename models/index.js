const { Sequelize, DataTypes } = require('sequelize');

const sequelize = process.env.NODE_ENV === 'test'
    ? require('../config/database.test')
    : require('../config/database');

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Import models and pass the sequelize instance
db.User = require('./User')(sequelize);
db.Dish = require('./Dish')(sequelize);
db.Table = require('./Table')(sequelize);
db.Order = require('./Order')(sequelize);
db.OrderDetail = require('./OrderDetail')(sequelize);

// Define associations
db.User.hasMany(db.Order, {
    foreignKey: 'id_mesero',
    as: 'orders'
});

db.Order.belongsTo(db.User, {
    foreignKey: 'id_mesero',
    as: 'mesero'
});

db.Table.hasMany(db.Order, {
    foreignKey: 'id_mesa',
    as: 'orders'
});

db.Order.belongsTo(db.Table, {
    foreignKey: 'id_mesa',
    as: 'mesa'
});

db.Order.hasMany(db.OrderDetail, {
    foreignKey: 'id_pedido',
    as: 'detalles'
});

db.OrderDetail.belongsTo(db.Order, {
    foreignKey: 'id_pedido',
    as: 'pedido'
});

db.Dish.hasMany(db.OrderDetail, {
    foreignKey: 'id_plato',
    as: 'orderDetails'
});

db.OrderDetail.belongsTo(db.Dish, {
    foreignKey: 'id_plato',
    as: 'plato'
});

// Sync database
const syncDatabase = async (force = false) => {
    try {
        await db.sequelize.sync({ force: force });
        console.log(`Base de datos sincronizada correctamente (force: ${force}).`);
    } catch (error) {
        console.error('Error al sincronizar la base de datos:', error);
    }
};

// Only sync database on startup if not in test environment
if (process.env.NODE_ENV !== 'test') {
    syncDatabase();
}

module.exports = db;
