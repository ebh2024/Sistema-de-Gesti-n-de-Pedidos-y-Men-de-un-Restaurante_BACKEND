const { User } = require('../models');
const AppError = require('../utils/AppError'); // Keep AppError for custom createUser logic
const logger = require('../utils/logger'); // Keep logger for custom createUser logic
const baseController = require('./baseController');

const userController = baseController(User);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crea un nuevo usuario (solo admin)
 *     description: Permite a un administrador crear un nuevo usuario con cualquier rol.
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
 *                 description: Nombre completo del usuario.
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico único del usuario.
 *               contraseña:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario.
 *               rol:
 *                 type: string
 *                 enum: [admin, cocinero, mesero]
 *                 description: Rol del usuario.
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente.
 *       400:
 *         description: Datos inválidos o correo ya registrado.
 *       403:
 *         description: Acceso denegado.
 */
const createUser = async (req, res, next) => {
    try {
        const { nombre, correo, contraseña, rol } = req.body;

        // Verificar si ya existe un usuario con el correo
        const existingUser = await User.findOne({ where: { correo } });
        if (existingUser) {
            logger.warn(`Intento de crear usuario con correo ya existente: ${correo}`);
            return next(new AppError('El correo ya está registrado', 400));
        }

        // Crear el usuario (password will be hashed by model hook)
        const user = await User.create({
            nombre,
            correo,
            contraseña, // Password will be hashed by model hook
            rol
        });

        logger.info(`Usuario creado por admin: ${user.correo} con rol: ${user.rol}`);
        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: {
                id: user.id,
                nombre: user.nombre,
                correo: user.correo,
                rol: user.rol,
                is_active: user.is_active
            }
        });
    } catch (error) {
        logger.error(`Error al crear usuario: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtiene la lista de usuarios (solo admin)
 *     description: Permite a un administrador obtener la lista de todos los usuarios.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente.
 *       403:
 *         description: Acceso denegado.
 */
module.exports = {
    createUser,
    getUsers: userController.getAll,
    updateUser: userController.update,
    deleteUser: userController.delete
};
