-- ============================================================
-- 001_initial_schema.sql
-- Full schema for API Change Impact Simulator
-- ============================================================

-- Enable UUID extension or shim with built-in gen_random_uuid
CREATE OR REPLACE FUNCTION uuid_generate_v4() RETURNS uuid AS $$
  SELECT gen_random_uuid();
$$ LANGUAGE SQL;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'consumer_rep', 'reviewer')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Consumer Teams ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consumer_teams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Link users to consumer teams (a user belongs to one team)
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES consumer_teams(id) ON DELETE SET NULL;

-- ── Dependencies ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dependencies (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_team_id UUID NOT NULL REFERENCES consumer_teams(id) ON DELETE CASCADE,
  endpoint_path    TEXT NOT NULL,
  http_method      TEXT NOT NULL CHECK (http_method IN ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS')),
  field_path       TEXT,  -- nullable: monitors the entire endpoint if null
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (consumer_team_id, endpoint_path, http_method, field_path)
);

-- ── API Specs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_specs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Spec Versions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spec_versions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spec_id       UUID NOT NULL REFERENCES api_specs(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW(),
  raw_spec      JSONB NOT NULL,  -- immutable snapshot
  file_size     INTEGER,
  UNIQUE (spec_id, version_label)
);

-- ── Diff Runs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diff_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  old_version_id  UUID NOT NULL REFERENCES spec_versions(id),
  new_version_id  UUID NOT NULL REFERENCES spec_versions(id),
  triggered_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  run_at          TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  UNIQUE (old_version_id, new_version_id)  -- idempotent: same pair = same run
);

-- ── Change Items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS change_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diff_run_id     UUID NOT NULL REFERENCES diff_runs(id) ON DELETE CASCADE,
  change_type     TEXT NOT NULL,            -- e.g. 'endpoint_removed', 'field_type_changed'
  classification  TEXT NOT NULL CHECK (classification IN ('BREAKING','WARNING','NON_BREAKING')),
  endpoint_path   TEXT,
  http_method     TEXT,
  field_path      TEXT,
  explanation     TEXT NOT NULL,
  old_value       JSONB,
  new_value       JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Impact (change × consumer cross-reference) ───────────────
CREATE TABLE IF NOT EXISTS impacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_item_id  UUID NOT NULL REFERENCES change_items(id) ON DELETE CASCADE,
  dependency_id   UUID NOT NULL REFERENCES dependencies(id) ON DELETE CASCADE,
  severity        TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  dispute_reason  TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','disputed')),
  UNIQUE (change_item_id, dependency_id)
);

-- ── Test Collections ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_collections (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_team_id UUID NOT NULL REFERENCES consumer_teams(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  collection_json  JSONB NOT NULL,
  uploaded_at      TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by      UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ── Test Runs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_runs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diff_run_id         UUID NOT NULL REFERENCES diff_runs(id) ON DELETE CASCADE,
  test_collection_id  UUID NOT NULL REFERENCES test_collections(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','passed','failed','error')),
  results             JSONB,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Migration Reports ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS migration_reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diff_run_id  UUID NOT NULL REFERENCES diff_runs(id) ON DELETE CASCADE UNIQUE,
  summary      JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at  TIMESTAMPTZ,
  decision     TEXT CHECK (decision IN ('approved','blocked'))
);

-- ── Audit Log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  timestamp   TIMESTAMPTZ DEFAULT NOW(),
  metadata    JSONB
);

-- ── Refresh Tokens ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_spec_versions_spec_id ON spec_versions(spec_id);
CREATE INDEX IF NOT EXISTS idx_diff_runs_versions ON diff_runs(old_version_id, new_version_id);
CREATE INDEX IF NOT EXISTS idx_change_items_diff_run ON change_items(diff_run_id);
CREATE INDEX IF NOT EXISTS idx_impacts_change_item ON impacts(change_item_id);
CREATE INDEX IF NOT EXISTS idx_impacts_dependency ON impacts(dependency_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_team ON dependencies(consumer_team_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_test_runs_diff ON test_runs(diff_run_id);
