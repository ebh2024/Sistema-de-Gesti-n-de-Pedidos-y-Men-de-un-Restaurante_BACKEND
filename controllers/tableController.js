const { Table } = require('../models');
const baseController = require('./baseController');

const tableController = baseController(Table);

/**
 * @swagger
 * tags:
 *   name: Tables
 *   description: Gestión de mesas
 */

/**
 * @swagger
 * /api/tables:
 *   get:
 *     summary: Obtiene todas las mesas.
 *     tags: [Tables]
 *     responses:
 *       200:
 *         description: Lista de todas las mesas.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Table'
 *       500:
 *         description: Error interno del servidor.
 */
module.exports = {
    getAllTables: tableController.getAll,
    getTableById: tableController.getById,
    createTable: tableController.create,
    updateTable: tableController.update,
    deleteTable: tableController.delete
};
