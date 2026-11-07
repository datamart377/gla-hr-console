-- Session management: per-user token epoch (bumped to revoke all of a user's
-- active sessions) and a last-login timestamp for the admin sessions view.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_epoch   INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
