import path from "node:path";

export interface WorkspaceEnforcerOptions {
  readonly workspaceRoot?: string;
  readonly allowedSubdirectories?: readonly string[];
  readonly readOnlyPaths?: readonly string[];
}

export class WorkspaceEnforcer {
  /**
   * Validates that a file path or directory access stays safely within the workspace boundary.
   */
  public static validatePathAccess(
    targetPath: string,
    isWrite: boolean,
    options?: WorkspaceEnforcerOptions
  ): { valid: boolean; normalizedPath: string; error?: string } {
    if (!targetPath || typeof targetPath !== "string") {
      return { valid: false, normalizedPath: "", error: "Target path must be a non-empty string" };
    }

    const wsRoot = options?.workspaceRoot ? path.resolve(options.workspaceRoot) : process.cwd();
    const resolvedTarget = path.isAbsolute(targetPath)
      ? path.resolve(path.normalize(targetPath))
      : path.resolve(wsRoot, targetPath);

    // Normalize for comparison
    const normTarget = path.normalize(resolvedTarget);
    const normRoot = path.normalize(wsRoot);

    const checkTarget = process.platform === "win32" ? normTarget.toLowerCase() : normTarget;
    const checkRoot = process.platform === "win32" ? normRoot.toLowerCase() : normRoot;

    // Check for root path traversal escape
    if (!checkTarget.startsWith(checkRoot)) {
      return {
        valid: false,
        normalizedPath: normTarget,
        error: `Path traversal detected: '${targetPath}' resolves outside authorized workspace root '${normRoot}'`,
      };
    }

    // Check read-only paths if this is a write operation
    if (isWrite && options?.readOnlyPaths && options.readOnlyPaths.length > 0) {
      for (const roPath of options.readOnlyPaths) {
        const normRo = path.normalize(path.isAbsolute(roPath) ? roPath : path.resolve(normRoot, roPath));
        const checkRo = process.platform === "win32" ? normRo.toLowerCase() : normRo;
        if (checkTarget.startsWith(checkRo)) {
          return {
            valid: false,
            normalizedPath: normTarget,
            error: `Write permission denied: '${targetPath}' is in read-only path '${roPath}'`,
          };
        }
      }
    }

    // Check allowed subdirectories if constrained
    if (options?.allowedSubdirectories && options.allowedSubdirectories.length > 0) {
      const isAllowed = options.allowedSubdirectories.some((sub) => {
        const normSub = path.normalize(path.isAbsolute(sub) ? sub : path.resolve(normRoot, sub));
        const checkSub = process.platform === "win32" ? normSub.toLowerCase() : normSub;
        return checkTarget.startsWith(checkSub);
      });

      if (!isAllowed) {
        return {
          valid: false,
          normalizedPath: normTarget,
          error: `Access denied: '${targetPath}' is outside the authorized subdirectories list`,
        };
      }
    }

    return { valid: true, normalizedPath: normTarget };
  }
}
