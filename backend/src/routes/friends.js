const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/friends - Lista de amigos del usuario actual
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener amigos (donde la amistad está aceptada, en cualquier dirección)
    const result = await db.query(
      `SELECT
        a.id as amistad_id,
        u.id, u.nombre, u.posicion, u.ranking, u.partidos_jugados, u.partidos_ganados,
        a.created_at as amigos_desde
       FROM amistades a
       JOIN usuarios u ON (
         CASE
           WHEN a.usuario_id = $1 THEN u.id = a.amigo_id
           ELSE u.id = a.usuario_id
         END
       )
       WHERE (a.usuario_id = $1 OR a.amigo_id = $1)
         AND a.estado = 'aceptada'
       ORDER BY u.nombre ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo amigos:', error);
    res.status(500).json({ error: 'Error al obtener amigos' });
  }
});

// GET /api/friends/pending - Solicitudes pendientes recibidas
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Solicitudes donde soy el destinatario (amigo_id)
    const result = await db.query(
      `SELECT
        a.id as amistad_id,
        u.id, u.nombre, u.posicion, u.ranking,
        a.created_at as enviada_el
       FROM amistades a
       JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.amigo_id = $1 AND a.estado = 'pendiente'
       ORDER BY a.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// GET /api/friends/sent - Solicitudes enviadas por mí (pendientes)
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT
        a.id as amistad_id,
        u.id, u.nombre, u.posicion, u.ranking,
        a.created_at as enviada_el
       FROM amistades a
       JOIN usuarios u ON u.id = a.amigo_id
       WHERE a.usuario_id = $1 AND a.estado = 'pendiente'
       ORDER BY a.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo solicitudes enviadas:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes enviadas' });
  }
});

// POST /api/friends/request/:userId - Enviar solicitud de amistad
router.post('/request/:userId', authMiddleware, async (req, res) => {
  try {
    const fromUserId = req.user.id;
    const toUserId = parseInt(req.params.userId);

    // No puedes agregarte a ti mismo
    if (fromUserId === toUserId) {
      return res.status(400).json({ error: 'No podés agregarte a vos mismo' });
    }

    // Verificar que el usuario destino existe y es jugador
    const targetUser = await db.query(
      'SELECT id, nombre, tipo FROM usuarios WHERE id = $1',
      [toUserId]
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si ya existe una amistad o solicitud
    const existingFriendship = await db.query(
      `SELECT id, estado FROM amistades
       WHERE (usuario_id = $1 AND amigo_id = $2)
          OR (usuario_id = $2 AND amigo_id = $1)`,
      [fromUserId, toUserId]
    );

    if (existingFriendship.rows.length > 0) {
      const estado = existingFriendship.rows[0].estado;
      if (estado === 'aceptada') {
        return res.status(400).json({ error: 'Ya son amigos' });
      } else {
        return res.status(400).json({ error: 'Ya existe una solicitud pendiente' });
      }
    }

    // Crear solicitud de amistad
    const result = await db.query(
      `INSERT INTO amistades (usuario_id, amigo_id, estado, created_at)
       VALUES ($1, $2, 'pendiente', NOW())
       RETURNING id`,
      [fromUserId, toUserId]
    );

    res.json({
      message: `Solicitud de amistad enviada a ${targetUser.rows[0].nombre}`,
      amistad_id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error enviando solicitud:', error);
    res.status(500).json({ error: 'Error al enviar solicitud' });
  }
});

// PUT /api/friends/accept/:friendshipId - Aceptar solicitud
router.put('/accept/:friendshipId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendshipId = parseInt(req.params.friendshipId);

    // Verificar que la solicitud existe y es para mí
    const friendship = await db.query(
      `SELECT a.*, u.nombre as solicitante_nombre
       FROM amistades a
       JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.id = $1 AND a.amigo_id = $2 AND a.estado = 'pendiente'`,
      [friendshipId, userId]
    );

    if (friendship.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });
    }

    // Aceptar la solicitud
    await db.query(
      "UPDATE amistades SET estado = 'aceptada' WHERE id = $1",
      [friendshipId]
    );

    res.json({
      message: `Ahora sos amigo de ${friendship.rows[0].solicitante_nombre}`
    });
  } catch (error) {
    console.error('Error aceptando solicitud:', error);
    res.status(500).json({ error: 'Error al aceptar solicitud' });
  }
});

// DELETE /api/friends/:friendshipId - Rechazar solicitud o eliminar amigo
router.delete('/:friendshipId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendshipId = parseInt(req.params.friendshipId);

    // Verificar que la amistad existe y me involucra
    const friendship = await db.query(
      `SELECT * FROM amistades
       WHERE id = $1 AND (usuario_id = $2 OR amigo_id = $2)`,
      [friendshipId, userId]
    );

    if (friendship.rows.length === 0) {
      return res.status(404).json({ error: 'Amistad no encontrada' });
    }

    // Eliminar la amistad
    await db.query('DELETE FROM amistades WHERE id = $1', [friendshipId]);

    const estado = friendship.rows[0].estado;
    const mensaje = estado === 'pendiente'
      ? 'Solicitud rechazada'
      : 'Amigo eliminado';

    res.json({ message: mensaje });
  } catch (error) {
    console.error('Error eliminando amistad:', error);
    res.status(500).json({ error: 'Error al eliminar amistad' });
  }
});

// GET /api/friends/search?q=nombre - Buscar jugadores para agregar
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = req.query.q || '';

    if (query.length < 2) {
      return res.json([]);
    }

    // Buscar jugadores que no sean yo y que coincidan con la búsqueda
    const result = await db.query(
      `SELECT
        u.id, u.nombre, u.posicion, u.ranking,
        CASE
          WHEN a.id IS NOT NULL AND a.estado = 'aceptada' THEN 'amigo'
          WHEN a.id IS NOT NULL AND a.estado = 'pendiente' AND a.usuario_id = $1 THEN 'solicitud_enviada'
          WHEN a.id IS NOT NULL AND a.estado = 'pendiente' AND a.amigo_id = $1 THEN 'solicitud_recibida'
          ELSE 'ninguna'
        END as relacion
       FROM usuarios u
       LEFT JOIN amistades a ON (
         (a.usuario_id = $1 AND a.amigo_id = u.id) OR
         (a.amigo_id = $1 AND a.usuario_id = u.id)
       )
       WHERE u.id != $1
         AND u.tipo = 'jugador'
         AND LOWER(u.nombre) LIKE LOWER($2)
       ORDER BY u.nombre ASC
       LIMIT 20`,
      [userId, `%${query}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error buscando jugadores:', error);
    res.status(500).json({ error: 'Error al buscar jugadores' });
  }
});

// GET /api/friends/status/:userId - Estado de amistad con un usuario específico
router.get('/status/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = parseInt(req.params.userId);

    if (currentUserId === targetUserId) {
      return res.json({ relacion: 'yo_mismo' });
    }

    const result = await db.query(
      `SELECT id, estado, usuario_id, amigo_id
       FROM amistades
       WHERE (usuario_id = $1 AND amigo_id = $2)
          OR (usuario_id = $2 AND amigo_id = $1)`,
      [currentUserId, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.json({ relacion: 'ninguna', amistad_id: null });
    }

    const amistad = result.rows[0];
    let relacion;

    if (amistad.estado === 'aceptada') {
      relacion = 'amigo';
    } else if (amistad.usuario_id === currentUserId) {
      relacion = 'solicitud_enviada';
    } else {
      relacion = 'solicitud_recibida';
    }

    res.json({ relacion, amistad_id: amistad.id });
  } catch (error) {
    console.error('Error obteniendo estado de amistad:', error);
    res.status(500).json({ error: 'Error al obtener estado' });
  }
});

module.exports = router;
