const db = require('../../config/db');

// Controlador para asignar un rol a un usuario
exports.assignUserRole = async (req, res) => {
    // Validación de los datos de entrada (ejemplo)
    const { usuarioID, rolID } = req.body;
    if (!usuarioID || !rolID) {
        return res.status(400).json({ message: 'Se requiere un usuario y un rol para asignar' });
    }

    try {
        // Verificar si el usuario existe
        const userExists = await db.query('SELECT * FROM Usuarios WHERE UsuarioID = $1', [usuarioID]);
        if (userExists.length === 0) {
            return res.status(404).json({ message: 'El usuario no existe' });
        }

        // Verificar si el rol existe
        const roleExists = await db.query('SELECT * FROM Roles WHERE RolID = $1', [rolID]);
        if (roleExists.length === 0) {
            return res.status(404).json({ message: 'El rol no existe' });
        }

        // Verificar si la asignación de rol ya existe
        const assignmentExists = await db.query('SELECT * FROM AsignacionesRolesUsuarios WHERE UsuarioID = $1 AND RolID = $2', [usuarioID, rolID]);
        if (assignmentExists.length > 0) {
            return res.status(400).json({ message: 'El usuario ya tiene asignado este rol' });
        }

        // Realizar la asignación de rol
        await db.query('INSERT INTO AsignacionesRolesUsuarios (UsuarioID, RolID) VALUES ($1, $2)', [usuarioID, rolID]);

        res.status(200).json({ message: 'Rol asignado correctamente al usuario' });
    } catch (error) {
        console.error('Error al asignar rol a usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Controlador para crear un nuevo rol
exports.createRole = async (req, res) => {
    const { nombreRol } = req.body;
    if (!nombreRol) {
        return res.status(400).json({ message: 'Se requiere el nombre del rol' });
    }

    try {
        // Verificar si el rol ya existe
        const roleExists = await db.query('SELECT * FROM Roles WHERE NombreRol = $1', [nombreRol]);
        if (roleExists.length > 0) {
            return res.status(400).json({ message: 'El rol ya existe' });
        }

        // Crear el nuevo rol
        await db.query('INSERT INTO Roles (NombreRol) VALUES ($1)', [nombreRol]);

        res.status(201).json({ message: 'Rol creado correctamente' });
    } catch (error) {
        console.error('Error al crear el rol:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Controlador para eliminar un rol
exports.deleteRole = async (req, res) => {
    const { rolID } = req.params;

    try {
        // Verificar si el rol existe
        const roleExists = await db.query('SELECT * FROM Roles WHERE RolID = $1', [rolID]);
        if (roleExists.length === 0) {
            return res.status(404).json({ message: 'El rol no existe' });
        }

        // Eliminar el rol
        await db.query('DELETE FROM Roles WHERE RolID = $1', [rolID]);

        res.status(200).json({ message: 'Rol eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar el rol:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};
