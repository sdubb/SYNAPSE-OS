import path from "node:path";
import fs from "node:fs";

export interface PathContainmentResult {
  contained: boolean;
  resolvedPath: string;
  workspaceRoot: string;
  violations: string[];
}

export class PathContainmentValidator {
  /**
   * Asserts that a target path is strictly contained within the workspace root directory.
   * Resolves symlinks, normalizes relative traversal, and checks for boundary escapes.
   */
  public static validate(targetPath: string, workspaceRoot: string): PathContainmentResult {
    const violations: string[] = [];

    if (!targetPath || typeof targetPath !== "string") {
      return {
        contained: false,
        resolvedPath: "",
        workspaceRoot,
        violations: ["Target path is empty or invalid"],
      };
    }

    if (!workspaceRoot || typeof workspaceRoot !== "string") {
      return {
        contained: false,
        resolvedPath: targetPath,
        workspaceRoot: "",
        violations: ["Workspace root is empty or invalid"],
      };
    }

    // 1. Null Byte Injection Detection
    if (targetPath.includes("\0") || targetPath.includes("%00")) {
      violations.push("Null byte character injection detected in path");
    }

    // 2. Resolve root and target
    const normalizedRoot = path.normalize(path.resolve(workspaceRoot));
    let normalizedTarget = path.normalize(path.resolve(normalizedRoot, targetPath));

    // 3. Symlink Resolution (if path or parent exists)
    try {
      if (fs.existsSync(normalizedTarget)) {
        normalizedTarget = fs.realpathSync(normalizedTarget);
      } else {
        // Resolve closest existing ancestor
        let current = path.dirname(normalizedTarget);
        while (current && current !== path.dirname(current)) {
          if (fs.existsSync(current)) {
            const realAncestor = fs.realpathSync(current);
            const relativePart = path.relative(current, normalizedTarget);
            normalizedTarget = path.resolve(realAncestor, relativePart);
            break;
          }
          current = path.dirname(current);
        }
      }
    } catch {
      // If filesystem check fails, proceed with normalized target
    }

    // 4. Windows Drive and UNC Path Checks
    if (process.platform === "win32") {
      const rootRoot = path.parse(normalizedRoot).root.toLowerCase();
      const targetRoot = path.parse(normalizedTarget).root.toLowerCase();

      if (rootRoot !== targetRoot) {
        violations.push(`Cross-drive path access forbidden (Root: ${rootRoot}, Target: ${targetRoot})`);
      }

      if (targetPath.startsWith("\\\\") || normalizedTarget.startsWith("\\\\")) {
        violations.push("UNC network share paths are forbidden");
      }
    }

    // 5. Relative Boundary Containment Check
    const relative = path.relative(normalizedRoot, normalizedTarget);
    const isEscaping = relative.startsWith("..") || path.isAbsolute(relative);

    if (isEscaping) {
      violations.push(`Path escapes workspace boundary (Relative: '${relative}', Root: '${normalizedRoot}')`);
    }

    return {
      contained: violations.length === 0,
      resolvedPath: normalizedTarget,
      workspaceRoot: normalizedRoot,
      violations,
    };
  }

  /**
   * Throws an error if path containment validation fails.
   */
  public static assertContained(targetPath: string, workspaceRoot: string): string {
    const result = this.validate(targetPath, workspaceRoot);
    if (!result.contained) {
      throw new Error(`Security sandbox boundary violation: ${result.violations.join(", ")}`);
    }
    return result.resolvedPath;
  }
}
