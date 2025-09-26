const { body } = require('express-validator');

exports.registerValidation = [
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
