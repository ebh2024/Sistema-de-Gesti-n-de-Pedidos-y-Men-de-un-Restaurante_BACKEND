const sequelize = require('../config/database');

// Import models
const User = require('./User');
const Dish = require('./Dish');
const Table = require('./Table');
const Order = require('./Order');
const OrderDetail = require('./OrderDetail');

// Define associations
User.hasMany(Order, {
    foreignKey: 'id_mesero',
    as: 'orders'
});

Order.belongsTo(User, {
    foreignKey: 'id_mesero',
    as: 'mesero'
});

Table.hasMany(Order, {
    foreignKey: 'id_mesa',
    as: 'orders'
});

Order.belongsTo(Table, {
    foreignKey: 'id_mesa',
    as: 'mesa'
});

Order.hasMany(OrderDetail, {
    foreignKey: 'id_pedido',
    as: 'detalles'
});

OrderDetail.belongsTo(Order, {
    foreignKey: 'id_pedido',
    as: 'pedido'
});

Dish.hasMany(OrderDetail, {
    foreignKey: 'id_plato',
    as: 'orderDetails'
});

OrderDetail.belongsTo(Dish, {
    foreignKey: 'id_plato',
    as: 'plato'
});

// Sync database (optional - only for development)
const syncDatabase = async () => {
    try {
        await sequelize.sync({ force: false });
        console.log('Base de datos sincronizada correctamente.');
    } catch (error) {
        console.error('Error al sincronizar la base de datos:', error);
    }
};

// Uncomment the line below if you want to sync the database on startup (development only)
// syncDatabase();

module.exports = {
    sequelize,
    User,
    Dish,
    Table,
    Order,
    OrderDetail
};
