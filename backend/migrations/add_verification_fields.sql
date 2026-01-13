-- Migración: Agregar campos de verificación de email y teléfono a usuarios
-- Ejecutar en Supabase SQL Editor

-- Agregar campo verificado (default false para nuevos usuarios)
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT FALSE;

-- Agregar campo código de verificación
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS codigo_verificacion VARCHAR(6);

-- Agregar campo de expiración del código
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS codigo_expira TIMESTAMP;

-- Agregar campo teléfono (opcional)
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);

-- Marcar usuarios existentes como verificados (para no romper cuentas existentes)
UPDATE usuarios SET verificado = TRUE WHERE verificado IS NULL;

-- Índice para búsquedas por código
CREATE INDEX IF NOT EXISTS idx_usuarios_codigo_verificacion ON usuarios(codigo_verificacion);
