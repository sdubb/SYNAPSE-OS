/**
 * @file RuleEngine.ts
 * @description Enforces business rules, conditional logic, and state mutation triggers during simulation execution.
 */

import type { WorldModel, Entity, PropertyValue } from '@synapse/world-engine';

export type RuleCondition = (model: WorldModel, entity: Entity) => boolean;
export type RuleAction = (
  model: WorldModel,
  entity: Entity
) => { stateUpdates?: Record<string, PropertyValue>; sideEffects?: string[] };

export interface SimulationRule {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly entityTypes?: readonly string[];
  readonly condition: RuleCondition;
  readonly action: RuleAction;
  readonly priority?: number;
  readonly enabled?: boolean;
}

export interface RuleExecutionResult {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly entityId: string;
  readonly fired: boolean;
  readonly stateUpdates?: Record<string, PropertyValue>;
  readonly sideEffects?: readonly string[];
}

export class RuleEngine {
  private readonly _rules: SimulationRule[] = [];

  public registerRule(rule: SimulationRule): this {
    this._rules.push(rule);
    this._rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return this;
  }

  public getRules(): readonly SimulationRule[] {
    return this._rules;
  }

  /**
   * Evaluates all applicable rules on the current world model state.
   */
  public evaluateRules(model: WorldModel): {
    updatedModel: WorldModel;
    results: RuleExecutionResult[];
  } {
    let currentModel = model;
    const results: RuleExecutionResult[] = [];

    for (const entity of currentModel.getAllEntities()) {
      for (const rule of this._rules) {
        if (rule.enabled === false) continue;

        if (rule.entityTypes && rule.entityTypes.length > 0 && !rule.entityTypes.includes(entity.type)) {
          continue;
        }

        try {
          const matched = rule.condition(currentModel, entity);
          if (matched) {
            const actionResult = rule.action(currentModel, entity);
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              entityId: entity.id,
              fired: true,
              stateUpdates: actionResult.stateUpdates,
              sideEffects: actionResult.sideEffects,
            });

            if (actionResult.stateUpdates) {
              const updatedEntity = entity.cloneWithState(actionResult.stateUpdates, {
                sourceSystem: `RuleEngine:${rule.name}`,
              });
              currentModel = currentModel.withEntity(updatedEntity);
            }
          }
        } catch (err) {
          console.error(`Rule '${rule.name}' failed on entity '${entity.id}':`, err);
        }
      }
    }

    return {
      updatedModel: currentModel,
      results,
    };
  }

  public static createThresholdRule(
    id: string,
    name: string,
    entityType: string,
    propertyKey: string,
    threshold: number,
    operator: '>' | '<' | '>=' | '<=' | '==',
    onExceededUpdates: Record<string, PropertyValue>
  ): SimulationRule {
    return {
      id,
      name,
      entityTypes: [entityType],
      condition: (_model: WorldModel, entity: Entity) => {
        const val = entity.state.get(propertyKey);
        if (typeof val !== 'number') return false;
        switch (operator) {
          case '>': return val > threshold;
          case '<': return val < threshold;
          case '>=': return val >= threshold;
          case '<=': return val <= threshold;
          case '==': return val === threshold;
        }
      },
      action: () => ({ stateUpdates: onExceededUpdates }),
    };
  }
}
