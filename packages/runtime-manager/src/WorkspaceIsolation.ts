/**
 * @file WorkspaceIsolation.ts
 * @description Path sandboxing, traversal protection, forbidden directory blacklists, and environment sanitization for Synapse OS.
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

export interface WorkspaceIsolationConfig {
  readonly workspaceRoot: string;
  readonly allowedSubdirectories?: readonly string[];
  readonly readOnlyPaths?: readonly string[];
  readonly temporaryDirectory?: string;
  readonly allowSymlinksOutsideRoot?: boolean;
}

export class WorkspaceIsolation {
  private readonly rootPath: string;
  private readonly normalizedRoot: string;
  private readonly allowedSubdirs: readonly string[];
  private readonly readOnlyPaths: readonly string[];
  private readonly tempDir: string;
  private readonly allowSymlinksOutside: boolean;

  private static readonly FORBIDDEN_PATTERNS = [
    // Unix sensitive roots
    /^\/etc(\/|$)/i,
    /^\/boot(\/|$)/i,
    /^\/sys(\/|$)/i,
    /^\/proc(\/|$)/i,
    /^\/dev(\/|$)/i,
    /^\/root(\/|$)/i,
    /^\/var\/run(\/|$)/i,
    // Windows sensitive roots
    /^[a-z]:\\windows(\\|$) /i,
    /^[a-z]:\\windows\\system32(\\|$)/i,
    /^[a-z]:\\program files(\\|$)/i,
    /^[a-z]:\\program files \(x86\)(\\|$)/i,
    /^[a-z]:\\programdata\\microsoft(\\|$)/i,
    // Sensitive hidden files
    /\.ssh(\/|\\|$)/i,
    /\.gnupg(\/|\\|$)/i,
    /\.aws(\/|\\|$)/i,
    /\.azure(\/|\\|$)/i,
    /\.docker(\/|\\|$)/i,
  ];

  constructor(config: WorkspaceIsolationConfig) {
    this.rootPath = path.resolve(config.workspaceRoot);
    this.normalizedRoot = this.normalizePath(this.rootPath);
    this.allowedSubdirs = config.allowedSubdirectories
      ? config.allowedSubdirectories.map((p) => this.normalizePath(path.resolve(this.rootPath, p)))
      : [];
    this.readOnlyPaths = config.readOnlyPaths
      ? config.readOnlyPaths.map((p) => this.normalizePath(path.resolve(this.rootPath, p)))
      : [];
    this.tempDir = config.temporaryDirectory
      ? path.resolve(config.temporaryDirectory)
      : path.join(this.rootPath, '.synapse_tmp');
    this.allowSymlinksOutside = config.allowSymlinksOutsideRoot ?? false;
  }

  public getWorkspaceRoot(): string {
    return this.rootPath;
  }

  public getTempDirectory(): string {
    return this.tempDir;
  }

  public resolveSafePath(inputPath: string, mode: 'read' | 'write' | 'execute' = 'read'): string {
    if (!inputPath || typeof inputPath !== 'string') {
      throw new Error('Path resolution error: Target path cannot be empty');
    }

    // Check for null-byte poison injection
    if (inputPath.includes('\0')) {
      throw new Error('Security violation: Null byte injection detected in path');
    }

    // Resolve path relative to workspace root if relative, or resolve absolute
    const resolvedPath = path.isAbsolute(inputPath)
      ? path.resolve(inputPath)
      : path.resolve(this.rootPath, inputPath);

    const normalized = this.normalizePath(resolvedPath);

    // Check forbidden system paths
    for (const pattern of WorkspaceIsolation.FORBIDDEN_PATTERNS) {
      if (pattern.test(normalized) || pattern.test(resolvedPath)) {
        throw new Error(`Security violation: Access to critical system path '${resolvedPath}' is strictly prohibited`);
      }
    }

    // Check if path is within root or allowed subdirs
    const isInsideRoot = this.isSubPath(this.normalizedRoot, normalized);
    const isInsideSubdir = this.allowedSubdirs.some((sub) => this.isSubPath(sub, normalized));
    const isInsideTemp = this.isSubPath(this.normalizePath(this.tempDir), normalized);

    if (!isInsideRoot && !isInsideSubdir && !isInsideTemp) {
      throw new Error(`Security violation: Path '${resolvedPath}' escapes workspace root '${this.rootPath}'`);
    }

    // If writing, ensure it's not a read-only path
    if (mode === 'write') {
      const isReadOnly = this.readOnlyPaths.some((ro) => this.isSubPath(ro, normalized));
      if (isReadOnly) {
        throw new Error(`Permission denied: Path '${resolvedPath}' is marked as read-only`);
      }
    }

    return resolvedPath;
  }

  public isPathContained(targetPath: string): boolean {
    try {
      this.resolveSafePath(targetPath, 'read');
      return true;
    } catch {
      return false;
    }
  }

  public async verifyRealpath(targetPath: string): Promise<string> {
    const safePath = this.resolveSafePath(targetPath);
    try {
      const real = await fs.realpath(safePath);
      const normalizedReal = this.normalizePath(real);

      if (!this.allowSymlinksOutside && !this.isSubPath(this.normalizedRoot, normalizedReal)) {
        throw new Error(`Security violation: Symlink at '${safePath}' points outside workspace root to '${real}'`);
      }
      return real;
    } catch (err: unknown) {
      // If file doesn't exist yet, verify parent directory
      const parentDir = path.dirname(safePath);
      const realParent = await fs.realpath(parentDir);
      const normalizedRealParent = this.normalizePath(realParent);

      if (!this.allowSymlinksOutside && !this.isSubPath(this.normalizedRoot, normalizedRealParent)) {
        throw new Error(`Security violation: Parent directory '${realParent}' points outside workspace root`);
      }
      return safePath;
    }
  }

  public sanitizeEnvironment(
    env: Record<string, string | undefined>,
    allowedSecretKeys: readonly string[] = []
  ): Record<string, string> {
    const sensitiveKeyPatterns = [
      /SECRET/i,
      /KEY/i,
      /PASSWORD/i,
      /TOKEN/i,
      /CREDENTIAL/i,
      /PRIVATE/i,
      /AUTH/i,
    ];

    const sanitized: Record<string, string> = {
      NODE_ENV: 'production',
      WORKSPACE_DIR: this.rootPath,
      TMPDIR: this.tempDir,
      TEMP: this.tempDir,
      TMP: this.tempDir,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
    };

    // Safe system path preservation
    if (env.PATH) {
      sanitized.PATH = env.PATH;
    }
    if (env.HOME) {
      sanitized.HOME = env.HOME;
    }
    if (env.USERPROFILE) {
      sanitized.USERPROFILE = env.USERPROFILE;
    }

    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) continue;

      if (allowedSecretKeys.includes(key)) {
        sanitized[key] = value;
        continue;
      }

      const isSensitive = sensitiveKeyPatterns.some((p) => p.test(key));
      if (!isSensitive) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private normalizePath(p: string): string {
    return p.replace(/\\/g, '/').toLowerCase();
  }

  private isSubPath(parent: string, child: string): boolean {
    if (parent === child) return true;
    const parentWithSlash = parent.endsWith('/') ? parent : `${parent}/`;
    return child.startsWith(parentWithSlash);
  }
}
