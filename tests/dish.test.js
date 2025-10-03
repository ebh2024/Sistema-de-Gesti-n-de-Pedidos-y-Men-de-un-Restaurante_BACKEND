const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server');
const { sequelize, Dish } = require('../models');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

chai.use(chaiHttp);
const expect = chai.expect;

describe('API de Platos', () => {
    let adminUser, adminToken;

    before(async () => {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.sync({ force: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });

        adminUser = await sequelize.models.User.create({
            nombre: 'Admin User',
            correo: 'admin@example.com',
            contraseña: 'adminpassword123',
            rol: 'admin',
            is_active: 1
        });

        adminToken = jwt.sign({ id: adminUser.id, rol: adminUser.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    after(async () => {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.drop();
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
    });

    beforeEach(async () => {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.models.OrderDetail.destroy({ truncate: true, cascade: true });
        await sequelize.models.Order.destroy({ truncate: true, cascade: true });
        await Dish.destroy({ truncate: true, cascade: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
    });

    describe('Modelo de Plato', () => {
        it('debería crear un nuevo plato', async () => {
            const dish = await Dish.create({
                nombre: 'Pizza',
                descripcion: 'Delicious pizza',
                precio: 12.99,
                disponibilidad: 1,
            });
            expect(dish).to.have.property('id');
            expect(dish.nombre).to.equal('Pizza');
        });

        it('no debería crear un plato sin nombre', async () => {
            try {
                await Dish.create({
                    descripcion: 'A test dish',
                    precio: 9.99,
                    disponibilidad: 1,
                });
                expect.fail('No debería haber creado un plato sin nombre');
            } catch (error) {
                expect(error.name).to.equal('SequelizeValidationError');
                expect(error.errors[0].message).to.equal('Dish.nombre cannot be null');
            }
        });

        it('no debería crear un plato con un precio no numérico', async () => {
            try {
                await Dish.create({
                    nombre: 'Invalid Dish',
                    descripcion: 'A dish with invalid price',
                    precio: 'abc',
                    disponibilidad: 1,
                });
                expect.fail('No debería haber creado un plato con un precio no numérico');
            } catch (error) {
                expect(error.name).to.equal('SequelizeValidationError');
                expect(error.errors[0].message).to.equal('Validation isFloat on precio failed');
            }
        });
    });

    describe('POST /api/dishes', () => {
        it('debería permitir al administrador crear un nuevo plato', (done) => {
            chai.request(app)
                .post('/api/dishes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nombre: 'Burger',
                    descripcion: 'Classic beef burger',
                    precio: 9.50,
                    disponibilidad: 1,
                })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('status').equal('éxito');
                    expect(res.body.data.data).to.have.property('id');
                    expect(res.body.data.data.nombre).to.equal('Burger');
                    done();
                });
        });

        it('no debería permitir a un no-administrador crear un nuevo plato', (done) => {
            chai.request(app)
                .post('/api/dishes')
                .send({
                    nombre: 'Unauthorized Dish',
                    descripcion: 'Should not be created',
                    precio: 10.00,
                    disponibilidad: 1,
                })
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    expect(res.body).to.have.property('message').equal('Token de acceso requerido');
                    done();
                });
        });

        it('debería devolver 400 si faltan campos requeridos', (done) => {
            chai.request(app)
                .post('/api/dishes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    descripcion: 'Missing name',
                    precio: 5.00,
                    disponibilidad: 1,
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: El nombre del plato es requerido.. El nombre del plato debe tener al menos 3 caracteres.');
                    done();
                });
        });
    });

    describe('GET /api/dishes', () => {
        it('debería permitir a los usuarios autenticados obtener todos los platos', (done) => {
            Dish.create({
                nombre: 'Salad',
                descripcion: 'Fresh garden salad',
                precio: 7.00,
                disponibilidad: 1,
            }).then(() => {
                chai.request(app)
                    .get('/api/dishes')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .end((err, res) => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('status').equal('éxito');
                        expect(res.body.data.data).to.be.an('array');
                        expect(res.body.data.data.length).to.be.at.least(1);
                        expect(res.body.data.data[0]).to.have.property('nombre');
                        done();
                    });
            });
        });

        it('no debería permitir a los usuarios no autenticados obtener todos los platos', (done) => {
            chai.request(app)
                .get('/api/dishes')
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    expect(res.body).to.have.property('message').equal('Token de acceso requerido');
                    done();
                });
        });
    });

    describe('GET /api/dishes/:id', () => {
        it('debería permitir a los usuarios autenticados obtener un plato por ID', (done) => {
            Dish.create({
                nombre: 'Soup',
                descripcion: 'Tomato soup',
                precio: 5.00,
                disponibilidad: 1,
            }).then((dish) => {
                chai.request(app)
                    .get(`/api/dishes/${dish.id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .end((err, res) => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('status').equal('éxito');
                        expect(res.body.data.data).to.be.an('object');
                        expect(res.body.data.data.nombre).to.equal('Soup');
                        done();
                    });
            });
        });

        it('debería devolver 404 para un ID de plato inexistente', (done) => {
            chai.request(app)
                .get('/api/dishes/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('No se encontró ningún documento con ese ID');
                    done();
                });
        });

        it('debería devolver 401 si no se proporciona token', (done) => {
            Dish.create({
                nombre: 'Juice',
                descripcion: 'Orange Juice',
                precio: 3.00,
                disponibilidad: 1,
            }).then((dish) => {
                chai.request(app)
                    .get(`/api/dishes/${dish.id}`)
                    .end((err, res) => {
                        expect(res).to.have.status(401);
                        expect(res.body).to.have.property('message').equal('Token de acceso requerido');
                        done();
                    });
            });
        });
    });

    describe('PUT /api/dishes/:id', () => {
        it('debería permitir al administrador actualizar un plato por ID', (done) => {
            Dish.create({
                nombre: 'Pasta',
                descripcion: 'Spaghetti with meatballs',
                precio: 15.00,
                disponibilidad: 1,
            }).then((dish) => {
                chai.request(app)
                    .put(`/api/dishes/${dish.id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        nombre: 'Pasta Carbonara',
                        precio: 16.50,
                    })
                    .end((err, res) => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('status').equal('éxito');
                        expect(res.body.data.data).to.be.an('object');
                        expect(res.body.data.data.nombre).to.equal('Pasta Carbonara');
                        expect(res.body.data.data.precio).to.equal('16.50');
                        done();
                    });
            });
        });

        it('no debería permitir a un no-administrador actualizar un plato por ID', (done) => {
            Dish.create({
                nombre: 'Fries',
                descripcion: 'Crispy french fries',
                precio: 3.50,
                disponibilidad: 1,
            }).then((dish) => {
                chai.request(app)
                    .put(`/api/dishes/${dish.id}`)
                    .send({ nombre: 'Updated Fries' })
                    .end((err, res) => {
                        expect(res).to.have.status(401);
                        expect(res.body).to.have.property('message').equal('Token de acceso requerido');
                        done();
                    });
            });
        });

        it('debería devolver 404 al intentar actualizar un ID de plato inexistente', (done) => {
            chai.request(app)
                .put('/api/dishes/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nombre: 'Non Existent' })
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('No se encontró ningún documento con ese ID');
                    done();
                });
        });

        it('debería devolver 400 si se proporcionan datos inválidos para la actualización', (done) => {
            Dish.create({
                nombre: 'Drink',
                descripcion: 'Soft drink',
                precio: 2.00,
                disponibilidad: 1,
            }).then((dish) => {
                chai.request(app)
                    .put(`/api/dishes/${dish.id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ precio: 'invalid' })
                    .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: El precio debe ser un número positivo.');
                    done();
                    });
            });
        });
    });

    describe('DELETE /api/dishes/:id', () => {
        it('debería permitir al administrador eliminar un plato por ID', (done) => {
            Dish.create({
                nombre: 'Dessert',
                descripcion: 'Chocolate cake',
                precio: 6.00,
                disponibilidad: 1,
            }).then((dish) => {
                chai.request(app)
                    .delete(`/api/dishes/${dish.id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .end((err, res) => {
                        expect(res).to.have.status(204);
                        expect(res.body).to.be.empty;
                        done();
                    });
            });
        });

        it('no debería permitir a un no-administrador eliminar un plato por ID', (done) => {
            Dish.create({
                nombre: 'Snack',
                descripcion: 'Small snack',
                precio: 3.00,
                disponibilidad: 1,
            }).then((dish) => {
                chai.request(app)
                    .delete(`/api/dishes/${dish.id}`)
                    .end((err, res) => {
                        expect(res).to.have.status(401);
                        expect(res.body).to.have.property('message').equal('Token de acceso requerido');
                        done();
                    });
            });
        });

        it('debería devolver 404 al intentar eliminar un ID de plato inexistente', (done) => {
            chai.request(app)
                .delete('/api/dishes/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('No se encontró ningún documento con ese ID');
                    done();
                });
        });
    });
});
