const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); // Importar morgan
require('dotenv').config();

// Importar modelos para establecer asociaciones
require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// Importar el logger
const logger = require('./utils/logger');

// Middleware
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar Morgan para registrar solicitudes HTTP
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rutas
const authRoutes = require('./routes/auth');
const dishRoutes = require('./routes/dishes');
const tableRoutes = require('./routes/tables');
const orderRoutes = require('./routes/orders');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middlewares/errorHandler');

app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({ message: 'API funcionando correctamente', timestamp: new Date().toISOString() });
});

/**
 * Manejo de errores para rutas no definidas
 * Nota: En Express 5, usar '*' como ruta genera error en path-to-regexp.
 * Usamos app.use sin ruta para capturar cualquier request no manejado.
 */
app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Middleware global de manejo de errores
app.use(globalErrorHandler);

// Iniciar servidor
app.listen(PORT, () => {
    logger.info(`Servidor corriendo en el puerto ${PORT}`);
    logger.info(`API Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
