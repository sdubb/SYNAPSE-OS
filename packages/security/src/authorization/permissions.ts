import { type PermissionAction } from "@synapse/contracts";

export const PERMISSION_LIST: readonly PermissionAction[] = [
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
] as const;

export const ADMIN_PERMISSIONS: PermissionAction[] = [...PERMISSION_LIST];

export const DEVELOPER_PERMISSIONS: PermissionAction[] = [
  "tenant:read",
  "agent:read",
  "agent:create",
  "agent:update",
  "agent:execute",
  "task:read",
  "task:create",
  "task:update",
  "task:execute",
  "session:read",
  "session:create",
  "session:interact",
  "policy:read",
  "approval:read",
  "verification:read",
  "verification:run",
  "audit:read",
  "world:read",
  "simulation:read",
  "simulation:run",
];

export const OPERATOR_PERMISSIONS: PermissionAction[] = [
  "tenant:read",
  "agent:read",
  "agent:execute",
  "agent:stop",
  "task:read",
  "task:execute",
  "session:read",
  "session:interact",
  "session:abort",
  "approval:read",
  "approval:decide",
  "policy:read",
  "verification:read",
  "verification:run",
  "audit:read",
];

export const AUDITOR_PERMISSIONS: PermissionAction[] = [
  "tenant:read",
  "agent:read",
  "task:read",
  "session:read",
  "policy:read",
  "approval:read",
  "verification:read",
  "audit:read",
  "world:read",
  "simulation:read",
];

export const VERIFIER_PERMISSIONS: PermissionAction[] = [
  "tenant:read",
  "agent:read",
  "task:read",
  "session:read",
  "verification:read",
  "verification:run",
  "audit:read",
];

export const VIEWER_PERMISSIONS: PermissionAction[] = [
  "tenant:read",
  "agent:read",
  "task:read",
  "session:read",
  "policy:read",
  "verification:read",
];
