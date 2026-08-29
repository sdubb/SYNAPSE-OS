import { type PolicyContext } from "../PolicyContext.js";
import { PolicyDecision } from "../PolicyDecision.js";

export interface DestructiveRuleOptions {
  allowDatabaseDrop?: boolean;
  allowTableTruncate?: boolean;
  allowInfraTeardown?: boolean;
}

const DESTRUCTIVE_SQL_PATTERNS = [
  { pattern: /\bDROP\s+DATABASE\b/i, name: "db-drop-database", level: "CRITICAL" as const, desc: "Dropping an entire database" },
  { pattern: /\bDROP\s+SCHEMA\b/i, name: "db-drop-schema", level: "CRITICAL" as const, desc: "Dropping a database schema" },
  { pattern: /\bDROP\s+TABLE\b/i, name: "db-drop-table", level: "HIGH" as const, desc: "Dropping a database table" },
  { pattern: /\bTRUNCATE\s+(?:TABLE\s+)?/i, name: "db-truncate-table", level: "HIGH" as const, desc: "Truncating all rows in a table" },
  { pattern: /\bDELETE\s+FROM\s+[^\s]+(?:\s*;|\s*$)/i, name: "db-delete-unbounded", level: "HIGH" as const, desc: "Unbounded DELETE without WHERE clause" },
];

const DESTRUCTIVE_INFRA_PATTERNS = [
  { pattern: /\bterraform\s+destroy\b/i, name: "infra-terraform-destroy", level: "CRITICAL" as const, desc: "Terraform infrastructure teardown" },
  { pattern: /\bpulumi\s+destroy\b/i, name: "infra-pulumi-destroy", level: "CRITICAL" as const, desc: "Pulumi stack destruction" },
  { pattern: /\baws\s+s3\s+rb\s+.*--force/i, name: "infra-aws-s3-rb-force", level: "CRITICAL" as const, desc: "Force deletion of S3 bucket" },
  { pattern: /\bkubectl\s+delete\s+namespace\b/i, name: "infra-k8s-delete-namespace", level: "CRITICAL" as const, desc: "Kubernetes namespace deletion" },
  { pattern: /\bdocker\s+system\s+prune\s+.*-a/i, name: "infra-docker-prune-all", level: "HIGH" as const, desc: "Docker prune removing all images and volumes" },
];

export function evaluateDestructivePolicy(
  context: PolicyContext,
  options?: DestructiveRuleOptions
): PolicyDecision | null {
  // 1. SQL / Database Commands
  const sqlTarget = (
    typeof context.args["query"] === "string"
      ? context.args["query"]
      : typeof context.args["sql"] === "string"
      ? context.args["sql"]
      : typeof context.args["statement"] === "string"
      ? context.args["statement"]
      : context.action.startsWith("database:")
      ? context.target
      : ""
  ).trim();

  if (sqlTarget) {
    for (const item of DESTRUCTIVE_SQL_PATTERNS) {
      if (item.pattern.test(sqlTarget)) {
        if (item.level === "CRITICAL" && !options?.allowDatabaseDrop) {
          return PolicyDecision.block(`Destructive database operation is prohibited: ${item.desc}`, {
            matchedCategory: "destructive",
            matchedRuleName: item.name,
            riskLevel: "CRITICAL",
            violations: [`Detected SQL pattern: ${item.pattern.source}`],
            remediation: "Database drop commands cannot be executed directly by autonomous agents.",
          });
        }

        return PolicyDecision.requireApproval(`Destructive database statement '${item.desc}' requires human approval`, {
          matchedCategory: "destructive",
          matchedRuleName: item.name,
          riskLevel: item.level,
          violations: [`Detected SQL pattern: ${item.pattern.source}`],
          remediation: "Submit a migration script or obtain admin approval.",
        });
      }
    }
  }

  // 2. Infrastructure Teardown Commands
  const cmd = (
    typeof context.args["command"] === "string"
      ? context.args["command"]
      : typeof context.args["CommandLine"] === "string"
      ? context.args["CommandLine"]
      : context.action.startsWith("shell:")
      ? context.target
      : ""
  ).trim();

  if (cmd) {
    for (const item of DESTRUCTIVE_INFRA_PATTERNS) {
      if (item.pattern.test(cmd)) {
        if (!options?.allowInfraTeardown) {
          return PolicyDecision.requireApproval(`Potentially destructive cloud infrastructure command '${item.desc}' requires human approval`, {
            matchedCategory: "destructive",
            matchedRuleName: item.name,
            riskLevel: item.level,
            violations: [`Command matches destructive infra pattern: ${item.pattern.source}`],
            remediation: "Require approval from an operations lead before destroying infrastructure.",
          });
        }
      }
    }
  }

  return null;
}
