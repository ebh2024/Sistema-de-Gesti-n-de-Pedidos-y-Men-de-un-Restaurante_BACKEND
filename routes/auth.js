const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middlewares/validation/authValidation');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger'); // Importar el logger
const AppError = require('../utils/AppError'); // Importar AppError

// Rate limiting para rutas de autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
    handler: (req, res, next) => {
        logger.warn(`Rate limit exceeded for auth route from IP: ${req.ip}`);
        next(new AppError('Too many authentication attempts, please try again after 15 minutes', 429));
    }
});

// Rutas públicas
router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

module.exports = router;
