const { Table } = require('../models');
const AppError = require('../utils/AppError');

const getAllTables = async (req, res, next) => {
    try {
        const tables = await Table.findAll({
            order: [['numero', 'ASC']]
        });
        res.json(tables);
    } catch (error) {
        next(error);
    }
};

const getTableById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const table = await Table.findByPk(id);

        if (!table) {
            return next(new AppError('Mesa no encontrada', 404));
        }

        res.json(table);
    } catch (error) {
        next(error);
    }
};

const createTable = async (req, res, next) => {
    try {
        const { numero, capacidad, disponible } = req.body;

        if (!numero || !capacidad) {
            return next(new AppError('Número y capacidad son requeridos', 400));
        }

        // Verificar si el número de mesa ya existe
        const existingTable = await Table.findOne({ where: { numero } });
        if (existingTable) {
            return next(new AppError('El número de mesa ya existe', 400));
        }

        const table = await Table.create({
            numero,
            capacidad,
            disponible: disponible !== undefined ? disponible : 1
        });

        res.status(201).json({
            message: 'Mesa creada exitosamente',
            tableId: table.id
        });
    } catch (error) {
        next(error);
    }
};

const updateTable = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { numero, capacidad, disponible } = req.body;

        // Verificar si el nuevo número ya existe (si se está cambiando)
        if (numero) {
            const existingTable = await Table.findOne({
                where: {
                    numero,
                    id: { [require('sequelize').Op.ne]: id }
                }
            });

            if (existingTable) {
                return next(new AppError('El número de mesa ya existe', 400));
            }
        }

        const [affectedRows] = await Table.update(
            { numero, capacidad, disponible },
            { where: { id } }
        );

        if (affectedRows === 0) {
            return next(new AppError('Mesa no encontrada', 404));
        }

        res.json({ message: 'Mesa actualizada exitosamente' });
    } catch (error) {
        next(error);
    }
};

const deleteTable = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deletedRows = await Table.destroy({ where: { id } });

        if (deletedRows === 0) {
            return next(new AppError('Mesa no encontrada', 404));
        }

        res.json({ message: 'Mesa eliminada exitosamente' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllTables,
    getTableById,
    createTable,
    updateTable,
    deleteTable
};
