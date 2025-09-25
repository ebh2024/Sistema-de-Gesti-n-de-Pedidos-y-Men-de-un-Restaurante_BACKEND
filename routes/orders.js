const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { createOrderValidation, updateOrderValidation, orderIdValidation } = require('../middlewares/validation/orderValidation');
const { handleValidationErrors } = require('../middlewares/errorHandler');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para todos los usuarios autenticados
router.get('/', orderController.getAllOrders);
router.get('/:id', orderIdValidation, handleValidationErrors, orderController.getOrderById);

// Rutas para meseros y admin
router.post('/', authorizeRoles('mesero', 'admin'), createOrderValidation, handleValidationErrors, orderController.createOrder);
router.put('/:id', authorizeRoles('mesero', 'admin'), createOrderValidation, handleValidationErrors, orderController.updateOrder); // For updating drafts
router.put('/:id/status', authorizeRoles('mesero', 'admin', 'cocinero'), updateOrderValidation, handleValidationErrors, orderController.updateOrderStatus);

// Rutas solo para admin
router.delete('/:id', authorizeRoles('admin'), orderIdValidation, handleValidationErrors, orderController.deleteOrder);

module.exports = router;
