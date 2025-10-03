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

describe('API de Usuarios', () => {
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

    describe('Modelo de Usuario', () => {
        it('debería hashear la contraseña antes de guardar', async () => {
            const user = await User.create({
                nombre: 'Test Hash',
                correo: 'hash@example.com',
                contraseña: 'plainpassword',
                rol: 'mesero'
            });
            expect(user.contraseña).to.not.equal('plainpassword');
            expect(bcrypt.compareSync('plainpassword', user.contraseña)).to.be.true;
        });

        it('no debería permitir correos electrónicos duplicados', async () => {
            try {
                await User.create({
                    nombre: 'Duplicate User',
                    correo: 'admin@example.com',
                    contraseña: 'duplicatepassword',
                    rol: 'mesero'
                });
                expect.fail('No debería haber creado un usuario con correo electrónico duplicado');
            } catch (error) {
                expect(error.name).to.equal('SequelizeUniqueConstraintError');
            }
        });

        it('no debería permitir roles inválidos', async () => {
            try {
                await User.create({
                    nombre: 'Invalid Role',
                    correo: 'invalidrole@example.com',
                    contraseña: 'password',
                    rol: 'invalid'
                });
                expect.fail('No debería haber creado un usuario con un rol inválido');
            } catch (error) {
            expect(error.name).to.equal('SequelizeDatabaseError');
            }
        });
    });

    describe('GET /api/users', () => {
        it('debería permitir al administrador obtener todos los usuarios', (done) => {
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

        it('no debería permitir a un usuario regular obtener todos los usuarios', (done) => {
            chai.request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${regularToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    expect(res.body).to.have.property('message').equal('Acceso denegado: rol insuficiente');
                    done();
                });
        });

        it('debería devolver 401 si no se proporciona token', (done) => {
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
        it('debería permitir al administrador obtener un usuario por ID', (done) => {
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

        it('debería permitir a un usuario regular obtener su propio perfil', (done) => {
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

        it('no debería permitir a un usuario regular obtener el perfil de otro usuario', (done) => {
            chai.request(app)
                .get(`/api/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${regularToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    expect(res.body).to.have.property('message').equal('No tienes permiso para realizar esta acción');
                    done();
                });
        });

        it('debería devolver 404 si el usuario no se encuentra', (done) => {
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
        it('debería permitir al administrador actualizar un usuario', (done) => {
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

        it('debería permitir a un usuario regular actualizar su propio perfil', (done) => {
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

        it('no debería permitir a un usuario regular actualizar el perfil de otro usuario', (done) => {
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

        it('debería devolver 404 si el usuario a actualizar no se encuentra', (done) => {
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

        it('no debería permitir actualizar el rol a un valor inválido', (done) => {
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
        it('debería permitir al administrador eliminar un usuario', (done) => {
            chai.request(app)
                .delete(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(204);
                    expect(res.body).to.be.empty;
                    done();
                });
        });

        it('no debería permitir a un usuario regular eliminar un usuario', (done) => {
            chai.request(app)
                .delete(`/api/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${regularToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    expect(res.body).to.have.property('message').equal('Acceso denegado: rol insuficiente');
                    done();
                });
        });

        it('debería devolver 404 si el usuario a eliminar no se encuentra', (done) => {
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
