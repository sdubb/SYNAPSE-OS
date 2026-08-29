import path from "node:path";
import { type PolicyContext } from "../PolicyContext.js";
import { PolicyDecision } from "../PolicyDecision.js";

export interface FilesystemRuleOptions {
  allowedRoots?: string[];
  blockHiddenFiles?: boolean;
  blockedExtensions?: string[];
  blockedPaths?: string[];
}

const DEFAULT_BLOCKED_PATHS = [
  "/etc",
  "/var/run",
  "/dev",
  "/proc",
  "/sys",
  "/root",
  "/boot",
  "C:\\Windows",
  "C:\\Windows\\System32",
  "C:\\Program Files",
  "C:\\ProgramData",
];

const DEFAULT_BLOCKED_PATTERNS = [
  /\.env(\.[\w-]+)?$/i,
  /\.git[\/\\]hooks/i,
  /\.ssh([\/\\]|$)/i,
  /\.aws([\/\\]|$)/i,
  /\.kube([\/\\]|$)/i,
  /\.gnupg([\/\\]|$)/i,
  /\.npmrc$/i,
  /\.pypirc$/i,
  /id_rsa(\.pub)?$/i,
  /id_ed25519(\.pub)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.keystore$/i,
  /service-account.*\.json$/i,
];

export function evaluateFilesystemPolicy(
  context: PolicyContext,
  options?: FilesystemRuleOptions
): PolicyDecision | null {
  const targetPathRaw = extractTargetPath(context);
  if (!targetPathRaw) {
    return null; // Not a filesystem action
  }

  // 1. Check for null byte injection
  if (targetPathRaw.includes("\0")) {
    return PolicyDecision.block("Null byte detected in file path target", {
      matchedCategory: "filesystem",
      matchedRuleName: "fs-null-byte-injection",
      riskLevel: "CRITICAL",
      violations: ["Null byte character sequence in file path"],
      remediation: "Ensure the file path does not contain poisoned null bytes.",
    });
  }

  // 2. Check for path traversal characters before normalization
  const containsTraversal = targetPathRaw.includes("..") || targetPathRaw.includes("%2e%2e");
  const workspaceRoot = context.workspaceRoot ?? (options?.allowedRoots && options.allowedRoots.length > 0 ? options.allowedRoots[0] : undefined);
  const resolvedRoot = workspaceRoot ? path.normalize(path.resolve(workspaceRoot)) : process.cwd();
  const normalizedPath = path.isAbsolute(targetPathRaw)
    ? path.normalize(path.resolve(targetPathRaw))
    : path.normalize(path.resolve(resolvedRoot, targetPathRaw));

  // 3. Sensitive OS root path access
  const blockedPaths = options?.blockedPaths ?? DEFAULT_BLOCKED_PATHS;
  for (const blocked of blockedPaths) {
    const normBlocked = path.normalize(path.resolve(blocked));
    if (normalizedPath === normBlocked || normalizedPath.startsWith(normBlocked + path.sep)) {
      return PolicyDecision.block(`Access to critical operating system directory is prohibited: ${blocked}`, {
        matchedCategory: "filesystem",
        matchedRuleName: "fs-system-directory-protection",
        riskLevel: "CRITICAL",
        violations: [`Target path ${targetPathRaw} resolves within system path ${blocked}`],
        remediation: "Keep file operations strictly inside the assigned workspace root directory.",
      });
    }
  }

  // 4. Sensitive credential and environment files
  for (const pattern of DEFAULT_BLOCKED_PATTERNS) {
    if (pattern.test(normalizedPath) || pattern.test(targetPathRaw)) {
      return PolicyDecision.block(`Access to sensitive credential or environment configuration is blocked: ${pattern.toString()}`, {
        matchedCategory: "filesystem",
        matchedRuleName: "fs-sensitive-file-protection",
        riskLevel: "CRITICAL",
        violations: [`Path matches sensitive configuration pattern: ${pattern.source}`],
        remediation: "Use Synapse Secrets Manager to handle credentials rather than reading raw key files directly.",
      });
    }
  }

  // 5. Workspace Boundary Enforcement
  if (workspaceRoot) {
    const relative = path.relative(resolvedRoot, normalizedPath);
    const isEscaping = relative.startsWith("..") || path.isAbsolute(relative);

    if (isEscaping) {
      return PolicyDecision.block(`Path boundary violation: Target path ${targetPathRaw} is outside workspace root (${resolvedRoot})`, {
        matchedCategory: "filesystem",
        matchedRuleName: "fs-workspace-boundary-escape",
        riskLevel: "CRITICAL",
        violations: [`Path ${normalizedPath} escapes designated root ${resolvedRoot}`],
        remediation: "All file creations, edits, and reads must be contained within the agent workspace.",
      });
    }
  }

  // 6. Blocked file extensions
  if (options?.blockedExtensions && options.blockedExtensions.length > 0) {
    const ext = path.extname(normalizedPath).toLowerCase().replace(".", "");
    if (options.blockedExtensions.includes(ext)) {
      return PolicyDecision.block(`File extension .${ext} is restricted by tenant policy`, {
        matchedCategory: "filesystem",
        matchedRuleName: "fs-blocked-extension",
        riskLevel: "HIGH",
        violations: [`File extension .${ext} not allowed`],
      });
    }
  }

  // 7. Write operations require elevated caution
  if (context.action === "fs:write" || context.action.includes("write")) {
    if (containsTraversal) {
      return PolicyDecision.block(`Path traversal sequence '..' in write operation is blocked`, {
        matchedCategory: "filesystem",
        matchedRuleName: "fs-write-path-traversal",
        riskLevel: "CRITICAL",
        violations: ["Attempted directory traversal during file write"],
      });
    }
  }

  return null;
}

function extractTargetPath(context: PolicyContext): string | null {
  const args = context.args;
  if (typeof args["targetFile"] === "string") return args["targetFile"];
  if (typeof args["TargetFile"] === "string") return args["TargetFile"];
  if (typeof args["path"] === "string") return args["path"];
  if (typeof args["targetPath"] === "string") return args["targetPath"];
  if (typeof args["filePath"] === "string") return args["filePath"];
  if (typeof args["DirectoryPath"] === "string") return args["DirectoryPath"];
  if (typeof args["AbsolutePath"] === "string") return args["AbsolutePath"];
  if (context.action.startsWith("fs:") && typeof context.target === "string" && context.target.length > 0) {
    return context.target;
  }
  return null;
}
