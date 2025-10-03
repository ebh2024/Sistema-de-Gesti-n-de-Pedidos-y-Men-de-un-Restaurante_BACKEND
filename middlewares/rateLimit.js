const rateLimit = require('express-rate-limit');

// Basic rate limiter for general requests
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita cada IP a 100 solicitudes por ventana de tiempo
  message: 'Demasiadas solicitudes desde esta IP, por favor intente de nuevo después de 15 minutos',
});

// Limitador de tasa más estricto para rutas relacionadas con la autenticación (ej. login, registro)
const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // Limita cada IP a 5 intentos de autenticación por hora
  message: 'Demasiados intentos de autenticación desde esta IP, por favor intente de nuevo después de una hora',
  handler: (req, res, _next) => {
    res.status(429).json({
      status: 'fallo',
      message: 'Demasiados intentos de autenticación, por favor intente de nuevo después de una hora',
    });
  },
});

module.exports = {
  generalRateLimiter,
  authRateLimiter,
};
