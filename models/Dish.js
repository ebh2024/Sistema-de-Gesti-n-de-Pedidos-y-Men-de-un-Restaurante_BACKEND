const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Dish = sequelize.define('Dish', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        descripcion: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        precio: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0.01 // Ensure price is positive
            }
        },
        disponibilidad: {
            type: DataTypes.TINYINT(1),
            defaultValue: 1
        }
    }, {
        tableName: 'dishes',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Dish;
};
