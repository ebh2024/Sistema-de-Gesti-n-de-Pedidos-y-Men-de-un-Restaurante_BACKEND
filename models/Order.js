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
            type: DataTypes.ENUM('borrador', 'pendiente', 'en preparación', 'servido'),
            defaultValue: 'pendiente',
            allowNull: false,
            validate: {
                isIn: [['borrador', 'pendiente', 'en preparación', 'servido']]
            }
        },
        total: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: '0.00',
            validate: {
                min: 0.00
            }
        }
    }, {
        tableName: 'orders',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Order;
};
