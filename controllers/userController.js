const { User } = require('../models');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const baseController = require('./baseController');

const userController = baseController(User);

const createUser = async (req, res, next) => {
    try {
        const { nombre, correo, contraseña, rol } = req.body;

        const existingUser = await User.findOne({ where: { correo } });
        if (existingUser) {
            logger.warn(`Intento de crear usuario con correo ya existente: ${correo}`);
            return next(new AppError('El correo ya está registrado', 400));
        }

        const user = await User.create({
            nombre,
            correo,
            contraseña,
            rol
        });

        logger.info(`Usuario creado por admin: ${user.correo} con rol: ${user.rol}`);
        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: {
                id: user.id,
                nombre: user.nombre,
                correo: user.correo,
                rol: user.rol,
                is_active: user.is_active
            }
        });
    } catch (error) {
        logger.error(`Error al crear usuario: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, correo, contraseña, rol, is_active } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return next(new AppError('Usuario no encontrado', 404));
        }

        if (nombre) user.nombre = nombre;
        if (correo) user.correo = correo;
        if (rol) user.rol = rol;
        if (typeof is_active === 'boolean') user.is_active = is_active;

        if (contraseña) {
            user.contraseña = contraseña;
        }

        await user.save();

        logger.info(`Usuario actualizado: ${user.correo}`);
        res.status(200).json({
            message: 'Usuario actualizado exitosamente',
            user: {
                id: user.id,
                nombre: user.nombre,
                correo: user.correo,
                rol: user.rol,
                is_active: user.is_active
            }
        });
    } catch (error) {
        logger.error(`Error al actualizar usuario: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

module.exports = {
    createUser,
    getUsers: userController.getAll,
    updateUser,
    deleteUser: userController.delete
};
