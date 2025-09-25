const { body } = require('express-validator');

exports.registerValidation = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido.')
    .isLength({ min: 3 })
    .withMessage('El nombre debe tener al menos 3 caracteres.'),
  body('correo')
    .trim()
    .notEmpty()
    .withMessage('El correo electrónico es requerido.')
    .isEmail()
    .withMessage('Debe ser un correo electrónico válido.'),
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
    .isIn(['admin', 'mesero', 'cocinero'])
    .withMessage('El rol debe ser "admin", "mesero" o "cocinero".'),
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
