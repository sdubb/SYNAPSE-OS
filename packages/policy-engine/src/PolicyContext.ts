import path from "node:path";
import { type PolicyExecutionContext } from "./schemas/policy.schema.js";

export interface CreatePolicyContextInput {
  tenantId: string;
  agentId?: string;
  sessionId?: string;
  taskId?: string;
  workspaceId?: string;
  workspaceRoot?: string;
  userId?: string;
  userRole?: string;
  toolName: string;
  action?: string;
  target?: string;
  args?: Record<string, unknown>;
  environment?: Record<string, string>;
  timestamp?: number;
}

export class PolicyContext implements PolicyExecutionContext {
  public readonly tenantId: string;
  public readonly agentId?: string;
  public readonly sessionId?: string;
  public readonly taskId?: string;
  public readonly workspaceId?: string;
  public readonly workspaceRoot?: string;
  public readonly userId?: string;
  public readonly userRole?: string;
  public readonly toolName: string;
  public readonly action: string;
  public readonly target: string;
  public readonly args: Readonly<Record<string, unknown>>;
  public readonly environment: Readonly<Record<string, string>>;
  public readonly timestamp: number;

  constructor(input: CreatePolicyContextInput) {
    this.tenantId = input.tenantId;
    this.agentId = input.agentId;
    this.sessionId = input.sessionId;
    this.taskId = input.taskId;
    this.workspaceId = input.workspaceId;
    this.workspaceRoot = input.workspaceRoot ? path.resolve(input.workspaceRoot) : undefined;
    this.userId = input.userId;
    this.userRole = input.userRole;
    this.toolName = input.toolName;
    this.action = input.action ?? this.deriveAction(input.toolName, input.args ?? {});
    this.target = input.target ?? this.deriveTarget(input.toolName, input.args ?? {});
    this.args = Object.freeze({ ...(input.args ?? {}) });
    this.environment = Object.freeze({ ...(input.environment ?? {}) });
    this.timestamp = input.timestamp ?? Date.now();
  }

  public get<T = unknown>(fieldPath: string): T | undefined {
    if (!fieldPath) return undefined;
    const parts = fieldPath.split(".");
    let current: unknown = this;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === "object" && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current as T;
  }

  public toJSON(): PolicyExecutionContext {
    return {
      tenantId: this.tenantId,
      agentId: this.agentId,
      sessionId: this.sessionId,
      taskId: this.taskId,
      workspaceId: this.workspaceId,
      workspaceRoot: this.workspaceRoot,
      userId: this.userId,
      userRole: this.userRole,
      toolName: this.toolName,
      action: this.action,
      target: this.target,
      args: { ...this.args },
      environment: { ...this.environment },
      timestamp: this.timestamp,
    };
  }

  private deriveAction(toolName: string, args: Record<string, unknown>): string {
    const lowerTool = toolName.toLowerCase();
    if (lowerTool.includes("execute_command") || lowerTool === "bash" || lowerTool === "terminal" || lowerTool === "exec") {
      return "shell:execute";
    }
    if (lowerTool.includes("write_to_file") || lowerTool.includes("replace_file") || lowerTool.includes("create_file")) {
      return "fs:write";
    }
    if (lowerTool.includes("read_file") || lowerTool.includes("view_file") || lowerTool.includes("list_dir")) {
      return "fs:read";
    }
    if (lowerTool.includes("http") || lowerTool.includes("fetch") || lowerTool.includes("curl") || lowerTool.includes("browser")) {
      return "network:request";
    }
    if (lowerTool.includes("git")) {
      return "git:operation";
    }
    if (lowerTool.includes("db") || lowerTool.includes("query") || lowerTool.includes("sql")) {
      return "database:mutation";
    }
    if (args["command"]) {
      return "shell:execute";
    }
    if (args["path"] || args["targetFile"] || args["targetPath"]) {
      return "fs:access";
    }
    if (args["url"]) {
      return "network:request";
    }
    return `tool:${toolName}`;
  }

  private deriveTarget(toolName: string, args: Record<string, unknown>): string {
    if (typeof args["command"] === "string") return args["command"];
    if (typeof args["CommandLine"] === "string") return args["CommandLine"];
    if (typeof args["TargetFile"] === "string") return args["TargetFile"];
    if (typeof args["path"] === "string") return args["path"];
    if (typeof args["targetPath"] === "string") return args["targetPath"];
    if (typeof args["url"] === "string") return args["url"];
    if (typeof args["Url"] === "string") return args["Url"];
    if (typeof args["sql"] === "string") return args["sql"];
    if (typeof args["query"] === "string") return args["query"];
    return toolName;
  }
}

export class PolicyContextBuilder {
  private input: Partial<CreatePolicyContextInput> = {
    args: {},
    environment: {},
  };

  public setTenantId(tenantId: string): this {
    this.input.tenantId = tenantId;
    return this;
  }

  public setAgentId(agentId: string): this {
    this.input.agentId = agentId;
    return this;
  }

  public setSessionId(sessionId: string): this {
    this.input.sessionId = sessionId;
    return this;
  }

  public setTaskId(taskId: string): this {
    this.input.taskId = taskId;
    return this;
  }

  public setWorkspace(workspaceId: string, workspaceRoot?: string): this {
    this.input.workspaceId = workspaceId;
    this.input.workspaceRoot = workspaceRoot;
    return this;
  }

  public setUser(userId: string, role?: string): this {
    this.input.userId = userId;
    this.input.userRole = role;
    return this;
  }

  public setTool(toolName: string, args?: Record<string, unknown>): this {
    this.input.toolName = toolName;
    if (args) this.input.args = args;
    return this;
  }

  public setAction(action: string): this {
    this.input.action = action;
    return this;
  }

  public setTarget(target: string): this {
    this.input.target = target;
    return this;
  }

  public setArgs(args: Record<string, unknown>): this {
    this.input.args = { ...(this.input.args ?? {}), ...args };
    return this;
  }

  public setEnvironment(env: Record<string, string>): this {
    this.input.environment = { ...(this.input.environment ?? {}), ...env };
    return this;
  }

  public build(): PolicyContext {
    if (!this.input.tenantId) {
      throw new Error("tenantId is required to construct a PolicyContext");
    }
    if (!this.input.toolName) {
      throw new Error("toolName is required to construct a PolicyContext");
    }
    return new PolicyContext(this.input as CreatePolicyContextInput);
  }
}
