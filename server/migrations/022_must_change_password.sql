-- 022_must_change_password.sql
-- Accounts still on a shared/default or admin-set password must choose their
-- own before they can use the system. The staff imported in 003 and 008 were
-- all given the same default onboarding password; flag every account still on
-- that exact hash. (Sign-in also flags anyone using a weak password.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

UPDATE users
SET must_change_password = true
WHERE password_hash = '$2a$10$tvVaRa4h9qItwzPRV3neBOCYcNj/ij6XmBFJr.0qT5St7Lhsbdgnu';
