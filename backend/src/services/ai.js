const validateWithAI = async (type, data) => {
  // Validación de fecha en backend (más confiable que IA)
  if (type === 'match' && data.fecha) {
    const fechaPartido = new Date(data.fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diffDias = Math.ceil((fechaPartido - hoy) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return { valid: false, message: 'La fecha del partido ya pasó' };
    }
    if (diffDias > 30) {
      return { valid: false, message: `La fecha está a ${diffDias} días. ¿Estás seguro? Máximo recomendado: 30 días` };
    }
  }

  const prompts = {
    match: `Sos un asistente que valida datos de partidos de fútbol 7 en Argentina.
Analizá estos datos y respondé en JSON:
- Si todo está bien: {"valid": true, "message": "Todo correcto"}
- Si hay algo raro: {"valid": false, "message": "pregunta o advertencia específica"}

Datos del partido:
- Hora inicio: ${data.hora_inicio}
- Hora fin: ${data.hora_fin}
- Precio por jugador: ${data.precio_por_jugador}
- Máximo jugadores: ${data.max_jugadores}

Validá:
- Precio: Si está entre $1000 y $30000, es VÁLIDO
- Horario: entre 8:00 y 00:00
- Duración: entre 1 y 3 horas es normal

IMPORTANTE: Si todos los valores están dentro de los rangos, respondé valid=true.
Respondé SOLO el JSON, nada más.`,

    venue: `Sos un asistente que valida datos de canchas de fútbol en Argentina.
Analizá estos datos y respondé en JSON:
- Si todo está bien: {"valid": true, "message": "Todo correcto"}
- Si hay algo raro: {"valid": false, "message": "pregunta o advertencia específica"}

Datos de la cancha:
- Nombre: ${data.nombre}
- Dirección: ${data.direccion}
- Zona: ${data.zona}
- Precio por hora: ${data.precio_hora}

Validá: que tenga nombre, dirección completa, zona de Argentina, precio razonable.
Respondé SOLO el JSON, nada más.`
  };

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompts[type] }],
        temperature: 0.3
      })
    });

    const result = await response.json();
    const content = result.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Error con DeepSeek:', error);
    return { valid: true, message: 'No se pudo validar con IA' };
  }
};

module.exports = { validateWithAI };
