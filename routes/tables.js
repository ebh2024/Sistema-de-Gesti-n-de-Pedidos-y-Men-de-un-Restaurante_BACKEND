const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { createTableValidation, updateTableValidation, tableIdValidation } = require('../middlewares/validation/tableValidation');
const { handleValidationErrors } = require('../middlewares/errorHandler');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para todos los usuarios autenticados
router.get('/', tableController.getAllTables);
router.get('/:id', tableIdValidation, handleValidationErrors, tableController.getTableById);

// Rutas solo para admin
router.post('/', authorizeRoles('admin'), createTableValidation, handleValidationErrors, tableController.createTable);
router.put('/:id', authorizeRoles('admin'), updateTableValidation, handleValidationErrors, tableController.updateTable);
router.delete('/:id', authorizeRoles('admin'), tableIdValidation, handleValidationErrors, tableController.deleteTable);

module.exports = router;
