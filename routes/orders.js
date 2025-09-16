const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para todos los usuarios autenticados
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);

// Rutas para meseros y admin
router.post('/', authorizeRoles('mesero', 'admin'), orderController.createOrder);
router.put('/:id/status', authorizeRoles('mesero', 'admin', 'cocinero'), orderController.updateOrderStatus);

// Rutas solo para admin
router.delete('/:id', authorizeRoles('admin'), orderController.deleteOrder);

module.exports = router;
