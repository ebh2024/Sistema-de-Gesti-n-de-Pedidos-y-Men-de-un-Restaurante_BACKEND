const { Order, OrderDetail, Table, User, Dish, sequelize } = require('../models');
const { Op } = require('sequelize');

const getAllOrders = async (req, res) => {
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

        res.json(formattedOrders);
    } catch (error) {
        console.error('Error obteniendo pedidos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const getOrderById = async (req, res) => {
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
            return res.status(404).json({ message: 'Pedido no encontrado' });
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

        res.json(formattedOrder);
    } catch (error) {
        console.error('Error obteniendo pedido:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const createOrder = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { id_mesa, detalles } = req.body;

        if (!id_mesa || !detalles || detalles.length === 0) {
            return res.status(400).json({ message: 'Mesa y detalles del pedido son requeridos' });
        }

        // Verificar que la mesa existe y está disponible
        const table = await Table.findByPk(id_mesa, { transaction });
        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        if (!table.disponible) {
            return res.status(400).json({ message: 'La mesa no está disponible' });
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
                return res.status(400).json({
                    message: `Plato ${detalle.id_plato} no encontrado o no disponible`
                });
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

        res.status(201).json({
            message: 'Pedido creado exitosamente',
            orderId: order.id,
            total: total
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creando pedido:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!['pendiente', 'en preparación', 'servido'].includes(estado)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        // Verificar que el pedido existe y pertenece al usuario (si es mesero)
        const whereCondition = req.user.rol === 'mesero'
            ? { id, id_mesero: req.user.id }
            : { id };

        const order = await Order.findOne({ where: whereCondition });

        if (!order) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
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

        res.json({ message: 'Estado del pedido actualizado exitosamente' });
    } catch (error) {
        console.error('Error actualizando estado del pedido:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const deleteOrder = async (req, res) => {
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
            return res.status(404).json({ message: 'Pedido no encontrado' });
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

        res.json({ message: 'Pedido eliminado exitosamente' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error eliminando pedido:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    deleteOrder
};
