import path from "node:path";

export type BlastRadiusScope = "LOCAL" | "WORKSPACE" | "CROSS_WORKSPACE" | "TENANT_WIDE" | "HOST_SYSTEM";

export interface BlastRadiusAssessment {
  scope: BlastRadiusScope;
  score: number; // 0 (minimal) to 100 (host catastrophic)
  affectedFilesCount: number;
  isSystemCritical: boolean;
  isDestructive: boolean;
  criticalPaths: string[];
  reasons: string[];
}

const CRITICAL_SYSTEM_FILES = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "bun.lock",
  "tsconfig.json",
  "tsconfig.base.json",
  "Dockerfile",
  "docker-compose.yml",
  ".github/workflows",
  ".gitlab-ci.yml",
  "drizzle.config.ts",
  "schema.prisma",
  "migrations",
  ".env",
  ".env.production",
];

export class BlastRadiusCalculator {
  public static calculateFileOperation(
    targetPath: string,
    operation: "read" | "write" | "delete" | "modify",
    workspaceRoot?: string,
    estimatedLinesChanged = 10
  ): BlastRadiusAssessment {
    const reasons: string[] = [];
    const criticalPaths: string[] = [];
    let score = 5;
    let isSystemCritical = false;
    let isDestructive = operation === "delete";

    const normalized = path.normalize(targetPath);
    const filename = path.basename(normalized);

    // 1. Check if target matches critical system configurations
    for (const crit of CRITICAL_SYSTEM_FILES) {
      if (normalized.includes(crit) || filename === crit) {
        isSystemCritical = true;
        criticalPaths.push(normalized);
        reasons.push(`Target touches critical project file: ${crit}`);
        score += 35;
        break;
      }
    }

    // 2. Check operation type
    if (operation === "delete") {
      score += 30;
      reasons.push("Operation performs file deletion");
    } else if (operation === "write") {
      score += 15;
    } else if (operation === "read") {
      score += 0;
    }

    // 3. Diff scale impact
    if (estimatedLinesChanged > 500) {
      score += 25;
      reasons.push(`Large modification volume (${estimatedLinesChanged} estimated lines)`);
    } else if (estimatedLinesChanged > 100) {
      score += 10;
    }

    // 4. Workspace containment
    let scope: BlastRadiusScope = "LOCAL";
    if (workspaceRoot) {
      const resolvedRoot = path.normalize(path.resolve(workspaceRoot));
      const resolvedTarget = path.normalize(path.resolve(targetPath));
      const rel = path.relative(resolvedRoot, resolvedTarget);

      if (rel.startsWith("..") || path.isAbsolute(rel)) {
        scope = "HOST_SYSTEM";
        score += 50;
        reasons.push("Target escapes designated workspace root");
      } else {
        scope = isSystemCritical ? "WORKSPACE" : "LOCAL";
      }
    }

    score = Math.min(100, Math.max(0, score));

    return {
      scope,
      score,
      affectedFilesCount: 1,
      isSystemCritical,
      isDestructive,
      criticalPaths,
      reasons,
    };
  }

  public static calculateCommandOperation(
    command: string,
    workspaceRoot?: string
  ): BlastRadiusAssessment {
    const reasons: string[] = [];
    const criticalPaths: string[] = [];
    let score = 20;
    let scope: BlastRadiusScope = "WORKSPACE";
    let isSystemCritical = false;
    let isDestructive = false;
    const lower = command.toLowerCase();

    if (lower.includes("rm -rf") || lower.includes("rimraf") || lower.includes("remove-item")) {
      isDestructive = true;
      score += 40;
      reasons.push("Command contains recursive deletion pattern");
    }

    if (lower.includes("git reset --hard") || lower.includes("git clean -fdx")) {
      isDestructive = true;
      score += 35;
      reasons.push("Command discards uncommitted git changes across workspace");
    }

    if (lower.includes("npm install") || lower.includes("pnpm install") || lower.includes("bun install")) {
      isSystemCritical = true;
      score += 20;
      reasons.push("Command modifies workspace dependency tree");
    }

    if (lower.includes("drop table") || lower.includes("drop database") || lower.includes("truncate")) {
      isDestructive = true;
      isSystemCritical = true;
      scope = "TENANT_WIDE";
      score += 60;
      reasons.push("Command executes database schema destruction");
    }

    if (lower.includes("sudo") || lower.includes("chmod 777") || lower.includes("/etc/")) {
      scope = "HOST_SYSTEM";
      score += 50;
      reasons.push("Command targets host system root privileges or configuration");
    }

    if (workspaceRoot && (lower.includes("..\\") || lower.includes("../") || lower.includes("cd .."))) {
      reasons.push(`Command contains relative path navigation escaping workspace root: ${workspaceRoot}`);
      score += 15;
    }

    score = Math.min(100, Math.max(0, score));

    return {
      scope,
      score,
      affectedFilesCount: isDestructive ? 50 : 5,
      isSystemCritical,
      isDestructive,
      criticalPaths,
      reasons,
    };
  }
}
