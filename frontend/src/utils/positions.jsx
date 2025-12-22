// Helper para obtener icono y estilo de posición

export const getPositionData = (posicion) => {
  if (!posicion) return null;

  const pos = posicion.toLowerCase();

  if (pos.includes('arquero') || pos.includes('portero') || pos.includes('goalkeeper')) {
    return {
      icon: '🧤',
      label: 'Arquero',
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };
  }

  if (pos.includes('defensor') || pos.includes('defensa') || pos.includes('central') || pos.includes('lateral')) {
    return {
      icon: '🛡️',
      label: 'Defensor',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
  }

  if (pos.includes('mediocampista') || pos.includes('medio') || pos.includes('volante') || pos.includes('centrocampista')) {
    return {
      icon: '⚡',
      label: 'Mediocampista',
      color: 'bg-green-500/20 text-green-400 border-green-500/30'
    };
  }

  if (pos.includes('delantero') || pos.includes('atacante') || pos.includes('punta') || pos.includes('extremo')) {
    return {
      icon: '🎯',
      label: 'Delantero',
      color: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
  }

  // Default
  return {
    icon: '⚽',
    label: posicion,
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };
};

// Componente de badge de posición
export const PositionBadge = ({ posicion, className = '' }) => {
  const data = getPositionData(posicion);
  if (!data) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${data.color} ${className}`}>
      <span>{data.icon}</span>
      <span>{data.label}</span>
    </span>
  );
};
