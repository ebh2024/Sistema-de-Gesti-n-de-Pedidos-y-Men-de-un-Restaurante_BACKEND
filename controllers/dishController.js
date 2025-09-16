const { Dish } = require('../models');

const getAllDishes = async (req, res) => {
    try {
        const dishes = await Dish.findAll({
            order: [['created_at', 'DESC']]
        });
        res.json(dishes);
    } catch (error) {
        console.error('Error obteniendo platos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const getDishById = async (req, res) => {
    try {
        const { id } = req.params;
        const dish = await Dish.findByPk(id);

        if (!dish) {
            return res.status(404).json({ message: 'Plato no encontrado' });
        }

        res.json(dish);
    } catch (error) {
        console.error('Error obteniendo plato:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const createDish = async (req, res) => {
    try {
        const { nombre, descripcion, precio, disponibilidad } = req.body;

        if (!nombre || !precio) {
            return res.status(400).json({ message: 'Nombre y precio son requeridos' });
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
        console.error('Error creando plato:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const updateDish = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio, disponibilidad } = req.body;

        const [affectedRows] = await Dish.update(
            { nombre, descripcion, precio, disponibilidad },
            { where: { id } }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Plato no encontrado' });
        }

        res.json({ message: 'Plato actualizado exitosamente' });
    } catch (error) {
        console.error('Error actualizando plato:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const deleteDish = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedRows = await Dish.destroy({ where: { id } });

        if (deletedRows === 0) {
            return res.status(404).json({ message: 'Plato no encontrado' });
        }

        res.json({ message: 'Plato eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando plato:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAllDishes,
    getDishById,
    createDish,
    updateDish,
    deleteDish
};
