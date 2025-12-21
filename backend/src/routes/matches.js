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
      query += ` AND LOWER(c.zona) LIKE LOWER('%' || $${params.length} || '%')`;
    }

    query += ' ORDER BY p.fecha ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando partidos:', error);
    res.status(500).json({ error: 'Error al listar partidos' });
  }
});

// GET /api/matches/mine - Obtener partidos del dueño (organizador)
router.get('/mine', authMiddleware, isDueno, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, c.nombre as cancha_nombre, c.direccion, c.zona,
              (SELECT COUNT(*) FROM partido_jugadores WHERE partido_id = p.id) as jugadores_anotados,
              CASE
                WHEN p.estado = 'jugado' THEN 'jugado'
                WHEN p.fecha < NOW() THEN 'pasado'
                ELSE 'pendiente'
              END as estado_actual
       FROM partidos p
       JOIN canchas c ON p.cancha_id = c.id
       WHERE p.organizador_id = $1
       ORDER BY p.fecha DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo mis partidos:', error);
    res.status(500).json({ error: 'Error al obtener partidos' });
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

    // Obtener datos del jugador para verificar restricciones
    const jugador = await db.query(
      `SELECT plan, partidos_mes_actual, mes_actual, suscripcion_vence, cuenta_bloqueada
       FROM usuarios WHERE id = $1`,
      [jugadorId]
    );

    const j = jugador.rows[0];

    // Verificar cuenta bloqueada
    if (j.cuenta_bloqueada) {
      return res.status(403).json({ error: 'Tu cuenta está bloqueada por falta de pago' });
    }

    // Determinar plan efectivo (si premium venció, tratarlo como free)
    const mesActual = new Date().getMonth() + 1; // 1-12
    let planEfectivo = j.plan || 'free';

    if (planEfectivo === 'premium') {
      const suscripcionVigente = j.suscripcion_vence && new Date(j.suscripcion_vence) > new Date();
      if (!suscripcionVigente) {
        planEfectivo = 'free'; // Premium vencido, tratarlo como free
      }
    }

    // Restricciones para plan free
    let partidosMesActual = j.partidos_mes_actual || 0;

    if (planEfectivo === 'free') {
      // Si cambió el mes, resetear contador
      if (j.mes_actual !== mesActual) {
        partidosMesActual = 0;
        await db.query(
          'UPDATE usuarios SET mes_actual = $1, partidos_mes_actual = 0 WHERE id = $2',
          [mesActual, jugadorId]
        );
      }

      // Verificar límite de 2 partidos
      if (partidosMesActual >= 2) {
        return res.status(403).json({ error: 'Alcanzaste el límite de 2 partidos gratis. Pasate a premium.' });
      }
    }

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

    // Incrementar contador para plan free
    if (planEfectivo === 'free') {
      await db.query(
        'UPDATE usuarios SET partidos_mes_actual = partidos_mes_actual + 1, mes_actual = $1 WHERE id = $2',
        [mesActual, jugadorId]
      );
    }

    res.json({ message: 'Te anotaste al partido exitosamente' });
  } catch (error) {
    console.error('Error anotando jugador:', error);
    res.status(500).json({ error: 'Error al anotarse al partido' });
  }
});

// DELETE /api/matches/:id/leave - Salir de un partido (con penalización si es muy tarde)
router.delete('/:id/leave', authMiddleware, isJugador, async (req, res) => {
  try {
    const partidoId = req.params.id;
    const jugadorId = req.user.id;

    // Verificar que el partido existe y obtener fecha/hora
    const partido = await db.query(
      `SELECT id, fecha, hora_inicio, estado FROM partidos WHERE id = $1`,
      [partidoId]
    );

    if (partido.rows.length === 0) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    const p = partido.rows[0];

    // Verificar que el partido no esté jugado
    if (p.estado === 'jugado') {
      return res.status(400).json({ error: 'No podés salir de un partido ya jugado' });
    }

    // Verificar que el jugador está anotado
    const inscripcion = await db.query(
      'SELECT id FROM partido_jugadores WHERE partido_id = $1 AND jugador_id = $2',
      [partidoId, jugadorId]
    );

    if (inscripcion.rows.length === 0) {
      return res.status(400).json({ error: 'No estás anotado en este partido' });
    }

    // Calcular tiempo hasta el partido
    const fechaPartido = new Date(p.fecha);
    const [horas, minutos] = p.hora_inicio.split(':');
    fechaPartido.setHours(parseInt(horas), parseInt(minutos), 0, 0);

    const ahora = new Date();
    const horasHastaPartido = (fechaPartido - ahora) / (1000 * 60 * 60);

    // Determinar si hay penalización (menos de 3 horas)
    const hayPenalizacion = horasHastaPartido < 3 && horasHastaPartido > 0;
    const penalizacion = 15;

    // Iniciar transacción
    await db.query('BEGIN');

    try {
      // Si hay penalización, restar puntos de ranking
      if (hayPenalizacion) {
        await db.query(
          `UPDATE usuarios
           SET ranking = GREATEST(0, COALESCE(ranking, 50) - $1)
           WHERE id = $2`,
          [penalizacion, jugadorId]
        );
      }

      // Eliminar al jugador del partido
      await db.query(
        'DELETE FROM partido_jugadores WHERE partido_id = $1 AND jugador_id = $2',
        [partidoId, jugadorId]
      );

      // Si había equipos asignados, limpiar el campo equipo de todos
      const equiposAsignados = await db.query(
        `SELECT id FROM partido_jugadores WHERE partido_id = $1 AND equipo IS NOT NULL LIMIT 1`,
        [partidoId]
      );

      if (equiposAsignados.rows.length > 0) {
        await db.query(
          'UPDATE partido_jugadores SET equipo = NULL WHERE partido_id = $1',
          [partidoId]
        );
      }

      // Confirmar transacción
      await db.query('COMMIT');

      const mensaje = hayPenalizacion
        ? `Saliste del partido. Se te descontaron ${penalizacion} puntos por salir con menos de 3 horas de anticipación.`
        : 'Saliste del partido exitosamente';

      res.json({
        message: mensaje,
        penalizacion: hayPenalizacion,
        puntosDescontados: hayPenalizacion ? penalizacion : 0,
        equiposReseteados: equiposAsignados.rows.length > 0
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error saliendo del partido:', error);
    res.status(500).json({ error: 'Error al salir del partido' });
  }
});

// POST /api/matches - Crear partido (solo dueños)
router.post('/', authMiddleware, isDueno, async (req, res) => {
  try {
    const { cancha_id, fecha, hora_inicio, hora_fin, max_jugadores, precio_por_jugador, descripcion } = req.body;

    // Verificar suscripción del dueño
    const dueno = await db.query(
      'SELECT suscripcion_activa, suscripcion_vence FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    const suscripcionActiva = dueno.rows[0]?.suscripcion_activa;
    const suscripcionVence = dueno.rows[0]?.suscripcion_vence;
    const suscripcionVigente = suscripcionVence && new Date(suscripcionVence) > new Date();

    if (!suscripcionActiva || !suscripcionVigente) {
      return res.status(403).json({ error: 'Tu suscripción está inactiva o vencida' });
    }

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

// PUT /api/matches/:id/result - Cargar resultado del partido
router.put('/:id/result', authMiddleware, isDueno, async (req, res) => {
  try {
    const { resultado_local, resultado_visitante } = req.body;
    const partidoId = req.params.id;

    // Validar que se enviaron los resultados
    if (resultado_local === undefined || resultado_visitante === undefined) {
      return res.status(400).json({ error: 'Debe enviar resultado_local y resultado_visitante' });
    }

    // Verificar que el partido existe y pertenece al organizador
    const partido = await db.query(
      'SELECT id, organizador_id FROM partidos WHERE id = $1',
      [partidoId]
    );

    if (partido.rows.length === 0) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    if (partido.rows[0].organizador_id !== req.user.id) {
      return res.status(403).json({ error: 'No tenés permiso para modificar este partido' });
    }

    // Verificar si hay equipos asignados
    const jugadoresConEquipo = await db.query(
      `SELECT pj.jugador_id, pj.equipo
       FROM partido_jugadores pj
       WHERE pj.partido_id = $1 AND pj.equipo IN ('local', 'visitante')`,
      [partidoId]
    );

    const equiposAsignados = jugadoresConEquipo.rows.length > 0;

    // Iniciar transacción
    await db.query('BEGIN');

    try {
      // Actualizar resultado y estado del partido
      const result = await db.query(
        `UPDATE partidos
         SET resultado_local = $1,
             resultado_visitante = $2,
             estado = 'jugado',
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [resultado_local, resultado_visitante, partidoId]
      );

      let statsActualizadas = false;

      if (equiposAsignados) {
        // Determinar resultado
        const ganoLocal = resultado_local > resultado_visitante;
        const ganoVisitante = resultado_visitante > resultado_local;
        const empate = resultado_local === resultado_visitante;

        // Obtener todos los jugadores del partido con su equipo
        const jugadores = jugadoresConEquipo.rows;

        // Separar por equipo
        const jugadoresLocal = jugadores.filter(j => j.equipo === 'local').map(j => j.jugador_id);
        const jugadoresVisitante = jugadores.filter(j => j.equipo === 'visitante').map(j => j.jugador_id);
        const todosLosJugadores = [...jugadoresLocal, ...jugadoresVisitante];

        if (todosLosJugadores.length > 0) {
          // Actualizar partidos_jugados para TODOS los jugadores
          await db.query(
            `UPDATE usuarios
             SET partidos_jugados = COALESCE(partidos_jugados, 0) + 1
             WHERE id = ANY($1)`,
            [todosLosJugadores]
          );

          if (empate) {
            // Empate: todos ranking += 3
            await db.query(
              `UPDATE usuarios
               SET ranking = COALESCE(ranking, 50) + 3
               WHERE id = ANY($1)`,
              [todosLosJugadores]
            );
          } else {
            // Determinar ganadores y perdedores
            const ganadores = ganoLocal ? jugadoresLocal : jugadoresVisitante;
            const perdedores = ganoLocal ? jugadoresVisitante : jugadoresLocal;

            // Actualizar ganadores: ranking += 10, partidos_ganados += 1
            if (ganadores.length > 0) {
              await db.query(
                `UPDATE usuarios
                 SET ranking = COALESCE(ranking, 50) + 10,
                     partidos_ganados = COALESCE(partidos_ganados, 0) + 1
                 WHERE id = ANY($1)`,
                [ganadores]
              );
            }

            // Actualizar perdedores: ranking -= 5 (mínimo 0)
            if (perdedores.length > 0) {
              await db.query(
                `UPDATE usuarios
                 SET ranking = GREATEST(0, COALESCE(ranking, 50) - 5)
                 WHERE id = ANY($1)`,
                [perdedores]
              );
            }
          }

          statsActualizadas = true;
        }
      }

      // Confirmar transacción
      await db.query('COMMIT');

      const mensaje = statsActualizadas
        ? 'Resultado cargado y estadísticas actualizadas exitosamente'
        : 'Resultado cargado exitosamente (equipos no asignados, rankings no actualizados)';

      res.json({
        message: mensaje,
        partido: result.rows[0],
        statsActualizadas
      });
    } catch (error) {
      // Rollback en caso de error
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error cargando resultado:', error);
    res.status(500).json({ error: 'Error al cargar resultado' });
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

// POST /api/matches/:id/assign-teams - Armar equipos balanceados por ranking (draft snake)
router.post('/:id/assign-teams', authMiddleware, isDueno, async (req, res) => {
  try {
    const partidoId = req.params.id;

    // Verificar que el partido existe y pertenece al organizador
    const partido = await db.query(
      'SELECT id, organizador_id, estado FROM partidos WHERE id = $1',
      [partidoId]
    );

    if (partido.rows.length === 0) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    if (partido.rows[0].organizador_id !== req.user.id) {
      return res.status(403).json({ error: 'No tenés permiso para modificar este partido' });
    }

    if (partido.rows[0].estado === 'jugado') {
      return res.status(400).json({ error: 'No se pueden reasignar equipos de un partido ya jugado' });
    }

    // Obtener jugadores anotados ordenados por ranking (mayor a menor)
    const jugadoresResult = await db.query(
      `SELECT pj.id as partido_jugador_id, u.id, u.nombre, u.posicion,
              COALESCE(u.ranking, 50) as ranking
       FROM partido_jugadores pj
       JOIN usuarios u ON pj.jugador_id = u.id
       WHERE pj.partido_id = $1
       ORDER BY COALESCE(u.ranking, 50) DESC`,
      [partidoId]
    );

    const jugadores = jugadoresResult.rows;

    if (jugadores.length < 2) {
      return res.status(400).json({ error: 'Se necesitan al menos 2 jugadores para armar equipos' });
    }

    // Draft snake: 1→local, 2→visitante, 3→visitante, 4→local, 5→local, 6→visitante...
    const equipoLocal = [];
    const equipoVisitante = [];

    jugadores.forEach((jugador, index) => {
      // Determinar en qué "ronda" estamos (cada ronda tiene 2 picks)
      const ronda = Math.floor(index / 2);
      const posicionEnRonda = index % 2;

      // En rondas pares (0, 2, 4...): primero local, luego visitante
      // En rondas impares (1, 3, 5...): primero visitante, luego local
      let equipo;
      if (ronda % 2 === 0) {
        equipo = posicionEnRonda === 0 ? 'local' : 'visitante';
      } else {
        equipo = posicionEnRonda === 0 ? 'visitante' : 'local';
      }

      jugador.equipo = equipo;
      if (equipo === 'local') {
        equipoLocal.push(jugador);
      } else {
        equipoVisitante.push(jugador);
      }
    });

    // Actualizar el campo equipo en partido_jugadores
    for (const jugador of jugadores) {
      await db.query(
        'UPDATE partido_jugadores SET equipo = $1 WHERE id = $2',
        [jugador.equipo, jugador.partido_jugador_id]
      );
    }

    // Calcular ranking promedio de cada equipo
    const rankingPromedioLocal = equipoLocal.length > 0
      ? equipoLocal.reduce((sum, j) => sum + parseFloat(j.ranking), 0) / equipoLocal.length
      : 0;

    const rankingPromedioVisitante = equipoVisitante.length > 0
      ? equipoVisitante.reduce((sum, j) => sum + parseFloat(j.ranking), 0) / equipoVisitante.length
      : 0;

    res.json({
      message: 'Equipos asignados exitosamente',
      equipos: {
        local: {
          jugadores: equipoLocal.map(j => ({
            id: j.id,
            nombre: j.nombre,
            posicion: j.posicion,
            ranking: parseFloat(j.ranking)
          })),
          rankingPromedio: Math.round(rankingPromedioLocal * 100) / 100
        },
        visitante: {
          jugadores: equipoVisitante.map(j => ({
            id: j.id,
            nombre: j.nombre,
            posicion: j.posicion,
            ranking: parseFloat(j.ranking)
          })),
          rankingPromedio: Math.round(rankingPromedioVisitante * 100) / 100
        }
      },
      diferencia: Math.round(Math.abs(rankingPromedioLocal - rankingPromedioVisitante) * 100) / 100
    });
  } catch (error) {
    console.error('Error asignando equipos:', error);
    res.status(500).json({ error: 'Error al asignar equipos' });
  }
});

module.exports = router;
