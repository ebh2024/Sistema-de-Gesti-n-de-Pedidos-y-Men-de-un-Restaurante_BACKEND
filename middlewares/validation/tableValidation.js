const { body, param } = require('express-validator');

exports.createTableValidation = [
  body('numero')
    .notEmpty()
    .withMessage('El número de mesa es requerido.')
    .isInt({ gt: 0 })
    .withMessage('El número de mesa debe ser un entero positivo.'),
  body('capacidad')
    .notEmpty()
    .withMessage('La capacidad de la mesa es requerida.')
    .isInt({ gt: 0 })
    .withMessage('La capacidad debe ser un entero positivo.'),
  body('disponible')
    .optional()
    .isBoolean()
    .withMessage('El estado de disponibilidad debe ser un booleano.'),
];

exports.updateTableValidation = [
  param('id')
    .isInt({ gt: 0 })
    .withMessage('ID de mesa inválido.'),
  body('numero')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('El número de mesa debe ser un entero positivo si se proporciona.'),
  body('capacidad')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('La capacidad debe ser un entero positivo si se proporciona.'),
  body('disponible')
    .optional()
    .isBoolean()
    .withMessage('El estado de disponibilidad debe ser un booleano si se proporciona.'),
];

exports.tableIdValidation = [
  param('id')
    .isInt({ gt: 0 })
    .withMessage('ID de mesa inválido.'),
];
