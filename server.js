const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config(); // Load default .env first

// Ensure NODE_ENV is set, default to 'development'
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// If in test environment, load .env.test and override
if (process.env.NODE_ENV === 'test') {
    require('dotenv').config({ path: '.env.test', override: true });
}

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Importar modelos y establecer asociaciones de la base de datos
// Solo importar y sincronizar modelos si no estamos en el entorno de prueba
if (process.env.NODE_ENV !== 'test') {
    require('./models');
}

// Importar el logger para el registro de eventos
const logger = require('./utils/logger');
// Importar la clase de error personalizada
const AppError = require('./utils/AppError');
// Importar el middleware global de manejo de errores
const globalErrorHandler = require('./middlewares/errorHandler');

/**
 * Configuración de rate limiting global para la API.
 * Limita el número de solicitudes por IP para proteger contra ataques de denegación de servicio.
 */
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 solicitudes por IP dentro de la ventana de tiempo
    message: 'Demasiadas solicitudes desde esta IP, por favor intente de nuevo después de 15 minutos'
});
if (process.env.NODE_ENV !== 'test') {
    app.use(limiter); // Aplicar el rate limiting a todas las solicitudes
}

/**
 * Configuración de CORS (Cross-Origin Resource Sharing).
 * Permite o deniega solicitudes de diferentes orígenes basándose en la variable de entorno CORS_ORIGIN.
 */
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];

app.use(cors({
    origin: (origin, callback) => {
        // Permitir solicitudes sin origen (ej. aplicaciones móviles, solicitudes curl)
        if (!origin) return callback(null, true);
        // Verificar si el origen de la solicitud está en la lista de orígenes permitidos
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'La política CORS para este sitio no permite el acceso desde el Origen especificado.';
            return callback(new AppError(msg, 403), false);
        }
        return callback(null, true);
    },
    credentials: true // Permitir el envío de cookies de origen cruzado
}));

// Middleware para parsear el cuerpo de las solicitudes en formato JSON
app.use(express.json());
// Middleware para parsear el cuerpo de las solicitudes en formato URL-encoded
app.use(express.urlencoded({ extended: true }));

/**
 * Configurar Morgan para registrar solicitudes HTTP.
 * Utiliza el formato 'combined' y envía los logs al logger personalizado.
 */
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Importar rutas de la API
const authRoutes = require('./routes/auth');
const dishRoutes = require('./routes/dishes');
const tableRoutes = require('./routes/tables');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

// Definir las rutas base para cada módulo de la API
app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verifica el estado de salud de la API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: La API está funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: API funcionando correctamente
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-09-23T10:00:00.000Z
 */
app.get('/api/health', (req, res) => {
    res.json({ message: 'API funcionando correctamente', timestamp: new Date().toISOString() });
});

/**
 * Middleware para manejar rutas no definidas (404 Not Found).
 * Captura cualquier solicitud que no haya sido manejada por las rutas anteriores.
 */
app.use((req, res, next) => {
    next(new AppError(`No se puede encontrar ${req.originalUrl} en este servidor!`, 404));
});

// Middleware global de manejo de errores. Debe ser el último middleware.
app.use(globalErrorHandler);

/**
 * Iniciar el servidor Express.
 * Escucha en el puerto definido y registra un mensaje en la consola.
 */
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        logger.info(`Servidor corriendo en el puerto ${PORT}`);
        logger.info(`API Health check disponible en: http://localhost:${PORT}/api/health`);
    });
}

module.exports = app;
