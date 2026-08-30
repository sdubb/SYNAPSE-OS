# Provider Credential Architecture

> Date: 2026-08-30

## Authoritative Model

```
USER → FREEBUFF AUTH → SYNAPSE IDENTITY/TENANT → PROVIDER CREDENTIAL RESOLVER → CLINE RUNTIME → LLM PROVIDER
```

## One Source of Truth

Provider credentials are owned by Freebuff/Synapse. Cline receives them only at runtime.

```
Freebuff/Synapse (authoritative)
  → provider_credentials table
  → AES-256-GCM encrypted at rest
  → ProviderCredentialResolver decrypts in-memory only
  → ClineEngine receives runtime config
  → Cline never persists the plaintext credential
```

## Storage

- Table: `provider_credentials`
- Encryption: AES-256-GCM with PBKDF2-derived key (100k iterations)
- Format: `salt:iv:authTag:ciphertext` (base64 components)
- Key derivation: master key from `SYNAPSE_CREDENTIAL_ENCRYPTION_KEY` env var

## Never Exposed

The plaintext credential is NEVER returned through:
- Frontend API
- `/auth/me`
- Settings API
- WebSocket events
- Audit logs
- Mission events
- Error messages
- Telemetry
- Console logs

## Resolution Flow

1. Authenticated user creates mission
2. Backend resolves user's credential via `ProviderCredentialResolver.resolve()`
3. Resolver verifies: userId, organizationId, workspaceId ownership
4. Resolver checks: status=active, not expired
5. Resolver decrypts credential (in-memory only)
6. ClineEngine receives: `{ provider, apiKey, model, baseUrl }`
7. ClineEngine uses credential for LLM calls
8. After session ends, plaintext is garbage collected

## Rotation

1. User provides new API key
2. Old credential status → "revoked"
3. New credential stored encrypted
4. Next mission uses new credential
5. Old credential retained for audit trail (encrypted, revoked)

## Revocation

1. User revokes credential
2. Status → "revoked"
3. New missions cannot use this credential
4. Existing Cline runtime retains in-memory copy until session ends
5. No new LLM calls use the revoked credential

## Crash Behavior

- **Synapse crashes**: Plaintext credentials in memory are lost. On restart, resolver re-decrypts from DB.
- **Cline crashes**: In-memory credential is lost. Mission must restart and re-resolve credential.
- **Neither persist plaintext across crashes** — this is by design.

## Security Invariants

1. One user → one authorized provider context → one Cline runtime
2. Simultaneous users cannot cross credentials
3. MCP clients cannot retrieve credentials
4. Browser cannot retrieve plaintext
5. Audit logs never contain secrets
6. Encrypted at rest, decrypted only in trusted runtime
7. Rotation creates new, revokes old — no overlap
8. Revocation immediately blocks new usage
