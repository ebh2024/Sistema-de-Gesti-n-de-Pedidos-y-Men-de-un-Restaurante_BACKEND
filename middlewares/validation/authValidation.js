const { body } = require('express-validator');

exports.registerValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('El nombre de usuario es requerido.')
    .isLength({ min: 3 })
    .withMessage('El nombre de usuario debe tener al menos 3 caracteres.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El correo electrónico es requerido.')
    .isEmail()
    .withMessage('Debe ser un correo electrónico válido.'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('La contraseña es requerida.')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres.'),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('El rol es requerido.')
    .isIn(['admin', 'employee'])
    .withMessage('El rol debe ser "admin" o "employee".'),
];

exports.loginValidation = [
  body('correo')
    .trim()
    .notEmpty()
    .withMessage('El correo electrónico es requerido.')
    .isEmail()
    .withMessage('Debe ser un correo electrónico válido.'),
  body('contraseña')
    .trim()
    .notEmpty()
    .withMessage('La contraseña es requerida.'),
];
