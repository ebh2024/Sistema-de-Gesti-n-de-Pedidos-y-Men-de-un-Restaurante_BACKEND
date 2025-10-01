const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const {
    createUserValidation,
    updateUserValidation
} = require('../middlewares/validation/userValidation');
const { handleValidationErrors } = require('../middlewares/errorHandler');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestión de usuarios por administradores
 */

// Todas las rutas requieren autenticación y rol de admin
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - correo
 *               - contraseña
 *               - rol
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre completo del usuario
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico único
 *               contraseña:
 *                 type: string
 *                 format: password
 *                 description: Contraseña (mínimo 6 caracteres)
 *               rol:
 *                 type: string
 *                 enum: [admin, cocinero, mesero]
 *                 description: Rol del usuario
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Acceso denegado
 */
router.post('/', createUserValidation, handleValidationErrors, userController.createUser);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener lista de usuarios
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *       403:
 *         description: Acceso denegado
 */
router.get('/', userController.getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre completo del usuario
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico único
 *               rol:
 *                 type: string
 *                 enum: [admin, cocinero, mesero]
 *                 description: Rol del usuario
 *               is_active:
 *                 type: boolean
 *                 description: Estado activo del usuario
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/:id', updateUserValidation, handleValidationErrors, userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Usuario no encontrado
 */
router.delete('/:id', userController.deleteUser);

module.exports = router;
