import AdBanner from './AdBanner';

/**
 * Layout wrapper con 3 columnas reales:
 * [Ads Izquierda] [Contenido Central] [Ads Derecha]
 *
 * Desktop (lg+): Grid de 3 columnas con ads apilados en los costados
 * Mobile (<lg): Solo contenido central, sin ads laterales
 */
function PageWithAds({ children }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-0">
      {/* Columna izquierda - Ads apilados */}
      <aside className="hidden lg:block p-4">
        <div className="sticky top-4 space-y-4">
          <AdBanner position="square" size="medium" />
          <AdBanner position="square" size="medium" />
          <AdBanner position="square" size="medium" />
        </div>
      </aside>

      {/* Columna central - Contenido principal */}
      <div className="w-full">
        {children}
      </div>

      {/* Columna derecha - Ads apilados */}
      <aside className="hidden lg:block p-4">
        <div className="sticky top-4 space-y-4">
          <AdBanner position="square" size="medium" />
          <AdBanner position="square" size="medium" />
          <AdBanner position="square" size="medium" />
        </div>
      </aside>
    </div>
  );
}

export default PageWithAds;
