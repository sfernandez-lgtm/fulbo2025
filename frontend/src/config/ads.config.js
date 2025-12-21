/**
 * Configuración de Google AdSense para Fulvo
 *
 * CÓMO CONECTAR GOOGLE ADSENSE:
 *
 * 1. Crear cuenta en Google AdSense: https://www.google.com/adsense/
 *
 * 2. Agregar el script de AdSense en index.html (dentro de <head>):
 *    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
 *         crossorigin="anonymous"></script>
 *
 * 3. Obtener tu Client ID (formato: ca-pub-XXXXXXXXXXXXXXXX) desde el panel de AdSense
 *
 * 4. Crear unidades de anuncio para cada posición:
 *    - Horizontal (728x90): Para banners en PlayerHome y Leagues
 *    - Sidebar (300x250): Para Rankings
 *    - Copiar el data-ad-slot de cada unidad
 *
 * 5. Actualizar esta configuración:
 *    - Cambiar AD_ENABLED a true
 *    - Pegar tu ADSENSE_CLIENT_ID
 *    - Pegar los AD_SLOTS correspondientes
 *
 * 6. Verificar que AdSense apruebe tu sitio (puede tomar unos días)
 *
 * IMPORTANTE:
 * - Los ads solo se muestran a usuarios con plan FREE
 * - Usuarios PREMIUM no ven publicidad
 * - En desarrollo (AD_ENABLED: false) se muestran placeholders
 */

export const AD_CONFIG = {
  // Activar/desactivar anuncios globalmente
  // Cambiar a true cuando tengas AdSense configurado
  AD_ENABLED: true,

  // Tu Client ID de Google AdSense
  // Formato: 'ca-pub-XXXXXXXXXXXXXXXX'
  ADSENSE_CLIENT_ID: '',

  // Slots de anuncios por posición
  // Cada slot se obtiene al crear una unidad de anuncio en AdSense
  AD_SLOTS: {
    horizontal: '', // Slot para banners 728x90
    sidebar: '',    // Slot para sidebar 300x250
    square: ''      // Slot para cuadrados 300x250
  },

  // Configuración de refresh de ads (en milisegundos)
  // Google recomienda no refrescar muy seguido (mínimo 30 segundos)
  REFRESH_INTERVAL: 60000, // 1 minuto

  // Mostrar ads en modo desarrollo (placeholders)
  SHOW_PLACEHOLDERS_IN_DEV: true
};

/**
 * Tamaños recomendados por Google:
 *
 * HORIZONTAL (Leaderboard):
 * - 728x90 (Desktop)
 * - 320x50 (Mobile)
 * - 970x90 (Large Desktop)
 *
 * SIDEBAR (Medium Rectangle):
 * - 300x250 (Desktop/Mobile)
 * - 336x280 (Large Rectangle)
 *
 * VERTICAL (Skyscraper):
 * - 160x600 (Wide Skyscraper)
 * - 300x600 (Half Page)
 *
 * Más info: https://support.google.com/adsense/answer/6002621
 */
