import "reflect-metadata";
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import documentsRoutes from './src/routes/documentsRoutes';
import login from './src/routes/login';
import roles from './src/routes/roles';
import users from './src/routes/users';

const app = express();
const port = 3000;

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
