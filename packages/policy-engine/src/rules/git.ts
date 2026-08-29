import { type PolicyContext } from "../PolicyContext.js";
import { PolicyDecision } from "../PolicyDecision.js";

export interface GitRuleOptions {
  protectedBranches?: string[];
  allowForcePush?: boolean;
  allowDirectMainPush?: boolean;
  allowHookModifications?: boolean;
}

const DEFAULT_PROTECTED_BRANCHES = ["main", "master", "production", "prod", "release", "stable"];

export function evaluateGitPolicy(
  context: PolicyContext,
  options?: GitRuleOptions
): PolicyDecision | null {
  const isGitAction =
    context.action.startsWith("git:") ||
    (typeof context.args["command"] === "string" && context.args["command"].trim().startsWith("git ")) ||
    (typeof context.args["CommandLine"] === "string" && context.args["CommandLine"].trim().startsWith("git "));

  if (!isGitAction) {
    return null;
  }

  const rawCmd = (
    (typeof context.args["command"] === "string"
      ? context.args["command"]
      : typeof context.args["CommandLine"] === "string"
      ? context.args["CommandLine"]
      : context.target) ?? ""
  ).trim();

  const protectedBranches = options?.protectedBranches ?? DEFAULT_PROTECTED_BRANCHES;

  // 1. Force Push Detection
  const forcePushPattern = /\bgit\s+push\b.*(?:\s+-(?:f\b|[a-zA-Z]*f)|--force\b|--force-with-lease\b|\+[a-zA-Z0-9_\-\/]+)/i;
  if (forcePushPattern.test(rawCmd)) {
    if (!options?.allowForcePush) {
      return PolicyDecision.block("Force pushing to git repositories is prohibited to preserve commit history integrity", {
        matchedCategory: "git",
        matchedRuleName: "git-force-push-blocked",
        riskLevel: "CRITICAL",
        violations: ["Destructive git force push operation"],
        remediation: "Rebase or merge changes cleanly without forcing remote repository updates.",
      });
    }
  }

  // 2. Direct Push to Protected Branches
  const pushPattern = /\bgit\s+push\s+(?:[^\s]+\s+)?([a-zA-Z0-9_\-\/]+)/i;
  const pushMatch = rawCmd.match(pushPattern);
  if (pushMatch) {
    const targetBranch = (pushMatch[1] ?? "").replace(/^origin\//, "").replace(/^\+/, "");
    if (protectedBranches.includes(targetBranch.toLowerCase())) {
      if (!options?.allowDirectMainPush) {
        return PolicyDecision.requireApproval(`Direct push to protected branch '${targetBranch}' requires human authorization`, {
          matchedCategory: "git",
          matchedRuleName: "git-protected-branch-push",
          riskLevel: "HIGH",
          violations: [`Target branch ${targetBranch} is protected`],
          remediation: "Create a feature branch and submit a pull request for automated verification.",
        });
      }
    }
  }

  // 3. Deletion of Protected Branches
  const deleteBranchPattern = /\bgit\s+(?:push\s+[^\s]+\s+(?:--delete|-d)\s+([a-zA-Z0-9_\-\/]+)|branch\s+-[dD]\s+([a-zA-Z0-9_\-\/]+))/i;
  const deleteMatch = rawCmd.match(deleteBranchPattern);
  if (deleteMatch) {
    const targetBranch = (deleteMatch[1] ?? deleteMatch[2] ?? "").toLowerCase();
    if (protectedBranches.includes(targetBranch)) {
      return PolicyDecision.block(`Deletion of protected branch '${targetBranch}' is forbidden`, {
        matchedCategory: "git",
        matchedRuleName: "git-protected-branch-deletion",
        riskLevel: "CRITICAL",
        violations: [`Attempted deletion of protected branch ${targetBranch}`],
      });
    }
  }

  // 4. Git Hooks Tampering
  if (!options?.allowHookModifications) {
    const hookPattern = /\.git[\/\\]hooks|git\s+config\s+.*core\.hooksPath/i;
    if (hookPattern.test(rawCmd)) {
      return PolicyDecision.block("Modification of git hooks or custom hooksPath is restricted", {
        matchedCategory: "git",
        matchedRuleName: "git-hook-tampering",
        riskLevel: "CRITICAL",
        violations: ["Attempted tampering with git hook scripts"],
      });
    }
  }

  // 5. Global Git Config Modifications
  if (/\bgit\s+config\s+--global\b/i.test(rawCmd)) {
    return PolicyDecision.requireApproval("Modifying global git configuration requires administrative approval", {
      matchedCategory: "git",
      matchedRuleName: "git-global-config-mutation",
      riskLevel: "MEDIUM",
      violations: ["Attempted mutation of host global git config"],
    });
  }

  return null;
}
