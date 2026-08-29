import { CapabilityRegistry, globalCapabilityRegistry } from "@synapse/capabilities";

export class CapabilityAuthorizer {
  constructor(private readonly registry: CapabilityRegistry = globalCapabilityRegistry) {}

  /**
   * Check if an agent has permission to execute the requested tool.
   */
  public checkCapability(
    toolName: string,
    allowedCapabilities?: readonly string[]
  ): { authorized: boolean; reason?: string } {
    // Map tool names to canonical capability IDs
    const capabilityId = this.resolveCapabilityId(toolName);

    // If allowedCapabilities is specified, check against it
    if (allowedCapabilities && allowedCapabilities.length > 0) {
      const isExplicitlyAllowed =
        allowedCapabilities.includes(toolName) ||
        allowedCapabilities.includes(capabilityId) ||
        allowedCapabilities.includes("*");

      if (!isExplicitlyAllowed) {
        return {
          authorized: false,
          reason: `Agent missing required capability '${capabilityId}' (or tool '${toolName}') in assigned capabilities list`,
        };
      }
    }

    // Check registry: if registered and disabled
    const capDef = this.registry.get(capabilityId);
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
