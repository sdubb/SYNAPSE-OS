import { z } from "zod";

export const CapabilityTypeSchema = z.enum([
  "cline_tool",
  "mcp_server",
  "connector",
  "custom_tool",
  "api_integration",
  "knowledge_source",
  "verification_strategy",
]);
export type CapabilityType = z.infer<typeof CapabilityTypeSchema>;

export const CapabilityRiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export type CapabilityRiskLevel = z.infer<typeof CapabilityRiskLevelSchema>;

export const CapabilityDefinitionSchema = z.object({
  id: z.string(), // e.g. "cline.read_files", "mcp.postgres", "connector.slack", "company.internal.crm"
  name: z.string().min(1).max(128),
  description: z.string().max(2048),
  type: CapabilityTypeSchema,
  provider: z.string().default("builtin"),
  version: z.string().default("1.0.0"),
  parametersSchema: z.record(z.string(), z.unknown()).optional(),
  requiredPermissions: z.array(z.string()).default([]),
  requiredSecrets: z.array(z.string()).default([]),
  riskLevel: CapabilityRiskLevelSchema.default("low"),
  isDynamic: z.boolean().default(false),
  tenantId: z.string().uuid().optional(), // undefined = global system capability
  enabled: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type CapabilityDefinition = z.infer<typeof CapabilityDefinitionSchema>;
export type CapabilityInput = z.input<typeof CapabilityDefinitionSchema>;

/**
 * Universal, Dynamic Capability Registry.
 * Capabilities are not hardcoded into Synapse; any tool, MCP, connector, or custom
 * integration can be registered dynamically at runtime without code changes.
 */
export class CapabilityRegistry {
  private capabilities: Map<string, CapabilityDefinition> = new Map();

  constructor() {
    this.registerBuiltinCapabilities();
  }

  public register(capability: CapabilityInput): CapabilityDefinition {
    const validated = CapabilityDefinitionSchema.parse(capability);
    this.capabilities.set(validated.id, validated);
    return validated;
  }

  public unregister(id: string): boolean {
    return this.capabilities.delete(id);
  }

  public get(id: string): CapabilityDefinition | undefined {
    return this.capabilities.get(id);
  }

  public has(id: string): boolean {
    return this.capabilities.has(id);
  }

  public list(filter?: {
    type?: CapabilityType;
    tenantId?: string;
    riskLevel?: CapabilityRiskLevel;
  }): CapabilityDefinition[] {
    let result = Array.from(this.capabilities.values());

    if (filter?.type) {
      result = result.filter((c) => c.type === filter.type);
    }
    if (filter?.riskLevel) {
      result = result.filter((c) => c.riskLevel === filter.riskLevel);
    }
    if (filter?.tenantId) {
      result = result.filter((c) => !c.tenantId || c.tenantId === filter.tenantId);
    }

    return result;
  }

  public validateCapabilities(capabilityIds: string[]): {
    valid: boolean;
    missing: string[];
    riskScore: number;
    requiredSecrets: string[];
  } {
    const missing: string[] = [];
    const requiredSecrets = new Set<string>();
    let maxRiskWeight = 0;

    const riskWeights: Record<CapabilityRiskLevel, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    for (const id of capabilityIds) {
      const cap = this.get(id);
      if (!cap) {
        missing.push(id);
      } else {
        cap.requiredSecrets.forEach((s) => requiredSecrets.add(s));
        maxRiskWeight = Math.max(maxRiskWeight, riskWeights[cap.riskLevel]);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      riskScore: maxRiskWeight,
      requiredSecrets: Array.from(requiredSecrets),
    };
  }

  private registerBuiltinCapabilities(): void {
    // Native Cline Execution Capabilities
    this.register({
      id: "cline.read_files",
      name: "Read Files",
      description: "Inspect file contents in workspace",
      type: "cline_tool",
      provider: "cline",
      riskLevel: "low",
      requiredPermissions: ["filesystem:read"],
    });

    this.register({
      id: "cline.edit_files",
      name: "Edit Files",
      description: "Create and modify workspace files",
      type: "cline_tool",
      provider: "cline",
      riskLevel: "medium",
      requiredPermissions: ["filesystem:write"],
    });

    this.register({
      id: "cline.run_commands",
      name: "Execute Terminal Commands",
      description: "Execute bash/powershell commands in sandbox",
      type: "cline_tool",
      provider: "cline",
      riskLevel: "high",
      requiredPermissions: ["terminal:execute"],
    });

    this.register({
      id: "cline.search",
      name: "Code Search",
      description: "Grep and regex search codebase",
      type: "cline_tool",
      provider: "cline",
      riskLevel: "low",
      requiredPermissions: ["filesystem:read"],
    });

    this.register({
      id: "cline.browser",
      name: "Browser Automation",
      description: "Interact with web pages in headless browser",
      type: "cline_tool",
      provider: "cline",
      riskLevel: "medium",
      requiredPermissions: ["network:browser"],
    });
  }
}

export const globalCapabilityRegistry = new CapabilityRegistry();
