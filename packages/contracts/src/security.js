import { z } from "zod";
export const UserRoleSchema = z.enum(["owner", "admin", "operator", "developer", "auditor", "verifier", "viewer"]);
export const PermissionActionSchema = z.enum([
    "tenant:read",
    "tenant:write",
    "tenant:delete",
    "agent:read",
    "agent:create",
    "agent:update",
    "agent:delete",
    "agent:execute",
    "agent:stop",
    "task:read",
    "task:create",
    "task:update",
    "task:delete",
    "task:execute",
    "session:read",
    "session:create",
    "session:interact",
    "session:abort",
    "policy:read",
    "policy:write",
    "approval:read",
    "approval:decide",
    "verification:read",
    "verification:run",
    "audit:read",
    "world:read",
    "world:write",
    "simulation:read",
    "simulation:run",
]);
export const TenantSecurityContextSchema = z.object({
    tenantId: z.string().uuid(),
    userId: z.string().uuid(),
    userEmail: z.string().email(),
    role: UserRoleSchema,
    permissions: z.array(PermissionActionSchema).default([]),
    sessionId: z.string().uuid().optional(),
    clientIp: z.string().optional(),
    userAgent: z.string().optional(),
});
export const AuthTokenPayloadSchema = z.object({
    sub: z.string().uuid(), // userId
    tid: z.string().uuid(), // tenantId
    email: z.string().email(),
    role: UserRoleSchema,
    permissions: z.array(PermissionActionSchema),
    iat: z.number().int(),
    exp: z.number().int(),
    iss: z.string().default("synapse-os"),
    aud: z.string().default("synapse-control-plane"),
});
export const EncryptedCredentialEnvelopeSchema = z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    keyId: z.string().min(1),
    algorithm: z.enum(["aes-256-gcm", "chacha20-poly1305"]).default("aes-256-gcm"),
    ciphertext: z.string().min(1), // Base64 encoded
    iv: z.string().min(1), // Base64 encoded initialization vector
    authTag: z.string().min(1), // Base64 encoded auth tag
    createdAt: z.string().datetime().default(() => new Date().toISOString()),
});
//# sourceMappingURL=security.js.map