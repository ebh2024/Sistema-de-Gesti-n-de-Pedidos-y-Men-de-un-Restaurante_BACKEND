const { Order, OrderDetail, Table, User, Dish, sequelize } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Gestión de pedidos
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Obtiene todos los pedidos.
 *     description: Retorna una lista de todos los pedidos, con la opción de filtrar por mesero si el usuario es un mesero.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos obtenida exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   estado:
 *                     type: string
 *                   total:
 *                     type: number
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *                   mesa_numero:
 *                     type: integer
 *                   mesero_nombre:
 *                     type: string
 *       500:
 *         description: Error interno del servidor.
 */
const getAllOrders = async (req, res, next) => {
    try {
        // Si el usuario es un mesero, solo puede ver sus propios pedidos
        const whereCondition = req.user.rol === 'mesero' ? { id_mesero: req.user.id } : {};

        const orders = await Order.findAll({
            where: whereCondition,
            include: [
                {
                    model: Table,
                    as: 'mesa',
                    attributes: ['numero']
                },
                {
                    model: User,
                    as: 'mesero',
                    attributes: ['nombre']
                }
            ],
            order: [['created_at', 'DESC']] // Ordenar por fecha de creación descendente
        });

        // Formatear la salida para incluir el número de mesa y el nombre del mesero directamente
        const formattedOrders = orders.map(order => ({
            ...order.toJSON(),
            mesa_numero: order.mesa.numero,
            mesero_nombre: order.mesero.nombre
        }));

        logger.info(`Se obtuvieron ${formattedOrders.length} pedidos.`);
        res.json(formattedOrders);
    } catch (error) {
        logger.error(`Error al obtener todos los pedidos: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Obtiene un pedido por su ID.
 *     description: Retorna los detalles de un pedido específico, incluyendo la mesa, el mesero y los platos.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del pedido a obtener.
 *     responses:
 *       200:
 *         description: Detalles del pedido obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 estado:
 *                   type: string
 *                 total:
 *                   type: number
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                 mesa_numero:
 *                   type: integer
 *                 mesero_nombre:
 *                   type: string
 *                 detalles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       cantidad:
 *                         type: integer
 *                       precio_unitario:
 *                         type: number
 *                       plato_nombre:
 *                         type: string
 *                       precio_actual:
 *                         type: number
 *       404:
 *         description: Pedido no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */
const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Condición para asegurar que un mesero solo pueda ver sus propios pedidos
        const whereCondition = req.user.rol === 'mesero'
            ? { id, id_mesero: req.user.id }
            : { id };

        // Obtener el pedido con sus relaciones (mesa, mesero, detalles y platos)
        const order = await Order.findOne({
            where: whereCondition,
            include: [
                {
                    model: Table,
                    as: 'mesa',
                    attributes: ['numero']
                },
                {
                    model: User,
                    as: 'mesero',
                    attributes: ['nombre']
                },
                {
                    model: OrderDetail,
                    as: 'detalles',
                    include: [
                        {
                            model: Dish,
                            as: 'plato',
                            attributes: ['nombre', 'precio']
                        }
                    ]
                }
            ]
        });

        if (!order) {
            logger.warn(`Intento de obtener pedido con ID no encontrado: ${id} o no autorizado.`);
            return next(new AppError('Pedido no encontrado', 404));
        }

        // Formatear la salida para incluir el número de mesa, el nombre del mesero y los detalles del plato
        const formattedOrder = {
            ...order.toJSON(),
            mesa_numero: order.mesa.numero,
            mesero_nombre: order.mesero.nombre,
            detalles: order.detalles.map(detalle => ({
                ...detalle.toJSON(),
                plato_nombre: detalle.plato.nombre,
                precio_actual: detalle.plato.precio
            }))
        };

        logger.info(`Se obtuvo el pedido con ID: ${id} exitosamente.`);
        res.json(formattedOrder);
    } catch (error) {
        logger.error(`Error al obtener pedido por ID ${id}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Crea un nuevo pedido.
 *     description: Crea un nuevo pedido para una mesa específica con una lista de platos.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_mesa
 *               - detalles
 *             properties:
 *               id_mesa:
 *                 type: integer
 *                 description: ID de la mesa a la que se asigna el pedido.
 *               detalles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id_plato
 *                     - cantidad
 *                   properties:
 *                     id_plato:
 *                       type: integer
 *                       description: ID del plato.
 *                     cantidad:
 *                       type: integer
 *                       description: Cantidad del plato.
 *     responses:
 *       201:
 *         description: Pedido creado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pedido creado exitosamente
 *                 orderId:
 *                   type: integer
 *                   example: 1
 *                 total:
 *                   type: number
 *                   example: 25.50
 *       400:
 *         description: Datos de entrada inválidos (mesa o detalles faltantes, mesa no disponible, plato no encontrado).
 *       404:
 *         description: Mesa no encontrada.
 *       500:
 *         description: Error interno del servidor.
 */
const createOrder = async (req, res, next) => {
    // Iniciar una transacción para asegurar la atomicidad de la operación
    const transaction = await sequelize.transaction();

    try {
        const { id_mesa, detalles } = req.body;

        // Validar que la mesa y los detalles del pedido estén presentes
        if (!id_mesa || !detalles || detalles.length === 0) {
            logger.warn('Intento de crear pedido con campos incompletos.');
            return next(new AppError('Mesa y detalles del pedido son requeridos', 400));
        }

        // Verificar que la mesa existe y está disponible
        const table = await Table.findByPk(id_mesa, { transaction });
        if (!table) {
            logger.warn(`Intento de crear pedido para mesa no encontrada: ${id_mesa}`);
            return next(new AppError('Mesa no encontrada', 404));
        }

        if (!table.disponible) {
            logger.warn(`Intento de crear pedido para mesa no disponible: ${id_mesa}`);
            return next(new AppError('La mesa no está disponible', 400));
        }

        let total = 0;
        const orderDetailsToCreate = [];

        // Iterar sobre los detalles del pedido para calcular el total y verificar la disponibilidad de los platos
        for (const detalle of detalles) {
            const dish = await Dish.findOne({
                where: {
                    id: detalle.id_plato,
                    disponibilidad: true // Verificar que el plato esté disponible
                },
                transaction
            });

            if (!dish) {
                logger.warn(`Plato ${detalle.id_plato} no encontrado o no disponible durante la creación del pedido.`);
                return next(new AppError(`Plato ${detalle.id_plato} no encontrado o no disponible`, 400));
            }

            total += dish.precio * detalle.cantidad;
            orderDetailsToCreate.push({
                id_plato: detalle.id_plato,
                cantidad: detalle.cantidad,
                precio_unitario: dish.precio
            });
        }

        // Crear el pedido principal
        const order = await Order.create({
            id_mesa,
            id_mesero: req.user.id, // Asignar el pedido al mesero autenticado
            total
        }, { transaction });

        // Crear los detalles del pedido asociados al pedido principal
        for (const detalle of orderDetailsToCreate) {
            await OrderDetail.create({
                id_pedido: order.id,
                ...detalle
            }, { transaction });
        }

        // Marcar la mesa como no disponible
        await Table.update(
            { disponible: false }, // Asumiendo que 'disponible' es un booleano
            { where: { id: id_mesa }, transaction }
        );

        await transaction.commit(); // Confirmar la transacción
        logger.info(`Pedido creado exitosamente con ID: ${order.id} por el mesero ${req.user.id}. Total: ${total}`);
        res.status(201).json({
            message: 'Pedido creado exitosamente',
            orderId: order.id,
            total: total
        });
    } catch (error) {
        await transaction.rollback(); // Revertir la transacción en caso de error
        logger.error(`Error al crear pedido: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Actualiza el estado de un pedido.
 *     description: Permite cambiar el estado de un pedido a 'pendiente', 'en preparación' o 'servido'. Si el estado es 'servido', la mesa asociada se marca como disponible.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del pedido a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [pendiente, en preparación, servido]
 *                 description: Nuevo estado del pedido.
 *     responses:
 *       200:
 *         description: Estado del pedido actualizado exitosamente.
 *       400:
 *         description: Estado inválido.
 *       404:
 *         description: Pedido no encontrado o no autorizado.
 *       500:
 *         description: Error interno del servidor.
 */
const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        // Validar que el estado proporcionado sea uno de los valores permitidos
        if (!['pendiente', 'en preparación', 'servido'].includes(estado)) {
            logger.warn(`Intento de actualizar pedido ${id} con estado inválido: ${estado}`);
            return next(new AppError('Estado inválido', 400));
        }

        // Condición para asegurar que un mesero solo pueda actualizar sus propios pedidos
        const whereCondition = req.user.rol === 'mesero'
            ? { id, id_mesero: req.user.id }
            : { id };

        const order = await Order.findOne({ where: whereCondition });

        if (!order) {
            logger.warn(`Intento de actualizar estado de pedido con ID no encontrado: ${id} o no autorizado.`);
            return next(new AppError('Pedido no encontrado', 404));
        }

        // Actualizar el estado del pedido
        await Order.update(
            { estado },
            { where: { id } }
        );

        // Si el pedido se marca como 'servido', liberar la mesa asociada
        if (estado === 'servido') {
            await Table.update(
                { disponible: true }, // Asumiendo que 'disponible' es un booleano
                { where: { id: order.id_mesa } }
            );
            logger.info(`Mesa ${order.id_mesa} liberada tras servir el pedido ${id}.`);
        }

        logger.info(`Estado del pedido con ID: ${id} actualizado a '${estado}' exitosamente.`);
        res.json({ message: 'Estado del pedido actualizado exitosamente' });
    } catch (error) {
        logger.error(`Error al actualizar estado del pedido con ID ${id}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Elimina un pedido por su ID.
 *     description: Elimina un pedido y sus detalles asociados. También libera la mesa si el pedido estaba asignado a una.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del pedido a eliminar.
 *     responses:
 *       200:
 *         description: Pedido eliminado exitosamente.
 *       404:
 *         description: Pedido no encontrado o no autorizado.
 *       500:
 *         description: Error interno del servidor.
 */
const deleteOrder = async (req, res, next) => {
    // Iniciar una transacción para asegurar la atomicidad de la operación
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;

        // Condición para asegurar que un mesero solo pueda eliminar sus propios pedidos
        const whereCondition = req.user.rol === 'mesero'
            ? { id, id_mesero: req.user.id }
            : { id };

        const order = await Order.findOne({
            where: whereCondition,
            transaction
        });

        if (!order) {
            logger.warn(`Intento de eliminar pedido con ID no encontrado: ${id} o no autorizado.`);
            return next(new AppError('Pedido no encontrado', 404));
        }

        // Eliminar los detalles del pedido asociados
        await OrderDetail.destroy({
            where: { id_pedido: id },
            transaction
        });
        logger.info(`Detalles del pedido ${id} eliminados.`);

        // Liberar la mesa asociada al pedido
        await Table.update(
            { disponible: true }, // Asumiendo que 'disponible' es un booleano
            { where: { id: order.id_mesa }, transaction }
        );
        logger.info(`Mesa ${order.id_mesa} liberada tras eliminar el pedido ${id}.`);

        // Eliminar el pedido principal
        await Order.destroy({
            where: { id },
            transaction
        });

        await transaction.commit(); // Confirmar la transacción
        logger.info(`Pedido con ID: ${id} eliminado exitosamente.`);
        res.json({ message: 'Pedido eliminado exitosamente' });
    } catch (error) {
        await transaction.rollback(); // Revertir la transacción en caso de error
        logger.error(`Error al eliminar pedido con ID ${id}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

module.exports = {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    deleteOrder
};
