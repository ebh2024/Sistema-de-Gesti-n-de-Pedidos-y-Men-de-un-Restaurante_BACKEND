const { Table } = require('../models');

const getAllTables = async (req, res) => {
    try {
        const tables = await Table.findAll({
            order: [['numero', 'ASC']]
        });
        res.json(tables);
    } catch (error) {
        console.error('Error obteniendo mesas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const getTableById = async (req, res) => {
    try {
        const { id } = req.params;
        const table = await Table.findByPk(id);

        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        res.json(table);
    } catch (error) {
        console.error('Error obteniendo mesa:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const createTable = async (req, res) => {
    try {
        const { numero, capacidad, disponible } = req.body;

        if (!numero || !capacidad) {
            return res.status(400).json({ message: 'Número y capacidad son requeridos' });
        }

        // Verificar si el número de mesa ya existe
        const existingTable = await Table.findOne({ where: { numero } });
        if (existingTable) {
            return res.status(400).json({ message: 'El número de mesa ya existe' });
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
        console.error('Error creando mesa:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const updateTable = async (req, res) => {
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
                return res.status(400).json({ message: 'El número de mesa ya existe' });
            }
        }

        const [affectedRows] = await Table.update(
            { numero, capacidad, disponible },
            { where: { id } }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        res.json({ message: 'Mesa actualizada exitosamente' });
    } catch (error) {
        console.error('Error actualizando mesa:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const deleteTable = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedRows = await Table.destroy({ where: { id } });

        if (deletedRows === 0) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        res.json({ message: 'Mesa eliminada exitosamente' });
    } catch (error) {
        console.error('Error eliminando mesa:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAllTables,
    getTableById,
    createTable,
    updateTable,
    deleteTable
};
