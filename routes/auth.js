const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation } = require('../middlewares/validation/authValidation');
const { authRateLimiter } = require('../middlewares/rateLimit'); // Import centralized rate limiter
const { handleValidationErrors } = require('../middlewares/errorHandler'); // Import handleValidationErrors

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Gestión de autenticación de usuarios
 */

// Rutas de autenticación
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre de usuario único
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del usuario
 *               contraseña:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario (mínimo 6 caracteres)
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Datos de entrada inválidos o usuario ya existe
 *       429:
 *         description: Demasiados intentos de registro
 */
if (process.env.NODE_ENV !== 'test') {
    router.post('/register', authRateLimiter, registerValidation, handleValidationErrors, authController.register);
} else {
    router.post('/register', registerValidation, handleValidationErrors, authController.register);
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Inicia sesión de un usuario
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
 *                 description: Correo electrónico del usuario
 *               contraseña:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso, devuelve un token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token de autenticación JWT
 *       400:
 *         description: Credenciales inválidas
 *       429:
 *         description: Demasiados intentos de inicio de sesión
 */
if (process.env.NODE_ENV !== 'test') {
    router.post('/login', authRateLimiter, loginValidation, handleValidationErrors, authController.login);
} else {
    router.post('/login', loginValidation, handleValidationErrors, authController.login);
}

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicita un restablecimiento de contraseña
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
 *                 description: Correo electrónico del usuario para restablecer la contraseña
 *     responses:
 *       200:
 *         description: Si el correo existe, se envía un enlace de restablecimiento
 *       400:
 *         description: Correo electrónico no proporcionado
 *       429:
 *         description: Demasiadas solicitudes de restablecimiento de contraseña
 */
if (process.env.NODE_ENV !== 'test') {
    router.post('/forgot-password', authRateLimiter, forgotPasswordValidation, handleValidationErrors, authController.forgotPassword);
} else {
    router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, authController.forgotPassword);
}

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablece la contraseña del usuario
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
 *                 description: Token de restablecimiento de contraseña recibido por correo
 *               nuevaContraseña:
 *                 type: string
 *                 format: password
 *                 description: Nueva contraseña (mínimo 6 caracteres)
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
 *       400:
 *         description: Token inválido o expirado, o nueva contraseña no válida
 *       429:
 *         description: Demasiadas solicitudes de restablecimiento de contraseña
 */
if (process.env.NODE_ENV !== 'test') {
    router.post('/reset-password', authRateLimiter, resetPasswordValidation, handleValidationErrors, authController.resetPassword);
} else {
    router.post('/reset-password', resetPasswordValidation, handleValidationErrors, authController.resetPassword);
}

module.exports = router;
