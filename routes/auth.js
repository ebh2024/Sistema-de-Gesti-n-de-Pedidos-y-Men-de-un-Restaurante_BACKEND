const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middlewares/validation/authValidation');

// Rutas públicas
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
