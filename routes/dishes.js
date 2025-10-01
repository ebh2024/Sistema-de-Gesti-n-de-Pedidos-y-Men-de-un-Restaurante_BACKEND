const express = require('express');
const router = express.Router();
const dishController = require('../controllers/dishController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { createDishValidation, updateDishValidation, dishIdValidation } = require('../middlewares/validation/dishValidation');
const { handleValidationErrors } = require('../middlewares/errorHandler');

router.get('/public', dishController.getAvailableDishes); // Rutas públicas (no requieren autenticación)

router.use(authenticateToken); // Todas las demás rutas requieren autenticación

router.get('/', dishController.getAllDishes); // Rutas para todos los usuarios autenticados
router.get('/:id', dishIdValidation, handleValidationErrors, dishController.getDishById);

router.post('/', authorizeRoles('admin'), createDishValidation, handleValidationErrors, dishController.createDish); // Rutas solo para admin
router.put('/:id', authorizeRoles('admin'), updateDishValidation, handleValidationErrors, dishController.updateDish);
router.delete('/:id', authorizeRoles('admin'), dishIdValidation, handleValidationErrors, dishController.deleteDish);

module.exports = router;
