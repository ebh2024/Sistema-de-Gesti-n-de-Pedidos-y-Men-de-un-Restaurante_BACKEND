const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Table = sequelize.define('Table', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        numero: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true
        },
        capacidad: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        estado: {
            type: DataTypes.ENUM('available', 'occupied', 'cleaning'),
            defaultValue: 'available'
        }
    }, {
        tableName: 'tables',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Table;
};
