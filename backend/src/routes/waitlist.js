const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST /api/waitlist - Agregar email a la lista de espera
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    // Insertar en la base de datos
    const result = await db.query(
      `INSERT INTO waitlist (email, source)
       VALUES ($1, 'landing')
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, created_at`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      // El email ya existía
      return res.status(200).json({
        message: '¡Ya estás en la lista!',
        alreadyExists: true
      });
    }

    res.status(201).json({
      message: '¡Te sumaste a la lista de espera!',
      alreadyExists: false,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error en waitlist:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// GET /api/waitlist/count - Obtener cantidad de registrados (público)
router.get('/count', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) as total FROM waitlist');
    res.json({ count: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error('Error obteniendo count:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

module.exports = router;
