const express = require('express');
const router = express.Router();
const dishController = require('../controllers/dishController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { createDishValidation, updateDishValidation, dishIdValidation } = require('../middlewares/validation/dishValidation');
const { handleValidationErrors } = require('../middlewares/errorHandler');

// Rutas públicas (no requieren autenticación)
router.get('/public', dishController.getAvailableDishes);

// Todas las demás rutas requieren autenticación
router.use(authenticateToken);

// Rutas para todos los usuarios autenticados
router.get('/', dishController.getAllDishes);
router.get('/:id', dishIdValidation, handleValidationErrors, dishController.getDishById);

// Rutas solo para admin
router.post('/', authorizeRoles('admin'), createDishValidation, handleValidationErrors, dishController.createDish);
router.put('/:id', authorizeRoles('admin'), updateDishValidation, handleValidationErrors, dishController.updateDish);
router.delete('/:id', authorizeRoles('admin'), dishIdValidation, handleValidationErrors, dishController.deleteDish);

module.exports = router;
