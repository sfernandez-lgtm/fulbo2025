const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, tipo, posicion } = req.body;

    // Validaciones
    if (!nombre || !email || !password || !tipo) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (!['jugador', 'dueno'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de usuario inválido' });
    }

    // Verificar si el email ya existe
    const existingUser = await db.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario
    const result = await db.query(
      `INSERT INTO usuarios (nombre, email, password, tipo, posicion, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, nombre, email, tipo, posicion`,
      [nombre, email, hashedPassword, tipo, tipo === 'jugador' ? posicion : null]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario
    const result = await db.query(
      'SELECT id, nombre, email, password, tipo, posicion FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // No enviar la contraseña en la respuesta
    delete user.password;

    res.json({
      message: 'Login exitoso',
      token,
      user
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

module.exports = router;
