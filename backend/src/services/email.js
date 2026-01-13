const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Genera un código de 6 dígitos
function generarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Envía el código de verificación por email
async function enviarCodigoVerificacion(email, nombre, codigo) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Fulvo <noreply@fulbo.app>',
      to: email,
      subject: 'Verificá tu cuenta de Fulvo',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #111827; color: #ffffff; padding: 40px 20px; margin: 0;">
          <div style="max-width: 400px; margin: 0 auto; background-color: #1f2937; border-radius: 16px; padding: 32px; text-align: center;">
            <h1 style="color: #38bdf8; margin-bottom: 8px; font-size: 28px;">Fulvo</h1>
            <p style="color: #9ca3af; margin-bottom: 32px;">Fútbol 7 en Argentina</p>

            <p style="color: #e5e7eb; font-size: 16px; margin-bottom: 24px;">
              ¡Hola <strong>${nombre}</strong>! 👋
            </p>

            <p style="color: #9ca3af; font-size: 14px; margin-bottom: 16px;">
              Tu código de verificación es:
            </p>

            <div style="background-color: #374151; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #38bdf8;">
                ${codigo}
              </span>
            </div>

            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              Este código expira en <strong>15 minutos</strong>.
            </p>
            <p style="color: #6b7280; font-size: 12px;">
              Si no solicitaste este código, podés ignorar este email.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Error enviando email:', error);
      return { success: false, error };
    }

    console.log('Email enviado:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error enviando email:', error);
    return { success: false, error };
  }
}

module.exports = {
  generarCodigo,
  enviarCodigoVerificacion
};
