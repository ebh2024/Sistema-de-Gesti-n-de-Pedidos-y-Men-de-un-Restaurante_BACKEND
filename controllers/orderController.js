const orderService = require('../services/orderService');
const logger = require('../utils/logger');


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
        const formattedOrders = await orderService.getAllOrders(req.user);
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
        const formattedOrder = await orderService.getOrderById(id, req.user);
        logger.info(`Se obtuvo el pedido con ID: ${id} exitosamente.`);
        res.json(formattedOrder);
    } catch (error) {
        logger.error(`Error al obtener pedido por ID ${req.params.id}: ${error.message}`, { stack: error.stack });
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
 *               estado:
 *                 type: string
 *                 enum: [borrador, pendiente, en preparación, servido]
 *                 description: Estado del pedido (opcional, por defecto 'pendiente').
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
    try {
        const { id_mesa, detalles, estado } = req.body;
        const { orderId, total } = await orderService.createOrder(id_mesa, detalles, req.user.id, estado);
        logger.info(`Pedido creado exitosamente con ID: ${orderId} por el mesero ${req.user.id}. Estado: ${estado}. Total: ${total}`);
        res.status(201).json({
            message: 'Pedido creado exitosamente',
            orderId: orderId,
            total: total
        });
    } catch (error) {
        logger.error(`Error al crear pedido: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * @swagger
 * /api/orders/{id}:
 *   put:
 *     summary: Actualiza un pedido existente (solo para borradores).
 *     description: Permite actualizar los detalles de un pedido que esté en estado 'borrador'.
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
 *               - detalles
 *             properties:
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
 *       200:
 *         description: Pedido actualizado exitosamente.
 *       400:
 *         description: Datos inválidos o pedido no es borrador.
 *       404:
 *         description: Pedido no encontrado o no autorizado.
 *       500:
 *         description: Error interno del servidor.
 */
const updateOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { detalles } = req.body;
        const { message, total } = await orderService.updateOrder(id, detalles, req.user);
        logger.info(`Pedido ${id} actualizado exitosamente. Nuevo total: ${total}`);
        res.json({ message, total });
    } catch (error) {
        logger.error(`Error al actualizar pedido ${req.params.id}: ${error.message}`, { stack: error.stack });
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
 *                 enum: [borrador, pendiente, en preparación, servido]
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
        const { message } = await orderService.updateOrderStatus(id, estado, req.user);
        logger.info(`Estado del pedido con ID: ${id} actualizado a '${estado}' exitosamente.`);
        res.json({ message });
    } catch (error) {
        logger.error(`Error al actualizar estado del pedido con ID ${req.params.id}: ${error.message}`, { stack: error.stack });
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
    try {
        const { id } = req.params;
        const { message } = await orderService.deleteOrder(id, req.user);
        logger.info(`Pedido con ID: ${id} eliminado exitosamente.`);
        res.json({ message });
    } catch (error) {
        logger.error(`Error al eliminar pedido con ID ${req.params.id}: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

module.exports = {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder
};
