// tests/table.test.js
const chai = require('chai');
const chaiHttp = require('chai-http');
let app; // Declare app as a mutable variable
const { sequelize, Table, User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key'; // Ensure this is set for JWT signing

chai.use(chaiHttp);
const expect = chai.expect;

describe('API de Mesas', () => {
    let token;
    let adminToken;
    let testTableId;
    let testUser;
    let adminUser;

    before(async () => {
        // Re-require app to ensure latest changes are picked up
        delete require.cache[require.resolve('../server')];
        app = require('../server');

        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.sync({ force: true }); // Clear and re-sync database for testing
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });

        // Create a test user and admin user for authentication
        const hashedPassword = await bcrypt.hash('password123', 10);
        testUser = await User.create({
            nombre: 'Test User',
            correo: 'test@example.com',
            contraseña: hashedPassword,
            rol: 'mesero', // Changed from 'customer' to 'mesero' to match ENUM
            is_active: 1
        });
        adminUser = await User.create({
            nombre: 'Admin User',
            correo: 'admin@example.com',
            contraseña: hashedPassword,
            rol: 'admin',
            is_active: 1
        });

        token = jwt.sign({ id: testUser.id, rol: testUser.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
        adminToken = jwt.sign({ id: adminUser.id, rol: adminUser.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    after(async () => {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.drop();
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
    });

    describe('Modelo de Mesa', () => {
        it('debería crear una nueva mesa', async () => {
            const table = await Table.create({ numero: 1, capacidad: 4, estado: 'available', is_active: 1 });
            expect(table).to.have.property('id');
            expect(table.numero).to.equal(1);
            expect(table.capacidad).to.equal(4);
            expect(table.estado).to.equal('available');
        });

        it('no debería crear una mesa con número duplicado', async () => {
            await Table.create({ numero: 2, capacidad: 2, estado: 'available', is_active: 1 });
            try {
                await Table.create({ numero: 2, capacidad: 3, estado: 'occupied', is_active: 1 });
                expect.fail('No debería haber creado una mesa con número duplicado');
            } catch (error) {
                expect(error.name).to.equal('SequelizeUniqueConstraintError');
            }
        });

        it('no debería crear una mesa con estado inválido', async () => {
            try {
                await Table.create({ numero: 3, capacidad: 4, estado: 'invalid', is_active: 1 });
                expect.fail('No debería haber creado una mesa con estado inválido');
            } catch (error) {
                expect(error.name).to.equal('SequelizeDatabaseError'); // Changed from SequelizeValidationError
                expect(error.message).to.include('estado');
            }
        });
    });

    describe('API de Mesas', () => {
        // Test POST /api/tables
        it('debería permitir al administrador crear una nueva mesa', (done) => {
            chai.request(app)
                .post('/api/tables')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ numero: 10, capacidad: 6, estado: 'available' })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    expect(res.body.data.data).to.have.property('id');
                    expect(res.body.data.data.numero).to.equal(10);
                    testTableId = res.body.data.data.id; // Save ID for later tests
                    done();
                });
        });

        it('no debería permitir a un no-administrador crear una nueva mesa', (done) => {
            chai.request(app)
                .post('/api/tables')
                .set('Authorization', `Bearer ${token}`)
                .send({ numero: 11, capacidad: 2, estado: 'available' })
                .end((err, res) => {
                    expect(res).to.have.status(403); // Forbidden
                    expect(res.body).to.have.property('message').equal('Acceso denegado: rol insuficiente');
                    done();
                });
        });

        it('no debería crear una mesa con datos inválidos', (done) => {
            chai.request(app)
                .post('/api/tables')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ numero: 'invalid', capacidad: 4, estado: 'available' })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: El número de mesa debe ser un entero positivo.'); // Updated message
                    done();
                });
        });

        // Test GET /api/tables
        it('debería obtener todas las mesas', (done) => {
            chai.request(app)
                .get('/api/tables')
                .set('Authorization', `Bearer ${token}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.data.data).to.be.an('array');
                    expect(res.body.data.data.length).to.be.at.least(1);
                    done();
                });
        });

        // Test GET /api/tables/:id
        it('debería obtener una mesa por ID', (done) => {
            chai.request(app)
                .get(`/api/tables/${testTableId}`)
                .set('Authorization', `Bearer ${token}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.data.data).to.have.property('id').equal(testTableId);
                    done();
                });
        });

        it('debería devolver 404 para un ID de mesa inexistente', (done) => {
            chai.request(app)
                .get('/api/tables/99999')
                .set('Authorization', `Bearer ${token}`)
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('No se encontró ningún documento con ese ID'); // Updated message
                    done();
                });
        });

        // Test PUT /api/tables/:id
        it('debería permitir al administrador actualizar una mesa', (done) => {
            chai.request(app)
                .put(`/api/tables/${testTableId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ capacidad: 8, estado: 'occupied' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.data.data).to.have.property('capacidad').equal(8);
                    expect(res.body.data.data).to.have.property('estado').equal('occupied');
                    done();
                });
        });

        it('no debería permitir a un no-administrador actualizar una mesa', (done) => {
            chai.request(app)
                .put(`/api/tables/${testTableId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ capacidad: 10 })
                .end((err, res) => {
                    expect(res).to.have.status(403); // Forbidden
                    expect(res.body).to.have.property('message').equal('Acceso denegado: rol insuficiente');
                    done();
                });
        });

        it('no debería actualizar una mesa con datos inválidos', (done) => {
            chai.request(app)
                .put(`/api/tables/${testTableId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ estado: 'invalid_status' })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: El estado debe ser "available", "occupied" o "cleaning" si se proporciona.'); // Updated message
                    done();
                });
        });

        // Test DELETE /api/tables/:id
        it('debería permitir al administrador eliminar una mesa', (done) => {
            chai.request(app)
                .delete(`/api/tables/${testTableId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(204); // No Content

                    // Verify deletion
                    chai.request(app)
                        .get(`/api/tables/${testTableId}`)
                        .set('Authorization', `Bearer ${token}`)
                        .end((err, getRes) => {
                            expect(getRes).to.have.status(404);
                            expect(getRes.body).to.have.property('message').equal('No se encontró ningún documento con ese ID'); // Verify 404 message
                            done();
                        });
                });
        });

        it('no debería permitir a un no-administrador eliminar una mesa', (done) => {
            // Create a new table to delete
            let newTableId;
            chai.request(app)
                .post('/api/tables')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ numero: 12, capacidad: 4, estado: 'available' })
                .end((err, res) => {
                    newTableId = res.body.data.data.id; // Updated to match response structure
                    chai.request(app)
                        .delete(`/api/tables/${newTableId}`)
                        .set('Authorization', `Bearer ${token}`)
                        .end((err, delRes) => {
                            expect(delRes).to.have.status(403); // Forbidden
                            expect(delRes.body).to.have.property('message').equal('Acceso denegado: rol insuficiente');
                            done();
                        });
                });
        });
    });
});
