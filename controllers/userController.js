const { User } = require('../models');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

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
const getUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'nombre', 'correo', 'rol', 'is_active', 'created_at', 'updated_at']
        });

        logger.info(`Lista de usuarios obtenida por admin: ${req.user.correo}`);
        res.json({
            message: 'Usuarios obtenidos exitosamente',
            users
        });
    } catch (error) {
        logger.error(`Error al obtener usuarios: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualiza un usuario (solo admin)
 *     description: Permite a un administrador actualizar la información de un usuario.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre completo del usuario.
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico único del usuario.
 *               rol:
 *                 type: string
 *                 enum: [admin, cocinero, mesero]
 *                 description: Rol del usuario.
 *               is_active:
 *                 type: boolean
 *                 description: Estado activo del usuario.
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente.
 *       400:
 *         description: Datos inválidos.
 *       403:
 *         description: Acceso denegado.
 *       404:
 *         description: Usuario no encontrado.
 */
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, correo, rol, is_active } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            logger.warn(`Usuario no encontrado para actualización: ID ${id}`);
            return next(new AppError('Usuario no encontrado', 404));
        }

        // Verificar si el correo ya está en uso por otro usuario
        if (correo && correo !== user.correo) {
            const existingUser = await User.findOne({ where: { correo } });
            if (existingUser) {
                logger.warn(`Intento de actualizar usuario con correo ya existente: ${correo}`);
                return next(new AppError('El correo ya está registrado', 400));
            }
        }

        // Actualizar el usuario
        await user.update({
            nombre: nombre || user.nombre,
            correo: correo || user.correo,
            rol: rol || user.rol,
            is_active: is_active !== undefined ? is_active : user.is_active
        });

        logger.info(`Usuario actualizado por admin: ${user.correo}`);
        res.json({
            message: 'Usuario actualizado exitosamente',
            user: {
                id: user.id,
                nombre: user.nombre,
                correo: user.correo,
                rol: user.rol,
                is_active: user.is_active
            }
        });
    } catch (error) {
        logger.error(`Error al actualizar usuario: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Elimina un usuario (solo admin)
 *     description: Permite a un administrador eliminar un usuario.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario a eliminar.
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente.
 *       403:
 *         description: Acceso denegado.
 *       404:
 *         description: Usuario no encontrado.
 */
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            logger.warn(`Usuario no encontrado para eliminación: ID ${id}`);
            return next(new AppError('Usuario no encontrado', 404));
        }

        await user.destroy();

        logger.info(`Usuario eliminado por admin: ${user.correo}`);
        res.json({
            message: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        logger.error(`Error al eliminar usuario: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

module.exports = {
    createUser,
    getUsers,
    updateUser,
    deleteUser
};
