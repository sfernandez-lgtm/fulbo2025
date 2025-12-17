const express = require('express');
const { validateWithAI } = require('../services/ai');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/ai/validate - Validar datos con IA
router.post('/validate', authMiddleware, async (req, res) => {
  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Faltan type y data' });
    }

    if (!['match', 'venue'].includes(type)) {
      return res.status(400).json({ error: 'Type debe ser "match" o "venue"' });
    }

    const validation = await validateWithAI(type, data);
    res.json(validation);
  } catch (error) {
    console.error('Error en validación IA:', error);
    res.status(500).json({ error: 'Error al validar' });
  }
});

module.exports = router;
