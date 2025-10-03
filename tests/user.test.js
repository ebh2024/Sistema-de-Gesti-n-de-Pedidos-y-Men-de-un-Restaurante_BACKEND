const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server');
const { sequelize, User } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

chai.use(chaiHttp);
const expect = chai.expect;

describe('User API', () => {
    let adminUser, regularUser, adminToken, regularToken;
    const adminPassword = 'adminpassword123';
    const regularPassword = 'userpassword123';

    before(async () => {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.sync({ force: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });

        adminUser = await User.create({
            nombre: 'Admin User',
            correo: 'admin@example.com',
            contraseña: adminPassword,
            rol: 'admin',
            is_active: 1
        });

        regularUser = await User.create({
            nombre: 'Regular User',
            correo: 'user@example.com',
            contraseña: regularPassword,
            rol: 'mesero',
            is_active: 1
        });

        adminToken = jwt.sign({ id: adminUser.id, rol: adminUser.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
        regularToken = jwt.sign({ id: regularUser.id, rol: regularUser.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    after(async () => {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
        await sequelize.drop();
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
    });

    describe('User Model', () => {
        it('should hash password before saving', async () => {
            const user = await User.create({
                nombre: 'Test Hash',
                correo: 'hash@example.com',
                contraseña: 'plainpassword',
                rol: 'mesero'
            });
            expect(user.contraseña).to.not.equal('plainpassword');
            expect(bcrypt.compareSync('plainpassword', user.contraseña)).to.be.true;
        });

        it('should not allow duplicate emails', async () => {
            try {
                await User.create({
                    nombre: 'Duplicate User',
                    correo: 'admin@example.com',
                    contraseña: 'duplicatepassword',
                    rol: 'mesero'
                });
                expect.fail('Should not have created user with duplicate email');
            } catch (error) {
                expect(error.name).to.equal('SequelizeUniqueConstraintError');
            }
        });

        it('should not allow invalid roles', async () => {
            try {
                await User.create({
                    nombre: 'Invalid Role',
                    correo: 'invalidrole@example.com',
                    contraseña: 'password',
                    rol: 'invalid'
                });
                expect.fail('Should not have created user with invalid role');
            } catch (error) {
            expect(error.name).to.equal('SequelizeDatabaseError');
            // The actual error message from the DB might vary, but the error type is key
            // For now, we'll just check the error type as the validation is at DB level for ENUM
            // If a custom validation error message is desired, it should be handled in the model hooks or controller
            }
        });
    });

    describe('GET /api/users', () => {
        it('should allow admin to get all users', (done) => {
            chai.request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.data.data).to.be.an('array');
                    expect(res.body.data.data.length).to.be.at.least(2);
                    expect(res.body.data.data[0]).to.not.have.property('contraseña');
                    done();
                });
        });

        it('should not allow regular user to get all users', (done) => {
            chai.request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${regularToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    expect(res.body).to.have.property('message').equal('Acceso denegado: rol insuficiente');
                    done();
                });
        });

        it('should return 401 if no token is provided', (done) => {
            chai.request(app)
                .get('/api/users')
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    expect(res.body).to.have.property('message').equal('Token de acceso requerido');
                    done();
                });
        });
    });

    describe('GET /api/users/:id', () => {
        it('should allow admin to get a user by ID', (done) => {
            chai.request(app)
                .get(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    expect(res.body.data.data.id).to.equal(regularUser.id);
                    expect(res.body.data.data).to.not.have.property('contraseña');
                    done();
                });
        });

        it('should allow a regular user to get their own profile', (done) => {
            chai.request(app)
                .get(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${regularToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    expect(res.body.data.data.id).to.equal(regularUser.id);
                    expect(res.body.data.data).to.not.have.property('contraseña');
                    done();
                });
        });

        it('should not allow a regular user to get another user\'s profile', (done) => {
            chai.request(app)
                .get(`/api/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${regularToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    expect(res.body).to.have.property('message').equal('No tienes permiso para realizar esta acción');
                    done();
                });
        });

        it('should return 404 if user not found', (done) => {
            chai.request(app)
                .get('/api/users/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('Usuario no encontrado');
                    done();
                });
        });
    });

    describe('PUT /api/users/:id', () => {
        it('should allow admin to update a user', (done) => {
            chai.request(app)
                .put(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nombre: 'Updated Regular User' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    expect(res.body.message).to.equal('Usuario actualizado exitosamente');
                    done();
                });
        });

        it('should allow a regular user to update their own profile', (done) => {
            chai.request(app)
                .put(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ nombre: 'Self Updated User' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    expect(res.body.message).to.equal('Usuario actualizado exitosamente');
                    done();
                });
        });

        it('should not allow a regular user to update another user\'s profile', (done) => {
            chai.request(app)
                .put(`/api/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ nombre: 'Attempted Update' })
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    expect(res.body).to.have.property('message').equal('No tienes permiso para realizar esta acción');
                    done();
                });
        });

        it('should return 404 if user to update not found', (done) => {
            chai.request(app)
                .put('/api/users/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nombre: 'Non Existent' })
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('Usuario no encontrado');
                    done();
                });
        });

        it('should not allow updating role to an invalid value', (done) => {
            chai.request(app)
                .put(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ rol: 'superadmin' })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('message').equal('Datos de entrada inválidos: El rol debe ser uno de: admin, cocinero, mesero.');
                    done();
                });
        });
    });

    describe('DELETE /api/users/:id', () => {
        it('should allow admin to delete a user', (done) => {
            chai.request(app)
                .delete(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(204);
                    expect(res.body).to.be.empty; // 204 No Content usually means an empty body
                    done();
                });
        });

        it('should not allow regular user to delete a user', (done) => {
            chai.request(app)
                .delete(`/api/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${regularToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    expect(res.body).to.have.property('message').equal('Acceso denegado: rol insuficiente');
                    done();
                });
        });

        it('should return 404 if user to delete not found', (done) => {
            chai.request(app)
                .delete('/api/users/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    expect(res.body).to.have.property('message').equal('No se encontró ningún documento con ese ID');
                    done();
                });
        });
    });
});
