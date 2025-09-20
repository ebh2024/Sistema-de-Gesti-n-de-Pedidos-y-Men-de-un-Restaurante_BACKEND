const { Dish } = require('../models');
const AppError = require('../utils/AppError');

const getAllDishes = async (req, res, next) => {
    try {
        const dishes = await Dish.findAll({
            order: [['created_at', 'DESC']]
        });
        res.json(dishes);
    } catch (error) {
        next(error);
    }
};

const getDishById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const dish = await Dish.findByPk(id);

        if (!dish) {
            return next(new AppError('Plato no encontrado', 404));
        }

        res.json(dish);
    } catch (error) {
        next(error);
    }
};

const createDish = async (req, res, next) => {
    try {
        const { nombre, descripcion, precio, disponibilidad } = req.body;

        if (!nombre || !precio) {
            return next(new AppError('Nombre y precio son requeridos', 400));
        }

        const dish = await Dish.create({
            nombre,
            descripcion: descripcion || '',
            precio,
            disponibilidad: disponibilidad !== undefined ? disponibilidad : 1
        });

        res.status(201).json({
            message: 'Plato creado exitosamente',
            dishId: dish.id
        });
    } catch (error) {
        next(error);
    }
};

const updateDish = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio, disponibilidad } = req.body;

        const [affectedRows] = await Dish.update(
            { nombre, descripcion, precio, disponibilidad },
            { where: { id } }
        );

        if (affectedRows === 0) {
            return next(new AppError('Plato no encontrado', 404));
        }

        res.json({ message: 'Plato actualizado exitosamente' });
    } catch (error) {
        next(error);
    }
};

const deleteDish = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deletedRows = await Dish.destroy({ where: { id } });

        if (deletedRows === 0) {
            return next(new AppError('Plato no encontrado', 404));
        }

        res.json({ message: 'Plato eliminado exitosamente' });
    } catch (error) {
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
