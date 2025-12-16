const express = require('express');
const db = require('../config/db');
const { authMiddleware, isJugador } = require('../middleware/auth');

const router = express.Router();

// GET /api/players/profile - Obtener perfil del jugador autenticado
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, nombre, email, tipo, posicion, partidos_jugados, goles, asistencias, created_at
       FROM usuarios WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// PUT /api/players/profile - Actualizar perfil del jugador
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nombre, posicion } = req.body;
    const userId = req.user.id;

    const result = await db.query(
      `UPDATE usuarios
       SET nombre = COALESCE($1, nombre),
           posicion = COALESCE($2, posicion),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, nombre, email, tipo, posicion`,
      [nombre, posicion, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      message: 'Perfil actualizado',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// GET /api/players/ranking - Obtener ranking de jugadores
router.get('/ranking', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, nombre, posicion, partidos_jugados, goles, asistencias
       FROM usuarios
       WHERE tipo = 'jugador' AND partidos_jugados > 0
       ORDER BY goles DESC, asistencias DESC
       LIMIT 50`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo ranking:', error);
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
});

// GET /api/players/:id - Obtener perfil de un jugador específico
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, nombre, posicion, partidos_jugados, goles, asistencias, created_at
       FROM usuarios
       WHERE id = $1 AND tipo = 'jugador'`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo jugador:', error);
    res.status(500).json({ error: 'Error al obtener jugador' });
  }
});

module.exports = router;
