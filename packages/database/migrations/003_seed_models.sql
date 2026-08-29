INSERT INTO llm_models (tenant_id, model_id, provider, display_name, context_window, input_pricing_per_1m, output_pricing_per_1m, rate_limit_rpm, rate_limit_tpm, enabled, capabilities) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'claude-3-5-sonnet', 'anthropic', 'Claude 3.5 Sonnet', 200000, 3.00, 15.00, 8000, 800000, true, '["vision","function_calling"]'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gpt-4o', 'openai', 'GPT-4o Omnimodal', 128000, 2.50, 10.00, 5000, 500000, true, '["vision","function_calling","audio"]'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gpt-4o-mini', 'openai', 'GPT-4o Mini', 128000, 0.15, 0.60, 10000, 1000000, true, '["vision","function_calling"]'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-1-5-pro', 'google', 'Gemini 1.5 Pro (2M Context)', 2000000, 1.25, 5.00, 2000, 1000000, true, '["vision","function_calling","code_execution"]'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-2-0-flash', 'google', 'Gemini 2.0 Flash', 1000000, 0.10, 0.40, 15000, 1000000, true, '["vision","function_calling"]'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'deepseek-r1', 'deepseek', 'DeepSeek R1 Reasoning', 64000, 0.55, 2.19, 3000, 300000, true, '["reasoning","function_calling"]'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'deepseek-v3', 'deepseek', 'DeepSeek V3', 64000, 0.27, 1.10, 3000, 300000, true, '["function_calling"]'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'llama-3.3-70b', 'ollama', 'Llama 3.3 70B (Local)', 128000, 0, 0, 100, 100000, true, '["function_calling"]')
ON CONFLICT DO NOTHING;

SELECT count(*) AS total_models FROM llm_models;
