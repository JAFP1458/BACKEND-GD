const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  authenticateToken,
  authorizeRole
} = require('../api/middleware/authMiddleware');
const {
  registerUser,
  getAllUsers,
  updateUser,
  deleteUser,
  getUserByEmail,
  updateUserStatus,
  getUserDetails
} = require('../api/controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Endpoints relacionados con la gestión de usuarios
 */

// Middleware para inspeccionar req.user
const inspectUser = (req, res, next) => {
  console.log('Usuario autenticado:', req.user);
  next();
};

// Ruta para registrar un nuevo usuario
/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     description: Crea un nuevo usuario en el sistema.
 *     tags: [Usuarios]
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
router.post(
  '/register',
  authenticateToken,
  authorizeRole("Gestor"),
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('correoElectronico').isEmail().withMessage('El correo electrónico no es válido'),
    body('contraseña').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rolID').notEmpty().withMessage('Se requiere el rol')
  ],
  registerUser
);

// Ruta para obtener todos los usuarios
/**
 * @swagger
 * /:
 *   get:
 *     summary: Obtener todos los usuarios
 *     description: Obtiene una lista de todos los usuarios registrados en el sistema.
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida correctamente
 *       500:
 *         description: Error del servidor
 */
router.get(
  '/',
  authenticateToken,
  inspectUser,
  authorizeRole(["Operador", "Gestor", "Visualizador"]),
  getAllUsers
);

// Ruta para obtener un usuario por correo electrónico
/**
 * @swagger
 * /user/{correoElectronico}:
 *   get:
 *     summary: Obtener usuario por correo electrónico
 *     description: Obtiene la información de un usuario registrado en el sistema por su dirección de correo electrónico.
 *     tags: [Usuarios]
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
router.get(
  '/:correoElectronico',
  authenticateToken,
  inspectUser,
  authorizeRole(["Operador", "Gestor", "Visualizador"]),
  getUserByEmail
);

// Ruta para obtener los detalles del usuario
router.get(
  '/details/:usuarioID',
  authenticateToken,
  inspectUser,
  authorizeRole(["Operador", "Gestor", "Visualizador"]),
  getUserDetails
);

// Ruta para actualizar la información de un usuario
/**
 * @swagger
 * /{usuarioID}:
 *   put:
 *     summary: Actualizar información de usuario
 *     description: Actualiza la información de un usuario existente en el sistema.
 *     tags: [Usuarios]
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
 */
router.put(
  '/:usuarioID',
  authenticateToken,
  authorizeRole("Gestor"),
  [
    body('nombre').optional().notEmpty().withMessage('El nombre es obligatorio'),
    body('correoElectronico').optional().isEmail().withMessage('El correo electrónico no es válido'),
    body('contraseña').optional().isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('rolID').optional().isInt().withMessage('El rolID debe ser un número entero')
  ],
  updateUser
);

// Ruta para eliminar un usuario
/**
 * @swagger
 * /{usuarioID}:
 *   delete:
 *     summary: Eliminar usuario
 *     description: Elimina un usuario existente en el sistema.
 *     tags: [Usuarios]
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
router.delete(
  '/:usuarioID',
  authenticateToken,
  authorizeRole("Gestor"),
  deleteUser
);

router.put(
  '/:usuarioID/status',
  authenticateToken,
  authorizeRole("Gestor"),
  updateUserStatus
);



module.exports = router;
