const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Configurar MercadoPago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

// Precios de suscripción (en ARS)
const PRECIOS = {
  dueno: 10000,   // $10.000 ARS/mes para dueños de canchas
  premium: 4000   // $4.000 ARS/mes para jugadores premium
};

// POST /api/payments/create-subscription - Crear preferencia de pago
router.post('/create-subscription', authMiddleware, async (req, res) => {
  try {
    const { tipo } = req.body;
    const userId = req.user.id;

    // Validar tipo
    if (!['dueno', 'premium'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo debe ser "dueno" o "premium"' });
    }

    // Obtener datos del usuario
    const user = await db.query('SELECT id, nombre, email FROM usuarios WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = user.rows[0];
    const precio = PRECIOS[tipo];
    const titulo = tipo === 'dueno'
      ? 'Suscripción Dueño de Cancha - Fulvo'
      : 'Plan Premium Jugador - Fulvo';

    // Crear preferencia de pago
    const preference = new Preference(client);

    const preferenceData = {
      items: [
        {
          id: `sub_${tipo}_${userId}`,
          title: titulo,
          description: `Suscripción mensual ${tipo === 'dueno' ? 'para dueños de canchas' : 'premium para jugadores'}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: precio
        }
      ],
      payer: {
        name: usuario.nombre,
        email: usuario.email
      },
      external_reference: JSON.stringify({ user_id: userId, tipo })
    };

    console.log('Creando preferencia con datos:', JSON.stringify(preferenceData, null, 2));

    const result = await preference.create({ body: preferenceData });

    console.log('Preferencia creada:', result.id);

    res.json({
      message: 'Preferencia de pago creada',
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
      preference_id: result.id,
      precio,
      tipo
    });
  } catch (error) {
    console.error('Error creando preferencia de pago:', error.message);
    console.error('Detalle del error:', JSON.stringify(error, null, 2));
    res.status(500).json({ error: 'Error al crear preferencia de pago', detalle: error.message });
  }
});

// POST /api/payments/webhook - Recibir notificaciones de MercadoPago
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;

    console.log('Webhook recibido:', { type, data });

    // Solo procesar notificaciones de pago
    if (type === 'payment') {
      const paymentId = data.id;

      // Obtener detalles del pago
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: paymentId });

      console.log('Info del pago:', {
        status: paymentInfo.status,
        external_reference: paymentInfo.external_reference
      });

      // Si el pago fue aprobado, activar suscripción
      if (paymentInfo.status === 'approved') {
        const externalRef = JSON.parse(paymentInfo.external_reference);
        const { user_id, tipo } = externalRef;

        // Calcular fecha de vencimiento (30 días)
        const vencimiento = new Date();
        vencimiento.setDate(vencimiento.getDate() + 30);

        if (tipo === 'dueno') {
          // Activar suscripción de dueño
          await db.query(
            `UPDATE usuarios
             SET suscripcion_activa = true,
                 suscripcion_vence = $1,
                 suscripcion_id_mp = $2
             WHERE id = $3`,
            [vencimiento, paymentId.toString(), user_id]
          );
          console.log(`Suscripción de dueño activada para usuario ${user_id}`);
        } else if (tipo === 'premium') {
          // Activar plan premium de jugador
          await db.query(
            `UPDATE usuarios
             SET plan = 'premium',
                 suscripcion_vence = $1,
                 suscripcion_id_mp = $2,
                 cuenta_bloqueada = false
             WHERE id = $3`,
            [vencimiento, paymentId.toString(), user_id]
          );
          console.log(`Plan premium activado para usuario ${user_id}`);
        }
      }
    }

    // MercadoPago espera un 200 OK
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando webhook:', error);
    // Aún así respondemos 200 para que MP no reintente
    res.status(200).send('OK');
  }
});

// GET /api/payments/status/check - Verificar estado de suscripción del usuario actual
router.get('/status/check', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener estado de suscripción del usuario
    const user = await db.query(
      `SELECT tipo, suscripcion_activa, suscripcion_vence, plan, suscripcion_id_mp
       FROM usuarios WHERE id = $1`,
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const u = user.rows[0];

    // Verificar si la suscripción está vigente
    const suscripcionVigente = u.suscripcion_vence && new Date(u.suscripcion_vence) > new Date();

    res.json({
      suscripcion_activa: u.suscripcion_activa && suscripcionVigente,
      suscripcion_vence: u.suscripcion_vence,
      plan: u.plan,
      tipo: u.tipo,
      tiene_suscripcion: u.suscripcion_id_mp !== null
    });
  } catch (error) {
    console.error('Error verificando estado:', error);
    res.status(500).json({ error: 'Error al verificar estado' });
  }
});

// GET /api/payments/status/:preference_id - Verificar estado de un pago (para polling desde frontend)
router.get('/status/:preference_id', authMiddleware, async (req, res) => {
  try {
    const { preference_id } = req.params;
    const userId = req.user.id;

    // Obtener estado de suscripción del usuario
    const user = await db.query(
      `SELECT tipo, suscripcion_activa, suscripcion_vence, plan, suscripcion_id_mp
       FROM usuarios WHERE id = $1`,
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const u = user.rows[0];

    res.json({
      suscripcion_activa: u.suscripcion_activa,
      suscripcion_vence: u.suscripcion_vence,
      plan: u.plan,
      tiene_suscripcion: u.suscripcion_id_mp !== null
    });
  } catch (error) {
    console.error('Error verificando estado:', error);
    res.status(500).json({ error: 'Error al verificar estado' });
  }
});

module.exports = router;
