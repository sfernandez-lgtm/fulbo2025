const express = require('express');
const db = require('../config/db');
const { authMiddleware, isDueno } = require('../middleware/auth');

const router = express.Router();

// Sistema prompt para el asistente de dueños
const SYSTEM_PROMPT = `Sos un asistente virtual de Fulvo, una app para organizar partidos de fútbol en Argentina.
Tu rol es ayudar a los dueños de canchas con:

1. CREAR PARTIDOS: Explicar cómo crear partidos, configurar precios, horarios y máximo de jugadores.

2. ENTENDER ESTADÍSTICAS: Explicar qué significa cada métrica (recaudación, jugadores únicos, partidos organizados).

3. PAGOS Y SUSCRIPCIONES: Resolver dudas sobre la suscripción de $10.000/mes, cómo confirmar pagos de jugadores, qué pasa si un jugador no paga.

4. TIPS PARA ATRAER JUGADORES:
   - Precios competitivos (entre $3.000 y $8.000 por jugador es lo común)
   - Horarios populares (después de las 18hs entre semana, mañanas los fines de semana)
   - Crear partidos con anticipación (3-7 días antes)
   - Mantener buena reputación confirmando pagos a tiempo

5. USO DE LA APP: Explicar funciones como asignar equipos, cargar resultados, ver historial.

REGLAS:
- Respondé siempre en español argentino, de forma amigable y concisa.
- Si no sabés algo, decilo honestamente.
- Máximo 2-3 párrafos por respuesta.
- Usá emojis ocasionalmente para ser más amigable.`;

// POST /api/chat/owner - Chat con asistente IA
router.post('/owner', authMiddleware, isDueno, async (req, res) => {
  try {
    const { mensaje } = req.body;
    const userId = req.user.id;

    if (!mensaje || mensaje.trim() === '') {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    // Obtener contexto del dueño (nombre, canchas, stats)
    const userResult = await db.query(
      'SELECT nombre FROM usuarios WHERE id = $1',
      [userId]
    );
    const userName = userResult.rows[0]?.nombre || 'Dueño';

    // Obtener canchas del dueño
    const canchasResult = await db.query(
      'SELECT nombre FROM canchas WHERE dueno_id = $1',
      [userId]
    );
    const canchas = canchasResult.rows.map(c => c.nombre).join(', ') || 'Ninguna';

    // Obtener stats básicas
    const statsResult = await db.query(
      `SELECT
        COUNT(DISTINCT p.id) as partidos_total,
        COUNT(DISTINCT pj.jugador_id) as jugadores_unicos
       FROM partidos p
       LEFT JOIN partido_jugadores pj ON p.id = pj.partido_id
       WHERE p.organizador_id = $1`,
      [userId]
    );
    const stats = statsResult.rows[0];

    // Construir contexto del usuario
    const userContext = `
CONTEXTO DEL USUARIO:
- Nombre: ${userName}
- Canchas registradas: ${canchas}
- Partidos organizados: ${stats.partidos_total || 0}
- Jugadores únicos: ${stats.jugadores_unicos || 0}
`;

    // Llamar a DeepSeek
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + userContext },
          { role: 'user', content: mensaje }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.error('Error de DeepSeek:', response.status);
      return res.status(500).json({ error: 'Error al conectar con el asistente' });
    }

    const result = await response.json();
    const respuesta = result.choices[0]?.message?.content || 'No pude procesar tu mensaje. Intentá de nuevo.';

    res.json({ respuesta });
  } catch (error) {
    console.error('Error en chat owner:', error);
    res.status(500).json({ error: 'Error al procesar el mensaje' });
  }
});

module.exports = router;
