const { body, param } = require('express-validator');

exports.createUserValidation = [
    body('nombre')
        .trim()
        .notEmpty()
        .withMessage('El nombre es requerido.')
        .isLength({ min: 2, max: 255 })
        .withMessage('El nombre debe tener entre 2 y 255 caracteres.'),
    body('correo')
        .trim()
        .notEmpty()
        .withMessage('El correo electrónico es requerido.')
        .isEmail()
        .withMessage('Debe ser un correo electrónico válido.')
        .normalizeEmail(),
    body('contraseña')
        .trim()
        .notEmpty()
        .withMessage('La contraseña es requerida.')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres.'),
    body('rol')
        .trim()
        .notEmpty()
        .withMessage('El rol es requerido.')
        .isIn(['admin', 'cocinero', 'mesero'])
        .withMessage('El rol debe ser uno de: admin, cocinero, mesero.')
];

exports.updateUserValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('El ID del usuario debe ser un número entero positivo.'),
    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('El nombre debe tener entre 2 y 255 caracteres.'),
    body('correo')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Debe ser un correo electrónico válido.')
        .normalizeEmail(),
    body('rol')
        .optional()
        .trim()
        .isIn(['admin', 'cocinero', 'mesero'])
        .withMessage('El rol debe ser uno de: admin, cocinero, mesero.'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active debe ser un valor booleano.'),
    body('contraseña')
        .optional()
        .trim()
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres.')
];

exports.deleteUserValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('El ID del usuario debe ser un número entero positivo.')
];
