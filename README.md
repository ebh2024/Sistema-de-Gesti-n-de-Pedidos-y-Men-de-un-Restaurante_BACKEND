# Restaurant Management System - Backend API

Backend API para el sistema de gestión de pedidos y menú de un restaurante, desarrollado con Node.js, Express y MySQL.

## Características

- ✅ Autenticación JWT con roles (admin, cocinero, mesero)
- ✅ Gestión completa de usuarios
- ✅ CRUD de platos con control de disponibilidad
- ✅ Gestión de mesas
- ✅ Sistema de pedidos con detalles
- ✅ Control de acceso basado en roles
- ✅ API RESTful completa
- ✅ Manejo de errores y validaciones
- ✅ Registro (Logging) robusto con Winston y Morgan

## Tecnologías Utilizadas

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Sequelize** - ORM para Node.js
- **MySQL2** - Cliente MySQL para Node.js
- **JWT** - Autenticación basada en tokens
- **bcryptjs** - Hash de contraseñas
- **nodemailer** - Envío de emails
- **CORS** - Manejo de cross-origin requests
- **Winston** - Librería de logging para Node.js
- **Morgan** - Middleware de logging HTTP para Express.js

## Instalación y Configuración

### Prerrequisitos

- Node.js (v14 o superior)
- MySQL Server
- Base de datos MySQL creada

### Instalación

1. **Clonar el repositorio y navegar al directorio backend:**
   ```bash
   cd backend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar la base de datos:**
   - Crear la base de datos MySQL usando el archivo `database_schema.sql`
   - Actualizar las variables de entorno en `.env`
   - **Nota:** El proyecto ahora usa Sequelize ORM. Asegúrate de que las credenciales de MySQL sean correctas en el archivo `.env`

4. **Configurar variables de entorno:**
   Editar el archivo `.env` con tus configuraciones:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=tu_usuario_mysql
   DB_PASSWORD=tu_contraseña_mysql
   DB_NAME=restaurant_management

   # JWT Configuration
   JWT_SECRET=tu_clave_secreta_jwt_muy_segura

   # Email Configuration
   EMAIL_USER=tu-email@gmail.com
   EMAIL_PASS=tu-app-password

   # Server Configuration
   PORT=3000
   ```

5. **Iniciar el servidor:**
   ```bash
   # Modo desarrollo (con nodemon)
   npm run dev

   # Modo producción
   npm start
   ```

El servidor se ejecutará en `http://localhost:3000`

## Estructura del Proyecto

```
backend/
├── config/
│   └── database.js          # Configuración de conexión a MySQL
├── controllers/
│   ├── authController.js    # Controlador de autenticación
│   ├── dishController.js    # Controlador de platos
│   ├── tableController.js   # Controlador de mesas
│   └── orderController.js   # Controlador de pedidos
├── middlewares/
│   └── auth.js              # Middleware de autenticación y roles
├── routes/
│   ├── auth.js              # Rutas de autenticación
│   ├── dishes.js            # Rutas de platos
│   ├── tables.js            # Rutas de mesas
│   └── orders.js            # Rutas de pedidos
├── .env                     # Variables de entorno
├── package.json             # Dependencias y scripts
├── server.js                # Archivo principal del servidor
└── README.md               # Este archivo
```

## API Endpoints

### Autenticación

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | Registrar nuevo usuario | Público |
| POST | `/api/auth/login` | Iniciar sesión | Público |
| POST | `/api/auth/forgot-password` | Solicitar reset de contraseña | Público |
| POST | `/api/auth/reset-password` | Resetear contraseña | Público |

### Platos (Dishes)

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|---------|
| GET | `/api/dishes` | Obtener todos los platos | Autenticado |
| GET | `/api/dishes/:id` | Obtener plato por ID | Autenticado |
| POST | `/api/dishes` | Crear nuevo plato | Admin |
| PUT | `/api/dishes/:id` | Actualizar plato | Admin |
| DELETE | `/api/dishes/:id` | Eliminar plato | Admin |

### Mesas (Tables)

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|---------|
| GET | `/api/tables` | Obtener todas las mesas | Autenticado |
| GET | `/api/tables/:id` | Obtener mesa por ID | Autenticado |
| POST | `/api/tables` | Crear nueva mesa | Admin |
| PUT | `/api/tables/:id` | Actualizar mesa | Admin |
| DELETE | `/api/tables/:id` | Eliminar mesa | Admin |

### Pedidos (Orders)

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|---------|
| GET | `/api/orders` | Obtener todos los pedidos | Autenticado* |
| GET | `/api/orders/:id` | Obtener pedido por ID | Autenticado* |
| POST | `/api/orders` | Crear nuevo pedido | Mesero/Admin |
| PUT | `/api/orders/:id/status` | Actualizar estado del pedido | Mesero/Admin/Cocinero |
| DELETE | `/api/orders/:id` | Eliminar pedido | Admin |

*Los meseros solo pueden ver/editar sus propios pedidos

### Utilidades

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|---------|
| GET | `/api/health` | Verificar estado del servidor | Público |

## Roles y Permisos

### Admin
- ✅ Gestionar usuarios
- ✅ Gestionar platos (CRUD completo)
- ✅ Gestionar mesas (CRUD completo)
- ✅ Gestionar pedidos (CRUD completo)

### Cocinero
- ✅ Ver todos los pedidos
- ✅ Actualizar estado de pedidos
- ✅ Ver platos

### Mesero
- ✅ Ver sus propios pedidos
- ✅ Crear nuevos pedidos
- ✅ Actualizar estado de sus pedidos
- ✅ Ver platos y mesas

## Ejemplos de Uso

### Registro de Usuario
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "correo": "juan@example.com",
    "contraseña": "password123",
    "rol": "mesero"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "juan@example.com",
    "contraseña": "password123"
  }'
```

### Crear Plato (Requiere token de admin)
```bash
curl -X POST http://localhost:3000/api/dishes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "nombre": "Pizza Margherita",
    "descripcion": "Pizza clásica con tomate y mozzarella",
    "precio": 15.99,
    "disponibilidad": true
  }'
```

### Crear Pedido (Requiere token de mesero/admin)
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "id_mesa": 1,
    "detalles": [
      {
        "id_plato": 1,
        "cantidad": 2
      },
      {
        "id_plato": 3,
        "cantidad": 1
      }
    ]
  }'
```

## Estados de Pedidos

- `pendiente` - Pedido recién creado
- `en preparación` - El cocinero está preparando el pedido
- `servido` - Pedido completado y mesa liberada

## Manejo de Errores

La API devuelve errores en formato JSON con los siguientes códigos:

- `400` - Datos inválidos o faltantes
- `401` - Token faltante o inválido
- `403` - Acceso denegado (rol insuficiente)
- `404` - Recurso no encontrado
- `500` - Error interno del servidor

Ejemplo de respuesta de error:
```json
{
  "message": "Acceso denegado: rol insuficiente"
}
```

## Registro (Logging)

El sistema de backend ahora incorpora un robusto sistema de registro (logging) utilizando **Winston** para logs a nivel de aplicación y **Morgan** para logs de solicitudes HTTP.

- **Winston**: Configurado para capturar logs en diferentes niveles (info, warn, error) y enviarlos a:
    - **Consola**: Para visibilidad inmediata durante el desarrollo.
    - **Archivos**: `combined.log` para todos los logs y `error.log` para logs de nivel `error` y superiores, facilitando la auditoría y depuración en entornos de producción.
- **Morgan**: Integrado para registrar automáticamente todas las solicitudes HTTP entrantes, proporcionando detalles como el método, la URL, el estado de la respuesta y el tiempo de respuesta.

Este sistema mejora significativamente la capacidad de monitorear el comportamiento de la aplicación, diagnosticar problemas y asegurar la trazabilidad de eventos importantes.

## Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Tokens JWT con expiración
- ✅ Validación de roles en cada endpoint
- ✅ Protección contra inyección SQL con consultas preparadas
- ✅ Variables de entorno para configuración sensible

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.
