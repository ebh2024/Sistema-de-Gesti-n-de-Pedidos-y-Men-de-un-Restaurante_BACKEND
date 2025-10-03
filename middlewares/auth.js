const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError'); // Import AppError
require('dotenv').config();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(new AppError('Token de acceso requerido', 401));
    }

    jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta', (err, user) => {
        if (err) {
            return next(new AppError('Token inválido', 403));
        }
        req.user = user;
        next();
    });
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            // This case should ideally be caught by authenticateToken first
            return next(new AppError('Usuario no autenticado', 401));
        }

        if (!roles.includes(req.user.rol)) {
            return next(new AppError('Acceso denegado: rol insuficiente', 403));
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
