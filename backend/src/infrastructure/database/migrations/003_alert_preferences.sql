-- Preferencias de alertas por dispositivo
-- Permite al padre activar/desactivar cada tipo de alerta
CREATE TABLE IF NOT EXISTS alert_preferences (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id  UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  enabled    BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_alert_preferences_device
  ON alert_preferences(device_id);
