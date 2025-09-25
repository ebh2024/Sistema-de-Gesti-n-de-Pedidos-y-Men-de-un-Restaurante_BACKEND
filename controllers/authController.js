const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
require('dotenv').config();

/**
 * Configuración del transportador de correo para el envío de emails.
 * Utiliza el servicio de Gmail y las credenciales definidas en las variables de entorno.
 */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuevo usuario en el sistema.
 *     description: Crea una nueva cuenta de usuario con nombre, correo, contraseña y rol.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - correo
 *               - contraseña
 *               - rol
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre completo del usuario.
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico único del usuario.
 *               contraseña:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario (se almacenará hasheada).
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuario registrado exitosamente
 *                 userId:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Error de validación o el correo ya está registrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: El correo ya está registrado
 *       500:
 *         description: Error interno del servidor.
 */
const register = async (req, res, next) => {
    try {
        const { nombre, correo, contraseña, rol } = req.body;

        // Validar que todos los campos requeridos estén presentes
        if (!nombre || !correo || !contraseña) {
            logger.warn('Intento de registro con campos incompletos.');
            return next(new AppError('Todos los campos son requeridos', 400));
        }

        // Verificar si ya existe un usuario con el correo proporcionado
        const existingUser = await User.findOne({ where: { correo } });
        if (existingUser) {
            logger.warn(`Intento de registro con correo ya existente: ${correo}`);
            return next(new AppError('El correo ya está registrado', 400));
        }

        // Hashear la contraseña antes de almacenarla en la base de datos
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        // Crear el nuevo usuario en la base de datos
        const user = await User.create({
            nombre,
            correo,
            contraseña: hashedPassword,
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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autentica a un usuario y devuelve un token JWT.
 *     description: Permite a un usuario iniciar sesión con su correo y contraseña.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *               - contraseña
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del usuario.
 *               contraseña:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario.
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso, devuelve un token JWT y datos del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login exitoso
 *                 token:
 *                   type: string
 *                   description: Token de autenticación JWT.
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     correo:
 *                       type: string
 *                     rol:
 *                       type: string
 *       400:
 *         description: Correo o contraseña no proporcionados.
 *       401:
 *         description: Credenciales inválidas o usuario inactivo.
 *       500:
 *         description: Error interno del servidor.
 */
const login = async (req, res, next) => {
    try {
        const { correo, contraseña } = req.body;

        // Validar que correo y contraseña estén presentes
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

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicita un restablecimiento de contraseña.
 *     description: Envía un correo electrónico al usuario con un enlace para restablecer su contraseña.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del usuario que olvidó su contraseña.
 *     responses:
 *       200:
 *         description: Si el correo existe, se envía un enlace de restablecimiento (simulado).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Instrucciones de reset enviadas al correo
 *       400:
 *         description: Correo electrónico no proporcionado.
 *       404:
 *         description: Usuario no encontrado con el correo electrónico proporcionado.
 *       500:
 *         description: Error interno del servidor o error al enviar el correo.
 */
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

        // TODO: Implementar el envío real del correo electrónico con el enlace de restablecimiento
        // const mailOptions = {
        //     from: process.env.EMAIL_USER,
        //     to: user.correo,
        //     subject: 'Restablecimiento de Contraseña',
        //     html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña: <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}">Restablecer Contraseña</a></p>`
        // };
        // await transporter.sendMail(mailOptions);

        logger.info(`Generado token de reseteo para ${user.correo}. Email de reseteo simulado enviado.`);
        res.json({ message: 'Instrucciones de reset enviadas al correo' });
    } catch (error) {
        logger.error(`Error en forgotPassword para ${req.body.correo}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablece la contraseña de un usuario.
 *     description: Permite a un usuario establecer una nueva contraseña utilizando un token de restablecimiento válido.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - nuevaContraseña
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de restablecimiento de contraseña recibido por correo.
 *               nuevaContraseña:
 *                 type: string
 *                 format: password
 *                 description: La nueva contraseña para el usuario (mínimo 6 caracteres).
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contraseña actualizada exitosamente
 *       400:
 *         description: Token inválido o expirado, o nueva contraseña no proporcionada.
 *       500:
 *         description: Error interno del servidor.
 */
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

        // Hashear la nueva contraseña
        const hashedPassword = await bcrypt.hash(nuevaContraseña, 10);

        // Actualizar la contraseña del usuario en la base de datos
        await User.update(
            { contraseña: hashedPassword },
            { where: { id: decoded.id } }
        );

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
