require('reflect-metadata');
const express = require('express');
const cors = require('cors'); // Importa el middleware de cors
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const http = require('http');
const { Server } = require('socket.io');
const documentsRoutes = require('./src/routes/documentsRoutes.js');
const login = require('./src/routes/login.js');
const roles = require('./src/routes/roles.js');
const users = require('./src/routes/users.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Permitir el acceso desde tu frontend
    methods: ["GET", "POST"],
  },
});

const port = 5000;

// Middleware para habilitar CORS
app.use(cors()); // Agrega esta línea

// Middleware para analizar solicitudes con cuerpo en formato JSON
app.use(express.json());

// Middleware para analizar solicitudes con cuerpo en formato URL-encoded
app.use(express.urlencoded({ extended: true }));

const options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Documentación de API',
      version: '1.0.0',
      description: 'Descripción de la API',
    },
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/documents', documentsRoutes);
app.use('/', login);
app.use('/roles', roles);
app.use('/users', users);

// Configuración de Socket.io
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join', (userId) => {
    socket.join(userId); // Unirse a una sala específica para el usuario
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  // Aquí puedes emitir notificaciones o manejar otros eventos
  // Ejemplo: emitir una notificación cuando se comparte un documento
  socket.on('shareDocument', (data) => {
    io.emit('notification', { title: 'Nuevo documento compartido', ...data });
  });
});

async function iniciarServidor() {
  try {
    server.listen(port, () => {
      console.log(`Servidor ejecutándose en http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
  }
}

iniciarServidor();
