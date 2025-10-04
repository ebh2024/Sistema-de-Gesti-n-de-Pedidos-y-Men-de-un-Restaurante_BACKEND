const chai = require('chai');
const sinon = require('sinon');
const { expect } = chai;
const OrderService = require('../../services/orderService');
const { Order, OrderDetail, Table, User, Dish, sequelize } = require('../../models');
const AppError = require('../../utils/AppError');

describe('OrderService Unit Tests', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('getAllOrders', () => {
        it('should return all orders for an admin user', async () => {
            const mockUser = { id: 1, rol: 'admin' };
            const mockOrders = [
                {
                    toJSON: () => ({ id: 1, estado: 'pendiente', total: 30.00 }),
                    mesa: { numero: 1 },
                    mesero: { nombre: 'Mesero 1' }
                },
                {
                    toJSON: () => ({ id: 2, estado: 'servido', total: 50.00 }),
                    mesa: { numero: 2 },
                    mesero: { nombre: 'Mesero 2' }
                }
            ];

            sandbox.stub(Order, 'findAll').resolves(mockOrders);

            const result = await OrderService.getAllOrders(mockUser);

            expect(Order.findAll.calledOnce).to.be.true;
            expect(Order.findAll.calledWithMatch({
                where: {},
                include: [
                    { model: Table, as: 'mesa', attributes: ['numero'] },
                    { model: User, as: 'mesero', attributes: ['nombre'] }
                ],
                order: [['created_at', 'DESC']]
            })).to.be.true;
            expect(result).to.deep.equal([
                { id: 1, estado: 'pendiente', total: 30.00, mesa_numero: 1, mesero_nombre: 'Mesero 1' },
                { id: 2, estado: 'servido', total: 50.00, mesa_numero: 2, mesero_nombre: 'Mesero 2' }
            ]);
        });

        it('should return only mesero\'s orders for a mesero user', async () => {
            const mockUser = { id: 10, rol: 'mesero' };
            const mockOrders = [
                {
                    toJSON: () => ({ id: 1, estado: 'pendiente', total: 30.00, id_mesero: 10 }),
                    mesa: { numero: 1 },
                    mesero: { nombre: 'Mesero 10' }
                }
            ];

            sandbox.stub(Order, 'findAll').resolves(mockOrders);

            const result = await OrderService.getAllOrders(mockUser);

            expect(Order.findAll.calledOnce).to.be.true;
            expect(Order.findAll.calledWithMatch({
                where: { id_mesero: 10 },
                include: [
                    { model: Table, as: 'mesa', attributes: ['numero'] },
                    { model: User, as: 'mesero', attributes: ['nombre'] }
                ],
                order: [['created_at', 'DESC']]
            })).to.be.true;
            expect(result).to.deep.equal([
                { id: 1, estado: 'pendiente', total: 30.00, id_mesero: 10, mesa_numero: 1, mesero_nombre: 'Mesero 10' }
            ]);
        });

        it('should return an empty array if no orders are found', async () => {
            const mockUser = { id: 1, rol: 'admin' };
            sandbox.stub(Order, 'findAll').resolves([]);

            const result = await OrderService.getAllOrders(mockUser);

            expect(Order.findAll.calledOnce).to.be.true;
            expect(result).to.be.an('array').that.is.empty;
        });
    });

    describe('getOrderById', () => {
        it('should return a specific order for an admin user', async () => {
            const mockUser = { id: 1, rol: 'admin' };
            const mockOrder = {
                toJSON: () => ({ id: 1, estado: 'pendiente', total: 30.00 }),
                mesa: { numero: 1 },
                mesero: { nombre: 'Mesero 1' },
                detalles: [
                    {
                        toJSON: () => ({ id: 101, cantidad: 2, precio_unitario: 15.00 }),
                        plato: { nombre: 'Pizza', precio: 15.00 }
                    }
                ]
            };

            sandbox.stub(Order, 'findOne').resolves(mockOrder); // Corrected stub

            const result = await OrderService.getOrderById(1, mockUser);

            expect(Order.findOne.calledOnce).to.be.true;
            expect(Order.findOne.calledWithMatch({
                where: { id: 1 },
                include: sinon.match.array
            })).to.be.true;
            expect(result).to.deep.equal({
                id: 1,
                estado: 'pendiente',
                total: 30.00,
                mesa_numero: 1,
                mesero_nombre: 'Mesero 1',
                detalles: [
                    { id: 101, cantidad: 2, precio_unitario: 15.00, plato_nombre: 'Pizza', precio_actual: 15.00 }
                ]
            });
        });

        it('should return a specific order for its mesero user', async () => {
            const mockUser = { id: 10, rol: 'mesero' };
            const mockOrder = {
                toJSON: () => ({ id: 1, estado: 'pendiente', total: 30.00, id_mesero: 10 }),
                mesa: { numero: 1 },
                mesero: { nombre: 'Mesero 10' },
                detalles: []
            };

            sandbox.stub(Order, 'findOne').resolves(mockOrder); // Corrected stub

            const result = await OrderService.getOrderById(1, mockUser);

            expect(Order.findOne.calledOnce).to.be.true;
            expect(Order.findOne.calledWithMatch({
                where: { id: 1, id_mesero: 10 },
                include: sinon.match.array
            })).to.be.true;
            expect(result).to.deep.equal({
                id: 1,
                estado: 'pendiente',
                total: 30.00,
                id_mesero: 10,
                mesa_numero: 1,
                mesero_nombre: 'Mesero 10',
                detalles: []
            });
        });

        it('should throw AppError if order not found', async () => {
            const mockUser = { id: 1, rol: 'admin' };
            sandbox.stub(Order, 'findOne').resolves(null);

            try {
                await OrderService.getOrderById(999, mockUser);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Pedido no encontrado');
                expect(error.statusCode).to.equal(404);
            }
        });

        it('should throw AppError if mesero tries to get another mesero\'s order', async () => {
            const meseroUser = { id: 10, rol: 'mesero' };

            sandbox.stub(Order, 'findOne').resolves(null); // Simulate not found for the mesero's specific query

            try {
                await OrderService.getOrderById(2, meseroUser);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Pedido no encontrado');
                expect(error.statusCode).to.equal(404);
            }
        });
    });

    describe('createOrder', () => {
        let mockTransaction;

        beforeEach(() => {
            mockTransaction = {
                commit: sandbox.stub().resolves(),
                rollback: sandbox.stub().resolves()
            };
            sandbox.stub(sequelize, 'transaction').resolves(mockTransaction);
        });

        it('should create an order successfully with "pendiente" status and update table to "occupied"', async () => {
            const id_mesa = 1;
            const detalles = [{ id_plato: 101, cantidad: 2 }];
            const meseroId = 10;
            const estado = 'pendiente';

            const mockTable = { id: id_mesa, estado: 'available' };
            const mockDish = { id: 101, precio: 15.00, disponibilidad: true };
            const mockOrder = { id: 1, total: 30.00 };

            sandbox.stub(Table, 'findByPk').resolves(mockTable);
            sandbox.stub(Dish, 'findOne').resolves(mockDish);
            sandbox.stub(Order, 'create').resolves(mockOrder);
            sandbox.stub(OrderDetail, 'create').resolves();
            sandbox.stub(Table, 'update').resolves();

            const result = await OrderService.createOrder(id_mesa, detalles, meseroId, estado);

            expect(sequelize.transaction.calledOnce).to.be.true;
            expect(Table.findByPk.calledOnceWith(id_mesa, { transaction: mockTransaction })).to.be.true;
            expect(Dish.findOne.calledOnceWith({ where: { id: 101, disponibilidad: true }, transaction: mockTransaction })).to.be.true;
            expect(Order.create.calledOnceWith({ id_mesa, id_mesero: meseroId, estado, total: 30.00 }, { transaction: mockTransaction })).to.be.true;
            expect(OrderDetail.create.calledOnce).to.be.true;
            expect(Table.update.calledOnceWith({ estado: 'occupied' }, { where: { id: id_mesa }, transaction: mockTransaction })).to.be.true;
            expect(mockTransaction.commit.calledOnce).to.be.true;
            expect(mockTransaction.rollback.notCalled).to.be.true;
            expect(result).to.deep.equal({ orderId: 1, total: 30.00 });
        });

        it('should create a "borrador" order successfully without changing table status', async () => {
            const id_mesa = 1;
            const detalles = [{ id_plato: 101, cantidad: 2 }];
            const meseroId = 10;
            const estado = 'borrador';

            const mockTable = { id: id_mesa, estado: 'available' };
            const mockDish = { id: 101, precio: 15.00, disponibilidad: true };
            const mockOrder = { id: 1, total: 30.00 };

            sandbox.stub(Table, 'findByPk').resolves(mockTable);
            sandbox.stub(Dish, 'findOne').resolves(mockDish);
            sandbox.stub(Order, 'create').resolves(mockOrder);
            sandbox.stub(OrderDetail, 'create').resolves();
            sandbox.stub(Table, 'update').resolves(); // Should not be called for 'borrador'

            const result = await OrderService.createOrder(id_mesa, detalles, meseroId, estado);

            expect(sequelize.transaction.calledOnce).to.be.true;
            expect(Table.findByPk.calledOnceWith(id_mesa, { transaction: mockTransaction })).to.be.true;
            expect(Dish.findOne.calledOnceWith({ where: { id: 101, disponibilidad: true }, transaction: mockTransaction })).to.be.true;
            expect(Order.create.calledOnceWith({ id_mesa, id_mesero: meseroId, estado, total: 30.00 }, { transaction: mockTransaction })).to.be.true;
            expect(OrderDetail.create.calledOnce).to.be.true;
            expect(Table.update.notCalled).to.be.true; // Verify table update is not called
            expect(mockTransaction.commit.calledOnce).to.be.true;
            expect(mockTransaction.rollback.notCalled).to.be.true;
            expect(result).to.deep.equal({ orderId: 1, total: 30.00 });
        });

        it('should throw AppError if table not found', async () => {
            const id_mesa = 999;
            const detalles = [{ id_plato: 101, cantidad: 1 }];
            const meseroId = 10;

            sandbox.stub(Table, 'findByPk').resolves(null);

            try {
                await OrderService.createOrder(id_mesa, detalles, meseroId);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Mesa no encontrada');
                expect(error.statusCode).to.equal(404);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
                expect(mockTransaction.commit.notCalled).to.be.true;
            }
        });

        it('should throw AppError if table not available for non-draft order', async () => {
            const id_mesa = 1;
            const detalles = [{ id_plato: 101, cantidad: 1 }];
            const meseroId = 10;
            const estado = 'pendiente';

            const mockTable = { id: id_mesa, estado: 'occupied' }; // Not available
            sandbox.stub(Table, 'findByPk').resolves(mockTable);

            try {
                await OrderService.createOrder(id_mesa, detalles, meseroId, estado);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('La mesa no está disponible');
                expect(error.statusCode).to.equal(400);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
                expect(mockTransaction.commit.notCalled).to.be.true;
            }
        });

        it('should throw AppError if dish not found or not available', async () => {
            const id_mesa = 1;
            const detalles = [{ id_plato: 999, cantidad: 1 }];
            const meseroId = 10;

            const mockTable = { id: id_mesa, estado: 'available' };
            sandbox.stub(Table, 'findByPk').resolves(mockTable);
            sandbox.stub(Dish, 'findOne').resolves(null); // Dish not found

            try {
                await OrderService.createOrder(id_mesa, detalles, meseroId);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Plato 999 no encontrado o no disponible');
                expect(error.statusCode).to.equal(400);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
                expect(mockTransaction.commit.notCalled).to.be.true;
            }
        });

        it('should calculate total correctly', async () => {
            const id_mesa = 1;
            const detalles = [
                { id_plato: 101, cantidad: 2 },
                { id_plato: 102, cantidad: 1 }
            ];
            const meseroId = 10;

            const mockTable = { id: id_mesa, estado: 'available' };
            const mockDish1 = { id: 101, precio: 10.00, disponibilidad: true };
            const mockDish2 = { id: 102, precio: 20.00, disponibilidad: true };
            const mockOrder = { id: 1, total: 40.00 }; // 2*10 + 1*20 = 40

            sandbox.stub(Table, 'findByPk').resolves(mockTable);
            sandbox.stub(Dish, 'findOne')
                .withArgs(sinon.match.has('where', { id: 101, disponibilidad: true }))
                .resolves(mockDish1)
                .withArgs(sinon.match.has('where', { id: 102, disponibilidad: true }))
                .resolves(mockDish2);
            sandbox.stub(Order, 'create').resolves(mockOrder);
            sandbox.stub(OrderDetail, 'create').resolves();
            sandbox.stub(Table, 'update').resolves();

            const result = await OrderService.createOrder(id_mesa, detalles, meseroId);

            expect(Order.create.calledOnceWith(sinon.match.has('total', 40.00), sinon.match.any)).to.be.true;
            expect(result.total).to.equal(40.00);
        });

        it('should rollback transaction on error', async () => {
            const id_mesa = 1;
            const detalles = [{ id_plato: 101, cantidad: 2 }];
            const meseroId = 10;

            sandbox.stub(Table, 'findByPk').throws(new Error('Database error'));

            try {
                await OrderService.createOrder(id_mesa, detalles, meseroId);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Database error');
                expect(mockTransaction.rollback.calledOnce).to.be.true;
                expect(mockTransaction.commit.notCalled).to.be.true;
            }
        });
    });

    describe('updateOrder', () => {
        let mockTransaction;
        let mockUserMesero, mockUserAdmin;

        beforeEach(() => {
            mockTransaction = {
                commit: sandbox.stub().resolves(),
                rollback: sandbox.stub().resolves()
            };
            sandbox.stub(sequelize, 'transaction').resolves(mockTransaction);
            mockUserMesero = { id: 10, rol: 'mesero' };
            mockUserAdmin = { id: 1, rol: 'admin' };
        });

        it('should update a "borrador" order successfully for its mesero', async () => {
            const orderId = 1;
            const detalles = [{ id_plato: 101, cantidad: 3 }];
            const mockOrder = { id: orderId, id_mesero: mockUserMesero.id, estado: 'borrador' };
            const mockDish = { id: 101, precio: 15.00, disponibilidad: true };

            sandbox.stub(Order, 'findOne').resolves(mockOrder); // Corrected stub
            sandbox.stub(Dish, 'findOne').resolves(mockDish);
            sandbox.stub(OrderDetail, 'destroy').resolves();
            sandbox.stub(OrderDetail, 'create').resolves();
            sandbox.stub(Order, 'update').resolves();

            const result = await OrderService.updateOrder(orderId, detalles, mockUserMesero);

            expect(Order.findOne.calledOnceWith({ where: { id: orderId, id_mesero: mockUserMesero.id, estado: 'borrador' }, transaction: mockTransaction })).to.be.true;
            expect(Dish.findOne.calledOnce).to.be.true;
            expect(OrderDetail.destroy.calledOnceWith({ where: { id_pedido: orderId }, transaction: mockTransaction })).to.be.true;
            expect(OrderDetail.create.calledOnce).to.be.true;
            expect(Order.update.calledOnceWith({ total: 45.00 }, { where: { id: orderId }, transaction: mockTransaction })).to.be.true;
            expect(mockTransaction.commit.calledOnce).to.be.true;
            expect(result).to.deep.equal({ message: 'Pedido actualizado exitosamente', total: 45.00 });
        });

        it('should update a "borrador" order successfully for an admin', async () => {
            const orderId = 1;
            const detalles = [{ id_plato: 101, cantidad: 4 }];
            const mockOrder = { id: orderId, id_mesero: 99, estado: 'borrador' }; // Mesero different from admin
            const mockDish = { id: 101, precio: 15.00, disponibilidad: true };

            sandbox.stub(Order, 'findOne').resolves(mockOrder); // Corrected stub
            sandbox.stub(Dish, 'findOne').resolves(mockDish);
            sandbox.stub(OrderDetail, 'destroy').resolves();
            sandbox.stub(OrderDetail, 'create').resolves();
            sandbox.stub(Order, 'update').resolves();

            const result = await OrderService.updateOrder(orderId, detalles, mockUserAdmin);

            expect(Order.findOne.calledOnceWith({ where: { id: orderId, estado: 'borrador' }, transaction: mockTransaction })).to.be.true;
            expect(Dish.findOne.calledOnce).to.be.true;
            expect(OrderDetail.destroy.calledOnceWith({ where: { id_pedido: orderId }, transaction: mockTransaction })).to.be.true;
            expect(OrderDetail.create.calledOnce).to.be.true;
            expect(Order.update.calledOnceWith({ total: 60.00 }, { where: { id: orderId }, transaction: mockTransaction })).to.be.true;
            expect(mockTransaction.commit.calledOnce).to.be.true;
            expect(result).to.deep.equal({ message: 'Pedido actualizado exitosamente', total: 60.00 });
        });

        it('should throw AppError if order not found', async () => {
            const orderId = 999;
            const detalles = [{ id_plato: 101, cantidad: 1 }];

            sandbox.stub(Order, 'findOne').resolves(null);

            try {
                await OrderService.updateOrder(orderId, detalles, mockUserMesero);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Pedido no encontrado o no se puede editar');
                expect(error.statusCode).to.equal(404);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
            }
        });

        it('should throw AppError if order is not in "borrador" state', async () => {
            const orderId = 1;
            const detalles = [{ id_plato: 101, cantidad: 1 }];

            sandbox.stub(Order, 'findOne')
                .withArgs(sinon.match.has('where', sinon.match.has('estado', 'borrador')))
                .resolves(null); // Corrected stub

            try {
                await OrderService.updateOrder(orderId, detalles, mockUserMesero);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Pedido no encontrado o no se puede editar');
                expect(error.statusCode).to.equal(404);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
            }
        });

        it('should throw AppError if mesero tries to update another mesero\'s draft order', async () => {
            const orderId = 1;
            const detalles = [{ id_plato: 101, cantidad: 1 }];

            sandbox.stub(Order, 'findOne').resolves(null); // Simulate not found for the mesero's specific query

            try {
                await OrderService.updateOrder(orderId, detalles, mockUserMesero);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Pedido no encontrado o no se puede editar');
                expect(error.statusCode).to.equal(404);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
            }
        });

        it('should throw AppError if dish not found or not available in new details', async () => {
            const orderId = 1;
            const detalles = [{ id_plato: 999, cantidad: 1 }];
            const mockOrder = { id: orderId, id_mesero: mockUserMesero.id, estado: 'borrador' };

            sandbox.stub(Order, 'findOne').resolves(mockOrder);
            sandbox.stub(Dish, 'findOne').resolves(null); // Dish not found

            try {
                await OrderService.updateOrder(orderId, detalles, mockUserMesero);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Plato 999 no encontrado o no disponible');
                expect(error.statusCode).to.equal(400);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
            }
        });

        it('should recalculate total correctly', async () => {
            const orderId = 1;
            const detalles = [
                { id_plato: 101, cantidad: 2 },
                { id_plato: 102, cantidad: 1 }
            ];
            const mockOrder = { id: orderId, id_mesero: mockUserMesero.id, estado: 'borrador' };
            const mockDish1 = { id: 101, precio: 10.00, disponibilidad: true };
            const mockDish2 = { id: 102, precio: 20.00, disponibilidad: true };

            sandbox.stub(Order, 'findOne').resolves(mockOrder);
            sandbox.stub(Dish, 'findOne')
                .withArgs(sinon.match.has('where', { id: 101, disponibilidad: true }))
                .resolves(mockDish1)
                .withArgs(sinon.match.has('where', { id: 102, disponibilidad: true }))
                .resolves(mockDish2);
            sandbox.stub(OrderDetail, 'destroy').resolves();
            sandbox.stub(OrderDetail, 'create').resolves();
            sandbox.stub(Order, 'update').resolves();

            const result = await OrderService.updateOrder(orderId, detalles, mockUserMesero);

            expect(Order.update.calledOnceWith({ total: 40.00 }, { where: { id: orderId }, transaction: mockTransaction })).to.be.true;
            expect(result.total).to.equal(40.00);
        });

        it('should rollback transaction on error', async () => {
            const orderId = 1;
            const detalles = [{ id_plato: 101, cantidad: 1 }];
            const mockOrder = { id: orderId, id_mesero: mockUserMesero.id, estado: 'borrador' };

            sandbox.stub(Order, 'findOne').resolves(mockOrder);
            sandbox.stub(Dish, 'findOne').throws(new Error('Database error'));

            try {
                await OrderService.updateOrder(orderId, detalles, mockUserMesero);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Database error');
                expect(mockTransaction.rollback.calledOnce).to.be.true;
                expect(mockTransaction.commit.notCalled).to.be.true;
            }
        });
    });

    describe('updateOrderStatus', () => {
        let mockTransaction;
        let mockUserMesero, mockUserCocinero, mockUserAdmin;

        beforeEach(() => {
            mockTransaction = {
                commit: sandbox.stub().resolves(),
                rollback: sandbox.stub().resolves()
            };
            sandbox.stub(sequelize, 'transaction').resolves(mockTransaction);
            mockUserMesero = { id: 10, rol: 'mesero' };
            mockUserCocinero = { id: 20, rol: 'cocinero' };
            mockUserAdmin = { id: 1, rol: 'admin' };
        });

        it('should update status from "borrador" to "pendiente" and set table to "occupied" for mesero', async () => {
            const orderId = 1;
            const newEstado = 'pendiente';
            const mockOrder = { id: orderId, id_mesero: mockUserMesero.id, estado: 'borrador', id_mesa: 100 };
            const mockTable = { id: 100, estado: 'available' };

            sandbox.stub(Order, 'findOne').resolves(mockOrder);
            sandbox.stub(Table, 'findByPk').resolves(mockTable);
            sandbox.stub(Order, 'update').resolves();
            sandbox.stub(Table, 'update').resolves();

            const result = await OrderService.updateOrderStatus(orderId, newEstado, mockUserMesero);

            expect(Order.findOne.calledOnceWith({ where: { id: orderId, id_mesero: mockUserMesero.id }, transaction: mockTransaction })).to.be.true;
            expect(Table.findByPk.calledOnceWith(mockOrder.id_mesa, { transaction: mockTransaction })).to.be.true;
            expect(Table.update.calledOnceWith({ estado: 'occupied' }, { where: { id: mockOrder.id_mesa }, transaction: mockTransaction })).to.be.true;
            expect(Order.update.calledOnceWith({ estado: newEstado }, { where: { id: orderId }, transaction: mockTransaction })).to.be.true;
            expect(mockTransaction.commit.calledOnce).to.be.true;
            expect(result).to.deep.equal({ message: 'Estado del pedido actualizado exitosamente' });
        });

        it('should update status to "servido" and set table to "available" for cocinero', async () => {
            const orderId = 1;
            const newEstado = 'servido';
            const mockOrder = { id: orderId, id_mesero: 10, estado: 'en preparación', id_mesa: 100 };

            sandbox.stub(Order, 'findOne').resolves(mockOrder);
            sandbox.stub(Order, 'update').resolves();
            sandbox.stub(Table, 'update').resolves();

            const result = await OrderService.updateOrderStatus(orderId, newEstado, mockUserCocinero);

            expect(Order.findOne.calledOnceWith({ where: { id: orderId }, transaction: mockTransaction })).to.be.true;
            expect(Order.update.calledOnceWith({ estado: newEstado }, { where: { id: orderId }, transaction: mockTransaction })).to.be.true;
            expect(Table.update.calledOnceWith({ estado: 'available' }, { where: { id: mockOrder.id_mesa }, transaction: mockTransaction })).to.be.true;
            expect(mockTransaction.commit.calledOnce).to.be.true;
            expect(result).to.deep.equal({ message: 'Estado del pedido actualizado exitosamente' });
        });

        it('should update status to "en preparación" for cocinero', async () => {
            const orderId = 1;
            const newEstado = 'en preparación';
            const mockOrder = { id: orderId, id_mesero: 10, estado: 'pendiente', id_mesa: 100 };

            sandbox.stub(Order, 'findOne').resolves(mockOrder);
            sandbox.stub(Order, 'update').resolves();
            sandbox.stub(Table, 'update').resolves(); // Should not be called for this state change

            const result = await OrderService.updateOrderStatus(orderId, newEstado, mockUserCocinero);

            expect(Order.findOne.calledOnceWith({ where: { id: orderId }, transaction: mockTransaction })).to.be.true;
            expect(Order.update.calledOnceWith({ estado: newEstado }, { where: { id: orderId }, transaction: mockTransaction })).to.be.true;
            expect(Table.update.notCalled).to.be.true;
            expect(mockTransaction.commit.calledOnce).to.be.true;
            expect(result).to.deep.equal({ message: 'Estado del pedido actualizado exitosamente' });
        });

        it('should throw AppError if order not found', async () => {
            const orderId = 999;
            const newEstado = 'servido';

            sandbox.stub(Order, 'findOne').resolves(null);

            try {
                await OrderService.updateOrderStatus(orderId, newEstado, mockUserAdmin);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Pedido no encontrado');
                expect(error.statusCode).to.equal(404);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
            }
        });

        it('should throw AppError if mesero tries to update another mesero\'s order', async () => {
            const orderId = 1;
            const newEstado = 'servido';

            sandbox.stub(Order, 'findOne').resolves(null); // Simulate not found for the mesero's specific query

            try {
                await OrderService.updateOrderStatus(orderId, newEstado, mockUserMesero);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Pedido no encontrado');
                expect(error.statusCode).to.equal(404);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
            }
        });

        it('should throw AppError if changing from "borrador" to "pendiente" and table is not available', async () => {
            const orderId = 1;
            const newEstado = 'pendiente';
            const mockOrder = { id: orderId, id_mesero: mockUserMesero.id, estado: 'borrador', id_mesa: 100 };
            const mockTable = { id: 100, estado: 'occupied' }; // Table not available

            sandbox.stub(Order, 'findOne').resolves(mockOrder);
            sandbox.stub(Table, 'findByPk').resolves(mockTable);

            try {
                await OrderService.updateOrderStatus(orderId, newEstado, mockUserMesero);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('La mesa no está disponible');
                expect(error.statusCode).to.equal(400);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
            }
        });

        it('should rollback transaction on error', async () => {
            const orderId = 1;
            const newEstado = 'servido';
            const mockOrder = { id: orderId, id_mesero: 10, estado: 'en preparación', id_mesa: 100 };

            sandbox.stub(Order, 'findOne').resolves(mockOrder);
            sandbox.stub(Order, 'update').throws(new Error('Database error'));

            try {
                await OrderService.updateOrderStatus(orderId, newEstado, mockUserCocinero);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Database error');
                expect(mockTransaction.rollback.calledOnce).to.be.true;
                expect(mockTransaction.commit.notCalled).to.be.true;
            }
        });
    });

    describe('deleteOrder', () => {
        let mockTransaction;
        let mockUserMesero, mockUserAdmin;

        beforeEach(() => {
            mockTransaction = {
                commit: sandbox.stub().resolves(),
                rollback: sandbox.stub().resolves()
            };
            sandbox.stub(sequelize, 'transaction').resolves(mockTransaction);
            mockUserMesero = { id: 10, rol: 'mesero' };
            mockUserAdmin = { id: 1, rol: 'admin' };
        });

        it('should delete an order and its details, and set table to "available" for admin', async () => {
            const orderId = 1;
            const mockOrder = { id: orderId, id_mesero: 99, id_mesa: 100 }; // Admin deleting another mesero's order

            sandbox.stub(Order, 'findOne').resolves(mockOrder);
            sandbox.stub(OrderDetail, 'destroy').resolves();
            sandbox.stub(Table, 'update').resolves();
            sandbox.stub(Order, 'destroy').resolves();

            const result = await OrderService.deleteOrder(orderId, mockUserAdmin);

            expect(Order.findOne.calledOnceWith({ where: { id: orderId }, transaction: mockTransaction })).to.be.true;
            expect(OrderDetail.destroy.calledOnceWith({ where: { id_pedido: orderId }, transaction: mockTransaction })).to.be.true;
            expect(Table.update.calledOnceWith({ estado: 'available' }, { where: { id: mockOrder.id_mesa }, transaction: mockTransaction })).to.be.true;
            expect(Order.destroy.calledOnceWith({ where: { id: orderId }, transaction: mockTransaction })).to.be.true;
            expect(mockTransaction.commit.calledOnce).to.be.true;
            expect(result).to.deep.equal({ message: 'Pedido eliminado exitosamente' });
        });

        it('should throw AppError if order not found', async () => {
            const orderId = 999;

            sandbox.stub(Order, 'findOne').resolves(null);

            try {
                await OrderService.deleteOrder(orderId, mockUserAdmin);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Pedido no encontrado');
                expect(error.statusCode).to.equal(404);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
            }
        });

        it('should throw AppError if mesero tries to update another mesero\'s order', async () => {
            const orderId = 1;

            sandbox.stub(Order, 'findOne').resolves(null); // Simulate not found for the mesero's specific query

            try {
                await OrderService.deleteOrder(orderId, mockUserMesero);
                expect.fail('Should have thrown AppError');
            } catch (error) {
                expect(error).to.be.an.instanceOf(AppError);
                expect(error.message).to.equal('Pedido no encontrado');
                expect(error.statusCode).to.equal(404);
                expect(mockTransaction.rollback.calledOnce).to.be.true;
            }
        });

        it('should rollback transaction on error', async () => {
            const orderId = 1;
            const mockOrder = { id: orderId, id_mesero: mockUserAdmin.id, id_mesa: 100 };

            sandbox.stub(Order, 'findOne').resolves(mockOrder);
            sandbox.stub(OrderDetail, 'destroy').throws(new Error('Database error'));

            try {
                await OrderService.deleteOrder(orderId, mockUserAdmin);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Database error');
                expect(mockTransaction.rollback.calledOnce).to.be.true;
                expect(mockTransaction.commit.notCalled).to.be.true;
            }
        });
    });
});
