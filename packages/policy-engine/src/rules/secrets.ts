import path from "node:path";
import { type PolicyContext } from "../PolicyContext.js";
import { PolicyDecision } from "../PolicyDecision.js";

export interface SecretsRuleOptions {
  blockedSecretNames?: string[];
  allowEnvInspection?: boolean;
}

const KNOWN_SECRET_PATTERNS = [
  /\.env(\.[\w-]+)?$/i,
  /\.ssh[\/\\](?:id_rsa|id_ecdsa|id_ed25519|known_hosts|authorized_keys)/i,
  /\.aws[\/\\](?:credentials|config)/i,
  /\.kube[\/\\]config/i,
  /\.gnupg[\/\\]/i,
  /\.dockercfg|\.docker[\/\\]config\.json/i,
  /\.npmrc$/i,
  /\.pypirc$/i,
  /\.netrc$/i,
  /id_rsa|id_ed25519|id_ecdsa/i,
  /service-account.*\.json$/i,
  /client_secret.*\.json$/i,
  /\.git-credentials$/i,
];

const SECRET_SHELL_EXPOSURE_PATTERNS = [
  /\b(?:cat|type|Get-Content|gc|head|tail|more|less)\s+.*(?:\.env|\.aws|\.ssh|\.kube|\.npmrc|id_rsa)/i,
  /\b(?:printenv|env|export)\b/i,
  /\becho\s+\$(?:AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GITHUB_TOKEN|SYNAPSE_MASTER_KEY|DATABASE_URL|JWT_SECRET)/i,
];

export function evaluateSecretsPolicy(
  context: PolicyContext,
  options?: SecretsRuleOptions
): PolicyDecision | null {
  // 1. Direct Target Path Analysis
  const target = context.target;
  const normalizedTarget = path.normalize(target);

  for (const pattern of KNOWN_SECRET_PATTERNS) {
    if (pattern.test(normalizedTarget) || pattern.test(target)) {
      return PolicyDecision.block(`Access to credential store or key file '${target}' is blocked`, {
        matchedCategory: "secrets",
        matchedRuleName: "secrets-credential-file-access",
        riskLevel: "CRITICAL",
        violations: [`Target path matches secret credential pattern: ${pattern.source}`],
        remediation: "Request authorized credentials via Synapse SecretManager rather than accessing files directly.",
      });
    }
  }

  // 2. Shell Command Dumping Secrets
  const command = (
    typeof context.args["command"] === "string"
      ? context.args["command"]
      : typeof context.args["CommandLine"] === "string"
      ? context.args["CommandLine"]
      : ""
  ).trim();

  if (command) {
    for (const pattern of SECRET_SHELL_EXPOSURE_PATTERNS) {
      if (pattern.test(command)) {
        if (pattern.source.includes("printenv") || pattern.source.includes("export")) {
          if (!options?.allowEnvInspection) {
            return PolicyDecision.requireApproval("Dumping process environment variables requires approval to prevent accidental secret leakage", {
              matchedCategory: "secrets",
              matchedRuleName: "secrets-env-dump",
              riskLevel: "HIGH",
              violations: ["Process environment dump detected"],
            });
          }
        } else {
          return PolicyDecision.block(`Command attempts to display or read secret file: ${command}`, {
            matchedCategory: "secrets",
            matchedRuleName: "secrets-command-exposure",
            riskLevel: "CRITICAL",
            violations: [`Secret exposure command pattern: ${pattern.source}`],
          });
        }
      }
    }
  }

  // 3. Blocked Secret Name Keys in Parameters
  if (options?.blockedSecretNames && options.blockedSecretNames.length > 0) {
    for (const key of Object.keys(context.args)) {
      if (options.blockedSecretNames.some((name) => key.toLowerCase().includes(name.toLowerCase()))) {
        return PolicyDecision.block(`Parameter '${key}' references a restricted secret key name`, {
          matchedCategory: "secrets",
          matchedRuleName: "secrets-restricted-key-name",
          riskLevel: "HIGH",
          violations: [`Restricted secret argument: ${key}`],
        });
      }
    }
  }

  return null;
}
