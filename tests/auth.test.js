const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server'); // Import the Express app
const { sequelize, User } = require('../models'); // Only import User and sequelize
const jwt = require('jsonwebtoken'); // Import jwt for creating reset tokens
// bcrypt is no longer needed here as password hashing is handled by model hooks and comparison is done in controller

process.env.NODE_ENV = 'test'; // Ensure test environment is loaded
process.env.JWT_SECRET = 'test-secret-key'; // Use a test secret key for JWT
process.env.CLIENT_URL = 'http://localhost:3000'; // Mock client URL for email links
process.env.EMAIL_USER = 'test@example.com'; // Mock email user for email service

chai.use(chaiHttp);
const expect = chai.expect;

describe('Auth API', () => {
    let testUser;
    let testUserPassword = 'testpassword123';
    let inactiveUser;

    before(async () => {
        try {
            // Disable foreign key checks
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });

            // Synchronize the database and force drop existing tables
            await sequelize.sync({ force: true });

            // Re-enable foreign key checks
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });

            // Create a test user (password will be hashed by model hook)
            testUser = await User.create({
                nombre: 'testuser',
                correo: 'testuser@example.com',
                contraseña: testUserPassword, // Pass plain-text password, model hook will hash it
                rol: 'admin'
            });

            // Create an inactive user
            inactiveUser = await User.create({
                nombre: 'inactiveuser',
                correo: 'inactive@example.com',
                contraseña: 'inactivepassword',
                rol: 'mesero',
                is_active: 0
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

        it('should return 400 if required fields are missing (contraseña)', (done) => {
            chai.request(app)
                .post('/api/auth/register')
                .send({
                    nombre: 'incomplete',
                    correo: 'incomplete@example.com',
                    rol: 'mesero'
                    // Missing contraseña
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message');
                    done();
                });
        });

        it('should return 400 if nombre is missing', (done) => {
            chai.request(app)
                .post('/api/auth/register')
                .send({
                    correo: 'noname@example.com',
                    contraseña: 'password123',
                    rol: 'mesero'
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message'); // Expect a message, as validation errors are aggregated
                    expect(res.body.message).to.include('El nombre es requerido.');
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

        it('should return 401 for invalid credentials (wrong password)', (done) => {
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

        it('should return 401 for invalid credentials (user not found)', (done) => {
            chai.request(app)
                .post('/api/auth/login')
                .send({
                    correo: 'nonexistent@example.com',
                    contraseña: 'password123'
                })
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('Credenciales inválidas');
                    done();
                });
        });

        it('should return 401 for inactive user', (done) => {
            chai.request(app)
                .post('/api/auth/login')
                .send({
                    correo: inactiveUser.correo,
                    contraseña: 'inactivepassword'
                })
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('Credenciales inválidas');
                    done();
                });
        });

        it('should return 400 if required fields are missing (contraseña)', (done) => {
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

    describe('POST /api/auth/forgot-password', () => {
        it('should send reset instructions if email exists', (done) => {
            chai.request(app)
                .post('/api/auth/forgot-password')
                .send({ correo: testUser.correo })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('Instrucciones de reset enviadas al correo');
                    done();
                });
        });

        it('should return 404 if email does not exist', (done) => {
            chai.request(app)
                .post('/api/auth/forgot-password')
                .send({ correo: 'nonexistent@example.com' })
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('Usuario no encontrado');
                    done();
                });
        });

        it('should return 400 if email is missing', (done) => {
            chai.request(app)
                .post('/api/auth/forgot-password')
                .send({})
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message');
                    done();
                });
        });

        it('should return 404 if user is inactive', (done) => {
            chai.request(app)
                .post('/api/auth/forgot-password')
                .send({ correo: inactiveUser.correo })
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('Usuario no encontrado');
                    done();
                });
        });
    });

    describe('POST /api/auth/reset-password', () => {
        let resetToken;

        before(async () => {
            // Generate a valid reset token for testUser
            resetToken = jwt.sign(
                { id: testUser.id, correo: testUser.correo },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
        });

        it('should reset password successfully with a valid token', (done) => {
            chai.request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: resetToken,
                    nuevaContraseña: 'newsecurepassword123'
                })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('Contraseña actualizada exitosamente');
                    done();
                });
        });

        it('should return 400 for an invalid token', (done) => {
            chai.request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: 'invalidtoken123',
                    nuevaContraseña: 'newsecurepassword123'
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message').equal('Token inválido o expirado');
                    done();
                });
        });

        it('should return 400 for an expired token', (done) => {
            // Create an expired token
            const expiredToken = jwt.sign(
                { id: testUser.id, correo: testUser.correo },
                process.env.JWT_SECRET,
                { expiresIn: '0s' } // Immediately expired
            );

            // Wait a bit for the token to actually expire
            setTimeout(() => {
                chai.request(app)
                    .post('/api/auth/reset-password')
                    .send({
                        token: expiredToken,
                        nuevaContraseña: 'newsecurepassword123'
                    })
                    .end((err, res) => {
                        expect(res).to.have.status(400);
                        expect(res.body).to.be.an('object');
                        expect(res.body).to.have.property('message').equal('Token inválido o expirado');
                        done();
                    });
            }, 100); // Wait 100ms
        });

        it('should return 400 if token or nuevaContraseña is missing', (done) => {
            chai.request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: resetToken
                    // Missing nuevaContraseña
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('message');
                    done();
                });
        });

        it('should return 400 if new password is too short', (done) => {
            chai.request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: resetToken,
                    nuevaContraseña: 'short' // Less than 6 characters
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
