const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Token mal formado' });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token mal formado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para verificar si es dueño
const isDueno = (req, res, next) => {
  if (req.user.tipo !== 'dueno') {
    return res.status(403).json({ error: 'Acceso solo para dueños de cancha' });
  }
  next();
};

// Middleware para verificar si es jugador
const isJugador = (req, res, next) => {
  if (req.user.tipo !== 'jugador') {
    return res.status(403).json({ error: 'Acceso solo para jugadores' });
  }
  next();
};

module.exports = { authMiddleware, isDueno, isJugador };
