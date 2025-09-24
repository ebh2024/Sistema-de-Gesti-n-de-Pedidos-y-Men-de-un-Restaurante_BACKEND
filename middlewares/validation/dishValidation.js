const { body, param } = require('express-validator');

exports.createDishValidation = [
  body('nombre') // Changed from 'name' to 'nombre'
    .trim()
    .notEmpty()
    .withMessage('El nombre del plato es requerido.')
    .isLength({ min: 3 })
    .withMessage('El nombre del plato debe tener al menos 3 caracteres.'),
  body('descripcion') // Changed from 'description' to 'descripcion'
    .optional() // Make description truly optional, allowing empty string or null
    .trim(), // No withMessage here, as it's not a validation rule
  body('precio') // Changed from 'price' to 'precio'
    .notEmpty()
    .withMessage('El precio del plato es requerido.')
    .isFloat({ gt: 0 })
    .withMessage('El precio debe ser un número positivo.'),
  body('disponibilidad') // Add validation for disponibilidad
    .isInt({ min: 0, max: 1 }) // Expects 0 or 1, matching TINYINT(1)
    .withMessage('La disponibilidad debe ser 0 o 1.'),
];

exports.updateDishValidation = [
  param('id')
    .isInt() // Changed from isUUID() to isInt()
    .withMessage('ID de plato inválido.'),
  body('nombre') // Changed from 'name' to 'nombre'
    .optional() // Re-added optional() for update
    .trim()
    .notEmpty()
    .withMessage('El nombre del plato no puede estar vacío si se proporciona.')
    .isLength({ min: 3 })
    .withMessage('El nombre del plato debe tener al menos 3 caracteres.'),
  body('descripcion') // Changed from 'description' to 'descripcion'
    .optional()
    .trim(), // No withMessage here
  body('precio') // Changed from 'price' to 'precio'
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('El precio debe ser un número positivo.'),
  body('disponibilidad') // Add validation for disponibilidad
    .optional()
    .isInt({ min: 0, max: 1 }) // Expects 0 or 1, matching TINYINT(1)
    .withMessage('La disponibilidad debe ser 0 o 1.'),
];

exports.dishIdValidation = [
  param('id')
    .isInt() // Changed from isUUID() to isInt()
    .withMessage('ID de plato inválido.'),
];
