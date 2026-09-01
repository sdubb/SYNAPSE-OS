/**
 * Provider Credential Isolation Suite
 *
 * Tests credential isolation, runtime isolation, revocation,
 * rotation, and verifies no plaintext exposure.
 */

import { CredentialEncryption } from '../packages/security/src/credential-encryption.js';
import { ProviderCredentialResolver } from '../packages/security/src/provider-credential-resolver.js';

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, name: string, detail?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

// ═══════════════════════════════════════════════════════════
// 1. ENCRYPTION / DECRYPTION
// ═══════════════════════════════════════════════════════════

section('1. Encryption / Decryption');

const enc = new CredentialEncryption('test-master-key-for-credential-encryption');
const testKey = 'sk-or-v1-abc123def456ghi789jkl012mno345pqr678stu901';
const encrypted = enc.encrypt(testKey);
const decrypted = enc.decrypt(encrypted);

assert(decrypted === testKey, 'Encrypt then decrypt produces original key');
assert(encrypted !== testKey, 'Encrypted value differs from plaintext');
assert(encrypted.split(':').length === 4, 'Encrypted format has 4 components (salt:iv:tag:ciphertext)');

// Tamper detection
const parts = encrypted.split(':');
const tampered = parts[0] + ':' + parts[1] + ':' + parts[2] + ':AAAA';
try {
  enc.decrypt(tampered);
  assert(false, 'Tampered ciphertext should fail decryption');
} catch {
  assert(true, 'Tampered ciphertext detected and rejected');
}

// Different keys produce different ciphertext
const encrypted2 = enc.encrypt(testKey);
assert(encrypted !== encrypted2, 'Same plaintext produces different ciphertext (random salt+iv)');

// Key prefix generation
const prefix = CredentialEncryption.deriveKeyPrefix(testKey);
assert(prefix.startsWith('sk-or-v1'), 'Key prefix starts with first 8 chars');
assert(prefix.endsWith('u901'), 'Key prefix ends with last 4 chars');
assert(!prefix.includes('abc123'), 'Key prefix masks middle characters');

// ═══════════════════════════════════════════════════════════
// 2. CREDENTIAL ISOLATION — USER A vs USER B
// ═══════════════════════════════════════════════════════════

section('2. Credential Isolation — Cross-User');

const resolver = new ProviderCredentialResolver('test-master-key-for-aes-256-encryption-32-chars');

// User A stores credential
resolver.storeCredential({
  id: 'cred_a1',
  userId: 'user_a',
  organizationId: 'org_a',
  provider: 'openrouter',
  status: 'active',
  plaintextSecret: 'sk-or-v1-userA-key-1234567890abcdef',
  metadata: { createdAt: new Date().toISOString() },
});

// User B stores credential
resolver.storeCredential({
  id: 'cred_b1',
  userId: 'user_b',
  organizationId: 'org_b',
  provider: 'openrouter',
  status: 'active',
  plaintextSecret: 'sk-or-v1-userB-key-abcdef1234567890',
  metadata: { createdAt: new Date().toISOString() },
});

// User A resolves their credential
const resolvedA = await resolver.resolve(
  { userId: 'user_a', organizationId: 'org_a' },
  'openrouter',
);
assert(resolvedA !== null, 'User A can resolve their own credential');
assert(resolvedA?.apiKey === 'sk-or-v1-userA-key-1234567890abcdef', 'User A gets their own API key');

// User A tries to resolve User B's credential — should fail
const stolenCred = await resolver.resolve(
  { userId: 'user_a', organizationId: 'org_a' },
  'openrouter',
  'cred_b1', // User A tries User B's credential ID
);
assert(stolenCred === null, 'User A cannot access User B credential by ID');

// User B cannot resolve User A's credential
const resolvedB = await resolver.resolve(
  { userId: 'user_b', organizationId: 'org_b' },
  'openrouter',
);
assert(resolvedB?.apiKey === 'sk-or-v1-userB-key-abcdef1234567890', 'User B gets their own API key, not User A');

// Cross-tenant attack
const crossTenant = await resolver.resolve(
  { userId: 'user_b', organizationId: 'org_a' }, // User B but Org A's context
  'openrouter',
);
assert(crossTenant === null, 'Cross-tenant credential access denied');

// ═══════════════════════════════════════════════════════════
// 3. RUNTIME ISOLATION — SIMULTANEOUS MISSIONS
// ═══════════════════════════════════════════════════════════

section('3. Runtime Isolation — Simultaneous Missions');

// User A has two missions running simultaneously
const missionA1 = await resolver.resolve(
  { userId: 'user_a', organizationId: 'org_a' },
  'openrouter',
);
const missionA2 = await resolver.resolve(
  { userId: 'user_a', organizationId: 'org_a' },
  'openrouter',
);

assert(missionA1?.apiKey === missionA2?.apiKey, 'Same user gets same credential for concurrent missions');
assert(missionA1?.credentialId === missionA2?.credentialId, 'Same credential ID for concurrent missions');

// User A and User B simultaneously — different credentials
const missionB1 = await resolver.resolve(
  { userId: 'user_b', organizationId: 'org_b' },
  'openrouter',
);
assert(missionA1?.apiKey !== missionB1?.apiKey, 'Different users get different credentials simultaneously');

// ═══════════════════════════════════════════════════════════
// 4. REVOCATION
// ═══════════════════════════════════════════════════════════

section('4. Revocation');

// Revoke User A's credential
const revoked = resolver.revoke('cred_a1', 'user_a');
assert(revoked === true, 'Credential revoked successfully');

// User A can no longer resolve
const afterRevoke = await resolver.resolve(
  { userId: 'user_a', organizationId: 'org_a' },
  'openrouter',
);
assert(afterRevoke === null, 'Revoked credential cannot be resolved');

// User B still has their credential
const stillActive = await resolver.resolve(
  { userId: 'user_b', organizationId: 'org_b' },
  'openrouter',
);
assert(stillActive !== null, 'Other users unaffected by revocation');

// Cannot revoke someone else's credential
const wrongUserRevoke = resolver.revoke('cred_b1', 'user_a');
assert(wrongUserRevoke === false, 'Cannot revoke another user credential');

// ═══════════════════════════════════════════════════════════
// 5. ROTATION
// ═══════════════════════════════════════════════════════════

section('5. Rotation');

// Re-create User A's credential (was revoked)
resolver.storeCredential({
  id: 'cred_a2',
  userId: 'user_a',
  organizationId: 'org_a',
  provider: 'openrouter',
  status: 'active',
  plaintextSecret: 'sk-or-v1-userA-newkey-9999999999999999',
  metadata: { createdAt: new Date().toISOString() },
});

// Rotate
const rotateResult = resolver.rotate('cred_a2', 'user_a', 'sk-or-v1-userA-rotated-1111111111111111');
assert(rotateResult.old !== null, 'Old credential returned after rotation');
assert(rotateResult.old?.status === 'revoked', 'Old credential marked as revoked');
assert(rotateResult.new !== null, 'New credential returned after rotation');
assert(rotateResult.new?.status === 'active', 'New credential is active');

// New credential works
const afterRotation = await resolver.resolve(
  { userId: 'user_a', organizationId: 'org_a' },
  'openrouter',
);
assert(afterRotation?.apiKey === 'sk-or-v1-userA-rotated-1111111111111111', 'New credential resolves to new key');

// Old credential ID no longer works
const oldAfterRotation = await resolver.resolve(
  { userId: 'user_a', organizationId: 'org_a' },
  'openrouter',
  'cred_a2',
);
assert(oldAfterRotation === null, 'Old credential ID no longer resolves after rotation');

// ═══════════════════════════════════════════════════════════
// 6. NO PLAINTEXT EXPOSURE
// ═══════════════════════════════════════════════════════════

section('6. No Plaintext Exposure');

// List safe metadata
const safeList = resolver.listSafeCredentials('user_b', 'org_b');
assert(safeList.length === 1, 'List returns credential metadata');
assert(!('apiKey' in safeList[0]), 'Safe metadata does not contain apiKey');
assert(!('secret' in safeList[0]), 'Safe metadata does not contain secret');
assert(!('encryptedSecret' in safeList[0]), 'Safe metadata does not contain encryptedSecret');
assert(safeList[0].keyPrefix.length > 0, 'Safe metadata contains keyPrefix');
assert(safeList[0].keyPrefix !== 'sk-or-v1-userB-key-abcdef1234567890', 'KeyPrefix is masked, not full key');

// Get safe metadata
const safeSingle = resolver.getSafeMetadata('cred_b1');
assert(safeSingle !== null, 'Get safe metadata returns data');
assert(!('apiKey' in (safeSingle || {})), 'Single safe metadata does not contain apiKey');

// ═══════════════════════════════════════════════════════════
// 7. PROVIDER SWITCHING
// ═══════════════════════════════════════════════════════════

section('7. Provider Switching');

// User B adds an OpenAI credential
resolver.storeCredential({
  id: 'cred_b2',
  userId: 'user_b',
  organizationId: 'org_b',
  provider: 'openai',
  status: 'active',
  plaintextSecret: 'sk-openai-userB-key-1234567890abcdef',
  metadata: { createdAt: new Date().toISOString() },
});

const openaiCred = await resolver.resolve(
  { userId: 'user_b', organizationId: 'org_b' },
  'openai',
);
assert(openaiCred?.apiKey === 'sk-openai-userB-key-1234567890abcdef', 'OpenAI credential resolves correctly');
assert(openaiCred?.provider === 'openai', 'Provider is openai');

const orCred = await resolver.resolve(
  { userId: 'user_b', organizationId: 'org_b' },
  'openrouter',
);
assert(orCred?.apiKey === 'sk-or-v1-userB-key-abcdef1234567890', 'OpenRouter credential still resolves');
assert(orCred?.provider === 'openrouter', 'Provider is openrouter');

// Switching provider doesn't leak previous
assert(openaiCred?.apiKey !== orCred?.apiKey, 'Different providers return different credentials');

// ═══════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════

console.log(`\n═══════════════════════════════════════════`);
console.log(`  Provider Credential Isolation Suite`);
console.log(`  ${passed}/${total} passed, ${failed} failed`);
console.log(`═══════════════════════════════════════════`);

if (failed > 0) {
  process.exit(1);
}
