const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../api/middleware/authMiddleware');
const { registerUser, getAllUsers, updateUser, deleteUser,getUserByEmail, getUserDetails } = require('../api/controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Usuarios 
 *   description: Endpoints relacionados con la gestión de usuarios
 */

// Middleware para validar el rol del usuario
const authorizeGestor = authorizeRole("Gestor");

// Ruta para registrar un nuevo usuario
/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     description: Crea un nuevo usuario en el sistema.
 *     tags: [Usuarios ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               correoElectronico:
 *                 type: string
 *               contraseña:
 *                 type: string
 *             required:
 *               - nombre
 *               - correoElectronico
 *               - contraseña
 *     responses:
 *       201:
 *         description: Usuario registrado correctamente
 *       400:
 *         description: Error de validación o usuario ya existente
 *       500:
 *         description: Error del servidor
 */
router.post('/register', [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('correoElectronico').isEmail().withMessage('El correo electrónico no es válido'),
    body('contraseña').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rolID').notEmpty().withMessage('Se requiere el rol')
], registerUser);


// Rutas protegidas para los gestores
router.use(authenticateToken, authorizeGestor);

// Ruta para obtener todos los usuarios
/**
 * @swagger
 * /:
 *   get:
 *     summary: Obtener todos los usuarios
 *     description: Obtiene una lista de todos los usuarios registrados en el sistema.
 *     tags: [Usuarios ]
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida correctamente
 *       500:
 *         description: Error del servidor
 */
router.get('/', getAllUsers);

router.get('/:correoElectronico', getUserByEmail);


// Ruta para actualizar la información de un usuario
/**
 * @swagger
 * /{usuarioID}:
 *   put:
 *     summary: Actualizar información de usuario
 *     description: Actualiza la información de un usuario existente en el sistema.
 *     tags: [Usuarios ]
 *     parameters:
 *       - in: path
 *         name: usuarioID
 *         required: true
 *         description: ID del usuario a actualizar
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               correoElectronico:
 *                 type: string
 *             required:
 *               - nombre
 *               - correoElectronico
 *     responses:
 *       200:
 *         description: Información de usuario actualizada correctamente
 *       400:
 *         description: Error de validación o usuario no encontrado
 *       500:
 *         description: Error del servidor
 *   delete:
 *     summary: Eliminar usuario
 *     description: Elimina un usuario existente en el sistema.
 *     tags: [Usuarios ]
 *     parameters:
 *       - in: path
 *         name: usuarioID
 *         required: true
 *         description: ID del usuario a eliminar
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario eliminado correctamente
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */

// Ruta para obtener los detalles del usuario
router.get('/details/:usuarioID', getUserDetails);

// Ruta para actualizar la información del usuario y su rol
router.put('/:usuarioID', [
  body('nombre').optional().notEmpty().withMessage('El nombre es obligatorio'),
  body('correoElectronico').optional().isEmail().withMessage('El correo electrónico no es válido'),
  body('contraseña').optional().isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('rolID').optional().isInt().withMessage('El rolID debe ser un número entero')
], updateUser);
// Controlador para mostrar un usuario por su correo electrónico
/**
 * @swagger
 * /user/{correoElectronico}:
 *   get:
 *     summary: Obtener usuario por correo electrónico
 *     description: Obtiene la información de un usuario registrado en el sistema por su dirección de correo electrónico.
 *     tags: [Usuarios ]
 *     parameters:
 *       - in: path
 *         name: correoElectronico
 *         required: true
 *         description: Dirección de correo electrónico del usuario a buscar
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario encontrado correctamente
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */

// Ruta para eliminar un usuario
router.delete('/:usuarioID', deleteUser);

module.exports = router;
