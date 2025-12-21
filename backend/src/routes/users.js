const express = require('express');
const db = require('../config/db');

const router = express.Router();

// GET /api/users/:id/activate-sub - Activar suscripción por 30 días (TEMPORAL - para testing)
router.get('/:id/activate-sub', async (req, res) => {
  try {
    const userId = req.params.id;

    // Obtener tipo de usuario
    const user = await db.query('SELECT id, nombre, tipo FROM usuarios WHERE id = $1', [userId]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const tipo = user.rows[0].tipo;
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 30); // 30 días

    if (tipo === 'dueno') {
      // Activar suscripción de dueño
      await db.query(
        `UPDATE usuarios
         SET suscripcion_activa = true,
             suscripcion_vence = $1,
             suscripcion_id_mp = 'TEST_' || $2
         WHERE id = $2`,
        [vencimiento, userId]
      );

      res.json({
        message: 'Suscripción de dueño activada por 30 días',
        usuario: user.rows[0].nombre,
        tipo: 'dueno',
        vence: vencimiento
      });
    } else if (tipo === 'jugador') {
      // Activar plan premium de jugador
      await db.query(
        `UPDATE usuarios
         SET plan = 'premium',
             suscripcion_vence = $1,
             suscripcion_id_mp = 'TEST_' || $2,
             cuenta_bloqueada = false
         WHERE id = $2`,
        [vencimiento, userId]
      );

      res.json({
        message: 'Plan premium activado por 30 días',
        usuario: user.rows[0].nombre,
        tipo: 'jugador',
        plan: 'premium',
        vence: vencimiento
      });
    } else {
      res.status(400).json({ error: 'Tipo de usuario no válido' });
    }
  } catch (error) {
    console.error('Error activando suscripción:', error);
    res.status(500).json({ error: 'Error al activar suscripción' });
  }
});

// GET /api/users/:id/deactivate-sub - Desactivar suscripción (TEMPORAL - para testing)
router.get('/:id/deactivate-sub', async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await db.query('SELECT id, nombre, tipo FROM usuarios WHERE id = $1', [userId]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const tipo = user.rows[0].tipo;

    if (tipo === 'dueno') {
      await db.query(
        `UPDATE usuarios
         SET suscripcion_activa = false,
             suscripcion_vence = NULL,
             suscripcion_id_mp = NULL
         WHERE id = $1`,
        [userId]
      );
    } else if (tipo === 'jugador') {
      await db.query(
        `UPDATE usuarios
         SET plan = 'free',
             suscripcion_vence = NULL,
             suscripcion_id_mp = NULL
         WHERE id = $1`,
        [userId]
      );
    }

    res.json({
      message: 'Suscripción desactivada',
      usuario: user.rows[0].nombre,
      tipo
    });
  } catch (error) {
    console.error('Error desactivando suscripción:', error);
    res.status(500).json({ error: 'Error al desactivar suscripción' });
  }
});

module.exports = router;
