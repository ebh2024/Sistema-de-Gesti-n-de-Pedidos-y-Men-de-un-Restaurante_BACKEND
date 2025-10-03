const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        correo: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        contraseña: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        rol: {
            type: DataTypes.ENUM('admin', 'cocinero', 'mesero'),
            allowNull: false
        },
        is_active: {
            type: DataTypes.TINYINT(1),
            defaultValue: 1
        }
    }, {
        tableName: 'users',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        defaultScope: {
            attributes: { exclude: ['contraseña'] }
        },
        scopes: {
            withPassword: {
                attributes: { include: ['contraseña'] }
            }
        }
    });

    User.beforeCreate(async (user) => {
        user.contraseña = await bcrypt.hash(user.contraseña, 10);
    });

    User.beforeUpdate(async (user) => {
        if (user.changed('contraseña')) {
            user.contraseña = await bcrypt.hash(user.contraseña, 10);
        }
    });

    return User;
};
