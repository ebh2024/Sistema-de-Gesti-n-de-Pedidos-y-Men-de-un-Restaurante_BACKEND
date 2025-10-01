const nodemailer = require('nodemailer');
const logger = require('./logger');
require('dotenv').config();

/**
 * Configuración del transportador de correo para el envío de emails.
 * Utiliza el servicio de Gmail y las credenciales definidas en las variables de entorno.
 */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Envía un correo electrónico utilizando el transportador configurado.
 * @param {object} mailOptions - Opciones del correo electrónico (from, to, subject, html/text).
 */
const sendEmail = async (mailOptions) => {
    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Correo enviado a: ${mailOptions.to} con asunto: ${mailOptions.subject}`);
    } catch (error) {
        logger.error(`Error al enviar correo a ${mailOptions.to}: ${error.message}`, { stack: error.stack });
        throw new Error('No se pudo enviar el correo electrónico.');
    }
};

module.exports = {
    sendEmail
};
