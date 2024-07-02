require('dotenv').config();
const { JWT_SECRET } = process.env;
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  console.log('Valor de JWT_SECRET en el primer archivo:', JWT_SECRET);
  jwt.verify(token, JWT_SECRET, (err, user) => {  
    if (err) {
      if (err.name === 'JsonWebTokenError') {
        console.error('Token inválido:', err);
        return res.status(403).json({ message: 'Token inválido' });
      } else if (err.name === 'TokenExpiredError') {
        console.error('Token expirado:', err);
        return res.status(403).json({ message: 'Token expirado' });
      } else {
        console.error('Error al verificar el token:', err);
        return res.status(500).json({ message: 'Error del servidor' });
      }
    }
    req.user = user;
    console.log('Usuario:', req.user);
    next();
  });
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.error('Usuario no autenticado');
      return res.status(403).json({ message: 'No tienes permiso para acceder a este recurso' });
    }

    console.log('Roles permitidos:', roles);
    console.log('Rol del usuario:', req.user.userRole);

    // Verificar si el usuario tiene uno de los roles necesarios
    if (!roles.includes(req.user.userRole)) {
      console.error('Rol no autorizado:', req.user.userRole);
      return res.status(403).json({ message: 'No tienes permiso para acceder a este recurso' });
    }
    
    next();
  };
};

const authorizePermission = (permission) => {
  return (req, res, next) => {
    // Verificar si el usuario tiene el permiso necesario
    if (!req.user || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ message: 'No tienes permiso para acceder a este recurso' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole,
  authorizePermission
};
