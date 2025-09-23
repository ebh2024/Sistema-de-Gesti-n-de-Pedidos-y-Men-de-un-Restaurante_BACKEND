const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server'); // Import the Express app
const { sequelize, User, Table, Dish, Order, OrderDetail } = require('../models'); // Import all necessary models
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test'; // Ensure test environment is loaded

chai.use(chaiHttp);
const expect = chai.expect;

describe('Auth API', () => {
    let testUser;
    let testUserPassword = 'testpassword123';

    before(async () => {
        try {
            // Disable foreign key checks
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });

            // Synchronize the database and force drop existing tables
            await sequelize.sync({ force: true });

            // Re-enable foreign key checks
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });

            // Create a test user
            const hashedPassword = await bcrypt.hash(testUserPassword, 10);
            testUser = await User.create({
                nombre: 'testuser',
            correo: 'testuser@example.com', // Changed email for the initial test user
            contraseña: hashedPassword,
            rol: 'admin'
        });
        } catch (error) {
            console.error('Error during test setup (before hook):', error);
            if (error.errors) {
                error.errors.forEach(err => console.error('Validation error detail:', err.message, err.path, err.value));
            }
            throw error; // Re-throw to fail the test
        }
    });

    after(async () => {
        // Disable foreign key checks before dropping tables
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });

        // Clean up: drop all tables
        await sequelize.drop();

        // Re-enable foreign key checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });

        // Close the database connection
        await sequelize.close();
    });

    describe('GET /api/health', () => {
        it('should return 200 and a success message', (done) => {
            chai.request(app)
                .get('/api/health')
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('API funcionando correctamente');
                    expect(res.body).to.have.property('timestamp');
                    done();
                });
        });
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', (done) => {
            chai.request(app)
                .post('/api/auth/register')
                .send({
                    nombre: 'newuser',
                    correo: 'newuser@example.com',
                    contraseña: 'newpassword123',
                    rol: 'mesero'
                })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('Usuario registrado exitosamente');
                    expect(res.body).to.have.property('userId'); // Expect userId instead of user
                    done();
                });
        });

        it('should return 400 if email already exists', (done) => {
            chai.request(app)
                .post('/api/auth/register')
                .send({
                    nombre: 'existinguser',
                    correo: 'testuser@example.com', // Use the email of the user created in before hook
                    contraseña: 'password123',
                    rol: 'mesero'
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('El correo ya está registrado');
                    done();
                });
        });

        it('should return 400 if required fields are missing', (done) => {
            chai.request(app)
                .post('/api/auth/register')
                .send({
                    nombre: 'incomplete',
                    correo: 'incomplete@example.com',
                    rol: 'cliente'
                    // Missing contraseña
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message');
                    done();
                });
        });
    });

    describe('POST /api/auth/login', () => {
        it('should log in an existing user successfully', (done) => {
            chai.request(app)
                .post('/api/auth/login')
                .send({
                    correo: testUser.correo,
                    contraseña: testUserPassword
                })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('Login exitoso');
                    expect(res.body).to.have.property('token');
                    expect(res.body).to.have.property('user');
                    expect(res.body.user).to.not.have.property('password');
                    done();
                });
        });

        it('should return 401 for invalid credentials', (done) => {
            chai.request(app)
                .post('/api/auth/login')
                .send({
                    correo: testUser.correo,
                    contraseña: 'wrongpassword'
                })
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('Credenciales inválidas');
                    done();
                });
        });

        it('should return 400 if required fields are missing', (done) => {
            chai.request(app)
                .post('/api/auth/login')
                .send({
                    correo: testUser.correo
                    // Missing contraseña
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message');
                    done();
                });
        });
    });
});
