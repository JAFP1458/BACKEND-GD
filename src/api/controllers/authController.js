require('dotenv').config();

const { JWT_SECRET} = process.env;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sanitize = require('sanitize-html');
const { validationResult } = require('express-validator');
const db = require('../../config/db');


// Controlador para registrar un nuevo usuario y asignar un rol
exports.registerUser = async (req, res) => {
    // Validación de los datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, correoElectronico, contraseña, rolID } = req.body;

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
        const result = await db.query(insertQuery, values);

        const usuarioID = result[0].usuarioid;

        // Asignar el rol al usuario
        const assignRoleQuery = `
            INSERT INTO AsignacionesRolesUsuarios (UsuarioID, RolID)
            VALUES ($1, $2);
        `;
        await db.query(assignRoleQuery, [usuarioID, rolID]);

        // Generar y devolver el token de sesión
        const token = generateToken(usuarioID);
        res.status(201).json({ usuarioID, token });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Controlador para iniciar sesión

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
        const isMatch = await bcrypt.compare(contraseña, usuario.contraseña); 
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
    return jwt.sign({ usuarioID, userRole }, JWT_SECRET, { expiresIn: '8h' });
}


exports.getAllUsers = async (req, res) => {
    try {
        const users = await db.query('SELECT * FROM Usuarios');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error al obtener todos los usuarios:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};


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



exports.updateUser = async (req, res) => {
  const { usuarioID } = req.params;
  const { nombre, correoElectronico, contraseña, rolID } = req.body;

  try {
    // Verificar si el usuario existe
    const usuario = await db.query('SELECT * FROM Usuarios WHERE UsuarioID = $1', [usuarioID]);
    if (usuario.length === 0) {
      return res.status(404).json({ message: 'El usuario no existe' });
    }

    // Preparar la consulta de actualización
    let updateQuery = 'UPDATE Usuarios SET Nombre = $1, CorreoElectronico = $2';
    const values = [nombre, correoElectronico];

    // Si se proporciona una nueva contraseña, encriptarla y actualizarla
    if (contraseña) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(contraseña, salt);
      updateQuery += ', Contraseña = $3';
      values.push(hashedPassword);
    }

    updateQuery += ' WHERE UsuarioID = $' + (values.length + 1);
    values.push(usuarioID);

    // Actualizar la información del usuario
    await db.query(updateQuery, values);

    // Verificar y actualizar el rol del usuario si ha cambiado
    if (rolID) {
      const currentRole = await db.query('SELECT RolID FROM AsignacionesRolesUsuarios WHERE UsuarioID = $1', [usuarioID]);
      if (currentRole.length === 0 || currentRole[0].rolid !== rolID) {
        await db.query('DELETE FROM AsignacionesRolesUsuarios WHERE UsuarioID = $1', [usuarioID]);
        await db.query('INSERT INTO AsignacionesRolesUsuarios (UsuarioID, RolID) VALUES ($1, $2)', [usuarioID, rolID]);
      }
    }

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


exports.getUserDetails = async (req, res) => {
  const { usuarioID } = req.params;

  try {
    // Obtener los detalles del usuario
    const usuarioResult = await db.query('SELECT * FROM Usuarios WHERE UsuarioID = $1', [usuarioID]);
    if (usuarioResult.length === 0) {
      return res.status(404).json({ message: 'El usuario no existe' });
    }

    const usuario = usuarioResult[0];

    // Obtener el rol del usuario
    const rolResult = await db.query('SELECT RolID FROM AsignacionesRolesUsuarios WHERE UsuarioID = $1', [usuarioID]);
    const rolID = rolResult.length > 0 ? rolResult[0].rolid : null;

    res.status(200).json({ ...usuario, rolid: rolID });
  } catch (error) {
    console.error('Error al obtener los detalles del usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

