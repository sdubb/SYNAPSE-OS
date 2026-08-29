import { type PolicyContext } from "../PolicyContext.js";
import { PolicyDecision } from "../PolicyDecision.js";

export interface ShellRuleOptions {
  allowSudo?: boolean;
  prohibitedBinaries?: string[];
  maxCommandLength?: number;
  allowPipedExecution?: boolean;
}

export interface ParsedShellCommand {
  raw: string;
  segments: string[];
  tokens: string[];
  isPiped: boolean;
  hasRedirection: boolean;
  hasSubshell: boolean;
  hasRemoteExecutionPipe: boolean;
}

export function parseShellCommand(command: string): ParsedShellCommand {
  const trimmed = command.trim();
  // Split by pipeline and chained operators (|, ||, &&, ;, &)
  const segments = trimmed
    .split(/\|\||&&|;|\|/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Tokenize taking basic quotes into account
  const tokens: string[] = [];
  const tokenRegex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(trimmed)) !== null) {
    const token = match[1] ?? match[2] ?? match[0];
    if (token) tokens.push(token);
  }

  const isPiped = /\|/.test(trimmed) && !/\|\|/.test(trimmed);
  const hasRedirection = />|>>|<|2>&1/.test(trimmed);
  const hasSubshell = /\$\([^)]+\)|`[^`]+`/.test(trimmed);

  // Detect curl/wget/fetch piped to bash/sh/zsh/python/perl/node/iex
  const hasRemoteExecutionPipe =
    /(?:curl|wget|fetch|invoke-webrequest|iwr)\b.*\|\s*(?:bash|sh|zsh|python|python3|perl|ruby|node|iex|invoke-expression)\b/i.test(
      trimmed
    );

  return {
    raw: trimmed,
    segments,
    tokens,
    isPiped,
    hasRedirection,
    hasSubshell,
    hasRemoteExecutionPipe,
  };
}

export function evaluateShellPolicy(
  context: PolicyContext,
  options?: ShellRuleOptions
): PolicyDecision | null {
  const rawCommand = extractCommandString(context);
  if (!rawCommand) {
    return null; // Not a shell action
  }

  const parsed = parseShellCommand(rawCommand);

  // 1. Max command length check
  const maxLength = options?.maxCommandLength ?? 10000;
  if (parsed.raw.length > maxLength) {
    return PolicyDecision.block(`Command exceeds maximum allowable length of ${maxLength} characters`, {
      matchedCategory: "shell",
      matchedRuleName: "shell-max-length-exceeded",
      riskLevel: "HIGH",
      violations: [`Length was ${parsed.raw.length}`],
    });
  }

  // 2. Fork bombs
  if (
    parsed.raw.includes(":(){ :|:& };:") ||
    parsed.raw.includes(":(){:|:&};:") ||
    parsed.raw.includes("%0|%0") ||
    parsed.raw.includes("fork()")
  ) {
    return PolicyDecision.block("Fork bomb pattern detected in command", {
      matchedCategory: "shell",
      matchedRuleName: "shell-fork-bomb",
      riskLevel: "CRITICAL",
      violations: ["Attempted resource exhaustion via fork bomb"],
      remediation: "Never execute denial-of-service command patterns.",
    });
  }

  // 3. Remote execution pipelines (curl | sh, iwr | iex)
  if (parsed.hasRemoteExecutionPipe) {
    return PolicyDecision.block("Piped remote code execution (e.g. curl ... | bash or iwr | iex) is strictly forbidden", {
      matchedCategory: "shell",
      matchedRuleName: "shell-remote-code-pipe",
      riskLevel: "CRITICAL",
      violations: ["Unverified remote code stream piped directly into shell interpreter"],
      remediation: "Download the script, inspect its content and checksum, and run it as an audited local file.",
    });
  }

  // 4. Catastrophic recursive deletion
  const dangerousRmPatterns = [
    /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+[\/\\]\s*$/i, // rm -rf /
    /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+\/\*\s*$/i, // rm -rf /*
    /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+~\s*$/i, // rm -rf ~
    /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+\.\s*$/i, // rm -rf .
    /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+\*\s*$/i, // rm -rf *
    /\bRemove-Item\s+.*-Recurse.*[\/\\]\s*$/i,
    /\bdel\s+\/f\s+\/s\s+\/q\s+[c-zC-Z]:\\/i,
  ];

  for (const pattern of dangerousRmPatterns) {
    if (pattern.test(parsed.raw)) {
      return PolicyDecision.block("Catastrophic filesystem deletion command detected", {
        matchedCategory: "shell",
        matchedRuleName: "shell-catastrophic-deletion",
        riskLevel: "CRITICAL",
        violations: [`Command matches dangerous deletion pattern: ${pattern.source}`],
        remediation: "Specify explicit bounded paths inside your project folder.",
      });
    }
  }

  // 5. Disk formatting and low-level block overwrites
  const diskDestroyPatterns = [
    /\bmkfs\b/i,
    /\bfdisk\b/i,
    /\bdd\s+if=\/dev\/(?:zero|urandom|null)\s+of=\/dev\//i,
    /\bformat\s+[c-zC-Z]:/i,
    /\bdiskpart\b/i,
  ];

  for (const pattern of diskDestroyPatterns) {
    if (pattern.test(parsed.raw)) {
      return PolicyDecision.block("Low-level disk format or block overwrite detected", {
        matchedCategory: "shell",
        matchedRuleName: "shell-disk-format",
        riskLevel: "CRITICAL",
        violations: ["Destructive disk partitioning or formatting operation"],
      });
    }
  }

  // 6. Reverse Shells & Network Listeners
  const reverseShellPatterns = [
    /\b(?:nc|ncat|netcat)\s+-[a-zA-Z0-9]*e\s+/i,
    /\/dev\/tcp\/[0-9.]+\/[0-9]+/i,
    /\bsocket\.socket\(socket\.AF_INET,\s*socket\.SOCK_STREAM\)/i,
    /\bpowershell.*-e(?:nc|ncodedcommand)?\s+[A-Za-z0-9+/=]{30,}/i, // suspicious base64 encoded powershell
  ];

  for (const pattern of reverseShellPatterns) {
    if (pattern.test(parsed.raw)) {
      return PolicyDecision.block("Reverse shell or unauthorized socket payload detected", {
        matchedCategory: "shell",
        matchedRuleName: "shell-reverse-shell",
        riskLevel: "CRITICAL",
        violations: ["Attempted reverse shell connection establishment"],
      });
    }
  }

  // 7. Privilege Escalation (sudo, su, doas, runas)
  if (!options?.allowSudo) {
    const privEscalation = /\b(?:sudo|su\s|doas|runas)\b/i;
    if (privEscalation.test(parsed.raw)) {
      return PolicyDecision.block("Privilege escalation commands (sudo, su, doas, runas) are blocked", {
        matchedCategory: "shell",
        matchedRuleName: "shell-privilege-escalation",
        riskLevel: "CRITICAL",
        violations: ["Attempted root / administrative privilege escalation"],
        remediation: "Run commands under the unprivileged agent user context.",
      });
    }
  }

  // 8. Permissive Permission Overrides (chmod 777, chmod -R 777)
  const chmod777Pattern = /\bchmod\s+(?:-R\s+)?(?:777|a\+rwx|ugo\+rwx)\b/i;
  if (chmod777Pattern.test(parsed.raw)) {
    return PolicyDecision.requireApproval("Permissive filesystem mode change (chmod 777) requires human authorization", {
      matchedCategory: "shell",
      matchedRuleName: "shell-permissive-chmod",
      riskLevel: "HIGH",
      violations: ["Command grants global read/write/execute permissions"],
      remediation: "Use standard least-privilege permissions (e.g. 755 for executables, 644 for files).",
    });
  }

  // 9. Shutdown / Reboot commands
  const shutdownPatterns = /\b(?:shutdown|reboot|init\s+0|init\s+6|poweroff|halt|Stop-Computer|Restart-Computer)\b/i;
  if (shutdownPatterns.test(parsed.raw)) {
    return PolicyDecision.block("System termination or reboot commands are blocked", {
      matchedCategory: "shell",
      matchedRuleName: "shell-system-shutdown",
      riskLevel: "CRITICAL",
      violations: ["Attempted host operating system reboot or shutdown"],
    });
  }

  // 10. Prohibited binaries
  const prohibited = options?.prohibitedBinaries ?? ["nmap", "tcpdump", "wireshark", "hydra", "john", "aircrack-ng"];
  for (const bin of prohibited) {
    const binRegex = new RegExp(`\\b${bin}\\b`, "i");
    if (binRegex.test(parsed.raw)) {
      return PolicyDecision.block(`Execution of prohibited security utility '${bin}' is blocked`, {
        matchedCategory: "shell",
        matchedRuleName: "shell-prohibited-binary",
        riskLevel: "CRITICAL",
        violations: [`Prohibited binary: ${bin}`],
      });
    }
  }

  return null;
}

function extractCommandString(context: PolicyContext): string | null {
  const args = context.args;
  if (typeof args["command"] === "string") return args["command"];
  if (typeof args["CommandLine"] === "string") return args["CommandLine"];
  if (typeof args["cmd"] === "string") return args["cmd"];
  if (typeof args["script"] === "string") return args["script"];
  if (context.action === "shell:execute" && typeof context.target === "string" && context.target.length > 0) {
    return context.target;
  }
  return null;
}
