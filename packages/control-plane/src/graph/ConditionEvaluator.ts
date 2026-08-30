export class ConditionEvaluator {
  public static evaluate(condition: string, context: Record<string, any>): boolean {
    if (!condition || condition.trim() === "") return true;
    try {
      const tokens = this.tokenize(condition);
      let pos = 0;

      const parsePrimary = (): boolean => {
        if (pos >= tokens.length) return false;
        
        if (tokens[pos] === "NOT") {
          pos++;
          return !parsePrimary();
        }
        
        if (tokens[pos] === "(") {
          pos++;
          const val = parseOr();
          if (tokens[pos] === ")") pos++;
          return val;
        }

        // It must be a binary expression: left operator right
        const leftStr = tokens[pos++];
        if (pos >= tokens.length) {
           // Single boolean value or truthy check
           return !!this.resolveValue(leftStr, context);
        }
        
        const op = tokens[pos++];
        const rightStr = tokens[pos++];
        
        const left = this.resolveValue(leftStr, context);
        const right = this.resolveValue(rightStr, context);

        switch (op) {
          case "==": return left === right;
          case "!=": return left !== right;
          case ">": return left > right;
          case ">=": return left >= right;
          case "<": return left < right;
          case "<=": return left <= right;
          case "CONTAINS": return Array.isArray(left) ? left.includes(right) : String(left).includes(String(right));
          default: throw new Error(`Unknown operator ${op}`);
        }
      };

      const parseAnd = (): boolean => {
        let val = parsePrimary();
        while (pos < tokens.length && tokens[pos] === "AND") {
          pos++;
          const right = parsePrimary();
          val = val && right;
        }
        return val;
      };

      const parseOr = (): boolean => {
        let val = parseAnd();
        while (pos < tokens.length && tokens[pos] === "OR") {
          pos++;
          const right = parseAnd();
          val = val || right;
        }
        return val;
      };

      return parseOr();
    } catch (e) {
      console.warn("Graph condition evaluation failed:", e);
      return false; // Default to false (blocking) on evaluation failure
    }
  }

  private static tokenize(str: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if ((char === "'" || char === '"') && (i === 0 || str[i-1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
          current += char;
        } else if (char === quoteChar) {
          inQuotes = false;
          current += char;
          tokens.push(current);
          current = "";
        } else {
          current += char;
        }
      } else if (!inQuotes && (char === "(" || char === ")")) {
        if (current.trim()) tokens.push(current.trim());
        tokens.push(char);
        current = "";
      } else if (!inQuotes && char.trim() === "") {
        if (current.trim()) tokens.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) tokens.push(current.trim());
    return tokens;
  }

  private static resolveValue(str: string, context: Record<string, any>): any {
    if (str === "true") return true;
    if (str === "false") return false;
    if (!isNaN(Number(str))) return Number(str);
    if (str.startsWith("'") && str.endsWith("'")) return str.slice(1, -1);
    if (str.startsWith('"') && str.endsWith('"')) return str.slice(1, -1);

    // Otherwise, treat as path
    return str.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : undefined, context);
  }
}
