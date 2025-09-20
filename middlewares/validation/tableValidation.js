const { body, param } = require('express-validator');

exports.createTableValidation = [
  body('number')
    .notEmpty()
    .withMessage('El número de mesa es requerido.')
    .isInt({ gt: 0 })
    .withMessage('El número de mesa debe ser un entero positivo.'),
  body('capacity')
    .notEmpty()
    .withMessage('La capacidad de la mesa es requerida.')
    .isInt({ gt: 0 })
    .withMessage('La capacidad debe ser un entero positivo.'),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('El estado de la mesa es requerido.')
    .isIn(['available', 'occupied', 'reserved'])
    .withMessage('El estado debe ser "available", "occupied" o "reserved".'),
];

exports.updateTableValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de mesa inválido.'),
  body('number')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('El número de mesa debe ser un entero positivo si se proporciona.'),
  body('capacity')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('La capacidad debe ser un entero positivo si se proporciona.'),
  body('status')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El estado de la mesa no puede estar vacío si se proporciona.')
    .isIn(['available', 'occupied', 'reserved'])
    .withMessage('El estado debe ser "available", "occupied" o "reserved".'),
];

exports.tableIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de mesa inválido.'),
];
