const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Order = sequelize.define('Order', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_mesa: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'tables',
                key: 'id'
            }
        },
        id_mesero: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        estado: {
            type: DataTypes.ENUM('pendiente', 'en preparación', 'servido'),
            defaultValue: 'pendiente'
        },
        total: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        }
    }, {
        tableName: 'orders',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Order;
};
