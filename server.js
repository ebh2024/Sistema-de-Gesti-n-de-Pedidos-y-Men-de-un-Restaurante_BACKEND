const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const helmet = require('helmet');
const YAML = require('yamljs');
require('dotenv').config(); // Cargar .env por defecto primero

// Asegurar que NODE_ENV esté configurado, por defecto 'development'
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Si está en entorno de prueba, cargar .env.test y sobrescribir
if (process.env.NODE_ENV === 'test') {
    require('dotenv').config({ path: '.env.test', override: true });
}

// Verificación de la variable de entorno JWT_SECRET
if (!process.env.JWT_SECRET) {
    const errorMessage = 'FATAL ERROR: JWT_SECRET no está definido.';
    if (process.env.NODE_ENV === 'production') {
        logger.error(errorMessage + ' La aplicación no puede ejecutarse en producción sin un secreto JWT.');
        process.exit(1); // Salir de la aplicación en producción
    } else {
        logger.warn(errorMessage + ' Se utilizará un valor por defecto para desarrollo/pruebas.');
        // Opcional: Asignar un valor por defecto para desarrollo si es absolutamente necesario
        process.env.JWT_SECRET = 'supersecretdevkey';
    }
}

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Importar el logger para el registro de eventos
const logger = require('./utils/logger');
// Importar la clase de error personalizada
const AppError = require('./utils/AppError');
// Importar el middleware global de manejo de errores
const globalErrorHandler = require('./middlewares/errorHandler');

// Importar los modelos para que Sequelize los registre
require('./models');

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

// Usar Helmet para establecer cabeceras de seguridad HTTP
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'La política CORS para este sitio no permite el acceso desde el Origen especificado.';
            return callback(new AppError(msg, 403), false);
        }
        return callback(null, true);
    },
    credentials: true // Permitir el envío de cookies de origen cruzado
}));

app.use(express.json()); // Middleware para parsear el cuerpo de las solicitudes en formato JSON
app.use(express.urlencoded({ extended: true })); // Middleware para parsear el cuerpo de las solicitudes en formato URL-encoded

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // Configurar Morgan para registrar solicitudes HTTP

const authRoutes = require('./routes/auth'); // Importar rutas de la API
const dishRoutes = require('./routes/dishes');
const tableRoutes = require('./routes/tables');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes); // Definir las rutas base para cada módulo de la API
app.use('/api/dishes', dishRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

const swaggerDocument = YAML.load('./docs/swagger.yaml'); // Cargar el archivo de definición de Swagger

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // Servir la documentación de Swagger UI

app.get('/api/health', (req, res) => {
    res.json({ message: 'API funcionando correctamente', timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
    next(new AppError(`No se puede encontrar ${req.originalUrl} en este servidor!`, 404));
}); // Middleware para manejar rutas no definidas (404 Not Found).

app.use(globalErrorHandler); // Middleware global de manejo de errores. Debe ser el último middleware.

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        logger.info(`Servidor corriendo en el puerto ${PORT}`);
        logger.info(`API Health check disponible en: http://localhost:${PORT}/api/health`);
    });
} // Iniciar el servidor Express.

module.exports = app;
