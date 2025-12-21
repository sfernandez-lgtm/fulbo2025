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

// GET /api/players/matches - Obtener partidos del jugador (pasados y futuros)
router.get('/matches', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        p.id,
        p.fecha,
        p.hora_inicio,
        p.hora_fin,
        p.max_jugadores,
        p.precio_por_jugador,
        p.descripcion,
        c.nombre as cancha_nombre,
        c.direccion,
        c.zona,
        pj.created_at as fecha_inscripcion,
        CASE
          WHEN p.fecha < NOW() THEN 'pasado'
          ELSE 'futuro'
        END as estado,
        (SELECT COUNT(*) FROM partido_jugadores WHERE partido_id = p.id) as jugadores_anotados
       FROM partido_jugadores pj
       JOIN partidos p ON pj.partido_id = p.id
       JOIN canchas c ON p.cancha_id = c.id
       WHERE pj.jugador_id = $1
       ORDER BY p.fecha ASC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo partidos del jugador:', error);
    res.status(500).json({ error: 'Error al obtener partidos' });
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

// GET /api/players/:id - Obtener perfil público de un jugador específico
router.get('/:id', async (req, res) => {
  try {
    const playerId = req.params.id;

    // Obtener datos del jugador
    const result = await db.query(
      `SELECT id, nombre, posicion,
              COALESCE(ranking, 50) as ranking,
              COALESCE(partidos_jugados, 0) as partidos_jugados,
              COALESCE(partidos_ganados, 0) as partidos_ganados,
              created_at
       FROM usuarios
       WHERE id = $1 AND tipo = 'jugador'`,
      [playerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    const player = result.rows[0];

    // Calcular porcentaje de victorias
    player.porcentaje_victorias = player.partidos_jugados > 0
      ? Math.round((player.partidos_ganados / player.partidos_jugados) * 100)
      : 0;

    // Obtener últimos 5 partidos jugados
    const matchesResult = await db.query(
      `SELECT
        p.id,
        p.fecha,
        p.resultado_local,
        p.resultado_visitante,
        c.nombre as cancha_nombre,
        c.zona,
        pj.equipo,
        CASE
          WHEN p.resultado_local IS NULL THEN 'pendiente'
          WHEN p.resultado_local = p.resultado_visitante THEN 'empate'
          WHEN (pj.equipo = 'local' AND p.resultado_local > p.resultado_visitante)
            OR (pj.equipo = 'visitante' AND p.resultado_visitante > p.resultado_local) THEN 'victoria'
          ELSE 'derrota'
        END as resultado
       FROM partido_jugadores pj
       JOIN partidos p ON pj.partido_id = p.id
       JOIN canchas c ON p.cancha_id = c.id
       WHERE pj.jugador_id = $1 AND p.estado = 'jugado'
       ORDER BY p.fecha DESC
       LIMIT 5`,
      [playerId]
    );

    player.ultimos_partidos = matchesResult.rows;

    res.json(player);
  } catch (error) {
    console.error('Error obteniendo jugador:', error);
    res.status(500).json({ error: 'Error al obtener jugador' });
  }
});

module.exports = router;
