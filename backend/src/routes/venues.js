const express = require('express');
const db = require('../config/db');
const { authMiddleware, isDueno } = require('../middleware/auth');

const router = express.Router();

// GET /api/venues - Listar todas las canchas
router.get('/', async (req, res) => {
  try {
    const { zona } = req.query;

    let query = `
      SELECT c.*, u.nombre as dueno_nombre
       FROM canchas c
       JOIN usuarios u ON c.dueno_id = u.id
       WHERE c.activa = true
    `;
    const params = [];

    if (zona) {
      params.push(zona);
      query += ` AND c.zona = $${params.length}`;
    }

    query += ' ORDER BY c.nombre ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando canchas:', error);
    res.status(500).json({ error: 'Error al listar canchas' });
  }
});

// GET /api/venues/my - Obtener canchas del dueño autenticado
router.get('/my', authMiddleware, isDueno, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM canchas WHERE dueno_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo mis canchas:', error);
    res.status(500).json({ error: 'Error al obtener canchas' });
  }
});

// GET /api/venues/zones - Obtener zonas únicas de las canchas
router.get('/zones', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT zona FROM canchas WHERE zona IS NOT NULL AND zona != '' ORDER BY zona ASC`
    );
    const zonas = result.rows.map(row => row.zona);
    res.json(zonas);
  } catch (error) {
    console.error('Error obteniendo zonas:', error);
    res.status(500).json({ error: 'Error al obtener zonas' });
  }
});

// GET /api/venues/:id - Detalle de una cancha
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, u.nombre as dueno_nombre
       FROM canchas c
       JOIN usuarios u ON c.dueno_id = u.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo cancha:', error);
    res.status(500).json({ error: 'Error al obtener cancha' });
  }
});

// POST /api/venues - Crear cancha (solo dueños)
router.post('/', authMiddleware, isDueno, async (req, res) => {
  try {
    const { nombre, direccion, zona, telefono, precio_hora, descripcion, servicios } = req.body;

    if (!nombre || !direccion || !zona) {
      return res.status(400).json({ error: 'Nombre, dirección y zona son requeridos' });
    }

    const result = await db.query(
      `INSERT INTO canchas (dueno_id, nombre, direccion, zona, telefono, precio_hora, descripcion, servicios, activa, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
       RETURNING *`,
      [req.user.id, nombre, direccion, zona, telefono, precio_hora, descripcion, servicios]
    );

    res.status(201).json({
      message: 'Cancha creada exitosamente',
      cancha: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando cancha:', error);
    res.status(500).json({ error: 'Error al crear cancha' });
  }
});

// PUT /api/venues/:id - Actualizar cancha (solo dueño de la cancha)
router.put('/:id', authMiddleware, isDueno, async (req, res) => {
  try {
    const { nombre, direccion, zona, telefono, precio_hora, descripcion, servicios, activa } = req.body;

    const result = await db.query(
      `UPDATE canchas
       SET nombre = COALESCE($1, nombre),
           direccion = COALESCE($2, direccion),
           zona = COALESCE($3, zona),
           telefono = COALESCE($4, telefono),
           precio_hora = COALESCE($5, precio_hora),
           descripcion = COALESCE($6, descripcion),
           servicios = COALESCE($7, servicios),
           activa = COALESCE($8, activa),
           updated_at = NOW()
       WHERE id = $9 AND dueno_id = $10
       RETURNING *`,
      [nombre, direccion, zona, telefono, precio_hora, descripcion, servicios, activa, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada o no tenés permiso' });
    }

    res.json({
      message: 'Cancha actualizada',
      cancha: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando cancha:', error);
    res.status(500).json({ error: 'Error al actualizar cancha' });
  }
});

// DELETE /api/venues/:id - Eliminar cancha (solo dueño de la cancha)
router.delete('/:id', authMiddleware, isDueno, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM canchas WHERE id = $1 AND dueno_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada o no tenés permiso' });
    }

    res.json({ message: 'Cancha eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando cancha:', error);
    res.status(500).json({ error: 'Error al eliminar cancha' });
  }
});

module.exports = router;
