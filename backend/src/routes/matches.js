const express = require('express');
const db = require('../config/db');
const { authMiddleware, isDueno, isJugador } = require('../middleware/auth');

const router = express.Router();

// GET /api/matches - Listar partidos disponibles
router.get('/', async (req, res) => {
  try {
    const { fecha, zona } = req.query;

    let query = `
      SELECT p.*, c.nombre as cancha_nombre, c.direccion, c.zona,
             (SELECT COUNT(*) FROM partido_jugadores WHERE partido_id = p.id) as jugadores_anotados
      FROM partidos p
      JOIN canchas c ON p.cancha_id = c.id
      WHERE p.fecha >= NOW()
    `;
    const params = [];

    if (fecha) {
      params.push(fecha);
      query += ` AND DATE(p.fecha) = $${params.length}`;
    }

    if (zona) {
      params.push(zona);
      query += ` AND c.zona = $${params.length}`;
    }

    query += ' ORDER BY p.fecha ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando partidos:', error);
    res.status(500).json({ error: 'Error al listar partidos' });
  }
});

// GET /api/matches/:id - Detalle de un partido
router.get('/:id', async (req, res) => {
  try {
    const partidoResult = await db.query(
      `SELECT p.*, c.nombre as cancha_nombre, c.direccion, c.zona, c.precio_hora,
              u.nombre as organizador_nombre
       FROM partidos p
       JOIN canchas c ON p.cancha_id = c.id
       JOIN usuarios u ON p.organizador_id = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (partidoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    // Obtener jugadores anotados
    const jugadoresResult = await db.query(
      `SELECT u.id, u.nombre, u.posicion
       FROM partido_jugadores pj
       JOIN usuarios u ON pj.jugador_id = u.id
       WHERE pj.partido_id = $1`,
      [req.params.id]
    );

    res.json({
      ...partidoResult.rows[0],
      jugadores: jugadoresResult.rows
    });
  } catch (error) {
    console.error('Error obteniendo partido:', error);
    res.status(500).json({ error: 'Error al obtener partido' });
  }
});

// POST /api/matches/:id/join - Unirse a un partido
router.post('/:id/join', authMiddleware, isJugador, async (req, res) => {
  try {
    const partidoId = req.params.id;
    const jugadorId = req.user.id;

    // Verificar que el partido existe y tiene cupo
    const partido = await db.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM partido_jugadores WHERE partido_id = p.id) as jugadores_anotados
       FROM partidos p WHERE p.id = $1`,
      [partidoId]
    );

    if (partido.rows.length === 0) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    if (partido.rows[0].jugadores_anotados >= partido.rows[0].max_jugadores) {
      return res.status(400).json({ error: 'El partido está completo' });
    }

    // Verificar que no esté ya anotado
    const yaAnotado = await db.query(
      'SELECT id FROM partido_jugadores WHERE partido_id = $1 AND jugador_id = $2',
      [partidoId, jugadorId]
    );

    if (yaAnotado.rows.length > 0) {
      return res.status(400).json({ error: 'Ya estás anotado en este partido' });
    }

    // Anotar jugador
    await db.query(
      'INSERT INTO partido_jugadores (partido_id, jugador_id, created_at) VALUES ($1, $2, NOW())',
      [partidoId, jugadorId]
    );

    res.json({ message: 'Te anotaste al partido exitosamente' });
  } catch (error) {
    console.error('Error anotando jugador:', error);
    res.status(500).json({ error: 'Error al anotarse al partido' });
  }
});

// POST /api/matches/:id/leave - Salir de un partido
router.post('/:id/leave', authMiddleware, isJugador, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM partido_jugadores WHERE partido_id = $1 AND jugador_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No estás anotado en este partido' });
    }

    res.json({ message: 'Saliste del partido exitosamente' });
  } catch (error) {
    console.error('Error saliendo del partido:', error);
    res.status(500).json({ error: 'Error al salir del partido' });
  }
});

// POST /api/matches - Crear partido (solo dueños)
router.post('/', authMiddleware, isDueno, async (req, res) => {
  try {
    const { cancha_id, fecha, hora_inicio, hora_fin, max_jugadores, precio_por_jugador, descripcion } = req.body;

    // Verificar que la cancha pertenece al dueño
    const cancha = await db.query(
      'SELECT id FROM canchas WHERE id = $1 AND dueno_id = $2',
      [cancha_id, req.user.id]
    );

    if (cancha.rows.length === 0) {
      return res.status(403).json({ error: 'No tenés permiso para crear partidos en esta cancha' });
    }

    const result = await db.query(
      `INSERT INTO partidos (cancha_id, organizador_id, fecha, hora_inicio, hora_fin, max_jugadores, precio_por_jugador, descripcion, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [cancha_id, req.user.id, fecha, hora_inicio, hora_fin, max_jugadores || 14, precio_por_jugador, descripcion]
    );

    res.status(201).json({
      message: 'Partido creado exitosamente',
      partido: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando partido:', error);
    res.status(500).json({ error: 'Error al crear partido' });
  }
});

// DELETE /api/matches/:id - Cancelar partido (solo dueños)
router.delete('/:id', authMiddleware, isDueno, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM partidos WHERE id = $1 AND organizador_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partido no encontrado o no tenés permiso' });
    }

    res.json({ message: 'Partido cancelado exitosamente' });
  } catch (error) {
    console.error('Error cancelando partido:', error);
    res.status(500).json({ error: 'Error al cancelar partido' });
  }
});

module.exports = router;
