const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/rankings - Obtener ranking global de jugadores
router.get('/', async (req, res) => {
  try {
    // Top 50 jugadores ordenados por ranking
    const result = await db.query(
      `SELECT
        id,
        nombre,
        posicion,
        COALESCE(ranking, 50) as ranking,
        COALESCE(partidos_jugados, 0) as partidos_jugados,
        COALESCE(partidos_ganados, 0) as partidos_ganados
       FROM usuarios
       WHERE tipo = 'jugador'
       ORDER BY COALESCE(ranking, 50) DESC, COALESCE(partidos_ganados, 0) DESC
       LIMIT 50`
    );

    // Agregar posición en el ranking
    const rankings = result.rows.map((player, index) => ({
      posicion_ranking: index + 1,
      ...player,
      porcentaje_victorias: player.partidos_jugados > 0
        ? Math.round((player.partidos_ganados / player.partidos_jugados) * 100)
        : 0
    }));

    res.json(rankings);
  } catch (error) {
    console.error('Error obteniendo rankings:', error);
    res.status(500).json({ error: 'Error al obtener rankings' });
  }
});

// GET /api/rankings/me - Obtener posición del usuario actual en el ranking
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener datos del usuario
    const userResult = await db.query(
      `SELECT
        id,
        nombre,
        posicion,
        COALESCE(ranking, 50) as ranking,
        COALESCE(partidos_jugados, 0) as partidos_jugados,
        COALESCE(partidos_ganados, 0) as partidos_ganados
       FROM usuarios
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = userResult.rows[0];

    // Calcular posición en el ranking (cuántos tienen más ranking)
    const positionResult = await db.query(
      `SELECT COUNT(*) as mejor_que_yo
       FROM usuarios
       WHERE tipo = 'jugador'
         AND COALESCE(ranking, 50) > $1`,
      [user.ranking]
    );

    const posicion_ranking = parseInt(positionResult.rows[0].mejor_que_yo) + 1;

    res.json({
      posicion_ranking,
      ...user,
      porcentaje_victorias: user.partidos_jugados > 0
        ? Math.round((user.partidos_ganados / user.partidos_jugados) * 100)
        : 0
    });
  } catch (error) {
    console.error('Error obteniendo mi ranking:', error);
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
});

module.exports = router;
