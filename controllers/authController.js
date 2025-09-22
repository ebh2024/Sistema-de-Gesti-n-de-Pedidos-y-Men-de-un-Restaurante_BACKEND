const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger'); // Importar el logger
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const register = async (req, res, next) => {
    try {
        const { nombre, correo, contraseña, rol } = req.body;

        // Validar datos
        if (!nombre || !correo || !contraseña || !rol) {
            return next(new AppError('Todos los campos son requeridos', 400));
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ where: { correo } });
        if (existingUser) {
            return next(new AppError('El correo ya está registrado', 400));
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        // Crear usuario
        const user = await User.create({
            nombre,
            correo,
            contraseña: hashedPassword,
            rol
        });

        logger.info(`Usuario registrado exitosamente: ${user.correo}`);
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            userId: user.id
        });
    } catch (error) {
        logger.error(`Error al registrar usuario: ${error.message}`);
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { correo, contraseña } = req.body;

        if (!correo || !contraseña) {
            return next(new AppError('Correo y contraseña son requeridos', 400));
        }

        // Buscar usuario
        const user = await User.findOne({
            where: {
                correo,
                is_active: 1
            }
        });

        if (!user) {
            logger.warn(`Intento de login fallido: usuario no encontrado para el correo ${correo}`);
            return next(new AppError('Credenciales inválidas', 401));
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);
        if (!isValidPassword) {
            logger.warn(`Intento de login fallido: contraseña inválida para el correo ${correo}`);
            return next(new AppError('Credenciales inválidas', 401));
        }

        // Generar token JWT
        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
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
        logger.error(`Error durante el login: ${error.message}`);
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { correo } = req.body;

        if (!correo) {
            return next(new AppError('Correo es requerido', 400));
        }

        // Verificar si el usuario existe
        const user = await User.findOne({
            where: {
                correo,
                is_active: 1
            }
        });

        if (!user) {
            return next(new AppError('Usuario no encontrado', 404));
        }

        // Generar token de reset
        const resetToken = jwt.sign(
            { id: user.id, correo: user.correo },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        // Enviar email (simulado por ahora)
        logger.info(`Generado token de reseteo para ${user.correo}`);
        res.json({ message: 'Instrucciones de reset enviadas al correo' });
    } catch (error) {
        logger.error(`Error en forgotPassword para ${correo}: ${error.message}`);
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { token, nuevaContraseña } = req.body;

        if (!token || !nuevaContraseña) {
            return next(new AppError('Token y nueva contraseña son requeridos', 400));
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Hash de la nueva contraseña
        const hashedPassword = await bcrypt.hash(nuevaContraseña, 10);

        // Actualizar contraseña
        await User.update(
            { contraseña: hashedPassword },
            { where: { id: decoded.id } }
        );

        logger.info(`Contraseña actualizada para el usuario ID: ${decoded.id}`);
        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        logger.error(`Error al resetear contraseña: ${error.message}`);
        next(new AppError('Token inválido o expirado', 400));
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword
};
