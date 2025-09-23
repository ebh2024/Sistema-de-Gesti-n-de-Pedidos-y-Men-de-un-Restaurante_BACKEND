const { Dish } = require('../models');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/dishes:
 *   get:
 *     summary: Obtiene todos los platos disponibles.
 *     tags: [Dishes]
 *     responses:
 *       200:
 *         description: Lista de todos los platos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Dish'
 *       500:
 *         description: Error interno del servidor.
 */
const getAllDishes = async (req, res, next) => {
    try {
        const dishes = await Dish.findAll({
            order: [['created_at', 'DESC']] // Ordenar por fecha de creación descendente
        });
        logger.info('Se obtuvieron todos los platos exitosamente.');
        res.json(dishes);
    } catch (error) {
        logger.error(`Error al obtener todos los platos: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/dishes/{id}:
 *   get:
 *     summary: Obtiene un plato por su ID.
 *     tags: [Dishes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del plato a obtener.
 *     responses:
 *       200:
 *         description: Detalles del plato.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dish'
 *       404:
 *         description: Plato no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */
const getDishById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const dish = await Dish.findByPk(id);

        if (!dish) {
            logger.warn(`Intento de obtener plato con ID no encontrado: ${id}`);
            return next(new AppError('Plato no encontrado', 404));
        }

        logger.info(`Se obtuvo el plato con ID: ${id} exitosamente.`);
        res.json(dish);
    } catch (error) {
        logger.error(`Error al obtener plato por ID ${id}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/dishes:
 *   post:
 *     summary: Crea un nuevo plato.
 *     tags: [Dishes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - precio
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre del plato.
 *               descripcion:
 *                 type: string
 *                 description: Descripción del plato (opcional).
 *               precio:
 *                 type: number
 *                 format: float
 *                 description: Precio del plato.
 *               disponibilidad:
 *                 type: boolean
 *                 description: Disponibilidad del plato (true por defecto).
 *     responses:
 *       201:
 *         description: Plato creado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Plato creado exitosamente
 *                 dishId:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Nombre y precio son requeridos.
 *       500:
 *         description: Error interno del servidor.
 */
const createDish = async (req, res, next) => {
    try {
        const { nombre, descripcion, precio, disponibilidad } = req.body;

        // Validar que nombre y precio estén presentes
        if (!nombre || !precio) {
            logger.warn('Intento de crear plato con campos incompletos.');
            return next(new AppError('Nombre y precio son requeridos', 400));
        }

        // Crear el nuevo plato en la base de datos
        const dish = await Dish.create({
            nombre,
            descripcion: descripcion || '', // Si la descripción no se proporciona, se guarda como cadena vacía
            precio,
            disponibilidad: disponibilidad !== undefined ? disponibilidad : true // Por defecto, disponible
        });

        logger.info(`Plato creado exitosamente con ID: ${dish.id}`);
        res.status(201).json({
            message: 'Plato creado exitosamente',
            dishId: dish.id
        });
    } catch (error) {
        logger.error(`Error al crear plato: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/dishes/{id}:
 *   put:
 *     summary: Actualiza un plato existente.
 *     tags: [Dishes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del plato a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nuevo nombre del plato.
 *               descripcion:
 *                 type: string
 *                 description: Nueva descripción del plato.
 *               precio:
 *                 type: number
 *                 format: float
 *                 description: Nuevo precio del plato.
 *               disponibilidad:
 *                 type: boolean
 *                 description: Nueva disponibilidad del plato.
 *     responses:
 *       200:
 *         description: Plato actualizado exitosamente.
 *       404:
 *         description: Plato no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */
const updateDish = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio, disponibilidad } = req.body;

        // Actualizar el plato en la base de datos
        const [affectedRows] = await Dish.update(
            { nombre, descripcion, precio, disponibilidad },
            { where: { id } }
        );

        // Si no se afectó ninguna fila, el plato no fue encontrado
        if (affectedRows === 0) {
            logger.warn(`Intento de actualizar plato con ID no encontrado: ${id}`);
            return next(new AppError('Plato no encontrado', 404));
        }

        logger.info(`Plato con ID: ${id} actualizado exitosamente.`);
        res.json({ message: 'Plato actualizado exitosamente' });
    } catch (error) {
        logger.error(`Error al actualizar plato con ID ${id}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/dishes/{id}:
 *   delete:
 *     summary: Elimina un plato por su ID.
 *     tags: [Dishes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del plato a eliminar.
 *     responses:
 *       200:
 *         description: Plato eliminado exitosamente.
 *       404:
 *         description: Plato no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */
const deleteDish = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Eliminar el plato de la base de datos
        const deletedRows = await Dish.destroy({ where: { id } });

        // Si no se eliminó ninguna fila, el plato no fue encontrado
        if (deletedRows === 0) {
            logger.warn(`Intento de eliminar plato con ID no encontrado: ${id}`);
            return next(new AppError('Plato no encontrado', 404));
        }

        logger.info(`Plato con ID: ${id} eliminado exitosamente.`);
        res.json({ message: 'Plato eliminado exitosamente' });
    } catch (error) {
        logger.error(`Error al eliminar plato con ID ${id}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

module.exports = {
    getAllDishes,
    getDishById,
    createDish,
    updateDish,
    deleteDish
};
