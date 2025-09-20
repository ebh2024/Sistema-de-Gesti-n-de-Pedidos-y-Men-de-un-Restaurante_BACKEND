const { body, param } = require('express-validator');

exports.createOrderValidation = [
  body('tableId')
    .notEmpty()
    .withMessage('El ID de la mesa es requerido.')
    .isUUID()
    .withMessage('ID de mesa inválido.'),
  body('userId')
    .notEmpty()
    .withMessage('El ID del usuario es requerido.')
    .isUUID()
    .withMessage('ID de usuario inválido.'),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('El estado del pedido es requerido.')
    .isIn(['pending', 'preparing', 'ready', 'delivered', 'cancelled'])
    .withMessage('El estado debe ser "pending", "preparing", "ready", "delivered" o "cancelled".'),
  body('orderDetails')
    .isArray({ min: 1 })
    .withMessage('Los detalles del pedido son requeridos y deben ser un array no vacío.'),
  body('orderDetails.*.dishId')
    .notEmpty()
    .withMessage('El ID del plato es requerido en los detalles del pedido.')
    .isUUID()
    .withMessage('ID de plato inválido en los detalles del pedido.'),
  body('orderDetails.*.quantity')
    .notEmpty()
    .withMessage('La cantidad es requerida en los detalles del pedido.')
    .isInt({ gt: 0 })
    .withMessage('La cantidad debe ser un entero positivo en los detalles del pedido.'),
  body('orderDetails.*.price')
    .notEmpty()
    .withMessage('El precio es requerido en los detalles del pedido.')
    .isFloat({ gt: 0 })
    .withMessage('El precio debe ser un número positivo en los detalles del pedido.'),
];

exports.updateOrderValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de pedido inválido.'),
  body('tableId')
    .optional()
    .isUUID()
    .withMessage('ID de mesa inválido si se proporciona.'),
  body('userId')
    .optional()
    .isUUID()
    .withMessage('ID de usuario inválido si se proporciona.'),
  body('status')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El estado del pedido no puede estar vacío si se proporciona.')
    .isIn(['pending', 'preparing', 'ready', 'delivered', 'cancelled'])
    .withMessage('El estado debe ser "pending", "preparing", "ready", "delivered" o "cancelled" si se proporciona.'),
  body('orderDetails')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Los detalles del pedido deben ser un array no vacío si se proporcionan.'),
  body('orderDetails.*.dishId')
    .optional()
    .isUUID()
    .withMessage('ID de plato inválido en los detalles del pedido si se proporciona.'),
  body('orderDetails.*.quantity')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('La cantidad debe ser un entero positivo en los detalles del pedido si se proporciona.'),
  body('orderDetails.*.price')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('El precio debe ser un número positivo en los detalles del pedido si se proporciona.'),
];

exports.orderIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de pedido inválido.'),
];
