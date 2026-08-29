-- Push Drizzle schema tables to PostgreSQL
-- Missing tables: tenants, tasks, sessions, policies, approvals, audit_logs,
-- verification_plans, verification_runs, evidence, artifacts, verifications,
-- schedules, schedule_runs, world_models, world_entities, world_relationships,
-- world_snapshots, simulation_scenarios, simulation_runs

-- Note: agents and users already exist but may have different columns.
-- We use CREATE TABLE IF NOT EXISTS so existing tables are preserved.

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  slug VARCHAR(64) NOT NULL UNIQUE,
  description TEXT,
  plan VARCHAR(32) NOT NULL DEFAULT 'enterprise',
  is_active BOOLEAN NOT NULL DEFAULT true,
  quotas JSONB NOT NULL DEFAULT '{"maxConcurrentSessions":20,"maxActiveAgents":50,"maxDailyTokenSpendUsd":500,"maxRequestsPerMinute":600,"maxStorageBytes":53687091200}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(32) NOT NULL DEFAULT 'developer',
  permissions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_idx ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON users(tenant_id);

-- ============================================================
-- AGENTS (new schema - only create if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  role VARCHAR(32) NOT NULL DEFAULT 'engineer',
  mode VARCHAR(32) NOT NULL DEFAULT 'supervised',
  model JSONB NOT NULL,
  fallback_models JSONB NOT NULL DEFAULT '[]',
  system_prompt TEXT NOT NULL DEFAULT '',
  custom_instructions TEXT,
  capabilities JSONB NOT NULL DEFAULT '{}',
  timeout_seconds NUMERIC NOT NULL DEFAULT '3600',
  max_budget_usd NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agents_tenant_id_idx ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS agents_role_idx ON agents(role);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_task_id UUID,
  workspace_id UUID NOT NULL,
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  team_id UUID,
  title VARCHAR(256) NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'backlog',
  priority VARCHAR(32) NOT NULL DEFAULT 'medium',
  dependencies JSONB NOT NULL DEFAULT '[]',
  policy_ids JSONB NOT NULL DEFAULT '[]',
  verification_plan_id UUID,
  retry_policy JSONB NOT NULL DEFAULT '{"maxRetries":3,"currentRetry":0,"backoffMs":5000,"exponential":true}',
  execution_result JSONB,
  tags JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_tenant_id_idx ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_assigned_agent_idx ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS tasks_workspace_idx ON tasks(workspace_id);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  cline_session_id VARCHAR(256) NOT NULL,
  workspace_id UUID NOT NULL,
  runtime_id UUID NOT NULL,
  parent_session_id UUID,
  status VARCHAR(32) NOT NULL DEFAULT 'initializing',
  mode VARCHAR(32) NOT NULL DEFAULT 'interactive',
  title VARCHAR(256),
  token_usage JSONB NOT NULL DEFAULT '{"promptTokens":0,"completionTokens":0,"totalTokens":0,"estimatedCostUsd":0}',
  runtime_metadata JSONB NOT NULL,
  active_checkpoints JSONB NOT NULL DEFAULT '[]',
  last_checkpoint_id VARCHAR(256),
  metadata JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_tenant_id_idx ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS sessions_cline_id_idx ON sessions(cline_session_id);
CREATE INDEX IF NOT EXISTS sessions_agent_id_idx ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS sessions_task_id_idx ON sessions(task_id);

-- ============================================================
-- POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  scope VARCHAR(32) NOT NULL DEFAULT 'tenant',
  target_id VARCHAR(256),
  enabled BOOLEAN NOT NULL DEFAULT true,
  rules JSONB NOT NULL DEFAULT '[]',
  default_decision VARCHAR(32) NOT NULL DEFAULT 'REQUIRE_APPROVAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS policies_tenant_id_idx ON policies(tenant_id);
CREATE INDEX IF NOT EXISTS policies_scope_idx ON policies(scope);

-- ============================================================
-- APPROVALS
-- ============================================================
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  task_id UUID,
  workspace_id UUID,
  cline_session_id VARCHAR(256) NOT NULL,
  call_id VARCHAR(256) NOT NULL,
  tool_name VARCHAR(128) NOT NULL,
  tool_parameters JSONB NOT NULL DEFAULT '{}',
  risk_level VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
  reason TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  expires_at TIMESTAMPTZ NOT NULL,
  decided_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  decision VARCHAR(32),
  decision_reason TEXT,
  modified_parameters JSONB,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approvals_tenant_id_idx ON approvals(tenant_id);
CREATE INDEX IF NOT EXISTS approvals_session_id_idx ON approvals(session_id);
CREATE INDEX IF NOT EXISTS approvals_status_idx ON approvals(status);
CREATE INDEX IF NOT EXISTS approvals_expires_at_idx ON approvals(expires_at);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  event_type VARCHAR(128) NOT NULL,
  source VARCHAR(64) NOT NULL,
  agent_id UUID,
  session_id UUID,
  task_id UUID,
  workspace_id UUID,
  user_id UUID,
  trace_id VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  ip_address VARCHAR(64),
  sequence BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_idx ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS audit_logs_event_type_idx ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS audit_logs_trace_id_idx ON audit_logs(trace_id);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS audit_logs_session_id_idx ON audit_logs(session_id);

-- ============================================================
-- VERIFICATION PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  name VARCHAR(256) NOT NULL,
  description TEXT,
  assertions JSONB NOT NULL DEFAULT '[]',
  require_verifier_agent BOOLEAN NOT NULL DEFAULT false,
  verifier_agent_prompt TEXT,
  max_execution_time_ms INTEGER NOT NULL DEFAULT 300000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_plans_tenant_id_idx ON verification_plans(tenant_id);
CREATE INDEX IF NOT EXISTS verification_plans_task_id_idx ON verification_plans(task_id);

-- ============================================================
-- VERIFICATION RUNS
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES verification_plans(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  workspace_id UUID,
  overall_verdict VARCHAR(32) NOT NULL DEFAULT 'INCONCLUSIVE',
  assertion_results JSONB NOT NULL DEFAULT '[]',
  summary TEXT,
  evidence_chain_root_hash VARCHAR(64),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS verification_runs_tenant_id_idx ON verification_runs(tenant_id);
CREATE INDEX IF NOT EXISTS verification_runs_plan_id_idx ON verification_runs(plan_id);
CREATE INDEX IF NOT EXISTS verification_runs_task_id_idx ON verification_runs(task_id);
CREATE INDEX IF NOT EXISTS verification_runs_verdict_idx ON verification_runs(overall_verdict);

-- ============================================================
-- EVIDENCE
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_run_id UUID REFERENCES verification_runs(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  kind VARCHAR(64) NOT NULL,
  label VARCHAR(256) NOT NULL,
  content TEXT NOT NULL,
  content_sha256 VARCHAR(64) NOT NULL,
  mime_type VARCHAR(128) NOT NULL DEFAULT 'text/plain',
  byte_size INTEGER NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_tenant_id_idx ON evidence(tenant_id);
CREATE INDEX IF NOT EXISTS evidence_verification_run_id_idx ON evidence(verification_run_id);
CREATE INDEX IF NOT EXISTS evidence_sha256_idx ON evidence(content_sha256);

-- ============================================================
-- ARTIFACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id UUID,
  session_id UUID,
  task_id UUID,
  name VARCHAR(256) NOT NULL,
  storage_path TEXT NOT NULL,
  sha256 VARCHAR(64) NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS artifacts_tenant_id_idx ON artifacts(tenant_id);
CREATE INDEX IF NOT EXISTS artifacts_workspace_id_idx ON artifacts(workspace_id);
CREATE INDEX IF NOT EXISTS artifacts_sha256_idx ON artifacts(sha256);

-- ============================================================
-- VERIFICATIONS (flat)
-- ============================================================
CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  agent_id UUID,
  task_id UUID,
  verdict VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  summary TEXT,
  assertion_results JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verifications_tenant_id_idx ON verifications(tenant_id);
CREATE INDEX IF NOT EXISTS verifications_session_id_idx ON verifications(session_id);
CREATE INDEX IF NOT EXISTS verifications_verdict_idx ON verifications(verdict);

-- ============================================================
-- SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  name VARCHAR(256) NOT NULL,
  description TEXT,
  cron_expression VARCHAR(128) NOT NULL,
  prompt TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  max_runs INTEGER,
  current_run_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS schedules_tenant_id_idx ON schedules(tenant_id);
CREATE INDEX IF NOT EXISTS schedules_enabled_idx ON schedules(enabled);
CREATE INDEX IF NOT EXISTS schedules_next_run_idx ON schedules(next_run_at);

-- ============================================================
-- SCHEDULE RUNS
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  session_id UUID,
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS schedule_runs_tenant_id_idx ON schedule_runs(tenant_id);
CREATE INDEX IF NOT EXISTS schedule_runs_schedule_id_idx ON schedule_runs(schedule_id);
CREATE INDEX IF NOT EXISTS schedule_runs_status_idx ON schedule_runs(status);

-- ============================================================
-- WORLD MODELS
-- ============================================================
CREATE TABLE IF NOT EXISTS world_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(256) NOT NULL,
  description TEXT,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS world_models_tenant_id_idx ON world_models(tenant_id);

-- ============================================================
-- WORLD ENTITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS world_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  world_model_id UUID NOT NULL REFERENCES world_models(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL,
  name VARCHAR(256) NOT NULL,
  description TEXT,
  properties JSONB NOT NULL DEFAULT '{}',
  state JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS world_entities_tenant_id_idx ON world_entities(tenant_id);
CREATE INDEX IF NOT EXISTS world_entities_world_model_id_idx ON world_entities(world_model_id);
CREATE INDEX IF NOT EXISTS world_entities_type_idx ON world_entities(type);

-- ============================================================
-- WORLD RELATIONSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS world_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  world_model_id UUID NOT NULL REFERENCES world_models(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL REFERENCES world_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES world_entities(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS world_relationships_tenant_id_idx ON world_relationships(tenant_id);
CREATE INDEX IF NOT EXISTS world_relationships_world_model_id_idx ON world_relationships(world_model_id);
CREATE INDEX IF NOT EXISTS world_relationships_source_idx ON world_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS world_relationships_target_idx ON world_relationships(target_entity_id);

-- ============================================================
-- WORLD SNAPSHOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS world_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  world_model_id UUID NOT NULL REFERENCES world_models(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  entity_states JSONB NOT NULL DEFAULT '{}',
  checksum_sha256 VARCHAR(64) NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS world_snapshots_tenant_id_idx ON world_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS world_snapshots_world_model_id_idx ON world_snapshots(world_model_id);

-- ============================================================
-- SIMULATION SCENARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS simulation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  world_model_id UUID NOT NULL REFERENCES world_models(id) ON DELETE CASCADE,
  name VARCHAR(256) NOT NULL,
  description TEXT,
  base_snapshot_id UUID,
  actions JSONB NOT NULL DEFAULT '[]',
  duration_virtual_ms INTEGER NOT NULL DEFAULT 3600000,
  tick_interval_ms INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS simulation_scenarios_tenant_id_idx ON simulation_scenarios(tenant_id);
CREATE INDEX IF NOT EXISTS simulation_scenarios_world_model_id_idx ON simulation_scenarios(world_model_id);

-- ============================================================
-- SIMULATION RUNS
-- ============================================================
CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES simulation_scenarios(id) ON DELETE CASCADE,
  world_model_id UUID NOT NULL REFERENCES world_models(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  current_tick INTEGER NOT NULL DEFAULT 0,
  current_virtual_time_ms INTEGER NOT NULL DEFAULT 0,
  diff_history JSONB NOT NULL DEFAULT '[]',
  comparative_result JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS simulation_runs_tenant_id_idx ON simulation_runs(tenant_id);
CREATE INDEX IF NOT EXISTS simulation_runs_scenario_id_idx ON simulation_runs(scenario_id);
CREATE INDEX IF NOT EXISTS simulation_runs_status_idx ON simulation_runs(status);
