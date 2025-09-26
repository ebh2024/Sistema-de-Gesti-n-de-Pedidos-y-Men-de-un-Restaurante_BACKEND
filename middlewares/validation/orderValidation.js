const { body, param } = require('express-validator');

exports.createOrderValidation = [
  body('id_mesa')
    .notEmpty()
    .withMessage('El ID de la mesa es requerido.')
    .isInt({ gt: 0 })
    .withMessage('ID de mesa inválido.'),
  body('detalles')
    .isArray({ min: 1 })
    .withMessage('Los detalles del pedido son requeridos y deben ser un array no vacío.'),
  body('detalles.*.id_plato')
    .notEmpty()
    .withMessage('El ID del plato es requerido en los detalles del pedido.')
    .isInt({ gt: 0 })
    .withMessage('ID de plato inválido en los detalles del pedido.'),
  body('detalles.*.cantidad')
    .notEmpty()
    .withMessage('La cantidad es requerida en los detalles del pedido.')
    .isInt({ gt: 0 })
    .withMessage('La cantidad debe ser un entero positivo en los detalles del pedido.'),
  body('estado')
    .optional()
    .trim()
    .isIn(['borrador', 'pendiente', 'en preparación', 'servido'])
    .withMessage('El estado debe ser "borrador", "pendiente", "en preparación" o "servido".'),
];

exports.updateOrderValidation = [
  param('id')
    .isInt({ gt: 0 })
    .withMessage('ID de pedido inválido.'),
  body('detalles')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Los detalles del pedido deben ser un array no vacío si se proporcionan.'),
  body('detalles.*.id_plato')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('ID de plato inválido en los detalles del pedido si se proporciona.'),
  body('detalles.*.cantidad')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('La cantidad debe ser un entero positivo en los detalles del pedido si se proporciona.'),
  body('estado')
    .optional()
    .trim()
    .isIn(['borrador', 'pendiente', 'en preparación', 'servido'])
    .withMessage('El estado debe ser "borrador", "pendiente", "en preparación" o "servido" si se proporciona.'),
];

exports.orderIdValidation = [
  param('id')
    .isInt({ gt: 0 })
    .withMessage('ID de pedido inválido.'),
];

exports.updateOrderStatusValidation = [
  param('id')
    .isInt({ gt: 0 })
    .withMessage('ID de pedido inválido.'),
  body('estado')
    .notEmpty()
    .withMessage('El estado del pedido es requerido.')
    .trim()
    .isIn(['borrador', 'pendiente', 'en preparación', 'servido'])
    .withMessage('El estado debe ser "borrador", "pendiente", "en preparación" o "servido".'),
];
