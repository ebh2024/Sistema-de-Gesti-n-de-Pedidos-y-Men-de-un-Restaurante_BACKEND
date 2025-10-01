const AppError = require('../utils/AppError');
const logger = require('../utils/logger'); // Importar el logger
const { validationResult } = require('express-validator'); // Keep for handleValidationErrors
// Removed UniqueConstraintError as it's not directly used in the error handling logic

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        return next(new AppError(`Invalid input data: ${errorMessages.join('. ')}`, 400));
    }
    next();
};

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleUniqueConstraintErrorDB = err => {
    const field = Object.keys(err.fields)[0];
    const value = err.fields[field];
    const message = `El valor '${value}' para el campo '${field}' ya existe. Por favor, use otro valor.`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const sendErrorDev = (err, res) => {
    logger.error('ERROR (Development) 💥', err);
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });

        // Programming or other unknown error: don't leak error details
    } else {
        // 1) Log error
        logger.error('ERROR (Production) 💥', err);

        // 2) Send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    }
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        error.message = err.message; // Ensure message is copied

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.name === 'SequelizeUniqueConstraintError') error = handleUniqueConstraintErrorDB(error);
        if (error.name === 'SequelizeValidationError') error = handleValidationErrorDB(error); // Sequelize validation errors
        // Note: express-validator errors are handled by handleValidationErrors middleware before reaching here.

        sendErrorProd(error, res);
    }
};

module.exports.handleValidationErrors = handleValidationErrors;
