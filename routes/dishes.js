const express = require('express');
const router = express.Router();
const dishController = require('../controllers/dishController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para todos los usuarios autenticados
router.get('/', dishController.getAllDishes);
router.get('/:id', dishController.getDishById);

// Rutas solo para admin
router.post('/', authorizeRoles('admin'), dishController.createDish);
router.put('/:id', authorizeRoles('admin'), dishController.updateDish);
router.delete('/:id', authorizeRoles('admin'), dishController.deleteDish);

module.exports = router;
