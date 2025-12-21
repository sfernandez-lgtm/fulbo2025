const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Rangos de ranking para cada liga
const LIGA_RANGOS = {
  diamante: { min: 1200, max: Infinity },
  platino: { min: 1100, max: 1199 },
  oro: { min: 1000, max: 1099 },
  plata: { min: 900, max: 999 },
  bronce: { min: 0, max: 899 }
};

// Premios por liga (puntos bonus al final de temporada)
const PREMIOS_LIGA = {
  diamante: { bonus: 50, descripcion: 'Premio especial para el #1 + 50 pts bonus' },
  platino: { bonus: 50, descripcion: '+50 puntos bonus' },
  oro: { bonus: 30, descripcion: '+30 puntos bonus' },
  plata: { bonus: 20, descripcion: '+20 puntos bonus' },
  bronce: { bonus: 10, descripcion: '+10 puntos bonus' }
};

// Iconos de liga
const LIGA_ICONOS = {
  diamante: '💎',
  platino: '🔷',
  oro: '🥇',
  plata: '🥈',
  bronce: '🥉'
};

// Calcular liga según ranking
function calcularLiga(ranking) {
  if (ranking >= LIGA_RANGOS.diamante.min) return 'diamante';
  if (ranking >= LIGA_RANGOS.platino.min) return 'platino';
  if (ranking >= LIGA_RANGOS.oro.min) return 'oro';
  if (ranking >= LIGA_RANGOS.plata.min) return 'plata';
  return 'bronce';
}

// GET /api/leagues/current-season - Temporada activa
router.get('/current-season', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, nombre, fecha_inicio, fecha_fin, estado,
              (fecha_fin::date - CURRENT_DATE) as dias_restantes
       FROM temporadas
       WHERE estado = 'activa'
       ORDER BY fecha_inicio DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No hay temporada activa' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo temporada:', error);
    res.status(500).json({ error: 'Error al obtener temporada' });
  }
});

// GET /api/leagues/my-league - Mi liga actual
router.get('/my-league', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener ranking del usuario
    const userResult = await db.query(
      'SELECT id, nombre, COALESCE(ranking, 50) as ranking FROM usuarios WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = userResult.rows[0];
    const liga = calcularLiga(user.ranking);

    // Obtener temporada activa
    const temporadaResult = await db.query(
      `SELECT id, nombre, fecha_fin,
              (fecha_fin::date - CURRENT_DATE) as dias_restantes
       FROM temporadas WHERE estado = 'activa' LIMIT 1`
    );

    if (temporadaResult.rows.length === 0) {
      return res.json({
        liga,
        icono: LIGA_ICONOS[liga],
        ranking: user.ranking,
        premio: PREMIOS_LIGA[liga],
        rangos: LIGA_RANGOS[liga],
        temporada: null
      });
    }

    const temporada = temporadaResult.rows[0];

    // Buscar o crear registro en liga_jugadores
    let ligaJugador = await db.query(
      `SELECT * FROM liga_jugadores WHERE temporada_id = $1 AND jugador_id = $2`,
      [temporada.id, userId]
    );

    if (ligaJugador.rows.length === 0) {
      // Crear registro
      await db.query(
        `INSERT INTO liga_jugadores (temporada_id, jugador_id, liga, puntos_temporada)
         VALUES ($1, $2, $3, 0)`,
        [temporada.id, userId, liga]
      );
      ligaJugador = await db.query(
        `SELECT * FROM liga_jugadores WHERE temporada_id = $1 AND jugador_id = $2`,
        [temporada.id, userId]
      );
    } else {
      // Actualizar liga si cambió el ranking
      if (ligaJugador.rows[0].liga !== liga) {
        await db.query(
          `UPDATE liga_jugadores SET liga = $1 WHERE id = $2`,
          [liga, ligaJugador.rows[0].id]
        );
        ligaJugador.rows[0].liga = liga;
      }
    }

    // Calcular posición en la liga
    const posicionResult = await db.query(
      `SELECT COUNT(*) + 1 as posicion
       FROM liga_jugadores lj
       JOIN usuarios u ON lj.jugador_id = u.id
       WHERE lj.temporada_id = $1
         AND lj.liga = $2
         AND COALESCE(u.ranking, 50) > $3`,
      [temporada.id, liga, user.ranking]
    );

    // Contar total de jugadores en la liga
    const totalResult = await db.query(
      `SELECT COUNT(*) as total
       FROM liga_jugadores
       WHERE temporada_id = $1 AND liga = $2`,
      [temporada.id, liga]
    );

    res.json({
      liga,
      icono: LIGA_ICONOS[liga],
      ranking: user.ranking,
      puntos_temporada: ligaJugador.rows[0].puntos_temporada,
      partidos_temporada: ligaJugador.rows[0].partidos_temporada,
      victorias_temporada: ligaJugador.rows[0].victorias_temporada,
      posicion: parseInt(posicionResult.rows[0].posicion),
      total_jugadores: parseInt(totalResult.rows[0].total),
      premio: PREMIOS_LIGA[liga],
      rangos: LIGA_RANGOS[liga],
      temporada: {
        id: temporada.id,
        nombre: temporada.nombre,
        dias_restantes: temporada.dias_restantes
      }
    });
  } catch (error) {
    console.error('Error obteniendo mi liga:', error);
    res.status(500).json({ error: 'Error al obtener liga' });
  }
});

// GET /api/leagues/:liga/standings - Tabla de posiciones de una liga
router.get('/:liga/standings', async (req, res) => {
  try {
    const { liga } = req.params;

    // Validar liga
    if (!['bronce', 'plata', 'oro', 'platino', 'diamante'].includes(liga)) {
      return res.status(400).json({ error: 'Liga inválida' });
    }

    // Obtener temporada activa
    const temporadaResult = await db.query(
      'SELECT id FROM temporadas WHERE estado = $1 LIMIT 1',
      ['activa']
    );

    if (temporadaResult.rows.length === 0) {
      return res.json({ liga, standings: [] });
    }

    const temporadaId = temporadaResult.rows[0].id;

    // Obtener standings - ordenados por ranking (que determina posición real)
    const result = await db.query(
      `SELECT
        u.id,
        u.nombre,
        COALESCE(u.ranking, 50) as ranking,
        lj.puntos_temporada,
        lj.partidos_temporada,
        lj.victorias_temporada
       FROM liga_jugadores lj
       JOIN usuarios u ON lj.jugador_id = u.id
       WHERE lj.temporada_id = $1 AND lj.liga = $2
       ORDER BY COALESCE(u.ranking, 50) DESC
       LIMIT 20`,
      [temporadaId, liga]
    );

    // Agregar posición en la tabla
    const standings = result.rows.map((player, index) => ({
      ...player,
      posicion: index + 1
    }));

    res.json({
      liga,
      icono: LIGA_ICONOS[liga],
      rangos: LIGA_RANGOS[liga],
      premio: PREMIOS_LIGA[liga],
      standings
    });
  } catch (error) {
    console.error('Error obteniendo standings:', error);
    res.status(500).json({ error: 'Error al obtener standings' });
  }
});

// GET /api/leagues/top-diamond - Top 10 de diamante
router.get('/top-diamond', async (req, res) => {
  try {
    // Obtener temporada activa
    const temporadaResult = await db.query(
      'SELECT id, nombre FROM temporadas WHERE estado = $1 LIMIT 1',
      ['activa']
    );

    if (temporadaResult.rows.length === 0) {
      return res.json({ temporada: null, top: [] });
    }

    const temporada = temporadaResult.rows[0];

    // Top 10 de diamante
    const result = await db.query(
      `SELECT
        u.id,
        u.nombre,
        COALESCE(u.ranking, 50) as ranking,
        lj.puntos_temporada,
        lj.partidos_temporada,
        lj.victorias_temporada
       FROM liga_jugadores lj
       JOIN usuarios u ON lj.jugador_id = u.id
       WHERE lj.temporada_id = $1 AND lj.liga = 'diamante'
       ORDER BY COALESCE(u.ranking, 50) DESC
       LIMIT 10`,
      [temporada.id]
    );

    const top = result.rows.map((player, index) => ({
      ...player,
      posicion: index + 1
    }));

    res.json({
      temporada,
      premio: PREMIOS_LIGA.diamante,
      icono: LIGA_ICONOS.diamante,
      top
    });
  } catch (error) {
    console.error('Error obteniendo top diamante:', error);
    res.status(500).json({ error: 'Error al obtener top diamante' });
  }
});

// GET /api/leagues/info - Información general de todas las ligas
router.get('/info', async (req, res) => {
  try {
    const ligas = ['diamante', 'platino', 'oro', 'plata', 'bronce'].map(liga => ({
      nombre: liga,
      icono: LIGA_ICONOS[liga],
      rangos: LIGA_RANGOS[liga],
      premio: PREMIOS_LIGA[liga]
    }));

    res.json(ligas);
  } catch (error) {
    console.error('Error obteniendo info de ligas:', error);
    res.status(500).json({ error: 'Error al obtener info' });
  }
});

// Función exportada para actualizar puntos de temporada (se usa desde matches.js)
async function actualizarPuntosTemporada(jugadorId, puntosGanados, esVictoria) {
  try {
    // Obtener temporada activa
    const temporadaResult = await db.query(
      'SELECT id FROM temporadas WHERE estado = $1 LIMIT 1',
      ['activa']
    );

    if (temporadaResult.rows.length === 0) return;

    const temporadaId = temporadaResult.rows[0].id;

    // Obtener ranking actual del jugador para determinar liga
    const userResult = await db.query(
      'SELECT COALESCE(ranking, 50) as ranking FROM usuarios WHERE id = $1',
      [jugadorId]
    );

    if (userResult.rows.length === 0) return;

    const liga = calcularLiga(userResult.rows[0].ranking);

    // Buscar o crear registro
    const existeResult = await db.query(
      'SELECT id FROM liga_jugadores WHERE temporada_id = $1 AND jugador_id = $2',
      [temporadaId, jugadorId]
    );

    if (existeResult.rows.length === 0) {
      // Crear registro
      await db.query(
        `INSERT INTO liga_jugadores (temporada_id, jugador_id, liga, puntos_temporada, partidos_temporada, victorias_temporada)
         VALUES ($1, $2, $3, $4, 1, $5)`,
        [temporadaId, jugadorId, liga, puntosGanados, esVictoria ? 1 : 0]
      );
    } else {
      // Actualizar registro
      await db.query(
        `UPDATE liga_jugadores
         SET liga = $1,
             puntos_temporada = puntos_temporada + $2,
             partidos_temporada = partidos_temporada + 1,
             victorias_temporada = victorias_temporada + $3
         WHERE temporada_id = $4 AND jugador_id = $5`,
        [liga, puntosGanados, esVictoria ? 1 : 0, temporadaId, jugadorId]
      );
    }
  } catch (error) {
    console.error('Error actualizando puntos de temporada:', error);
  }
}

module.exports = router;
module.exports.actualizarPuntosTemporada = actualizarPuntosTemporada;
module.exports.calcularLiga = calcularLiga;
