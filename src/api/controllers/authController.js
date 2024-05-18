require('dotenv').config();

const { JWT_SECRET} = process.env;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sanitize = require('sanitize-html');
const { validationResult } = require('express-validator');
const db = require('../../config/db');

/**
 * @swagger
 * tags:
 *   name: Autenticación Usuario
 *   description: Endpoints relacionados con la autenticación de usuarios
 */

// Controlador para registrar un nuevo usuario
/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     description: Crea un nuevo usuario en el sistema.
 *     tags: [Usuarios rutas]
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

exports.registerUser = async (req, res) => {
    // Validación de los datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, correoElectronico, contraseña } = req.body;

    try {
        // Verificar si el usuario ya existe
        let usuario = await db.query('SELECT * FROM Usuarios WHERE CorreoElectronico = $1', [correoElectronico]);
        if (usuario.length > 0) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(contraseña, salt);

        // Crear el nuevo usuario
        const insertQuery = `
            INSERT INTO Usuarios (Nombre, CorreoElectronico, Contraseña)
            VALUES ($1, $2, $3)
            RETURNING UsuarioID;
        `;
        const values = [nombre, correoElectronico, hashedPassword];
        usuario = await db.query(insertQuery, values);

        // Generar y devolver el token de sesión
        const token = generateToken(usuario.UsuarioID);
        res.status(201).json({ token });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Controlador para iniciar sesión
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Inicia sesión con las credenciales proporcionadas y devuelve un token de sesión.
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
exports.loginUser = async (req, res) => {
    // Validación de los datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { correoElectronico, contraseña } = req.body;

    try {
        // Desinfectar la entrada de correo electrónico para prevenir la inyección de código malicioso
        const sanitizedEmail = sanitize(correoElectronico);

        // Verificar si el usuario existe
        console.log('Correo electrónico:', sanitizedEmail); // Agrega este registro
        const usuarioResult = await db.query('SELECT * FROM Usuarios WHERE CorreoElectronico = $1', [sanitizedEmail]);
        console.log('Correo electrónico:', sanitizedEmail);
        

        if (!usuarioResult || !usuarioResult.length || !usuarioResult[0]) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        const usuario = usuarioResult[0];

        // Verificar si la contraseña del usuario está definida
        if (!usuario.contraseña) {
            return res.status(400).json({ message: 'La contraseña del usuario no está definida' });
        }
        console.log('Contrasena:', contraseña); 
        console.log('Contrasena:', usuario.contraseña); 
        // Verificar la contraseña
        const isMatch = bcrypt.compare(contraseña,usuario.contraseña);
        console.log('Contrasena:', isMatch);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        // Obtener el rol del usuario
        const roleIdResult = await db.query('SELECT RolID FROM AsignacionesRolesUsuarios WHERE UsuarioID = $1', [usuario.usuarioid]);
        if (!roleIdResult || !roleIdResult.length || !roleIdResult[0]) {
            return res.status(400).json({ message: 'El usuario no tiene un rol asignado' });
        }

        const roleId = roleIdResult[0];

        const roleResult = await db.query('SELECT NombreRol FROM Roles WHERE RolID = $1', [roleId.rolid]);
        if (!roleResult || !roleResult.length || !roleResult[0]) {
            return res.status(400).json({ message: 'No se pudo obtener el rol del usuario' });
        }

        const role = roleResult[0];
        console.log('Rol:', role.nombrerol); 

        req.user = {
            id: usuario.usuarioid,
            role: role.nombrerol
        };
        // Generar y devolver el token de sesión con el rol del usuario
        const token = generateToken(usuario.usuarioid, role.nombrerol);
        res.json({ token });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Función para generar el token de sesión con el rol del usuario
function generateToken(usuarioID, userRole) {
    console.log('Valor de JWT_SECRET en el primer archivo:', JWT_SECRET);
    return jwt.sign({ usuarioID, userRole },JWT_SECRET, { expiresIn: '8h' });
}



// Controlador para obtener todos los usuarios
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     description: Obtiene una lista de todos los usuarios registrados en el sistema.
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida correctamente
 *       500:
 *         description: Error del servidor
 */
exports.getAllUsers = async (req, res) => {
    try {
        const users = await db.query('SELECT * FROM Usuarios');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error al obtener todos los usuarios:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};


// Controlador para mostrar un usuario por su correo electrónico
/**
 * @swagger
 * /user/{correoElectronico}:
 *   get:
 *     summary: Obtener usuario por correo electrónico
 *     description: Obtiene la información de un usuario registrado en el sistema por su dirección de correo electrónico.
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
exports.getUserByEmail = async (req, res) => {
    const { correoElectronico } = req.params;

    try {
        // Buscar el usuario por su correo electrónico
        const usuario = await db.query('SELECT * FROM Usuarios WHERE CorreoElectronico = $1', [correoElectronico]);
        if (!usuario || !usuario[0]) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json(usuario[0]);
    } catch (error) {
        console.error('Error al obtener el usuario por correo electrónico:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};


// Controlador para actualizar la información de un usuario
/**
 * @swagger
 * /users/{usuarioID}:
 *   put:
 *     summary: Actualizar información de usuario
 *     description: Actualiza la información de un usuario existente en el sistema.
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
exports.updateUser = async (req, res) => {
    const { usuarioID } = req.params;
    const { nombre, correoElectronico } = req.body;

    try {
        // Verificar si el usuario existe
        const usuario = await db.query('SELECT * FROM Usuarios WHERE UsuarioID = $1', [usuarioID]);
        if (usuario.length === 0) {
            return res.status(404).json({ message: 'El usuario no existe' });
        }

        // Actualizar la información del usuario
        await db.query('UPDATE Usuarios SET Nombre = $1, CorreoElectronico = $2 WHERE UsuarioID = $3', [nombre, correoElectronico, usuarioID]);

        res.status(200).json({ message: 'Información del usuario actualizada correctamente' });
    } catch (error) {
        console.error('Error al actualizar la información del usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Controlador para eliminar un usuario
exports.deleteUser = async (req, res) => {
    const { usuarioID } = req.params;

    try {
        // Verificar si el usuario existe
        const usuario = await db.query('SELECT * FROM Usuarios WHERE UsuarioID = $1', [usuarioID]);
        if (usuario.length === 0) {
            return res.status(404).json({ message: 'El usuario no existe' });
        }

        // Eliminar el usuario
        await db.query('DELETE FROM Usuarios WHERE UsuarioID = $1', [usuarioID]);

        res.status(200).json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar el usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};
