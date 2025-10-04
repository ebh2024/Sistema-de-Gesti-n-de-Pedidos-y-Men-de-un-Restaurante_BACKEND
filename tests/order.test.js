const chai = require('chai');
const chaiHttp = require('chai-http');
let app; // Declare app as a mutable variable
const { sequelize, Order, User, Dish, Table, OrderDetail } = require('../models');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

chai.use(chaiHttp);
const expect = chai.expect;

describe('API de Pedidos', () => {
    let adminUser, meseroUser, cocineroUser, adminToken, meseroToken, cocineroToken;
    let testDish, testTable, testOrder;

    before(async () => {
        // Re-require app to ensure latest changes are picked up
        delete require.cache[require.resolve('../server')];
        app = require('../server');

        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.sync({ force: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });

        adminUser = await User.create({
            nombre: 'Admin User',
            correo: 'admin@example.com',
            contraseña: 'password123',
            rol: 'admin',
            is_active: 1
        });

        meseroUser = await User.create({
            nombre: 'Mesero User',
            correo: 'mesero@example.com',
            contraseña: 'password123',
            rol: 'mesero',
            is_active: 1
        });

        cocineroUser = await User.create({
            nombre: 'Cocinero User',
            correo: 'cocinero@example.com',
            contraseña: 'password123',
            rol: 'cocinero',
            is_active: 1
        });

        adminToken = jwt.sign({ id: adminUser.id, rol: adminUser.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
        meseroToken = jwt.sign({ id: meseroUser.id, rol: meseroUser.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
        cocineroToken = jwt.sign({ id: cocineroUser.id, rol: cocineroUser.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });

        testDish = await Dish.create({
            nombre: 'Pizza',
            descripcion: 'Deliciosa pizza de pepperoni',
            precio: 15.00,
            categoria: 'Plato Fuerte',
            is_active: 1,
            disponibilidad: true
        });

        testTable = await Table.create({
            numero: 1,
            capacidad: 4,
            estado: 'available',
            is_active: 1
        });

        console.log('Before hook - testDish.id:', testDish.id);
        console.log('Before hook - testTable.id:', testTable.id);

        // Create a test order here so it's available for all subsequent tests
        let res;
        try {
            res = await chai.request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${meseroToken}`)
                .send({
                    id_mesa: testTable.id,
                    detalles: [{ id_plato: testDish.id, cantidad: 2 }],
                    estado: 'borrador' // Create as draft to not occupy the table immediately
                });
            console.log('Before hook - POST /api/orders response status:', res.status);
            console.log('Before hook - POST /api/orders response body:', res.body);
            expect(res).to.have.status(201);
            testOrder = { id: res.body.orderId, total: res.body.total, id_mesa: testTable.id, id_mesero: meseroUser.id, estado: 'borrador' };
            console.log('Initial testOrder created:', testOrder);
        } catch (error) {
            console.error('Error creating initial testOrder in before hook:', error.response ? error.response.body : error.message);
            throw error; // Re-throw to fail the before hook
        }
    });

    after(async () => {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.drop();
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
    });

    describe('Modelo de Pedido', () => {
        it('debería crear un pedido correctamente', async () => {
            const order = await Order.create({
                id_mesa: testTable.id,
                id_mesero: meseroUser.id,
                estado: 'pendiente',
                total: 20.00
            });
            expect(order).to.have.property('id');
            expect(order.estado).to.equal('pendiente');
            expect(order.id_mesa).to.equal(testTable.id);
            expect(order.id_mesero).to.equal(meseroUser.id);
        });

        it('no debería permitir un estado de pedido inválido', async () => {
            try {
                await Order.create({
                    id_mesa: testTable.id,
                    id_mesero: meseroUser.id,
                    estado: 'invalid_state',
                    total: 10.00
                });
                expect.fail('No debería haber creado un pedido con estado inválido');
            } catch (error) {
                expect(error.name).to.equal('SequelizeValidationError');
                expect(error.message).to.include('estado');
            }
        });

        it('no debería permitir un total de pedido negativo', async () => {
            try {
                await Order.create({
                    id_mesa: testTable.id,
                    id_mesero: meseroUser.id,
                    estado: 'pendiente',
                    total: -10.00
                });
                expect.fail('No debería haber creado un pedido con total negativo');
            } catch (error) {
                expect(error.name).to.equal('SequelizeValidationError');
                expect(error.message).to.include('Validation min on total failed');
            }
        });

        it('no debería permitir crear un pedido sin id_mesa', async () => {
            try {
                await Order.create({
                    id_mesero: meseroUser.id,
                    estado: 'pendiente',
                    total: 10.00
                });
                expect.fail('No debería haber creado un pedido sin id_mesa');
            } catch (error) {
                expect(error.name).to.equal('SequelizeValidationError');
                expect(error.message).to.include('id_mesa cannot be null');
            }
        });

        it('no debería permitir crear un pedido sin id_mesero', async () => {
            try {
                await Order.create({
                    id_mesa: testTable.id,
                    estado: 'pendiente',
                    total: 10.00
                });
                expect.fail('No debería haber creado un pedido sin id_mesero');
            } catch (error) {
                expect(error.name).to.equal('SequelizeValidationError');
                expect(error.message).to.include('id_mesero cannot be null');
            }
        });

        it('debería crear un pedido con estado por defecto "pendiente" si no se especifica', async () => {
            const order = await Order.create({
                id_mesa: testTable.id,
                id_mesero: meseroUser.id,
                total: 25.00
            });
            expect(order.estado).to.equal('pendiente');
        });

        it('debería crear un pedido con total por defecto "0" si no se especifica', async () => {
            const order = await Order.create({
                id_mesa: testTable.id,
                id_mesero: meseroUser.id,
                estado: 'pendiente'
            });
            expect(order.total).to.equal('0.00'); // Sequelize returns DECIMAL as string
        });

        it('debería incluir el mesero asociado al obtener un pedido', async () => {
            const order = await Order.create({
                id_mesa: testTable.id,
                id_mesero: meseroUser.id,
                estado: 'pendiente',
                total: 30.00
            });
            const fetchedOrder = await Order.findByPk(order.id, { include: [{ model: User, as: 'mesero' }] });
            expect(fetchedOrder.mesero).to.exist;
            expect(fetchedOrder.mesero.nombre).to.equal(meseroUser.nombre);
        });

        it('debería incluir la mesa asociada al obtener un pedido', async () => {
            const order = await Order.create({
                id_mesa: testTable.id,
                id_mesero: meseroUser.id,
                estado: 'pendiente',
                total: 35.00
            });
            const fetchedOrder = await Order.findByPk(order.id, { include: [{ model: Table, as: 'mesa' }] });
            expect(fetchedOrder.mesa).to.exist;
            expect(fetchedOrder.mesa.numero).to.equal(testTable.numero);
        });

        it('debería incluir los detalles del pedido asociados al obtener un pedido', async () => {
            const order = await Order.create({
                id_mesa: testTable.id,
                id_mesero: meseroUser.id,
                estado: 'pendiente',
                total: 40.00
            });
            await OrderDetail.create({
                id_pedido: order.id,
                id_plato: testDish.id,
                cantidad: 1,
                precio_unitario: testDish.precio
            });
            const fetchedOrder = await Order.findByPk(order.id, { include: [{ model: OrderDetail, as: 'detalles' }] });
            expect(fetchedOrder.detalles).to.exist;
            expect(fetchedOrder.detalles).to.be.an('array').that.is.not.empty;
            expect(fetchedOrder.detalles[0].id_plato).to.equal(testDish.id);
        });
    });

    describe('POST /api/orders', () => {
        let newTestTable;
        beforeEach(async () => {
            newTestTable = await Table.create({ numero: Math.floor(Math.random() * 1000) + 100, capacidad: 4, estado: 'available', is_active: 1 });
        });

        it('debería permitir a un mesero crear un nuevo pedido', (done) => {
            chai.request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${meseroToken}`)
                .send({
                    id_mesa: newTestTable.id,
                    detalles: [{ id_plato: testDish.id, cantidad: 2 }]
                })
                .end((err, res) => {
                    console.log('POST /api/orders response:', res.body);
                    expect(res).to.have.status(201);
                    expect(res.body).to.have.property('message').equal('Pedido creado exitosamente');
                    expect(res.body).to.have.property('orderId');
                    expect(res.body).to.have.property('total');
                    done();
                });
        });

        it('debería devolver 400 si el ID de la mesa es inválido', (done) => {
            chai.request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${meseroToken}`)
                .send({
                    id_mesa: 'invalid',
                    detalles: [{ id_plato: testDish.id, cantidad: 1 }]
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: ID de mesa inválido.');
                    done();
                });
        });

        it('debería devolver 400 si el ID del plato es inválido', (done) => {
            chai.request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${meseroToken}`)
                .send({
                    id_mesa: testTable.id,
                    detalles: [{ id_plato: 'invalid', cantidad: 1 }]
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: ID de plato inválido en los detalles del pedido.');
                    done();
                });
        });

        it('debería devolver 400 si la cantidad del plato es inválida', (done) => {
            chai.request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${meseroToken}`)
                .send({
                    id_mesa: testTable.id,
                    detalles: [{ id_plato: testDish.id, cantidad: 'invalid' }]
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: La cantidad debe ser un entero positivo en los detalles del pedido.');
                    done();
                });
        });

        it('no debería permitir a un cocinero crear un nuevo pedido', (done) => {
            chai.request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${cocineroToken}`)
                .send({
                    id_mesa: testTable.id,
                    detalles: [{ id_plato: testDish.id, cantidad: 1 }]
                })
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    expect(res.body).to.have.property('message').equal('Acceso denegado: rol insuficiente');
                    done();
                });
        });

        it('debería devolver 400 si faltan detalles del pedido', (done) => {
            chai.request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${meseroToken}`)
                .send({
                    id_mesa: testTable.id,
                    detalles: []
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: Los detalles del pedido son requeridos y deben ser un array no vacío.');
                    done();
                });
        });

        it('debería devolver 400 si la mesa no está disponible', (done) => {
            Table.update({ estado: 'occupied' }, { where: { id: testTable.id } })
                .then(() => {
                    chai.request(app)
                        .post('/api/orders')
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({
                            id_mesa: testTable.id,
                            detalles: [{ id_plato: testDish.id, cantidad: 1 }]
                        })
                        .end((err, res) => {
                            expect(res).to.have.status(400);
                            expect(res.body).to.have.property('message').equal('La mesa no está disponible');
                            Table.update({ estado: 'available' }, { where: { id: testTable.id } }) // Reset table state
                            done();
                        });
                })
                .catch(err => done(err));
        });
    });

    describe('GET /api/orders', () => {
        it('debería permitir al administrador obtener todos los pedidos', (done) => {
            chai.request(app)
                .get('/api/orders')
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.at.least(1);
                    expect(res.body[0]).to.have.property('mesa_numero');
                    expect(res.body[0]).to.have.property('mesero_nombre');
                    done();
                });
        });

        it('debería permitir al mesero obtener sus propios pedidos', (done) => {
            chai.request(app)
                .get('/api/orders')
                .set('Authorization', `Bearer ${meseroToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.at.least(1);
                    expect(res.body[0]).to.have.property('id_mesero').equal(meseroUser.id);
                    done();
                });
        });

        it('debería permitir al cocinero obtener pedidos pendientes o en preparación', (done) => {
            chai.request(app)
                .get('/api/orders')
                .set('Authorization', `Bearer ${cocineroToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('array');
                    expect(res.body.some(order => order.estado === 'pendiente' || order.estado === 'en preparación')).to.be.true;
                    done();
                });
        });
    });

    describe('GET /api/orders/:id', () => {
        it('debería permitir al administrador obtener un pedido por ID', (done) => {
            chai.request(app)
                .get(`/api/orders/${testOrder.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('id').equal(testOrder.id);
                    expect(res.body).to.have.property('detalles').to.be.an('array');
                    expect(res.body.detalles[0]).to.have.property('plato_nombre');
                    done();
                });
        });

        it('debería permitir al mesero obtener su propio pedido por ID', (done) => {
            chai.request(app)
                .get(`/api/orders/${testOrder.id}`)
                .set('Authorization', `Bearer ${meseroToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('id').equal(testOrder.id);
                    expect(res.body).to.have.property('id_mesero').equal(meseroUser.id);
                    done();
                });
        });

        it('no debería permitir a un mesero obtener un pedido de otro mesero', (done) => {
            let otherOrder;
            Table.create({ numero: 2, capacidad: 2, estado: 'available', is_active: 1 })
                .then(table2 => {
                    return chai.request(app)
                        .post('/api/orders')
                        .set('Authorization', `Bearer ${adminToken}`)
                        .send({
                            id_mesa: table2.id,
                            detalles: [{ id_plato: testDish.id, cantidad: 1 }]
                        });
                })
                .then(res => {
                    otherOrder = { id: res.body.orderId };
                    return chai.request(app)
                        .get(`/api/orders/${otherOrder.id}`)
                        .set('Authorization', `Bearer ${meseroToken}`);
                })
                .then(res => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('Pedido no encontrado');
                    done();
                })
                .catch(err => {
                    console.error('Error in "no debería permitir a un mesero obtener un pedido de otro mesero" test:', err.response ? err.response.body : err.message);
                    done(err);
                });
        });

        it('debería devolver 404 si el pedido no se encuentra', (done) => {
            chai.request(app)
                .get('/api/orders/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('Pedido no encontrado');
                    done();
                });
        });

        it('debería devolver 400 si el ID del pedido es inválido', (done) => {
            chai.request(app)
                .get('/api/orders/invalid')
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: ID de pedido inválido.');
                    done();
                });
        });

        it('debería permitir al cocinero obtener pedidos pendientes o en preparación por ID', (done) => {
            let cocineroOrder;
            Table.create({ numero: 8, capacidad: 2, estado: 'available', is_active: 1 })
                .then(table8 => {
                    return chai.request(app)
                        .post('/api/orders')
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({
                            id_mesa: table8.id,
                            detalles: [{ id_plato: testDish.id, cantidad: 1 }],
                            estado: 'en preparación'
                        });
                })
                .then(res => {
                    cocineroOrder = { id: res.body.orderId };
                    return chai.request(app)
                        .get(`/api/orders/${cocineroOrder.id}`)
                        .set('Authorization', `Bearer ${cocineroToken}`);
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('id').equal(cocineroOrder.id);
                    expect(res.body).to.have.property('estado').to.equal('en preparación');
                    done();
                })
                .catch(err => done(err));
        });
    });

    describe('PUT /api/orders/:id (Actualizar Pedido Borrador)', () => {
        let draftOrderToUpdate;
        let tableForDraft;

        beforeEach(async () => {
            try {
                tableForDraft = await Table.create({ numero: Math.floor(Math.random() * 1000) + 200, capacidad: 2, estado: 'available', is_active: 1 });
                const res = await chai.request(app)
                    .post('/api/orders')
                    .set('Authorization', `Bearer ${meseroToken}`)
                    .send({
                        id_mesa: tableForDraft.id,
                        detalles: [{ id_plato: testDish.id, cantidad: 1 }],
                        estado: 'borrador'
                    });
                draftOrderToUpdate = { id: res.body.orderId };
            } catch (error) {
                console.error('Error in beforeEach for PUT /api/orders/:id:', error.response ? error.response.body : error.message);
                throw error;
            }
        });

        it('debería permitir a un mesero actualizar un pedido en estado "borrador"', (done) => {
            chai.request(app)
                .put(`/api/orders/${draftOrderToUpdate.id}`)
                .set('Authorization', `Bearer ${meseroToken}`)
                .send({
                    detalles: [{ id_plato: testDish.id, cantidad: 3 }]
                })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('message').equal('Pedido actualizado exitosamente');
                    expect(res.body).to.have.property('total').to.equal(testDish.precio * 3);
                    done();
                });
        });

        it('debería permitir a un administrador actualizar un pedido en estado "borrador"', (done) => {
            chai.request(app)
                .put(`/api/orders/${draftOrderToUpdate.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    detalles: [{ id_plato: testDish.id, cantidad: 4 }]
                })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('message').equal('Pedido actualizado exitosamente');
                    expect(res.body).to.have.property('total').to.equal(testDish.precio * 4);
                    done();
                });
        });

        it('no debería permitir actualizar un pedido que no está en estado "borrador"', (done) => {
            // Change order state to 'pendiente'
            Order.update({ estado: 'pendiente' }, { where: { id: draftOrderToUpdate.id } })
                .then(() => {
                    chai.request(app)
                        .put(`/api/orders/${draftOrderToUpdate.id}`)
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({
                            detalles: [{ id_plato: testDish.id, cantidad: 2 }]
                        })
                        .end((err, res) => {
                            expect(res).to.have.status(404);
                            expect(res.body).to.have.property('message').equal('Pedido no encontrado o no se puede editar');
                            done();
                        });
                })
                .catch(err => done(err));
        });

        it('debería devolver 404 si el pedido a actualizar no se encuentra', (done) => {
            chai.request(app)
                .put('/api/orders/99999')
                .set('Authorization', `Bearer ${meseroToken}`)
                .send({
                    detalles: [{ id_plato: testDish.id, cantidad: 1 }]
                })
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('Pedido no encontrado o no se puede editar');
                    done();
                });
        });

        it('debería devolver 400 si los detalles del pedido son inválidos', (done) => {
            chai.request(app)
                .put(`/api/orders/${draftOrderToUpdate.id}`)
                .set('Authorization', `Bearer ${meseroToken}`)
                .send({
                    detalles: [{ id_plato: 'invalid', cantidad: 1 }]
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: ID de plato inválido en los detalles del pedido si se proporciona.');
                    done();
                });
        });

        it('no debería permitir a un mesero actualizar un pedido de otro mesero', (done) => {
            let otherMeseroDraftOrder;
            User.create({
                nombre: 'Other Mesero',
                correo: 'othermesero@example.com',
                contraseña: 'password123',
                rol: 'mesero',
                is_active: 1
            }).then(otherMesero => {
                const otherMeseroToken = jwt.sign({ id: otherMesero.id, rol: otherMesero.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
                return chai.request(app)
                    .post('/api/orders')
                    .set('Authorization', `Bearer ${otherMeseroToken}`)
                    .send({
                        id_mesa: tableForDraft.id,
                        detalles: [{ id_plato: testDish.id, cantidad: 1 }],
                        estado: 'borrador'
                    });
            }).then(res => {
                otherMeseroDraftOrder = { id: res.body.orderId };
                return chai.request(app)
                    .put(`/api/orders/${otherMeseroDraftOrder.id}`)
                    .set('Authorization', `Bearer ${meseroToken}`) // meseroUser trying to update otherMesero's order
                    .send({
                        detalles: [{ id_plato: testDish.id, cantidad: 2 }]
                    });
            }).then(res => {
                expect(res).to.have.status(404);
                expect(res.body).to.have.property('message').equal('Pedido no encontrado o no se puede editar');
                done();
            }).catch(err => done(err));
        });
    });

    describe('PATCH /api/orders/:id/status', () => {
        it('debería permitir al cocinero cambiar el estado de un pedido a "en preparación"', (done) => {
            // Ensure testOrder is in a state that can be changed to 'en preparación' (e.g., 'pendiente')
            Order.update({ estado: 'pendiente' }, { where: { id: testOrder.id } })
                .then(() => {
                    chai.request(app)
                        .patch(`/api/orders/${testOrder.id}/status`)
                        .set('Authorization', `Bearer ${cocineroToken}`)
                        .send({ estado: 'en preparación' })
                        .end((err, res) => {
                            expect(res).to.have.status(200);
                            expect(res.body).to.have.property('message').equal('Estado del pedido actualizado exitosamente');
                            done();
                        });
                })
                .catch(err => done(err));
        });

        it('debería permitir al cocinero cambiar el estado de un pedido a "pendiente" (desde en preparación)', (done) => {
            // Create a new order in 'en preparación' state
            let newOrder;
            Table.create({ numero: 7, capacidad: 2, estado: 'available', is_active: 1 })
                .then(table7 => {
                    return chai.request(app)
                        .post('/api/orders')
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({
                            id_mesa: table7.id,
                            detalles: [{ id_plato: testDish.id, cantidad: 1 }],
                            estado: 'en preparación'
                        });
                })
                .then(res => {
                    newOrder = { id: res.body.orderId };
                    return chai.request(app)
                        .patch(`/api/orders/${newOrder.id}/status`)
                        .set('Authorization', `Bearer ${cocineroToken}`)
                        .send({ estado: 'pendiente' });
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('message').equal('Estado del pedido actualizado exitosamente');
                    done();
                })
                .catch(err => done(err));
        });

        it('debería permitir al mesero cambiar el estado de un pedido a "servido" (desde pendiente)', (done) => {
            // Create a new order in 'pendiente' state
            let newOrder;
            Table.create({ numero: 4, capacidad: 2, estado: 'available', is_active: 1 })
                .then(table4 => {
                    return chai.request(app)
                        .post('/api/orders')
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({
                            id_mesa: table4.id,
                            detalles: [{ id_plato: testDish.id, cantidad: 1 }],
                            estado: 'pendiente'
                        });
                })
                .then(res => {
                    newOrder = { id: res.body.orderId };
                    return chai.request(app)
                        .patch(`/api/orders/${newOrder.id}/status`)
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({ estado: 'servido' });
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('message').equal('Estado del pedido actualizado exitosamente');
                    done();
                })
                .catch(err => done(err));
        });

        it('debería permitir al cocinero cambiar el estado de un pedido a "servido"', (done) => {
            // Ensure testOrder is in a state that can be changed to 'servido' (e.g., 'en preparación')
            Order.update({ estado: 'en preparación' }, { where: { id: testOrder.id } })
                .then(() => {
                    chai.request(app)
                        .patch(`/api/orders/${testOrder.id}/status`)
                        .set('Authorization', `Bearer ${cocineroToken}`)
                        .send({ estado: 'servido' })
                        .end((err, res) => {
                            expect(res).to.have.status(200);
                            expect(res.body).to.have.property('message').equal('Estado del pedido actualizado exitosamente');
                            done();
                        });
                })
                .catch(err => done(err));
        });

        it('debería permitir al mesero cambiar el estado de un pedido a "pendiente" (desde borrador)', (done) => {
            // Create a draft order first
            let draftOrder;
            chai.request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${meseroToken}`)
                .send({
                    id_mesa: testTable.id,
                    detalles: [{ id_plato: testDish.id, cantidad: 1 }],
                    estado: 'borrador'
                })
                .then(res => {
                    draftOrder = { id: res.body.orderId };
                    return chai.request(app)
                        .patch(`/api/orders/${draftOrder.id}/status`)
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({ estado: 'pendiente' });
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('message').equal('Estado del pedido actualizado exitosamente');
                    done();
                })
                .catch(err => done(err));
        });

        it('no debería permitir a un mesero cambiar el estado a "en preparación"', (done) => {
            chai.request(app)
                .patch(`/api/orders/${testOrder.id}/status`)
                .set('Authorization', `Bearer ${meseroToken}`)
                .send({ estado: 'en preparación' })
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    expect(res.body).to.have.property('message').equal('No tienes permiso para cambiar a este estado');
                    done();
                });
        });

        it('no debería permitir un estado de pedido inválido', (done) => {
            chai.request(app)
                .patch(`/api/orders/${testOrder.id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ estado: 'estado_invalido' })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: El estado debe ser "borrador", "pendiente", "en preparación" o "servido".');
                    done();
                });
        });

        it('debería permitir al administrador cambiar el estado de un pedido a cualquier estado válido', (done) => {
            // Create a new order in 'pendiente' state
            let newOrder;
            Table.create({ numero: 10, capacidad: 2, estado: 'available', is_active: 1 })
                .then(table10 => {
                    return chai.request(app)
                        .post('/api/orders')
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({
                            id_mesa: table10.id,
                            detalles: [{ id_plato: testDish.id, cantidad: 1 }],
                            estado: 'pendiente'
                        });
                })
                .then(res => {
                    newOrder = { id: res.body.orderId };
                    return chai.request(app)
                        .patch(`/api/orders/${newOrder.id}/status`)
                        .set('Authorization', `Bearer ${adminToken}`)
                        .send({ estado: 'servido' });
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('message').equal('Estado del pedido actualizado exitosamente');
                    return Order.findByPk(newOrder.id);
                })
                .then(order => {
                    expect(order.estado).to.equal('servido');
                    return Table.findByPk(order.id_mesa);
                })
                .then(table => {
                    expect(table.estado).to.equal('available');
                    done();
                })
                .catch(err => done(err));
        });

        it('debería actualizar el estado de la mesa a "available" cuando el pedido se marca como "servido"', (done) => {
            let servedOrder;
            let tableForServedOrder;
            Table.create({ numero: 11, capacidad: 2, estado: 'occupied', is_active: 1 })
                .then(table11 => {
                    tableForServedOrder = table11;
                    return Order.create({
                        id_mesa: table11.id,
                        id_mesero: meseroUser.id,
                        estado: 'en preparación',
                        total: 10.00
                    });
                })
                .then(order => {
                    servedOrder = order;
                    return chai.request(app)
                        .patch(`/api/orders/${servedOrder.id}/status`)
                        .set('Authorization', `Bearer ${cocineroToken}`)
                        .send({ estado: 'servido' });
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    return Table.findByPk(tableForServedOrder.id);
                })
                .then(table => {
                    expect(table.estado).to.equal('available');
                    done();
                })
                .catch(err => done(err));
        });

        it('debería actualizar el estado de la mesa a "occupied" cuando el pedido pasa de "borrador" a "pendiente"', (done) => {
            let draftOrder;
            let tableForDraftToPending;
            Table.create({ numero: 12, capacidad: 2, estado: 'available', is_active: 1 })
                .then(table12 => {
                    tableForDraftToPending = table12;
                    return Order.create({
                        id_mesa: table12.id,
                        id_mesero: meseroUser.id,
                        estado: 'borrador',
                        total: 10.00
                    });
                })
                .then(order => {
                    draftOrder = order;
                    return chai.request(app)
                        .patch(`/api/orders/${draftOrder.id}/status`)
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({ estado: 'pendiente' });
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    return Table.findByPk(tableForDraftToPending.id);
                })
                .then(table => {
                    expect(table.estado).to.equal('occupied');
                    done();
                })
                .catch(err => done(err));
        });

        it('no debería permitir cambiar de "borrador" a "pendiente" si la mesa no está disponible', (done) => {
            let draftOrder;
            Table.create({ numero: 13, capacidad: 2, estado: 'occupied', is_active: 1 })
                .then(table13 => {
                    return Order.create({
                        id_mesa: table13.id,
                        id_mesero: meseroUser.id,
                        estado: 'borrador',
                        total: 10.00
                    });
                })
                .then(order => {
                    draftOrder = order;
                    return chai.request(app)
                        .patch(`/api/orders/${draftOrder.id}/status`)
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({ estado: 'pendiente' });
                })
                .then(res => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('La mesa no está disponible');
                    done();
                })
                .catch(err => done(err));
        });
    });

    describe('DELETE /api/orders/:id', () => {
        it('debería permitir al administrador eliminar un pedido', (done) => {
            // Create a new order to delete
            let orderToDelete;
            Table.create({ numero: 3, capacidad: 2, estado: 'available', is_active: 1 })
                .then(table3 => {
                    return chai.request(app)
                        .post('/api/orders')
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({
                            id_mesa: table3.id,
                            detalles: [{ id_plato: testDish.id, cantidad: 1 }]
                        });
                })
                .then(res => {
                    orderToDelete = { id: res.body.orderId };
                    return chai.request(app)
                        .delete(`/api/orders/${orderToDelete.id}`)
                        .set('Authorization', `Bearer ${adminToken}`);
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('message').equal('Pedido eliminado exitosamente');
                    done();
                })
                .catch(err => {
                    console.error('Error in "debería permitir al administrador eliminar un pedido" test:', err.response ? err.response.body : err.message);
                    done(err);
                });
        });

        it('no debería permitir a un mesero eliminar un pedido', (done) => {
            // Create a new order by mesero to attempt to delete
            let meseroOwnedOrder;
            Table.create({ numero: 6, capacidad: 2, estado: 'available', is_active: 1 })
                .then(table6 => {
                    return chai.request(app)
                        .post('/api/orders')
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({
                            id_mesa: table6.id,
                            detalles: [{ id_plato: testDish.id, cantidad: 1 }]
                        });
                })
                .then(res => {
                    meseroOwnedOrder = { id: res.body.orderId };
                    return chai.request(app)
                        .delete(`/api/orders/${meseroOwnedOrder.id}`)
                        .set('Authorization', `Bearer ${meseroToken}`);
                })
                .then(res => {
                    expect(res).to.have.status(403);
                    expect(res.body).to.have.property('message').equal('Acceso denegado: rol insuficiente');
                    done();
                })
                .catch(err => done(err));
        });

        it('debería devolver 404 si el pedido a eliminar no se encuentra', (done) => {
            chai.request(app)
                .delete('/api/orders/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('Pedido no encontrado');
                    done();
                });
        });

        it('debería devolver 404 si el pedido a eliminar no se encuentra', (done) => {
            chai.request(app)
                .delete('/api/orders/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('Pedido no encontrado');
                    done();
                });
        });

        it('no debería permitir a un mesero eliminar un pedido que no es suyo', (done) => {
            // Create an order by admin to test this
            let otherOrder;
            Table.create({ numero: 5, capacidad: 2, estado: 'available', is_active: 1 })
                .then(table5 => {
                    return chai.request(app)
                        .post('/api/orders')
                        .set('Authorization', `Bearer ${adminToken}`)
                        .send({
                            id_mesa: table5.id,
                            detalles: [{ id_plato: testDish.id, cantidad: 1 }]
                        });
                })
                .then(res => {
                    otherOrder = { id: res.body.orderId };
                    return chai.request(app)
                        .delete(`/api/orders/${otherOrder.id}`)
                        .set('Authorization', `Bearer ${meseroToken}`);
                })
                .then(res => {
                    expect(res).to.have.status(403);
                    expect(res.body).to.have.property('message').equal('Acceso denegado: rol insuficiente'); // Updated message
                    done();
                })
                .catch(err => done(err));
        });

        it('debería eliminar los OrderDetails asociados al eliminar un pedido', (done) => {
            let orderToDeleteWithDetails;
            Table.create({ numero: 14, capacidad: 2, estado: 'available', is_active: 1 })
                .then(table14 => {
                    return chai.request(app)
                        .post('/api/orders')
                        .set('Authorization', `Bearer ${meseroToken}`)
                        .send({
                            id_mesa: table14.id,
                            detalles: [{ id_plato: testDish.id, cantidad: 2 }]
                        });
                })
                .then(res => {
                    orderToDeleteWithDetails = { id: res.body.orderId };
                    return chai.request(app)
                        .delete(`/api/orders/${orderToDeleteWithDetails.id}`)
                        .set('Authorization', `Bearer ${adminToken}`);
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    return OrderDetail.findAll({ where: { id_pedido: orderToDeleteWithDetails.id } });
                })
                .then(details => {
                    expect(details).to.be.an('array').that.is.empty;
                    done();
                })
                .catch(err => done(err));
        });

        it('debería liberar la mesa asociada al eliminar un pedido', (done) => {
            let orderToDeleteAndFreeTable;
            let tableToFree;
            Table.create({ numero: 15, capacidad: 2, estado: 'occupied', is_active: 1 })
                .then(table15 => {
                    tableToFree = table15;
                    return Order.create({
                        id_mesa: table15.id,
                        id_mesero: meseroUser.id,
                        estado: 'servido',
                        total: 10.00
                    });
                })
                .then(order => {
                    orderToDeleteAndFreeTable = order;
                    return chai.request(app)
                        .delete(`/api/orders/${orderToDeleteAndFreeTable.id}`)
                        .set('Authorization', `Bearer ${adminToken}`);
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    return Table.findByPk(tableToFree.id);
                })
                .then(table => {
                    expect(table.estado).to.equal('available');
                    done();
                })
                .catch(err => done(err));
        });
    });
});
