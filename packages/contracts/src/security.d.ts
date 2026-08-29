import { z } from "zod";
export declare const UserRoleSchema: z.ZodEnum<["owner", "admin", "operator", "developer", "auditor", "verifier", "viewer"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export declare const PermissionActionSchema: z.ZodEnum<["tenant:read", "tenant:write", "tenant:delete", "agent:read", "agent:create", "agent:update", "agent:delete", "agent:execute", "agent:stop", "task:read", "task:create", "task:update", "task:delete", "task:execute", "session:read", "session:create", "session:interact", "session:abort", "policy:read", "policy:write", "approval:read", "approval:decide", "verification:read", "verification:run", "audit:read", "world:read", "world:write", "simulation:read", "simulation:run"]>;
export type PermissionAction = z.infer<typeof PermissionActionSchema>;
export declare const TenantSecurityContextSchema: z.ZodObject<{
    tenantId: z.ZodString;
    userId: z.ZodString;
    userEmail: z.ZodString;
    role: z.ZodEnum<["owner", "admin", "operator", "developer", "auditor", "verifier", "viewer"]>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodEnum<["tenant:read", "tenant:write", "tenant:delete", "agent:read", "agent:create", "agent:update", "agent:delete", "agent:execute", "agent:stop", "task:read", "task:create", "task:update", "task:delete", "task:execute", "session:read", "session:create", "session:interact", "session:abort", "policy:read", "policy:write", "approval:read", "approval:decide", "verification:read", "verification:run", "audit:read", "world:read", "world:write", "simulation:read", "simulation:run"]>, "many">>;
    sessionId: z.ZodOptional<z.ZodString>;
    clientIp: z.ZodOptional<z.ZodString>;
    userAgent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    role: "verifier" | "operator" | "owner" | "admin" | "developer" | "auditor" | "viewer";
    permissions: ("tenant:read" | "tenant:write" | "tenant:delete" | "agent:read" | "agent:create" | "agent:update" | "agent:delete" | "agent:execute" | "agent:stop" | "task:read" | "task:create" | "task:update" | "task:delete" | "task:execute" | "session:read" | "session:create" | "session:interact" | "session:abort" | "policy:read" | "policy:write" | "approval:read" | "approval:decide" | "verification:read" | "verification:run" | "audit:read" | "world:read" | "world:write" | "simulation:read" | "simulation:run")[];
    userId: string;
    userEmail: string;
    sessionId?: string | undefined;
    clientIp?: string | undefined;
    userAgent?: string | undefined;
}, {
    tenantId: string;
    role: "verifier" | "operator" | "owner" | "admin" | "developer" | "auditor" | "viewer";
    userId: string;
    userEmail: string;
    permissions?: ("tenant:read" | "tenant:write" | "tenant:delete" | "agent:read" | "agent:create" | "agent:update" | "agent:delete" | "agent:execute" | "agent:stop" | "task:read" | "task:create" | "task:update" | "task:delete" | "task:execute" | "session:read" | "session:create" | "session:interact" | "session:abort" | "policy:read" | "policy:write" | "approval:read" | "approval:decide" | "verification:read" | "verification:run" | "audit:read" | "world:read" | "world:write" | "simulation:read" | "simulation:run")[] | undefined;
    sessionId?: string | undefined;
    clientIp?: string | undefined;
    userAgent?: string | undefined;
}>;
export type TenantSecurityContext = z.infer<typeof TenantSecurityContextSchema>;
export declare const AuthTokenPayloadSchema: z.ZodObject<{
    sub: z.ZodString;
    tid: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["owner", "admin", "operator", "developer", "auditor", "verifier", "viewer"]>;
    permissions: z.ZodArray<z.ZodEnum<["tenant:read", "tenant:write", "tenant:delete", "agent:read", "agent:create", "agent:update", "agent:delete", "agent:execute", "agent:stop", "task:read", "task:create", "task:update", "task:delete", "task:execute", "session:read", "session:create", "session:interact", "session:abort", "policy:read", "policy:write", "approval:read", "approval:decide", "verification:read", "verification:run", "audit:read", "world:read", "world:write", "simulation:read", "simulation:run"]>, "many">;
    iat: z.ZodNumber;
    exp: z.ZodNumber;
    iss: z.ZodDefault<z.ZodString>;
    aud: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    role: "verifier" | "operator" | "owner" | "admin" | "developer" | "auditor" | "viewer";
    permissions: ("tenant:read" | "tenant:write" | "tenant:delete" | "agent:read" | "agent:create" | "agent:update" | "agent:delete" | "agent:execute" | "agent:stop" | "task:read" | "task:create" | "task:update" | "task:delete" | "task:execute" | "session:read" | "session:create" | "session:interact" | "session:abort" | "policy:read" | "policy:write" | "approval:read" | "approval:decide" | "verification:read" | "verification:run" | "audit:read" | "world:read" | "world:write" | "simulation:read" | "simulation:run")[];
    sub: string;
    tid: string;
    email: string;
    iat: number;
    exp: number;
    iss: string;
    aud: string;
}, {
    role: "verifier" | "operator" | "owner" | "admin" | "developer" | "auditor" | "viewer";
    permissions: ("tenant:read" | "tenant:write" | "tenant:delete" | "agent:read" | "agent:create" | "agent:update" | "agent:delete" | "agent:execute" | "agent:stop" | "task:read" | "task:create" | "task:update" | "task:delete" | "task:execute" | "session:read" | "session:create" | "session:interact" | "session:abort" | "policy:read" | "policy:write" | "approval:read" | "approval:decide" | "verification:read" | "verification:run" | "audit:read" | "world:read" | "world:write" | "simulation:read" | "simulation:run")[];
    sub: string;
    tid: string;
    email: string;
    iat: number;
    exp: number;
    iss?: string | undefined;
    aud?: string | undefined;
}>;
export type AuthTokenPayload = z.infer<typeof AuthTokenPayloadSchema>;
export declare const EncryptedCredentialEnvelopeSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    keyId: z.ZodString;
    algorithm: z.ZodDefault<z.ZodEnum<["aes-256-gcm", "chacha20-poly1305"]>>;
    ciphertext: z.ZodString;
    iv: z.ZodString;
    authTag: z.ZodString;
    createdAt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    createdAt: string;
    keyId: string;
    algorithm: "aes-256-gcm" | "chacha20-poly1305";
    ciphertext: string;
    iv: string;
    authTag: string;
}, {
    id: string;
    tenantId: string;
    keyId: string;
    ciphertext: string;
    iv: string;
    authTag: string;
    createdAt?: string | undefined;
    algorithm?: "aes-256-gcm" | "chacha20-poly1305" | undefined;
}>;
export type EncryptedCredentialEnvelope = z.infer<typeof EncryptedCredentialEnvelopeSchema>;
//# sourceMappingURL=security.d.ts.map