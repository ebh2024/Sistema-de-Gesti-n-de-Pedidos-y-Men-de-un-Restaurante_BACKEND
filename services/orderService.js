const { Order, OrderDetail, Table, User, Dish, sequelize } = require('../models');
const AppError = require('../utils/AppError');

class OrderService {
    constructor() { }

    async getAllOrders(user) {
        const whereCondition = user.rol === 'mesero' ? { id_mesero: user.id } : {};

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

        return orders.map(order => ({
            ...order.toJSON(),
            mesa_numero: order.mesa.numero,
            mesero_nombre: order.mesero.nombre
        }));
    }

    async getOrderById(orderId, user) {
        const whereCondition = user.rol === 'mesero'
            ? { id: orderId, id_mesero: user.id }
            : { id: orderId };

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
            throw new AppError('Pedido no encontrado', 404);
        }

        return {
            ...order.toJSON(),
            mesa_numero: order.mesa.numero,
            mesero_nombre: order.mesero.nombre,
            detalles: order.detalles.map(detalle => ({
                ...detalle.toJSON(),
                plato_nombre: detalle.plato.nombre,
                precio_actual: detalle.plato.precio
            }))
        };
    }

    async createOrder(id_mesa, detalles, meseroId, estado = 'pendiente') {
        const transaction = await sequelize.transaction();

        try {
            const table = await Table.findByPk(id_mesa, { transaction });
            if (!table) {
                throw new AppError('Mesa no encontrada', 404);
            }

            if (estado !== 'borrador' && table.estado !== 'available') {
                throw new AppError('La mesa no está disponible', 400);
            }

            let total = 0;
            const orderDetailsToCreate = [];

            for (const detalle of detalles) {
                const dish = await Dish.findOne({
                    where: {
                        id: detalle.id_plato,
                        disponibilidad: true
                    },
                    transaction
                });

                if (!dish) {
                    throw new AppError(`Plato ${detalle.id_plato} no encontrado o no disponible`, 400);
                }

                total += dish.precio * detalle.cantidad;
                orderDetailsToCreate.push({
                    id_plato: detalle.id_plato,
                    cantidad: detalle.cantidad,
                    precio_unitario: dish.precio
                });
            }

            const order = await Order.create({
                id_mesa,
                id_mesero: meseroId,
                estado,
                total
            }, { transaction });

            for (const detalle of orderDetailsToCreate) {
                await OrderDetail.create({
                    id_pedido: order.id,
                    ...detalle
                }, { transaction });
            }

            if (estado !== 'borrador') {
                await Table.update(
                    { estado: 'occupied' },
                    { where: { id: id_mesa }, transaction }
                );
            }

            await transaction.commit();
            return { orderId: order.id, total: total };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async updateOrder(orderId, detalles, user) {
        const transaction = await sequelize.transaction();

        try {
            const whereCondition = user.rol === 'mesero'
                ? { id: orderId, id_mesero: user.id, estado: 'borrador' }
                : { id: orderId, estado: 'borrador' };

            const order = await Order.findOne({ where: whereCondition, transaction });

            if (!order) {
                throw new AppError('Pedido no encontrado o no se puede editar', 404);
            }

            let total = 0;
            const orderDetailsToCreate = [];

            for (const detalle of detalles) {
                const dish = await Dish.findOne({
                    where: {
                        id: detalle.id_plato,
                        disponibilidad: true
                    },
                    transaction
                });

                if (!dish) {
                    throw new AppError(`Plato ${detalle.id_plato} no encontrado o no disponible`, 400);
                }

                total += dish.precio * detalle.cantidad;
                orderDetailsToCreate.push({
                    id_pedido: order.id,
                    id_plato: detalle.id_plato,
                    cantidad: detalle.cantidad,
                    precio_unitario: dish.precio
                });
            }

            await OrderDetail.destroy({
                where: { id_pedido: orderId },
                transaction
            });

            for (const detalle of orderDetailsToCreate) {
                await OrderDetail.create(detalle, { transaction });
            }

            await Order.update(
                { total },
                { where: { id: orderId }, transaction }
            );

            await transaction.commit();
            return { message: 'Pedido actualizado exitosamente', total };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async updateOrderStatus(orderId, newEstado, user) {
        const transaction = await sequelize.transaction();
        try {
            const whereCondition = user.rol === 'mesero'
                ? { id: orderId, id_mesero: user.id }
                : { id: orderId };

            const order = await Order.findOne({ where: whereCondition, transaction });

            if (!order) {
                throw new AppError('Pedido no encontrado', 404);
            }

            if (order.estado === 'borrador' && newEstado === 'pendiente') {
                const table = await Table.findByPk(order.id_mesa, { transaction });
                if (table.estado !== 'available') {
                    throw new AppError('La mesa no está disponible', 400);
                }
                await Table.update({ estado: 'occupied' }, { where: { id: order.id_mesa }, transaction });
            }

            await Order.update(
                { estado: newEstado },
                { where: { id: orderId }, transaction }
            );

            if (newEstado === 'servido') {
                await Table.update(
                    { estado: 'available' },
                    { where: { id: order.id_mesa }, transaction }
                );
            }

            await transaction.commit();
            return { message: 'Estado del pedido actualizado exitosamente' };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async deleteOrder(orderId, user) {
        const transaction = await sequelize.transaction();

        try {
            const whereCondition = user.rol === 'mesero'
                ? { id: orderId, id_mesero: user.id }
                : { id: orderId };

            const order = await Order.findOne({
                where: whereCondition,
                transaction
            });

            if (!order) {
                throw new AppError('Pedido no encontrado', 404);
            }

            await OrderDetail.destroy({
                where: { id_pedido: orderId },
                transaction
            });

            await Table.update(
                { estado: 'available' },
                { where: { id: order.id_mesa }, transaction }
            );

            await Order.destroy({
                where: { id: orderId },
                transaction
            });

            await transaction.commit();
            return { message: 'Pedido eliminado exitosamente' };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new OrderService();
