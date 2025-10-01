const { Table } = require('../models');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

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
const getAllTables = async (req, res, next) => {
    try {
        const tables = await Table.findAll({
            order: [['numero', 'ASC']] // Ordenar por número de mesa ascendente
        });
        logger.info('Se obtuvieron todas las mesas exitosamente.');
        res.json(tables);
    } catch (error) {
        logger.error(`Error al obtener todas las mesas: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/tables/{id}:
 *   get:
 *     summary: Obtiene una mesa por su ID.
 *     tags: [Tables]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la mesa a obtener.
 *     responses:
 *       200:
 *         description: Detalles de la mesa.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Table'
 *       404:
 *         description: Mesa no encontrada.
 *       500:
 *         description: Error interno del servidor.
 */
const getTableById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const table = await Table.findByPk(id);

        if (!table) {
            logger.warn(`Intento de obtener mesa con ID no encontrado: ${id}`);
            return next(new AppError('Mesa no encontrada', 404));
        }

        logger.info(`Se obtuvo la mesa con ID: ${id} exitosamente.`);
        res.json(table);
    } catch (error) {
        logger.error(`Error al obtener mesa por ID ${id}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/tables:
 *   post:
 *     summary: Crea una nueva mesa.
 *     tags: [Tables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - numero
 *               - capacidad
 *             properties:
 *               numero:
 *                 type: integer
 *                 description: Número único de la mesa.
 *               capacidad:
 *                 type: integer
 *                 description: Capacidad de personas de la mesa.
 *               disponible:
 *                 type: boolean
 *                 description: Estado de disponibilidad de la mesa (true por defecto).
 *     responses:
 *       201:
 *         description: Mesa creada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mesa creada exitosamente
 *                 tableId:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Número y capacidad son requeridos o el número de mesa ya existe.
 *       500:
 *         description: Error interno del servidor.
 */
const createTable = async (req, res, next) => {
    try {
        const { numero, capacidad, estado } = req.body;

        // Verificar si ya existe una mesa con el número proporcionado
        const existingTable = await Table.findOne({ where: { numero } });
        if (existingTable) {
            logger.warn(`Intento de crear mesa con número ya existente: ${numero}`);
            return next(new AppError('El número de mesa ya existe', 400));
        }

        // Crear la nueva mesa en la base de datos
        const table = await Table.create({
            numero,
            capacidad,
            estado: estado || 'available' // Por defecto, available
        });

        logger.info(`Mesa creada exitosamente con ID: ${table.id}, número: ${table.numero}`);
        res.status(201).json({
            message: 'Mesa creada exitosamente',
            tableId: table.id
        });
    } catch (error) {
        logger.error(`Error al crear mesa: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/tables/{id}:
 *   put:
 *     summary: Actualiza una mesa existente.
 *     tags: [Tables]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la mesa a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numero:
 *                 type: integer
 *                 description: Nuevo número de la mesa.
 *               capacidad:
 *                 type: integer
 *                 description: Nueva capacidad de personas de la mesa.
 *               disponible:
 *                 type: boolean
 *                 description: Nuevo estado de disponibilidad de la mesa.
 *     responses:
 *       200:
 *         description: Mesa actualizada exitosamente.
 *       400:
 *         description: El número de mesa ya existe.
 *       404:
 *         description: Mesa no encontrada.
 *       500:
 *         description: Error interno del servidor.
 */
const updateTable = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { numero, capacidad, estado } = req.body;

        // Verificar si el nuevo número de mesa ya existe para otra mesa (si se está cambiando)
        if (numero) {
            const existingTable = await Table.findOne({
                where: {
                    numero,
                    id: { [require('sequelize').Op.ne]: id } // Excluir la mesa actual de la búsqueda
                }
            });

            if (existingTable) {
                logger.warn(`Intento de actualizar mesa ${id} con número ya existente: ${numero}`);
                return next(new AppError('El número de mesa ya existe', 400));
            }
        }

        // Actualizar la mesa en la base de datos
        const [affectedRows] = await Table.update(
            { numero, capacidad, estado },
            { where: { id } }
        );

        // Si no se afectó ninguna fila, la mesa no fue encontrada
        if (affectedRows === 0) {
            logger.warn(`Intento de actualizar mesa con ID no encontrado: ${id}`);
            return next(new AppError('Mesa no encontrada', 404));
        }

        logger.info(`Mesa con ID: ${id} actualizada exitosamente.`);
        res.json({ message: 'Mesa actualizada exitosamente' });
    } catch (error) {
        logger.error(`Error al actualizar mesa con ID ${id}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/tables/{id}:
 *   delete:
 *     summary: Elimina una mesa por su ID.
 *     tags: [Tables]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la mesa a eliminar.
 *     responses:
 *       200:
 *         description: Mesa eliminada exitosamente.
 *       404:
 *         description: Mesa no encontrada.
 *       500:
 *         description: Error interno del servidor.
 */
const deleteTable = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Eliminar la mesa de la base de datos
        const deletedRows = await Table.destroy({ where: { id } });

        // Si no se eliminó ninguna fila, la mesa no fue encontrada
        if (deletedRows === 0) {
            logger.warn(`Intento de eliminar mesa con ID no encontrado: ${id}`);
            return next(new AppError('Mesa no encontrada', 404));
        }

        logger.info(`Mesa con ID: ${id} eliminada exitosamente.`);
        res.json({ message: 'Mesa eliminada exitosamente' });
    } catch (error) {
        logger.error(`Error al eliminar mesa con ID ${id}: ${error.message}`, { stack: error.stack });
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
