require('reflect-metadata');
const express = require('express');
const cors = require('cors');  // Importa el middleware de cors
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const documentsRoutes = require('./src/routes/documentsRoutes.js');
const login = require('./src/routes/login.js');
const roles = require('./src/routes/roles.js');
const users = require('./src/routes/users.js');

const app = express();
const port = 5000;

// Middleware para habilitar CORS
app.use(cors());  // Agrega esta línea

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

app.use('/documents', documentsRoutes);

app.use('/', login);

app.use('/roles', roles);

app.use('/users', users);

async function iniciarServidor() {
  try {
    app.listen(port, () => {
      console.log(`Servidor ejecutándose en http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
  }
}

iniciarServidor();
