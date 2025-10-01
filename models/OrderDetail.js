const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const OrderDetail = sequelize.define('OrderDetail', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_pedido: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'id'
            }
        },
        id_plato: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'dishes',
                key: 'id'
            }
        },
        cantidad: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        precio_unitario: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0.01
            }
        }
    }, {
        tableName: 'order_details',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return OrderDetail;
};
