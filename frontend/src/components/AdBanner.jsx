import { useState, useEffect } from 'react';
import { AD_CONFIG } from '../config/ads.config';
import { getSubscriptionStatus } from '../services/payments';

// Tamaños estándar de Google Ads
const AD_SIZES = {
  horizontal: {
    small: { width: 468, height: 60 },
    medium: { width: 728, height: 90 },
    large: { width: 970, height: 90 }
  },
  sidebar: {
    small: { width: 160, height: 600 },
    medium: { width: 300, height: 250 },
    large: { width: 300, height: 600 }
  },
  square: {
    small: { width: 200, height: 200 },
    medium: { width: 300, height: 250 },
    large: { width: 336, height: 280 }
  }
};

// Props:
// - position: 'horizontal' | 'sidebar' | 'square'
// - size: 'small' | 'medium' | 'large'
// - sticky: boolean (para sidebars que se mantienen al scrollear)
// - className: clases adicionales para responsive (ej: 'hidden lg:block')
function AdBanner({ position = 'horizontal', size = 'medium', sticky = false, className = '' }) {
  const [showAd, setShowAd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIfShouldShowAd();
  }, []);

  const checkIfShouldShowAd = async () => {
    // Si ads están desactivados globalmente, no mostrar
    if (!AD_CONFIG.AD_ENABLED) {
      setShowAd(false);
      setLoading(false);
      return;
    }

    try {
      // Verificar si el usuario tiene plan premium
      const status = await getSubscriptionStatus();
      // Solo mostrar ads a usuarios free (no premium)
      const isPremium = status.plan === 'premium' && status.suscripcion_activa;
      setShowAd(!isPremium);
    } catch (err) {
      // Si hay error, mostrar ad por defecto (usuario no logueado o error)
      setShowAd(true);
    } finally {
      setLoading(false);
    }
  };

  // No mostrar nada mientras carga o si no debe mostrar
  if (loading || !showAd) {
    return null;
  }

  const dimensions = AD_SIZES[position]?.[size] || AD_SIZES.horizontal.medium;
  const stickyClass = sticky ? 'sticky top-4' : '';
  const wrapperClass = position === 'sidebar' ? '' : 'flex justify-center my-4';

  // En producción con AdSense configurado, renderizar el script de Google
  if (AD_CONFIG.ADSENSE_CLIENT_ID && AD_CONFIG.AD_ENABLED) {
    return (
      <div className={`${wrapperClass} ${stickyClass} ${className}`}>
        <ins
          className="adsbygoogle"
          style={{
            display: 'inline-block',
            width: dimensions.width,
            height: dimensions.height
          }}
          data-ad-client={AD_CONFIG.ADSENSE_CLIENT_ID}
          data-ad-slot={AD_CONFIG.AD_SLOTS[position] || ''}
        />
      </div>
    );
  }

  // Placeholder para desarrollo
  return (
    <div className={`${wrapperClass} ${stickyClass} ${className}`}>
      <div
        className="border-2 border-dashed border-gray-600 bg-gray-800/50 rounded-lg flex flex-col items-center justify-center text-gray-500"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: '100%'
        }}
      >
        <span className="text-2xl mb-1">📢</span>
        <p className="text-xs font-medium">Espacio publicitario</p>
        <p className="text-xs opacity-60">{dimensions.width}x{dimensions.height}</p>
      </div>
    </div>
  );
}

export default AdBanner;
