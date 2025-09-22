const { Order, OrderDetail, Table, User, Dish, sequelize } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger'); // Importar el logger

const getAllOrders = async (req, res, next) => {
    try {
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
            order: [['created_at', 'DESC']]
        });

        // Transformar los datos para mantener el formato anterior
        const formattedOrders = orders.map(order => ({
            ...order.toJSON(),
            mesa_numero: order.mesa.numero,
            mesero_nombre: order.mesero.nombre
        }));

        logger.info(`Se obtuvieron ${formattedOrders.length} pedidos.`);
        res.json(formattedOrders);
    } catch (error) {
        logger.error(`Error al obtener todos los pedidos: ${error.message}`);
        next(error);
    }
};

const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const whereCondition = req.user.rol === 'mesero'
            ? { id, id_mesero: req.user.id }
            : { id };

        // Obtener pedido con includes
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
            return next(new AppError('Pedido no encontrado', 404));
        }

        // Transformar los datos para mantener el formato anterior
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
        logger.error(`Error al obtener pedido por ID ${id}: ${error.message}`);
        next(error);
    }
};

const createOrder = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { id_mesa, detalles } = req.body;

        if (!id_mesa || !detalles || detalles.length === 0) {
            return next(new AppError('Mesa y detalles del pedido son requeridos', 400));
        }

        // Verificar que la mesa existe y está disponible
        const table = await Table.findByPk(id_mesa, { transaction });
        if (!table) {
            return next(new AppError('Mesa no encontrada', 404));
        }

        if (!table.disponible) {
            return next(new AppError('La mesa no está disponible', 400));
        }

        // Calcular total y verificar platos
        let total = 0;
        const orderDetails = [];

        for (const detalle of detalles) {
            const dish = await Dish.findOne({
                where: {
                    id: detalle.id_plato,
                    disponibilidad: 1
                },
                transaction
            });

            if (!dish) {
                return next(new AppError(`Plato ${detalle.id_plato} no encontrado o no disponible`, 400));
            }

            total += dish.precio * detalle.cantidad;
            orderDetails.push({
                id_plato: detalle.id_plato,
                cantidad: detalle.cantidad,
                precio_unitario: dish.precio
            });
        }

        // Crear pedido
        const order = await Order.create({
            id_mesa,
            id_mesero: req.user.id,
            total
        }, { transaction });

        // Crear detalles del pedido
        for (const detalle of orderDetails) {
            await OrderDetail.create({
                id_pedido: order.id,
                ...detalle
            }, { transaction });
        }

        // Marcar mesa como no disponible
        await Table.update(
            { disponible: 0 },
            { where: { id: id_mesa }, transaction }
        );

        await transaction.commit();
        logger.info(`Pedido creado exitosamente con ID: ${order.id} por el mesero ${req.user.id}. Total: ${total}`);
        res.status(201).json({
            message: 'Pedido creado exitosamente',
            orderId: order.id,
            total: total
        });
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al crear pedido: ${error.message}`);
        next(error);
    }
};

const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!['pendiente', 'en preparación', 'servido'].includes(estado)) {
            return next(new AppError('Estado inválido', 400));
        }

        // Verificar que el pedido existe y pertenece al usuario (si es mesero)
        const whereCondition = req.user.rol === 'mesero'
            ? { id, id_mesero: req.user.id }
            : { id };

        const order = await Order.findOne({ where: whereCondition });

        if (!order) {
            return next(new AppError('Pedido no encontrado', 404));
        }

        // Actualizar estado
        await Order.update(
            { estado },
            { where: { id } }
        );

        // Si el pedido está servido, liberar la mesa
        if (estado === 'servido') {
            await Table.update(
                { disponible: 1 },
                { where: { id: order.id_mesa } }
            );
        }

        logger.info(`Estado del pedido con ID: ${id} actualizado a '${estado}' exitosamente.`);
        res.json({ message: 'Estado del pedido actualizado exitosamente' });
    } catch (error) {
        logger.error(`Error al actualizar estado del pedido con ID ${id}: ${error.message}`);
        next(error);
    }
};

const deleteOrder = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;

        // Verificar que el pedido existe y pertenece al usuario (si es mesero)
        const whereCondition = req.user.rol === 'mesero'
            ? { id, id_mesero: req.user.id }
            : { id };

        const order = await Order.findOne({
            where: whereCondition,
            transaction
        });

        if (!order) {
            return next(new AppError('Pedido no encontrado', 404));
        }

        // Eliminar detalles del pedido (Sequelize maneja esto automáticamente por las asociaciones)
        await OrderDetail.destroy({
            where: { id_pedido: id },
            transaction
        });

        // Liberar mesa
        await Table.update(
            { disponible: 1 },
            { where: { id: order.id_mesa }, transaction }
        );

        // Eliminar pedido
        await Order.destroy({
            where: { id },
            transaction
        });

        await transaction.commit();
        logger.info(`Pedido con ID: ${id} eliminado exitosamente.`);
        res.json({ message: 'Pedido eliminado exitosamente' });
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al eliminar pedido con ID ${id}: ${error.message}`);
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
