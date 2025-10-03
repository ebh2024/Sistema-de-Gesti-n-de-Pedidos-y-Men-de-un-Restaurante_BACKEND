const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server');
const { sequelize, Dish } = require('../models');
const jwt = require('jsonwebtoken'); // Assuming JWT might be used for admin access to dish routes

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key'; // Ensure this matches your auth middleware

chai.use(chaiHttp);
const expect = chai.expect;

describe('Dish API', () => {
    let adminUser, adminToken;

    before(async () => {
        // Connect to the test database and sync models
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.sync({ force: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });

        // Create an admin user for authenticated routes
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
        // Clean up the database after all tests
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.drop();
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
    });

    beforeEach(async () => {
        // Clean up tables before each test to avoid foreign key constraints
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.models.OrderDetail.destroy({ truncate: true, cascade: true });
        await sequelize.models.Order.destroy({ truncate: true, cascade: true });
        await Dish.destroy({ truncate: true, cascade: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
    });

    describe('Dish Model', () => {
        it('should create a new dish', async () => {
            const dish = await Dish.create({
                nombre: 'Pizza',
                descripcion: 'Delicious pizza',
                precio: 12.99,
                // category and imageUrl are not in the model
                disponibilidad: 1,
            });
            expect(dish).to.have.property('id');
            expect(dish.nombre).to.equal('Pizza');
        });

        it('should not create a dish without a name', async () => {
            try {
                await Dish.create({
                    descripcion: 'A test dish',
                    precio: 9.99,
                    // category is not in the model
                    disponibilidad: 1,
                });
                expect.fail('Should not have created dish without a name');
            } catch (error) {
                expect(error.name).to.equal('SequelizeValidationError');
                expect(error.errors[0].message).to.equal('Dish.nombre cannot be null');
            }
        });

        it('should not create a dish with a non-numeric price', async () => {
            try {
                await Dish.create({
                    nombre: 'Invalid Dish',
                    descripcion: 'A dish with invalid price',
                    precio: 'abc',
                    // category is not in the model
                    disponibilidad: 1,
                });
                expect.fail('Should not have created dish with non-numeric price');
            } catch (error) {
                expect(error.name).to.equal('SequelizeValidationError');
                expect(error.errors[0].message).to.equal('Validation isFloat on precio failed');
            }
        });
    });

    describe('POST /api/dishes', () => {
        it('should allow admin to create a new dish', (done) => {
            chai.request(app)
                .post('/api/dishes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nombre: 'Burger',
                    descripcion: 'Classic beef burger',
                    precio: 9.50,
                    // category and imageUrl are not in the model
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

        it('should not allow non-admin to create a new dish', (done) => {
            chai.request(app)
                .post('/api/dishes')
                .send({
                    nombre: 'Unauthorized Dish',
                    descripcion: 'Should not be created',
                    precio: 10.00,
                    // category and imageUrl are not in the model
                    disponibilidad: 1,
                })
                .end((err, res) => {
                    expect(res).to.have.status(401); // Or 403 if auth middleware is present but role is insufficient
                    expect(res.body).to.have.property('message').equal('Token de acceso requerido');
                    done();
                });
        });

        it('should return 400 if required fields are missing', (done) => {
            chai.request(app)
                .post('/api/dishes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    descripcion: 'Missing name',
                    precio: 5.00,
                    // category is not in the model
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
        it('should allow authenticated users to get all dishes', (done) => {
            Dish.create({
                nombre: 'Salad',
                descripcion: 'Fresh garden salad',
                precio: 7.00,
                disponibilidad: 1,
            }).then(() => {
                chai.request(app)
                    .get('/api/dishes')
                    .set('Authorization', `Bearer ${adminToken}`) // Add authentication token
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

        it('should not allow unauthenticated users to get all dishes', (done) => {
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
        it('should allow authenticated users to get a dish by ID', (done) => {
            Dish.create({
                nombre: 'Soup',
                descripcion: 'Tomato soup',
                precio: 5.00,
                disponibilidad: 1,
            }).then((dish) => {
                chai.request(app)
                    .get(`/api/dishes/${dish.id}`)
                    .set('Authorization', `Bearer ${adminToken}`) // Add authentication token
                    .end((err, res) => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('status').equal('éxito');
                        expect(res.body.data.data).to.be.an('object');
                        expect(res.body.data.data.nombre).to.equal('Soup');
                        done();
                    });
            });
        });

        it('should return 404 for a non-existent dish ID', (done) => {
            chai.request(app)
                .get('/api/dishes/99999')
                .set('Authorization', `Bearer ${adminToken}`) // Add authentication token
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('No se encontró ningún documento con ese ID');
                    done();
                });
        });

        it('should return 401 if no token is provided', (done) => {
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
        it('should allow admin to update a dish by ID', (done) => {
            Dish.create({
                nombre: 'Pasta',
                descripcion: 'Spaghetti with meatballs',
                precio: 15.00,
                // category and imageUrl are not in the model
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
                        expect(res.body.data.data.precio).to.equal('16.50'); // Price is DECIMAL, so it's a string
                        done();
                    });
            });
        });

        it('should not allow non-admin to update a dish by ID', (done) => {
            Dish.create({
                nombre: 'Fries',
                descripcion: 'Crispy french fries',
                precio: 3.50,
                // category and imageUrl are not in the model
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

        it('should return 404 for updating a non-existent dish ID', (done) => {
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

        it('should return 400 if invalid data is provided for update', (done) => {
            Dish.create({
                nombre: 'Drink',
                descripcion: 'Soft drink',
                precio: 2.00,
                // category and imageUrl are not in the model
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
        it('should allow admin to delete a dish by ID', (done) => {
            Dish.create({
                nombre: 'Dessert',
                descripcion: 'Chocolate cake',
                precio: 6.00,
                // category and imageUrl are not in the model
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

        it('should not allow non-admin to delete a dish by ID', (done) => {
            Dish.create({
                nombre: 'Snack',
                descripcion: 'Small snack',
                precio: 3.00,
                // category and imageUrl are not in the model
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

        it('should return 404 for deleting a non-existent dish ID', (done) => {
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
