/**
 * @file AgentCapabilities.ts
 * @description Comprehensive capability matrix, permission evaluation, and tool gating for Synapse OS agents.
 */

export type ToolPermissionLevel = 'ALLOWED' | 'DENIED' | 'REQUIRE_APPROVAL';

export interface ToolCapabilityRule {
  readonly toolName: string;
  readonly permission: ToolPermissionLevel;
  readonly maxInvocationsPerSession?: number;
  readonly allowedParameters?: Record<string, unknown>;
  readonly restrictedParameters?: Record<string, string[]>;
  readonly rateLimitPerMinute?: number;
}

export interface FileSystemPermissions {
  readonly allowedReadPaths: readonly string[];
  readonly allowedWritePaths: readonly string[];
  readonly deniedPaths: readonly string[];
  readonly maxFileSizeBytes: number;
  readonly allowSymlinks: boolean;
  readonly allowExecutables: boolean;
}

export interface ShellCommandRestrictions {
  readonly allowedCommands: readonly string[];
  readonly forbiddenPatterns: readonly string[];
  readonly maxExecutionTimeMs: number;
  readonly maxOutputBufferBytes: number;
  readonly allowInteractive: boolean;
  readonly allowRootOrSudo: boolean;
}

export interface NetworkEgressRules {
  readonly allowedHosts: readonly string[];
  readonly deniedHosts: readonly string[];
  readonly allowedPorts: readonly number[];
  readonly allowInsecureHttp: boolean;
  readonly blockPrivateSubnets: boolean;
}

export interface SubAgentPermissions {
  readonly canSpawnSubAgents: boolean;
  readonly maxSpawnDepth: number;
  readonly maxTotalChildren: number;
  readonly allowedChildTemplates: readonly string[];
  readonly propagateBudgetLimits: boolean;
}

export interface AgentCapabilitiesConfig {
  readonly tools: readonly ToolCapabilityRule[];
  readonly filesystem: FileSystemPermissions;
  readonly shell: ShellCommandRestrictions;
  readonly network: NetworkEgressRules;
  readonly subAgents: SubAgentPermissions;
  readonly maxConcurrency: number;
  readonly requiredMemoryMb: number;
  readonly requiredCpuCores: number;
  readonly tags: readonly string[];
}

export class AgentCapabilities {
  private readonly config: AgentCapabilitiesConfig;
  private readonly toolLookup: Map<string, ToolCapabilityRule>;

  constructor(config: AgentCapabilitiesConfig) {
    this.config = Object.freeze({
      ...config,
      tools: Object.freeze([...config.tools]),
      filesystem: Object.freeze({
        ...config.filesystem,
        allowedReadPaths: Object.freeze([...config.filesystem.allowedReadPaths]),
        allowedWritePaths: Object.freeze([...config.filesystem.allowedWritePaths]),
        deniedPaths: Object.freeze([...config.filesystem.deniedPaths]),
      }),
      shell: Object.freeze({
        ...config.shell,
        allowedCommands: Object.freeze([...config.shell.allowedCommands]),
        forbiddenPatterns: Object.freeze([...config.shell.forbiddenPatterns]),
      }),
      network: Object.freeze({
        ...config.network,
        allowedHosts: Object.freeze([...config.network.allowedHosts]),
        deniedHosts: Object.freeze([...config.network.deniedHosts]),
        allowedPorts: Object.freeze([...config.network.allowedPorts]),
      }),
      subAgents: Object.freeze({
        ...config.subAgents,
        allowedChildTemplates: Object.freeze([...config.subAgents.allowedChildTemplates]),
      }),
      tags: Object.freeze([...config.tags]),
    });

    this.toolLookup = new Map<string, ToolCapabilityRule>();
    for (const rule of this.config.tools) {
      this.toolLookup.set(rule.toolName, rule);
    }
  }

  public getConfig(): AgentCapabilitiesConfig {
    return this.config;
  }

  public getToolPermission(toolName: string): ToolPermissionLevel {
    const rule = this.toolLookup.get(toolName);
    if (!rule) {
      // Default to DENIED if tool not explicitly defined
      return 'DENIED';
    }
    return rule.permission;
  }

  public isToolAllowed(toolName: string): boolean {
    return this.getToolPermission(toolName) === 'ALLOWED';
  }

  public requiresApproval(toolName: string): boolean {
    return this.getToolPermission(toolName) === 'REQUIRE_APPROVAL';
  }

  public canExecuteShellCommand(command: string): { allowed: boolean; reason?: string } {
    if (!this.isToolAllowed('bash') && !this.isToolAllowed('execute_command')) {
      return { allowed: false, reason: 'Shell execution tool is not allowed for this agent' };
    }

    const trimmed = command.trim();
    if (!this.config.shell.allowRootOrSudo && (trimmed.startsWith('sudo ') || trimmed.startsWith('su '))) {
      return { allowed: false, reason: 'Root/sudo commands are prohibited' };
    }

    for (const pattern of this.config.shell.forbiddenPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(trimmed)) {
        return { allowed: false, reason: `Command matches forbidden security pattern: ${pattern}` };
      }
    }

    if (this.config.shell.allowedCommands.length > 0) {
      const firstToken = trimmed.split(/\s+/)[0];
      const isExplicitlyAllowed = this.config.shell.allowedCommands.some((allowed) => {
        return allowed === '*' || allowed === firstToken || allowed === trimmed;
      });

      if (!isExplicitlyAllowed) {
        return { allowed: false, reason: `Command binary '${firstToken}' is not in the whitelist` };
      }
    }

    return { allowed: true };
  }

  public canAccessPath(targetPath: string, mode: 'read' | 'write'): { allowed: boolean; reason?: string } {
    const normalized = targetPath.replace(/\\/g, '/').toLowerCase();

    for (const denied of this.config.filesystem.deniedPaths) {
      const normalizedDenied = denied.replace(/\\/g, '/').toLowerCase();
      if (normalized.startsWith(normalizedDenied)) {
        return { allowed: false, reason: `Path '${targetPath}' is in the restricted paths list` };
      }
    }

    if (mode === 'read') {
      if (this.config.filesystem.allowedReadPaths.length === 0) {
        return { allowed: true };
      }
      const allowed = this.config.filesystem.allowedReadPaths.some((p) => {
        if (p === '*') return true;
        const normP = p.replace(/\\/g, '/').toLowerCase();
        return normalized.startsWith(normP);
      });
      return allowed
        ? { allowed: true }
        : { allowed: false, reason: `Read access to path '${targetPath}' is outside authorized scope` };
    }

    if (mode === 'write') {
      if (this.config.filesystem.allowedWritePaths.length === 0) {
        return { allowed: false, reason: 'Write access is completely disabled' };
      }
      const allowed = this.config.filesystem.allowedWritePaths.some((p) => {
        if (p === '*') return true;
        const normP = p.replace(/\\/g, '/').toLowerCase();
        return normalized.startsWith(normP);
      });
      return allowed
        ? { allowed: true }
        : { allowed: false, reason: `Write access to path '${targetPath}' is outside authorized workspace` };
    }

    return { allowed: false, reason: 'Invalid filesystem access mode' };
  }

  public canEgressHost(host: string, port: number): { allowed: boolean; reason?: string } {
    const cleanHost = host.toLowerCase().trim();

    if (this.config.network.blockPrivateSubnets) {
      const privatePatterns = [
        /^localhost$/,
        /^127\./,
        /^10\./,
        /^192\.168\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^169\.254\./,
        /^0\.0\.0\.0$/,
        /^::1$/,
        /^fd[0-9a-f]{2}:/i,
      ];
      if (privatePatterns.some((pattern) => pattern.test(cleanHost))) {
        return { allowed: false, reason: `Access to private/local network endpoint '${host}' is blocked` };
      }
    }

    for (const denied of this.config.network.deniedHosts) {
      if (denied === cleanHost || (denied.startsWith('*.') && cleanHost.endsWith(denied.slice(1)))) {
        return { allowed: false, reason: `Host '${host}' is explicitly denied by egress policy` };
      }
    }

    if (this.config.network.allowedHosts.length > 0) {
      const isAllowed = this.config.network.allowedHosts.some((allowed) => {
        if (allowed === '*') return true;
        if (allowed.startsWith('*.') && cleanHost.endsWith(allowed.slice(1))) return true;
        return allowed.toLowerCase() === cleanHost;
      });

      if (!isAllowed) {
        return { allowed: false, reason: `Host '${host}' is not in allowed egress whitelist` };
      }
    }

    if (this.config.network.allowedPorts.length > 0 && !this.config.network.allowedPorts.includes(port)) {
      return { allowed: false, reason: `Port ${port} is not in allowed outbound ports` };
    }

    return { allowed: true };
  }

  public canSpawnChildAgent(childTemplate: string, currentDepth: number, currentChildrenCount: number): { allowed: boolean; reason?: string } {
    if (!this.config.subAgents.canSpawnSubAgents) {
      return { allowed: false, reason: 'Sub-agent spawning is disabled for this agent' };
    }

    if (currentDepth >= this.config.subAgents.maxSpawnDepth) {
      return {
        allowed: false,
        reason: `Maximum sub-agent nesting depth (${this.config.subAgents.maxSpawnDepth}) reached`,
      };
    }

    if (currentChildrenCount >= this.config.subAgents.maxTotalChildren) {
      return {
        allowed: false,
        reason: `Maximum total concurrent sub-agents (${this.config.subAgents.maxTotalChildren}) reached`,
      };
    }

    if (this.config.subAgents.allowedChildTemplates.length > 0) {
      const allowed = this.config.subAgents.allowedChildTemplates.includes('*') ||
        this.config.subAgents.allowedChildTemplates.includes(childTemplate);
      if (!allowed) {
        return { allowed: false, reason: `Template '${childTemplate}' is not permitted for sub-agent spawning` };
      }
    }

    return { allowed: true };
  }

  public static createDefaultReadOnly(): AgentCapabilities {
    return new AgentCapabilities({
      tools: [
        { toolName: 'read_file', permission: 'ALLOWED' },
        { toolName: 'list_dir', permission: 'ALLOWED' },
        { toolName: 'grep_search', permission: 'ALLOWED' },
        { toolName: 'find_by_name', permission: 'ALLOWED' },
        { toolName: 'web_search', permission: 'ALLOWED' },
      ],
      filesystem: {
        allowedReadPaths: ['*'],
        allowedWritePaths: [],
        deniedPaths: ['/etc/shadow', '/etc/passwd', 'C:/Windows/System32/config'],
        maxFileSizeBytes: 10 * 1024 * 1024,
        allowSymlinks: false,
        allowExecutables: false,
      },
      shell: {
        allowedCommands: [],
        forbiddenPatterns: ['.*'],
        maxExecutionTimeMs: 0,
        maxOutputBufferBytes: 0,
        allowInteractive: false,
        allowRootOrSudo: false,
      },
      network: {
        allowedHosts: ['*'],
        deniedHosts: [],
        allowedPorts: [80, 443],
        allowInsecureHttp: false,
        blockPrivateSubnets: true,
      },
      subAgents: {
        canSpawnSubAgents: false,
        maxSpawnDepth: 0,
        maxTotalChildren: 0,
        allowedChildTemplates: [],
        propagateBudgetLimits: true,
      },
      maxConcurrency: 2,
      requiredMemoryMb: 512,
      requiredCpuCores: 1,
      tags: ['read-only', 'researcher'],
    });
  }

  public static createDefaultFullDev(): AgentCapabilities {
    return new AgentCapabilities({
      tools: [
        { toolName: 'read_file', permission: 'ALLOWED' },
        { toolName: 'write_to_file', permission: 'ALLOWED' },
        { toolName: 'replace_file_content', permission: 'ALLOWED' },
        { toolName: 'list_dir', permission: 'ALLOWED' },
        { toolName: 'grep_search', permission: 'ALLOWED' },
        { toolName: 'find_by_name', permission: 'ALLOWED' },
        { toolName: 'bash', permission: 'ALLOWED' },
        { toolName: 'web_search', permission: 'ALLOWED' },
      ],
      filesystem: {
        allowedReadPaths: ['*'],
        allowedWritePaths: ['*'],
        deniedPaths: ['/etc/shadow', '/etc/passwd', 'C:/Windows/System32/config'],
        maxFileSizeBytes: 100 * 1024 * 1024,
        allowSymlinks: true,
        allowExecutables: true,
      },
      shell: {
        allowedCommands: ['*'],
        forbiddenPatterns: [
          'rm\\s+-rf\\s+/(?!tmp)',
          'mkfs',
          'dd\\s+if=/dev/zero',
          ':\\(\\)\\s*\\{\\s*:\\|:&\\s*\\};:',
        ],
        maxExecutionTimeMs: 300_000,
        maxOutputBufferBytes: 10 * 1024 * 1024,
        allowInteractive: false,
        allowRootOrSudo: false,
      },
      network: {
        allowedHosts: ['*'],
        deniedHosts: [],
        allowedPorts: [80, 443, 3000, 5000, 8000, 8080],
        allowInsecureHttp: false,
        blockPrivateSubnets: true,
      },
      subAgents: {
        canSpawnSubAgents: true,
        maxSpawnDepth: 3,
        maxTotalChildren: 5,
        allowedChildTemplates: ['*'],
        propagateBudgetLimits: true,
      },
      maxConcurrency: 4,
      requiredMemoryMb: 2048,
      requiredCpuCores: 2,
      tags: ['full-developer', 'coding', 'automation'],
    });
  }
}
