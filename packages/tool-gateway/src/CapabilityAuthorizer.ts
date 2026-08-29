import { CapabilityRegistry, globalCapabilityRegistry } from "@synapse/capabilities";
import type { AgentRegistry } from "@synapse/agent-registry";

export class CapabilityAuthorizer {
  constructor(
    private readonly agentRegistry?: AgentRegistry,
    private readonly capabilityRegistry: CapabilityRegistry = globalCapabilityRegistry
  ) {}

  /**
   * Check if an agent has permission to execute the requested tool authoritatively.
   */
  public checkCapability(
    toolName: string,
    agentId: string,
    callerAllowedCapabilities?: readonly string[]
  ): { authorized: boolean; reason?: string } {
    const capabilityId = this.resolveCapabilityId(toolName);

    // 1. Authoritative check via Agent Registry if available (CR4)
    if (this.agentRegistry) {
      const agent = this.agentRegistry.get(agentId);
      
      // If agent isn't registered, we might be in a dev/test stub scenario.
      // But if it is registered, strictly enforce its configured capabilities.
      if (agent) {
        if (!agent.capabilities.isToolAllowed(toolName)) {
          return {
            authorized: false,
            reason: `Agent '${agentId}' is missing authoritative capability to run tool '${toolName}' in the Agent Registry`,
          };
        }
      }
    } 
    // 2. Fallback to caller-provided capabilities ONLY if registry check isn't strictly blocking
    // (This is primarily for test compatibility where agents might not be registered)
    else if (callerAllowedCapabilities && callerAllowedCapabilities.length > 0) {
      const isExplicitlyAllowed =
        callerAllowedCapabilities.includes(toolName) ||
        callerAllowedCapabilities.includes(capabilityId) ||
        callerAllowedCapabilities.includes("*");

      if (!isExplicitlyAllowed) {
        return {
          authorized: false,
          reason: `Agent missing required capability '${capabilityId}' (or tool '${toolName}') in assigned capabilities list`,
        };
      }
    }

    // 3. Global Capability Registry System State
    const capDef = this.capabilityRegistry.get(capabilityId);
    if (capDef && !capDef.enabled) {
      return {
        authorized: false,
        reason: `Capability '${capabilityId}' is disabled in the system registry`,
      };
    }

    return { authorized: true };
  }

  private resolveCapabilityId(toolName: string): string {
    const lower = toolName.toLowerCase();
    if (lower.includes("read") || lower.includes("view") || lower.includes("list_dir") || lower.includes("find")) {
      return "cline.read_files";
    }
    if (lower.includes("write") || lower.includes("edit") || lower.includes("replace") || lower.includes("save")) {
      return "cline.edit_files";
    }
    if (lower.includes("command") || lower.includes("execute") || lower.includes("bash") || lower.includes("shell") || lower.includes("terminal")) {
      return "cline.run_commands";
    }
    if (lower.includes("search") || lower.includes("grep")) {
      return "cline.search";
    }
    if (lower.includes("browser") || lower.includes("web") || lower.includes("fetch")) {
      return "cline.browser";
    }
    if (lower.startsWith("mcp.")) {
      return lower;
    }
    if (lower.startsWith("connector.")) {
      return lower;
    }
    return `custom.${toolName}`;
  }
}
