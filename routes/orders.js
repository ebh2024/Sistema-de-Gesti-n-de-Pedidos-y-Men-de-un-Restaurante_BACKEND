const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { createOrderValidation, updateOrderValidation, orderIdValidation, updateOrderStatusValidation } = require('../middlewares/validation/orderValidation');
const { handleValidationErrors } = require('../middlewares/errorHandler');

router.use(authenticateToken);

router.get('/', orderController.getAllOrders);
router.get('/:id', orderIdValidation, handleValidationErrors, orderController.getOrderById);

router.post('/', authorizeRoles('mesero', 'admin'), createOrderValidation, handleValidationErrors, orderController.createOrder);
router.put('/:id', authorizeRoles('mesero', 'admin'), updateOrderValidation, handleValidationErrors, orderController.updateOrder);
router.put('/:id/status', authorizeRoles('mesero', 'admin', 'cocinero'), updateOrderStatusValidation, handleValidationErrors, orderController.updateOrderStatus);

router.delete('/:id', authorizeRoles('admin'), orderIdValidation, handleValidationErrors, orderController.deleteOrder);

module.exports = router;
