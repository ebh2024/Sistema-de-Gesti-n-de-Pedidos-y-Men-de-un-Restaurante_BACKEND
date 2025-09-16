const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { User } = require('../models');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const register = async (req, res) => {
    try {
        const { nombre, correo, contraseña, rol } = req.body;

        // Validar datos
        if (!nombre || !correo || !contraseña || !rol) {
            return res.status(400).json({ message: 'Todos los campos son requeridos' });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ where: { correo } });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        // Crear usuario
        const user = await User.create({
            nombre,
            correo,
            contraseña: hashedPassword,
            rol
        });

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            userId: user.id
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const login = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;

        if (!correo || !contraseña) {
            return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
        }

        // Buscar usuario
        const user = await User.findOne({
            where: {
                correo,
                is_active: 1
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Generar token JWT
        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                correo: user.correo,
                rol: user.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { correo } = req.body;

        if (!correo) {
            return res.status(400).json({ message: 'Correo es requerido' });
        }

        // Verificar si el usuario existe
        const user = await User.findOne({
            where: {
                correo,
                is_active: 1
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Generar token de reset
        const resetToken = jwt.sign(
            { id: user.id, correo: user.correo },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        // Enviar email (simulado por ahora)
        console.log(`Reset token para ${user.correo}: ${resetToken}`);

        res.json({ message: 'Instrucciones de reset enviadas al correo' });
    } catch (error) {
        console.error('Error en forgot password:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, nuevaContraseña } = req.body;

        if (!token || !nuevaContraseña) {
            return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Hash de la nueva contraseña
        const hashedPassword = await bcrypt.hash(nuevaContraseña, 10);

        // Actualizar contraseña
        await User.update(
            { contraseña: hashedPassword },
            { where: { id: decoded.id } }
        );

        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('Error en reset password:', error);
        res.status(500).json({ message: 'Token inválido o expirado' });
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword
};
