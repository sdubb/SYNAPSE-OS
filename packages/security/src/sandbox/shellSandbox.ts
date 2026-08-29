import { exec, type ExecOptions } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface ShellSandboxConfig {
  workspaceRoot: string;
  timeoutMs?: number;
  maxBufferBytes?: number;
  allowedEnvVars?: string[];
  deniedEnvVars?: string[];
  deniedBinaries?: string[];
}

const DANGEROUS_ENV_VARS = [
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "PYTHONPATH",
  "NODE_OPTIONS",
  "BASH_ENV",
  "IFS",
  "PERL5LIB",
  "RUBYOPT",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "DYLD_FRAMEWORK_PATH",
  "SYNAPSE_MASTER_KEY",
  "SYNAPSE_JWT_SECRET",
];

const DEFAULT_DENIED_BINARIES = [
  "sudo",
  "su",
  "doas",
  "gdo",
  "pkexec",
  "chmod",
  "chown",
  "mkfs",
  "fdisk",
  "nmap",
  "tcpdump",
  "wireshark",
  "nc",
  "netcat",
  "ncat",
];

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export class ShellSandbox {
  private config: ShellSandboxConfig;

  constructor(config: ShellSandboxConfig) {
    this.config = {
      timeoutMs: 60000, // 60 seconds default
      maxBufferBytes: 10 * 1024 * 1024, // 10MB
      ...config,
    };
  }

  /**
   * Sanitizes host environment variables removing sensitive keys and injection vectors.
   */
  public sanitizeEnvironment(customEnv?: Record<string, string>): Record<string, string> {
    const cleanEnv: Record<string, string> = {};
    const denied = new Set([
      ...DANGEROUS_ENV_VARS,
      ...(this.config.deniedEnvVars ?? []),
    ]);

    // Keep safe system environment baseline
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined && !denied.has(k) && !k.startsWith("SYNAPSE_")) {
        cleanEnv[k] = v;
      }
    }

    // Merge custom env if provided
    if (customEnv) {
      for (const [k, v] of Object.entries(customEnv)) {
        if (!denied.has(k) && !k.startsWith("SYNAPSE_")) {
          cleanEnv[k] = v;
        }
      }
    }

    return cleanEnv;
  }

  /**
   * Validates command safety before execution.
   */
  public validateCommand(command: string): { safe: boolean; reason?: string } {
    const denied = this.config.deniedBinaries ?? DEFAULT_DENIED_BINARIES;
    const tokens = command.trim().split(/\s+/);

    for (const token of tokens) {
      const baseBinary = token.split("/").pop()?.split("\\").pop()?.toLowerCase();
      if (baseBinary && denied.includes(baseBinary)) {
        return {
          safe: false,
          reason: `Execution of binary '${baseBinary}' is prohibited in shell sandbox`,
        };
      }
    }

    return { safe: true };
  }

  /**
   * Executes a command within the sanitized sandbox constraints.
   */
  public async execute(
    command: string,
    options?: { env?: Record<string, string>; cwd?: string; timeoutMs?: number }
  ): Promise<SandboxExecutionResult> {
    const validation = this.validateCommand(command);
    if (!validation.safe) {
      throw new Error(`Sandbox Execution Refused: ${validation.reason}`);
    }

    const startTime = performance.now();
    const env = this.sanitizeEnvironment(options?.env);
    const cwd = options?.cwd ?? this.config.workspaceRoot;
    const timeout = options?.timeoutMs ?? this.config.timeoutMs ?? 60000;

    const execOptions: ExecOptions = {
      cwd,
      env,
      timeout,
      maxBuffer: this.config.maxBufferBytes,
      windowsHide: true,
    };

    try {
      const { stdout, stderr } = await execAsync(command, execOptions);
      const durationMs = performance.now() - startTime;

      return {
        stdout: typeof stdout === "string" ? stdout : stdout.toString("utf8"),
        stderr: typeof stderr === "string" ? stderr : stderr.toString("utf8"),
        exitCode: 0,
        durationMs,
      };
    } catch (err: unknown) {
      const durationMs = performance.now() - startTime;
      const error = err as { stdout?: string | Buffer; stderr?: string | Buffer; code?: number; message?: string };

      return {
        stdout: error.stdout ? error.stdout.toString() : "",
        stderr: error.stderr ? error.stderr.toString() : error.message ?? "Command execution failed",
        exitCode: typeof error.code === "number" ? error.code : 1,
        durationMs,
      };
    }
  }
}
