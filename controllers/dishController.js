const { Dish } = require('../models');
const logger = require('../utils/logger');
const baseController = require('./baseController');

const dishController = baseController(Dish);

const getAvailableDishes = async (req, res, next) => {
    try {
        const dishes = await Dish.findAll({
            where: { disponibilidad: 1 },
            order: [['created_at', 'DESC']]
        });
        logger.info('Se obtuvieron los platos disponibles para el menú público exitosamente.');
        res.json(dishes);
    } catch (error) {
        logger.error(`Error al obtener platos disponibles para menú público: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

module.exports = {
    getAvailableDishes,
    getAllDishes: dishController.getAll,
    getDishById: dishController.getById,
    createDish: dishController.create,
    updateDish: dishController.update,
    deleteDish: dishController.delete
};
