import { isPrivateOrLoopbackHost } from "./rules/network.js";
import {
  type PolicyRuleDefinition,
  type PolicyCondition,
  type ConditionGroup,
  type PolicyConfig,
} from "./schemas/policy.schema.js";
import { type PolicyContext } from "./PolicyContext.js";
import { PolicyDecision } from "./PolicyDecision.js";

export type CompiledMatcher = (context: PolicyContext) => boolean;

export interface CompiledPolicyRule {
  readonly definition: PolicyRuleDefinition;
  readonly targetMatcher: (target: string) => boolean;
  readonly conditionMatcher: CompiledMatcher;
  evaluate(context: PolicyContext): PolicyDecision | null;
}

export class PolicyCompiler {
  /**
   * Compiles a single declarative PolicyRuleDefinition into a high-speed compiled rule.
   */
  public static compileRule(rule: PolicyRuleDefinition): CompiledPolicyRule {
    const targetMatcher = this.compileGlobMatcher(rule.target ?? "*");
    const conditionMatcher = this.compileConditionGroup(rule.conditions);

    return {
      definition: rule,
      targetMatcher,
      conditionMatcher,
      evaluate(context: PolicyContext): PolicyDecision | null {
        if (!rule.enabled) {
          return null;
        }

        // 1. Check target filter (tool name, action, or target string)
        const matchesTarget =
          targetMatcher(context.toolName) ||
          targetMatcher(context.action) ||
          targetMatcher(context.target);

        if (!matchesTarget) {
          return null;
        }

        // 2. Evaluate conditions
        const isMatched = conditionMatcher(context);
        if (!isMatched) {
          return null;
        }

        // 3. Construct the resulting PolicyDecision
        return new PolicyDecision({
          decision: rule.decision,
          riskLevel: rule.riskLevel,
          reason: rule.reason,
          remediation: rule.remediation,
          matchedRuleId: rule.id,
          matchedRuleName: rule.name,
          matchedCategory: rule.category,
          metadata: rule.metadata,
        });
      },
    };
  }

  /**
   * Compiles an entire PolicyConfig into an array of compiled rules sorted by priority descending.
   */
  public static compileConfig(config: PolicyConfig): CompiledPolicyRule[] {
    return (config.rules ?? [])
      .filter((r) => r.enabled)
      .sort((a, b) => (b.priority ?? 100) - (a.priority ?? 100))
      .map((r) => this.compileRule(r));
  }

  /**
   * Compiles a recursive ConditionGroup into a high-speed boolean predicate.
   */
  public static compileConditionGroup(group: ConditionGroup): CompiledMatcher {
    if (!group || !group.conditions || group.conditions.length === 0) {
      return () => true;
    }

    const compiledChildren = group.conditions.map((item) => {
      if ("conditions" in item) {
        return this.compileConditionGroup(item as ConditionGroup);
      }
      return this.compileCondition(item as PolicyCondition);
    });

    switch (group.operator) {
      case "AND":
        return (ctx) => compiledChildren.every((matcher) => matcher(ctx));
      case "OR":
        return (ctx) => compiledChildren.some((matcher) => matcher(ctx));
      case "NOT":
        return (ctx) => !compiledChildren.some((matcher) => matcher(ctx));
      default:
        return (ctx) => compiledChildren.every((matcher) => matcher(ctx));
    }
  }

  /**
   * Compiles a single PolicyCondition into a fast predicate.
   */
  public static compileCondition(condition: PolicyCondition): CompiledMatcher {
    const { field, operator, value } = condition;

    switch (operator) {
      case "EQUALS":
        return (ctx) => {
          const val = ctx.get(field);
          return val === value;
        };

      case "NOT_EQUALS":
        return (ctx) => {
          const val = ctx.get(field);
          return val !== value;
        };

      case "CONTAINS": {
        const needle = String(value ?? "").toLowerCase();
        return (ctx) => {
          const raw = ctx.get(field);
          if (typeof raw === "string") {
            return raw.toLowerCase().includes(needle);
          }
          if (Array.isArray(raw)) {
            return raw.some((elem) => String(elem).toLowerCase().includes(needle));
          }
          return false;
        };
      }

      case "NOT_CONTAINS": {
        const needle = String(value ?? "").toLowerCase();
        return (ctx) => {
          const raw = ctx.get(field);
          if (typeof raw === "string") {
            return !raw.toLowerCase().includes(needle);
          }
          if (Array.isArray(raw)) {
            return !raw.some((elem) => String(elem).toLowerCase().includes(needle));
          }
          return true;
        };
      }

      case "STARTS_WITH": {
        const prefix = String(value ?? "");
        return (ctx) => {
          const raw = ctx.get(field);
          return typeof raw === "string" && raw.startsWith(prefix);
        };
      }

      case "ENDS_WITH": {
        const suffix = String(value ?? "");
        return (ctx) => {
          const raw = ctx.get(field);
          return typeof raw === "string" && raw.endsWith(suffix);
        };
      }

      case "MATCHES_REGEX": {
        const regex = new RegExp(String(value ?? ""), "i");
        return (ctx) => {
          const raw = ctx.get(field);
          return typeof raw === "string" && regex.test(raw);
        };
      }

      case "IN": {
        const allowedSet = new Set(
          Array.isArray(value) ? value.map(String) : [String(value ?? "")]
        );
        return (ctx) => {
          const raw = ctx.get(field);
          return allowedSet.has(String(raw));
        };
      }

      case "NOT_IN": {
        const disallowedSet = new Set(
          Array.isArray(value) ? value.map(String) : [String(value ?? "")]
        );
        return (ctx) => {
          const raw = ctx.get(field);
          return !disallowedSet.has(String(raw));
        };
      }

      case "GREATER_THAN": {
        const threshold = Number(value);
        return (ctx) => {
          const raw = Number(ctx.get(field));
          return !isNaN(raw) && raw > threshold;
        };
      }

      case "LESS_THAN": {
        const threshold = Number(value);
        return (ctx) => {
          const raw = Number(ctx.get(field));
          return !isNaN(raw) && raw < threshold;
        };
      }

      case "IS_EMPTY":
        return (ctx) => {
          const raw = ctx.get(field);
          if (raw === undefined || raw === null) return true;
          if (typeof raw === "string" || Array.isArray(raw)) return raw.length === 0;
          if (typeof raw === "object") return Object.keys(raw).length === 0;
          return false;
        };

      case "IS_NOT_EMPTY":
        return (ctx) => {
          const raw = ctx.get(field);
          if (raw === undefined || raw === null) return false;
          if (typeof raw === "string" || Array.isArray(raw)) return raw.length > 0;
          if (typeof raw === "object") return Object.keys(raw).length > 0;
          return true;
        };

      case "CIDR_MATCH": {
        const cidr = String(value ?? "");
        return (ctx) => {
          const raw = String(ctx.get(field) ?? "");
          return PolicyCompiler.matchCidr(raw, cidr);
        };
      }

      case "GLOB_MATCH": {
        const globMatcher = this.compileGlobMatcher(String(value ?? "*"));
        return (ctx) => {
          const raw = String(ctx.get(field) ?? "");
          return globMatcher(raw);
        };
      }

      default:
        return () => false;
    }
  }

  /**
   * Helper to match IP against a CIDR block or keyword
   */
  public static matchCidr(ipStr: string, cidr: string): boolean {
    if (!cidr || !ipStr) return false;
    if (cidr === "RFC1918" || cidr === "private" || cidr === "loopback") {
      return isPrivateOrLoopbackHost(ipStr);
    }

    const [range, bitsStr] = cidr.split("/");
    if (!range) return false;
    const prefixBits = bitsStr !== undefined ? parseInt(bitsStr, 10) : 32;
    if (isNaN(prefixBits) || prefixBits < 0 || prefixBits > 32) return false;

    const ipToLong = (ip: string): number | null => {
      const parts = ip.trim().split(".").map((p) => parseInt(p, 10));
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null;
      return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
    };

    const targetLong = ipToLong(ipStr);
    const rangeLong = ipToLong(range);
    if (targetLong === null || rangeLong === null) return false;

    if (prefixBits === 0) return true;
    const mask = (0xffffffff << (32 - prefixBits)) >>> 0;
    return (targetLong & mask) === (rangeLong & mask);
  }

  /**
   * High-speed Glob to RegExp compiler using sentinel substitution to prevent double-replacement corruption.
   */
  public static compileGlobMatcher(pattern: string): (candidate: string) => boolean {
    if (pattern === "*" || pattern === "**") {
      return () => true;
    }

    const DOUBLE_STAR_SENTINEL = "__DOUBLE_STAR_WILDCARD__";
    const SINGLE_STAR_SENTINEL = "__SINGLE_STAR_WILDCARD__";
    const QUESTION_SENTINEL = "__QUESTION_WILDCARD__";

    const normalized = pattern
      .replace(/\*\*/g, DOUBLE_STAR_SENTINEL)
      .replace(/\*/g, SINGLE_STAR_SENTINEL)
      .replace(/\?/g, QUESTION_SENTINEL);

    const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, "\\$&");

    const regexStr = "^" + escaped
      .replace(new RegExp(DOUBLE_STAR_SENTINEL, "g"), ".*")
      .replace(new RegExp(SINGLE_STAR_SENTINEL, "g"), "[^/\\\\]*")
      .replace(new RegExp(QUESTION_SENTINEL, "g"), ".") + "$";

    const regex = new RegExp(regexStr, "i");
    return (candidate: string) => regex.test(candidate);
  }
}
