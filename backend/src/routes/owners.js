const express = require('express');
const db = require('../config/db');
const { authMiddleware, isDueno } = require('../middleware/auth');

const router = express.Router();

// GET /api/owners/stats - Estadísticas del dueño
router.get('/stats', authMiddleware, isDueno, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Total recaudado (jugadores con pago confirmado * precio del partido)
    const totalRecaudadoResult = await db.query(
      `SELECT COALESCE(SUM(p.precio_por_jugador), 0) as total
       FROM partido_jugadores pj
       JOIN partidos p ON pj.partido_id = p.id
       WHERE p.organizador_id = $1
         AND pj.pago_confirmado = true`,
      [ownerId]
    );

    // Recaudado este mes
    const recaudadoMesResult = await db.query(
      `SELECT COALESCE(SUM(p.precio_por_jugador), 0) as total
       FROM partido_jugadores pj
       JOIN partidos p ON pj.partido_id = p.id
       WHERE p.organizador_id = $1
         AND pj.pago_confirmado = true
         AND EXTRACT(MONTH FROM p.fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM p.fecha) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [ownerId]
    );

    // Cantidad de partidos (total)
    const partidosTotalResult = await db.query(
      `SELECT COUNT(*) as total
       FROM partidos
       WHERE organizador_id = $1`,
      [ownerId]
    );

    // Cantidad de partidos este mes
    const partidosMesResult = await db.query(
      `SELECT COUNT(*) as total
       FROM partidos
       WHERE organizador_id = $1
         AND EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [ownerId]
    );

    // Jugadores únicos que participaron
    const jugadoresUnicosResult = await db.query(
      `SELECT COUNT(DISTINCT pj.jugador_id) as total
       FROM partido_jugadores pj
       JOIN partidos p ON pj.partido_id = p.id
       WHERE p.organizador_id = $1`,
      [ownerId]
    );

    // Partido con más recaudación
    const partidoTopResult = await db.query(
      `SELECT p.id, p.nombre, p.fecha, c.nombre as cancha_nombre,
              COUNT(pj.id) * p.precio_por_jugador as recaudacion,
              COUNT(pj.id) as jugadores_pagaron
       FROM partidos p
       JOIN canchas c ON p.cancha_id = c.id
       LEFT JOIN partido_jugadores pj ON p.id = pj.partido_id AND pj.pago_confirmado = true
       WHERE p.organizador_id = $1
       GROUP BY p.id, p.nombre, p.fecha, c.nombre, p.precio_por_jugador
       HAVING COUNT(pj.id) > 0
       ORDER BY recaudacion DESC
       LIMIT 1`,
      [ownerId]
    );

    // Promedio de jugadores por partido
    const promedioJugadoresResult = await db.query(
      `SELECT ROUND(AVG(jugadores)::numeric, 1) as promedio
       FROM (
         SELECT COUNT(pj.id) as jugadores
         FROM partidos p
         LEFT JOIN partido_jugadores pj ON p.id = pj.partido_id
         WHERE p.organizador_id = $1
         GROUP BY p.id
       ) subquery`,
      [ownerId]
    );

    // Total de jugadores que pagaron
    const jugadoresPagaronResult = await db.query(
      `SELECT COUNT(*) as total
       FROM partido_jugadores pj
       JOIN partidos p ON pj.partido_id = p.id
       WHERE p.organizador_id = $1
         AND pj.pago_confirmado = true`,
      [ownerId]
    );

    res.json({
      total_recaudado: parseInt(totalRecaudadoResult.rows[0].total) || 0,
      recaudado_mes: parseInt(recaudadoMesResult.rows[0].total) || 0,
      partidos_total: parseInt(partidosTotalResult.rows[0].total) || 0,
      partidos_mes: parseInt(partidosMesResult.rows[0].total) || 0,
      jugadores_unicos: parseInt(jugadoresUnicosResult.rows[0].total) || 0,
      jugadores_pagaron: parseInt(jugadoresPagaronResult.rows[0].total) || 0,
      promedio_jugadores: parseFloat(promedioJugadoresResult.rows[0].promedio) || 0,
      partido_top: partidoTopResult.rows[0] || null
    });
  } catch (error) {
    console.error('Error obteniendo stats del owner:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// GET /api/owners/stats/monthly - Ingresos mensuales (últimos 6 meses)
router.get('/stats/monthly', authMiddleware, isDueno, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Ingresos de los últimos 6 meses
    const result = await db.query(
      `SELECT
         TO_CHAR(p.fecha, 'Mon') as mes,
         EXTRACT(MONTH FROM p.fecha) as mes_num,
         EXTRACT(YEAR FROM p.fecha) as anio,
         COALESCE(SUM(p.precio_por_jugador), 0) as ingresos
       FROM partido_jugadores pj
       JOIN partidos p ON pj.partido_id = p.id
       WHERE p.organizador_id = $1
         AND pj.pago_confirmado = true
         AND p.fecha >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY TO_CHAR(p.fecha, 'Mon'), EXTRACT(MONTH FROM p.fecha), EXTRACT(YEAR FROM p.fecha)
       ORDER BY anio, mes_num`,
      [ownerId]
    );

    // Mapear meses en español
    const mesesEspanol = {
      'Jan': 'Ene', 'Feb': 'Feb', 'Mar': 'Mar', 'Apr': 'Abr',
      'May': 'May', 'Jun': 'Jun', 'Jul': 'Jul', 'Aug': 'Ago',
      'Sep': 'Sep', 'Oct': 'Oct', 'Nov': 'Nov', 'Dec': 'Dic'
    };

    // Generar los últimos 6 meses (incluyendo el actual)
    const meses = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mesNum = d.getMonth() + 1;
      const anio = d.getFullYear();
      const mesNombre = d.toLocaleString('es-AR', { month: 'short' });

      // Buscar si hay datos para este mes
      const data = result.rows.find(r =>
        parseInt(r.mes_num) === mesNum && parseInt(r.anio) === anio
      );

      meses.push({
        mes: mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1, 3),
        ingresos: data ? parseInt(data.ingresos) : 0
      });
    }

    res.json(meses);
  } catch (error) {
    console.error('Error obteniendo stats mensuales:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas mensuales' });
  }
});

module.exports = router;
