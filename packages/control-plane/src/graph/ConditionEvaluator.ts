export class ConditionEvaluator {
  public static evaluate(condition: string, context: Record<string, any>): boolean {
    if (!condition || condition.trim() === "") return true;

    // A very simple tokenizer for the safe DSL
    const tokens = condition.trim().split(/\s+/);
    
    if (tokens.length === 3) {
      const left = this.resolvePath(tokens[0], context);
      const operator = tokens[1];
      const rightStr = tokens[2];
      let right: any = rightStr;
      
      // Parse right side
      if (rightStr === "true") right = true;
      else if (rightStr === "false") right = false;
      else if (!isNaN(Number(rightStr))) right = Number(rightStr);
      else if (rightStr.startsWith("'") && rightStr.endsWith("'")) right = rightStr.slice(1, -1);
      else if (rightStr.startsWith('"') && rightStr.endsWith('"')) right = rightStr.slice(1, -1);
      
      switch (operator) {
        case "==": return left === right;
        case "!=": return left !== right;
        case ">": return left > right;
        case ">=": return left >= right;
        case "<": return left < right;
        case "<=": return left <= right;
        case "CONTAINS": return Array.isArray(left) ? left.includes(right) : String(left).includes(String(right));
        default: return false; // Invalid operator
      }
    }
    
    return false; // Invalid syntax
  }

  private static resolvePath(path: string, obj: any): any {
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : undefined, obj);
  }
}
