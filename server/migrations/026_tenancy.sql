-- 026_tenancy.sql
-- Tenancy module: the Administrator's personal apartments. Same id + JSONB doc
-- shape as the other collections. Access is restricted to the admin role in
-- the API (crud.js ADMIN_ONLY); no role permission toggles it.
CREATE TABLE IF NOT EXISTS tenancy_meta        (id TEXT PRIMARY KEY, doc JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS tenancy_properties  (id TEXT PRIMARY KEY, doc JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS tenancy_tenants     (id TEXT PRIMARY KEY, doc JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS tenancy_leases      (id TEXT PRIMARY KEY, doc JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS tenancy_payments    (id TEXT PRIMARY KEY, doc JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS tenancy_charges     (id TEXT PRIMARY KEY, doc JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS tenancy_maintenance (id TEXT PRIMARY KEY, doc JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
