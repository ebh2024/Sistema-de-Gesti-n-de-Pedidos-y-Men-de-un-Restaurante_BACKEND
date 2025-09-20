const { body, param } = require('express-validator');

exports.createDishValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del plato es requerido.')
    .isLength({ min: 3 })
    .withMessage('El nombre del plato debe tener al menos 3 caracteres.'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('La descripción del plato es requerida.'),
  body('price')
    .notEmpty()
    .withMessage('El precio del plato es requerido.')
    .isFloat({ gt: 0 })
    .withMessage('El precio debe ser un número positivo.'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('La categoría del plato es requerida.'),
  body('imageUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('La URL de la imagen debe ser válida.'),
];

exports.updateDishValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de plato inválido.'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre del plato no puede estar vacío si se proporciona.')
    .isLength({ min: 3 })
    .withMessage('El nombre del plato debe tener al menos 3 caracteres.'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('La descripción del plato no puede estar vacía si se proporciona.'),
  body('price')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('El precio debe ser un número positivo.'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('La categoría del plato no puede estar vacía si se proporciona.'),
  body('imageUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('La URL de la imagen debe ser válida.'),
];

exports.dishIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de plato inválido.'),
];
