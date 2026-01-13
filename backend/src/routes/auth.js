const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { generarCodigo, enviarCodigoVerificacion } = require('../services/email');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, tipo, posicion, telefono } = req.body;

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

    // Generar código de verificación
    const codigo = generarCodigo();
    const codigoExpira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Insertar usuario (NO verificado)
    const result = await db.query(
      `INSERT INTO usuarios (nombre, email, password, tipo, posicion, telefono, verificado, codigo_verificacion, codigo_expira, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $8, NOW())
       RETURNING id, nombre, email, tipo, posicion, telefono`,
      [nombre, email, hashedPassword, tipo, tipo === 'jugador' ? posicion : null, telefono || null, codigo, codigoExpira]
    );

    const user = result.rows[0];

    // Enviar email con código
    const emailResult = await enviarCodigoVerificacion(email, nombre, codigo);

    if (!emailResult.success) {
      console.error('Error enviando email de verificación:', emailResult.error);
      // No fallamos el registro, pero lo logueamos
    }

    res.status(201).json({
      message: 'Usuario registrado. Verificá tu email con el código enviado.',
      user,
      requiresVerification: true
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// POST /api/auth/verificar-codigo
router.post('/verificar-codigo', async (req, res) => {
  try {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
      return res.status(400).json({ error: 'Email y código son requeridos' });
    }

    // Buscar usuario
    const result = await db.query(
      'SELECT id, nombre, email, tipo, posicion, codigo_verificacion, codigo_expira, verificado FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    // Verificar si ya está verificado
    if (user.verificado) {
      return res.status(400).json({ error: 'La cuenta ya está verificada' });
    }

    // Verificar código
    if (user.codigo_verificacion !== codigo) {
      return res.status(400).json({ error: 'Código incorrecto' });
    }

    // Verificar expiración
    if (new Date() > new Date(user.codigo_expira)) {
      return res.status(400).json({ error: 'El código expiró. Solicitá uno nuevo.' });
    }

    // Marcar como verificado
    await db.query(
      'UPDATE usuarios SET verificado = TRUE, codigo_verificacion = NULL, codigo_expira = NULL WHERE id = $1',
      [user.id]
    );

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Cuenta verificada exitosamente',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        tipo: user.tipo,
        posicion: user.posicion
      }
    });
  } catch (error) {
    console.error('Error verificando código:', error);
    res.status(500).json({ error: 'Error al verificar código' });
  }
});

// POST /api/auth/reenviar-codigo
router.post('/reenviar-codigo', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    // Buscar usuario
    const result = await db.query(
      'SELECT id, nombre, email, verificado FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    // Verificar si ya está verificado
    if (user.verificado) {
      return res.status(400).json({ error: 'La cuenta ya está verificada' });
    }

    // Generar nuevo código
    const codigo = generarCodigo();
    const codigoExpira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Actualizar código
    await db.query(
      'UPDATE usuarios SET codigo_verificacion = $1, codigo_expira = $2 WHERE id = $3',
      [codigo, codigoExpira, user.id]
    );

    // Enviar email
    const emailResult = await enviarCodigoVerificacion(email, user.nombre, codigo);

    if (!emailResult.success) {
      return res.status(500).json({ error: 'Error enviando email' });
    }

    res.json({ message: 'Código reenviado exitosamente' });
  } catch (error) {
    console.error('Error reenviando código:', error);
    res.status(500).json({ error: 'Error al reenviar código' });
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
      'SELECT id, nombre, email, password, tipo, posicion, verificado FROM usuarios WHERE email = $1',
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

    // Verificar que la cuenta esté verificada
    if (!user.verificado) {
      return res.status(403).json({
        error: 'Cuenta no verificada. Revisá tu email.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // No enviar la contraseña en la respuesta
    delete user.password;
    delete user.verificado;

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
