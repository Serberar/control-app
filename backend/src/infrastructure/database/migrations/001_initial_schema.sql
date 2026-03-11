-- ============================================================
-- Control Parental — Schema completo
-- Incluye todas las tablas para las 6 fases del proyecto
-- ============================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USUARIOS (padres)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DISPOSITIVOS (móviles de los hijos)
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  alias           VARCHAR(255),
  device_model    VARCHAR(255),
  android_version VARCHAR(50),
  app_version     VARCHAR(50),
  device_token    VARCHAR(255) UNIQUE NOT NULL,
  fcm_token       TEXT,
  last_seen_at    TIMESTAMPTZ,
  battery_level   SMALLINT CHECK (battery_level BETWEEN 0 AND 100),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVENTOS DE SIM
-- ============================================================
CREATE TABLE IF NOT EXISTS sim_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  event_type   VARCHAR(20) NOT NULL CHECK (event_type IN ('changed', 'removed', 'inserted')),
  phone_number VARCHAR(50),
  carrier      VARCHAR(100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HISTORIAL DE UBICACIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS location_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id  UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  latitude   DECIMAL(10, 8) NOT NULL,
  longitude  DECIMAL(11, 8) NOT NULL,
  accuracy   DECIMAL(8, 2),
  altitude   DECIMAL(8, 2),
  address    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_device_time
  ON location_history(device_id, created_at DESC);

-- ============================================================
-- GEOFENCES (zonas geográficas)
-- ============================================================
CREATE TABLE IF NOT EXISTS geofences (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id      UUID REFERENCES devices(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  latitude       DECIMAL(10, 8) NOT NULL,
  longitude      DECIMAL(11, 8) NOT NULL,
  radius_meters  INTEGER NOT NULL CHECK (radius_meters > 0),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  alert_on_exit  BOOLEAN NOT NULL DEFAULT true,
  alert_on_enter BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MENSAJES (WhatsApp, Telegram, Instagram, SMS)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id           UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  app                 VARCHAR(50) NOT NULL CHECK (app IN ('whatsapp', 'telegram', 'instagram', 'sms', 'other')),
  contact_name        VARCHAR(255),
  contact_identifier  VARCHAR(255),
  direction           VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content             TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_device_time
  ON messages(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_content
  ON messages USING gin(to_tsvector('spanish', content));

-- ============================================================
-- LLAMADAS VOIP (WhatsApp, Telegram)
-- ============================================================
CREATE TABLE IF NOT EXISTS voip_calls (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id           UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  app                 VARCHAR(50) NOT NULL,
  contact_name        VARCHAR(255),
  contact_identifier  VARCHAR(255),
  direction           VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing', 'missed')),
  duration_seconds    INTEGER,
  call_type           VARCHAR(10) NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voip_device_time
  ON voip_calls(device_id, created_at DESC);

-- ============================================================
-- REGISTRO DE LLAMADAS NATIVAS
-- ============================================================
CREATE TABLE IF NOT EXISTS call_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  contact_name     VARCHAR(255),
  phone_number     VARCHAR(50) NOT NULL,
  direction        VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing', 'missed')),
  duration_seconds INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_device_time
  ON call_logs(device_id, created_at DESC);

-- ============================================================
-- CONTACTOS DEL HIJO
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id      UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name           VARCHAR(255),
  phone_number   VARCHAR(50),
  is_new         BOOLEAN NOT NULL DEFAULT false,
  first_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, phone_number)
);

-- ============================================================
-- MEDIA (fotos y vídeos)
-- ============================================================
CREATE TABLE IF NOT EXISTS media (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id           UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  file_path           TEXT NOT NULL,
  thumbnail_path      TEXT,
  file_type           VARCHAR(10) NOT NULL CHECK (file_type IN ('photo', 'video')),
  file_size_bytes     BIGINT,
  thumbnail_uploaded  BOOLEAN NOT NULL DEFAULT false,
  full_uploaded       BOOLEAN NOT NULL DEFAULT false,
  taken_at            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_device_time
  ON media(device_id, created_at DESC);

-- ============================================================
-- CAPTURAS DE PANTALLA
-- ============================================================
CREATE TABLE IF NOT EXISTS screenshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id            UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  file_path            TEXT NOT NULL,
  app_in_foreground    VARCHAR(255),
  trigger_type         VARCHAR(20) NOT NULL CHECK (trigger_type IN ('periodic', 'app_open')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screenshots_device_time
  ON screenshots(device_id, created_at DESC);

-- ============================================================
-- HISTORIAL WEB
-- ============================================================
CREATE TABLE IF NOT EXISTS url_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id  UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  title      TEXT,
  app        VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_url_device_time
  ON url_history(device_id, created_at DESC);

-- ============================================================
-- USO DE APPS
-- ============================================================
CREATE TABLE IF NOT EXISTS app_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id     UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  package_name  VARCHAR(255) NOT NULL,
  app_name      VARCHAR(255),
  usage_date    DATE NOT NULL,
  usage_seconds INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, package_name, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_app_usage_device_date
  ON app_usage(device_id, usage_date DESC);

-- ============================================================
-- REGLAS DE APPS (bloqueo y límites de tiempo)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_rules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id            UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  package_name         VARCHAR(255) NOT NULL,
  app_name             VARCHAR(255),
  is_blocked           BOOLEAN NOT NULL DEFAULT false,
  daily_limit_seconds  INTEGER CHECK (daily_limit_seconds > 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, package_name)
);

-- ============================================================
-- HORARIOS DE BLOQUEO
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id     UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  days_of_week  SMALLINT[] NOT NULL, -- [1=Lun, 2=Mar, ..., 7=Dom]
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PALABRAS CLAVE PARA ALERTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS keywords (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id  UUID REFERENCES devices(id) ON DELETE CASCADE,
  word       VARCHAR(255) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id, word)
);

-- ============================================================
-- ALERTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL CHECK (type IN (
    'keyword', 'geofence_exit', 'geofence_enter',
    'photo_new', 'battery_low', 'sim_change',
    'vpn_detected', 'new_contact', 'inactivity',
    'app_installed'
  )),
  severity    VARCHAR(10) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  metadata    JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_unread
  ON alerts(user_id, is_read, created_at DESC);
