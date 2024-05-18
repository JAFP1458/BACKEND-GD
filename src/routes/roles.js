const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../api/middleware/authMiddleware');
const { assignUserRole, createRole, deleteRole } = require('../api/controllers/rolController');



// Middleware para validar el rol del usuario
const authorizeGestor = authorizeRole('Gestor');

// Rutas protegidas para los gestores
router.use(authenticateToken, authorizeGestor);

// Ruta para asignar un rol a un usuario

router.post('/assign-role', [
    body('usuarioID').notEmpty().withMessage('Se requiere un ID de usuario'),
    body('rolID').notEmpty().withMessage('Se requiere un ID de rol')
], assignUserRole);

// Ruta para crear un nuevo rol

router.post('/create-role', [
    body('nombreRol').notEmpty().withMessage('Se requiere el nombre del rol')
], createRole);

// Ruta para eliminar un rol

router.delete('/delete-role/:rolID', [
    param('rolID').notEmpty().withMessage('Se requiere un ID de rol')
], deleteRole);


/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Endpoints relacionados con la gestión de roles de usuario
 */

/**
 * @swagger
 * /assign-role:
 *   post:
 *     summary: Asignar un rol a un usuario
 *     description: Asigna un rol específico a un usuario existente en el sistema.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuarioID:
 *                 type: string
 *               rolID:
 *                 type: string
 *             required:
 *               - usuarioID
 *               - rolID
 *     responses:
 *       200:
 *         description: Rol asignado correctamente al usuario
 *       400:
 *         description: Error de validación o usuario/rol no encontrado o usuario ya tiene asignado el rol
 *       404:
 *         description: El usuario no existe
 *       500:
 *         description: Error del servidor
 */

/**
 * @swagger
 * /create-role:
 *   post:
 *     summary: Crear un nuevo rol
 *     description: Crea un nuevo rol en el sistema.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombreRol:
 *                 type: string
 *             required:
 *               - nombreRol
 *     responses:
 *       201:
 *         description: Rol creado correctamente
 *       400:
 *         description: Error de validación o rol ya existente
 *       500:
 *         description: Error del servidor
 */

/**
 * @swagger
 * /delete-role/{rolID}:
 *   delete:
 *     summary: Eliminar un rol
 *     description: Elimina un rol existente en el sistema.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rolID
 *         required: true
 *         description: ID del rol a eliminar
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rol eliminado correctamente
 *       404:
 *         description: El rol no existe
 *       500:
 *         description: Error del servidor
 */

module.exports = router;
