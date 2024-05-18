const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { loginUser } = require('../api/controllers/authController');
/**
 * @swagger
 * tags:
 *   name: Login
 *   description: Endpoints relacionados con el login
 */
// Ruta para iniciar sesión (pública)
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Inicia sesión con las credenciales proporcionadas y devuelve un token de sesión.
 *     tags: [Login]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               correoElectronico:
 *                 type: string
 *               contraseña:
 *                 type: string
 *             required:
 *               - correoElectronico
 *               - contraseña
 *     responses:
 *       200:
 *         description: Sesión iniciada correctamente
 *       400:
 *         description: Credenciales inválidas o usuario sin rol asignado
 *       500:
 *         description: Error del servidor
 */
router.post('/login', loginUser);


module.exports = router;
