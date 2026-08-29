/**
 * @file RuleEngine.ts
 * @description Enforces business rules, conditional logic, and state mutation triggers during simulation execution.
 */
import type { WorldModel, Entity, PropertyValue } from '@synapse/world-engine';
export type RuleCondition = (model: WorldModel, entity: Entity) => boolean;
export type RuleAction = (model: WorldModel, entity: Entity) => {
    stateUpdates?: Record<string, PropertyValue>;
    sideEffects?: string[];
};
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
export declare class RuleEngine {
    private readonly _rules;
    registerRule(rule: SimulationRule): this;
    getRules(): readonly SimulationRule[];
    /**
     * Evaluates all applicable rules on the current world model state.
     */
    evaluateRules(model: WorldModel): {
        updatedModel: WorldModel;
        results: RuleExecutionResult[];
    };
    static createThresholdRule(id: string, name: string, entityType: string, propertyKey: string, threshold: number, operator: '>' | '<' | '>=' | '<=' | '==', onExceededUpdates: Record<string, PropertyValue>): SimulationRule;
}
//# sourceMappingURL=RuleEngine.d.ts.map