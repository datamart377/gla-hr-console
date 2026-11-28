-- 025_security.sql
-- Intrusion detection & response: an append-only security event log and
-- temporary IP blocks. Configuration lives in settings under key 'security'
-- (served only to Admin/HR via /api/security, never via /api/settings).
CREATE TABLE IF NOT EXISTS security_events (
  id           BIGSERIAL PRIMARY KEY,
  at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  type         TEXT NOT NULL,
  severity     TEXT NOT NULL DEFAULT 'info',
  ip           TEXT,
  user_id      INT,
  email        TEXT,
  method       TEXT,
  path         TEXT,
  user_agent   TEXT,
  detail       JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  ack_by       TEXT,
  ack_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS security_events_at_idx    ON security_events (at DESC);
CREATE INDEX IF NOT EXISTS security_events_ip_idx    ON security_events (ip, at DESC);
CREATE INDEX IF NOT EXISTS security_events_email_idx ON security_events (lower(email), at DESC);
CREATE INDEX IF NOT EXISTS security_events_type_idx  ON security_events (type, at DESC);

CREATE TABLE IF NOT EXISTS security_blocks (
  ip          TEXT PRIMARY KEY,
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,            -- NULL = until removed
  created_by  TEXT NOT NULL DEFAULT 'auto',
  hits        INT NOT NULL DEFAULT 0
);

INSERT INTO settings (key, value)
VALUES ('security', '{"autoBlock": true, "emailAlerts": true, "alertMinSeverity": "high", "allowlist": [], "extraRecipients": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;
