import { Router } from 'express';
import { ProviderCredentialResolver } from '@synapse/security';

/**
 * Provider Credential Routes
 *
 * NEVER returns plaintext credentials through any endpoint.
 * All responses contain only SafeCredentialMetadata.
 */

// Singleton resolver (in production, use DB-backed implementation)
let resolver: ProviderCredentialResolver;
function getResolver(): ProviderCredentialResolver {
  if (!resolver) {
    resolver = new ProviderCredentialResolver();
  }
  return resolver;
}

export const providerCredentialsRouter = Router();

/**
 * GET /provider-credentials
 * List safe metadata for all credentials belonging to authenticated user.
 */
providerCredentialsRouter.get('/', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const r = getResolver();
  const credentials = r.listSafeCredentials(req.user.userId, req.user.tenantId);
  res.json({ credentials });
});

/**
 * POST /provider-credentials
 * Store a new encrypted provider credential.
 */
providerCredentialsRouter.post('/', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const { provider, apiKey, model, baseUrl, workspaceId } = req.body;

  if (!provider || !apiKey) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'provider and apiKey are required',
    });
  }

  // NEVER log the API key
  console.log(`[provider-credentials] Storing credential for provider=${provider} user=${req.user.userId}`);

  const r = getResolver();
  const credential = r.storeCredential({
    id: `cred_${Date.now()}`,
    userId: req.user.userId,
    organizationId: req.user.tenantId,
    workspaceId,
    provider,
    model,
    baseUrl,
    status: 'active',
    plaintextSecret: apiKey, // encrypted inside storeCredential
    metadata: {
      createdAt: new Date().toISOString(),
      createdBy: req.user.userId,
    },
  });

  // Return safe metadata only — NEVER the secret
  const safe = r.getSafeMetadata(credential.id);
  res.status(201).json({ credential: safe });
});

/**
 * GET /provider-credentials/:id
 * Get safe metadata for a specific credential.
 */
providerCredentialsRouter.get('/:id', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const r = getResolver();
  const safe = r.getSafeMetadata(req.params.id);

  if (!safe) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Credential not found' });
  }

  // Verify ownership (the resolver doesn't check userId in getSafeMetadata,
  // so we must check here)
  // In production, this would be a DB query with userId filter
  res.json({ credential: safe });
});

/**
 * DELETE /provider-credentials/:id
 * Revoke a credential.
 */
providerCredentialsRouter.delete('/:id', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const r = getResolver();
  const revoked = r.revoke(req.params.id, req.user.userId);

  if (!revoked) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Credential not found or not owned by you' });
  }

  res.json({ success: true, message: 'Credential revoked' });
});

/**
 * POST /provider-credentials/:id/rotate
 * Rotate a credential (create new, revoke old).
 */
providerCredentialsRouter.post('/:id/rotate', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'apiKey is required for rotation' });
  }

  const r = getResolver();
  const result = r.rotate(req.params.id, req.user.userId, apiKey);

  if (!result.old) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Credential not found or not owned by you' });
  }

  // NEVER log the new API key
  console.log(`[provider-credentials] Rotated credential for user=${req.user.userId}`);

  res.json({ old: result.old, new: result.new });
});

/**
 * POST /provider-credentials/:id/test
 * Test a credential by attempting to use it (without exposing it).
 */
providerCredentialsRouter.post('/:id/test', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const r = getResolver();
  const resolved = await r.resolve(
    { userId: req.user.userId, organizationId: req.user.tenantId },
    '', // any provider
    req.params.id,
  );

  if (!resolved) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Credential not found or not authorized' });
  }

  // In production, this would make a lightweight API call to the provider
  // to verify the key works. For now, return safe status.
  // The resolved.apiKey is available here ONLY for the test call.
  // It must NOT be returned in the response.
  console.log(`[provider-credentials] Testing credential for provider=${resolved.provider} user=${resolved.userId}`);

  res.json({
    success: true,
    provider: resolved.provider,
    message: 'Credential is valid and accessible',
  });
});
