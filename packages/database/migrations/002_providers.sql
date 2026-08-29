-- Provider Keys table
CREATE TABLE IF NOT EXISTS provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(64) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  endpoint_url TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  last_validated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_keys_tenant_id_idx ON provider_keys(tenant_id);
CREATE INDEX IF NOT EXISTS provider_keys_provider_idx ON provider_keys(provider);

-- LLM Models table
CREATE TABLE IF NOT EXISTS llm_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_id VARCHAR(128) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  display_name VARCHAR(256) NOT NULL,
  context_window NUMERIC NOT NULL DEFAULT 128000,
  input_pricing_per_1m NUMERIC(10,4) NOT NULL DEFAULT 0,
  output_pricing_per_1m NUMERIC(10,4) NOT NULL DEFAULT 0,
  rate_limit_rpm NUMERIC NOT NULL DEFAULT 1000,
  rate_limit_tpm NUMERIC NOT NULL DEFAULT 100000,
  availability VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  capabilities JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS llm_models_tenant_id_idx ON llm_models(tenant_id);
CREATE INDEX IF NOT EXISTS llm_models_provider_idx ON llm_models(provider);
CREATE INDEX IF NOT EXISTS llm_models_model_id_idx ON llm_models(model_id);
