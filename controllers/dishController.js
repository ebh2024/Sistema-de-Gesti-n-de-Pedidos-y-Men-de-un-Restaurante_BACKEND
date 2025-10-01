const { Dish } = require('../models');
const logger = require('../utils/logger');
const baseController = require('./baseController');

const dishController = baseController(Dish);

/**
 * @swagger
 * /api/dishes/public:
 *   get:
 *     summary: Obtiene todos los platos disponibles para el menú público.
 *     tags: [Dishes]
 *     responses:
 *       200:
 *         description: Lista de platos disponibles.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Dish'
 *       500:
 *         description: Error interno del servidor.
 */
const getAvailableDishes = async (req, res, next) => {
    try {
        const dishes = await Dish.findAll({
            where: { disponibilidad: 1 }, // Only available dishes
            order: [['created_at', 'DESC']] // Ordenar por fecha de creación descendente
        });
        logger.info('Se obtuvieron los platos disponibles para el menú público exitosamente.');
        res.json(dishes);
    } catch (error) {
        logger.error(`Error al obtener platos disponibles para menú público: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

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
module.exports = {
    getAvailableDishes,
    getAllDishes: dishController.getAll,
    getDishById: dishController.getById,
    createDish: dishController.create,
    updateDish: dishController.update,
    deleteDish: dishController.delete
};
