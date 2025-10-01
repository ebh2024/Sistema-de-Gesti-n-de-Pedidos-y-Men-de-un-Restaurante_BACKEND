const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { sendEmail } = process.env.NODE_ENV === 'test' ? require('../tests/__mocks__/emailService') : require('../utils/emailService');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Errores de validación en registro:', errors.array());
            return next(new AppError('Datos de entrada inválidos', 400));
        }

        const { nombre, correo, contraseña } = req.body;
        const rol = 'mesero'; // Rol por defecto para nuevos registros

        // Validar que el nombre esté presente
        if (!nombre) {
            logger.warn('Intento de registro sin nombre.');
            return next(new AppError('Nombre es requerido', 400));
        }

        // Verificar si ya existe un usuario con el correo proporcionado
        const existingUser = await User.findOne({ where: { correo } });
        if (existingUser) {
            logger.warn(`Intento de registro con correo ya existente: ${correo}`);
            return next(new AppError('El correo ya está registrado', 400));
        }

        // Crear el nuevo usuario en la base de datos (la contraseña será hasheada por el hook del modelo)
        const user = await User.create({
            nombre,
            correo,
            contraseña,
            rol
        });

        logger.info(`Usuario registrado exitosamente: ${user.correo} con ID: ${user.id} y rol: ${user.rol}`);
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            userId: user.id
        });
    } catch (error) {
        logger.error(`Error al registrar usuario: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { correo, contraseña } = req.body;

        // Validar que el correo y la contraseña estén presentes
        if (!correo || !contraseña) {
            logger.warn('Intento de login con campos incompletos.');
            return next(new AppError('Correo y contraseña son requeridos', 400));
        }

        // Buscar el usuario por correo y verificar que esté activo
        const user = await User.findOne({
            where: {
                correo,
                is_active: true // Asumiendo que 'is_active' es un booleano o 1 para activo
            }
        });

        // Si el usuario no existe o no está activo
        if (!user) {
            logger.warn(`Intento de login fallido: usuario no encontrado o inactivo para el correo ${correo}`);
            return next(new AppError('Credenciales inválidas', 401));
        }

        // Comparar la contraseña proporcionada con la contraseña hasheada almacenada
        const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);
        if (!isValidPassword) {
            logger.warn(`Intento de login fallido: contraseña inválida para el correo ${correo}`);
            return next(new AppError('Credenciales inválidas', 401));
        }

        // Generar un token JWT para el usuario autenticado
        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol },
            process.env.JWT_SECRET || 'your-secret-key', // Usar una clave secreta de entorno o una por defecto
            { expiresIn: '24h' } // El token expira en 24 horas
        );

        logger.info(`Login exitoso para el usuario: ${user.correo}`);
        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                correo: user.correo,
                rol: user.rol
            }
        });
    } catch (error) {
        logger.error(`Error durante el login para ${req.body.correo}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { correo } = req.body;

        // Validar que el correo esté presente
        if (!correo) {
            logger.warn('Intento de solicitud de restablecimiento de contraseña sin correo.');
            return next(new AppError('Correo es requerido', 400));
        }

        // Buscar el usuario por correo y verificar que esté activo
        const user = await User.findOne({
            where: {
                correo,
                is_active: true
            }
        });

        // Si el usuario no existe, devolver un error 404
        if (!user) {
            logger.warn(`Solicitud de restablecimiento de contraseña para correo no encontrado: ${correo}`);
            return next(new AppError('Usuario no encontrado', 404));
        }

        // Generar un token de restablecimiento de contraseña con una expiración de 1 hora
        const resetToken = jwt.sign(
            { id: user.id, correo: user.correo },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.correo,
            subject: 'Restablecimiento de Contraseña',
            html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña: <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}">Restablecer Contraseña</a></p>`
        };
        await sendEmail(mailOptions);

        logger.info(`Generado token de reseteo para ${user.correo}. Email de reseteo enviado.`);
        res.json({ message: 'Instrucciones de reset enviadas al correo' });
    } catch (error) {
        logger.error(`Error en forgotPassword para ${req.body.correo}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { token, nuevaContraseña } = req.body;

        // Validar que el token y la nueva contraseña estén presentes
        if (!token || !nuevaContraseña) {
            logger.warn('Intento de restablecimiento de contraseña con campos incompletos.');
            return next(new AppError('Token y nueva contraseña son requeridos', 400));
        }

        // Verificar y decodificar el token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Actualizar la contraseña del usuario en la base de datos (la contraseña será hasheada por el hook del modelo)
        // Buscar el usuario primero para activar el hook beforeUpdate
        const user = await User.findByPk(decoded.id);
        if (!user) {
            logger.warn(`Intento de restablecimiento de contraseña para usuario no encontrado: ID ${decoded.id}`);
            return next(new AppError('Usuario no encontrado', 404));
        }
        user.contraseña = nuevaContraseña; // Asignar nueva contraseña, el hook la hasheará
        await user.save();

        logger.info(`Contraseña actualizada para el usuario ID: ${decoded.id}`);
        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        logger.error(`Error al resetear contraseña: ${error.message}`, { stack: error.stack });
        next(new AppError('Token inválido o expirado', 400));
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword
};
