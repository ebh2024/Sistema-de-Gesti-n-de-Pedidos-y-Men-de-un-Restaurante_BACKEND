const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para todos los usuarios autenticados
router.get('/', tableController.getAllTables);
router.get('/:id', tableController.getTableById);

// Rutas solo para admin
router.post('/', authorizeRoles('admin'), tableController.createTable);
router.put('/:id', authorizeRoles('admin'), tableController.updateTable);
router.delete('/:id', authorizeRoles('admin'), tableController.deleteTable);

module.exports = router;
