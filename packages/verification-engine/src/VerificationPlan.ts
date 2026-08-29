import path from "node:path";
import {
  type VerificationPlan,
  type VerificationAssertion,
  type AssertionType,
} from "@synapse/contracts";

export interface PlanCompilationInput {
  tenantId: string;
  taskId?: string;
  name: string;
  description?: string;
  taskType?: "code_change" | "documentation" | "dependency_update" | "database_migration" | "api_endpoint";
  modifiedFiles: string[];
  workspaceRoot?: string;
  requireVerifierAgent?: boolean;
}

export class VerificationPlanCompiler {
  /**
   * Automatically compiles a multi-vector verification plan based on task attributes and modified files.
   */
  public static compile(input: PlanCompilationInput): VerificationPlan {
    const assertions: VerificationAssertion[] = [];

    // 1. File existence and content integrity assertions for each modified file
    for (const file of input.modifiedFiles) {
      assertions.push({
        id: crypto.randomUUID(),
        type: "FILE_EXISTS" as AssertionType,
        name: `Verify file exists: ${path.basename(file)}`,
        description: `Ensure ${file} was successfully written and is present in workspace`,
        target: file,
        timeoutSeconds: 30,
        critical: true,
        metadata: { path: file },
      });
    }

    // 2. TypeScript / Build compilation check
    const hasTypeScriptFiles = input.modifiedFiles.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
    if (hasTypeScriptFiles || input.taskType === "code_change") {
      assertions.push({
        id: crypto.randomUUID(),
        type: "BUILD_SUCCESS" as AssertionType,
        name: "Verify TypeScript / Project Build",
        description: "Runs build toolchain to guarantee zero type errors or broken exports",
        target: "npx tsc --noEmit",
        timeoutSeconds: 120,
        critical: true,
        metadata: { compiler: "tsc" },
      });
    }

    // 3. Automated Test Suite
    if (input.taskType === "code_change" || input.modifiedFiles.some((f) => f.includes("test") || f.includes("spec"))) {
      assertions.push({
        id: crypto.randomUUID(),
        type: "TEST_SUITE_PASS" as AssertionType,
        name: "Run Automated Test Suite",
        description: "Executes automated tests to verify zero regressions",
        target: "npm test",
        timeoutSeconds: 180,
        critical: true,
        metadata: { runner: "npm test" },
      });
    }

    // 4. Security & Secret Leak Scan
    assertions.push({
      id: crypto.randomUUID(),
      type: "SECURITY_SCAN_CLEAN" as AssertionType,
      name: "Security Secret Leak Scan",
      description: "Scans all generated code for accidentally committed private keys or tokens",
      target: "",
      timeoutSeconds: 60,
      critical: true,
      metadata: { scanType: "secrets" },
    });

    // 5. Git Diff / Commit Hygiene
    assertions.push({
      id: crypto.randomUUID(),
      type: "GIT_DIFF_EMPTY" as AssertionType,
      name: "Verify Clean Working Tree",
      description: "Checks that all work is cleanly staged or committed",
      target: "HEAD",
      timeoutSeconds: 30,
      critical: false,
      metadata: {},
    });

    const now = new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      tenantId: input.tenantId as `${string}-${string}-${string}-${string}-${string}`,
      taskId: input.taskId as `${string}-${string}-${string}-${string}-${string}` | undefined,
      name: input.name,
      description: input.description,
      assertions,
      requireVerifierAgent: input.requireVerifierAgent ?? false,
      maxExecutionTimeMs: 300000,
      createdAt: now,
      updatedAt: now,
    };
  }
}
