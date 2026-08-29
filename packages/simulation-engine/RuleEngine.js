/**
 * @file RuleEngine.ts
 * @description Enforces business rules, conditional logic, and state mutation triggers during simulation execution.
 */
export class RuleEngine {
    _rules = [];
    registerRule(rule) {
        this._rules.push(rule);
        this._rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        return this;
    }
    getRules() {
        return this._rules;
    }
    /**
     * Evaluates all applicable rules on the current world model state.
     */
    evaluateRules(model) {
        let currentModel = model;
        const results = [];
        for (const entity of currentModel.getAllEntities()) {
            for (const rule of this._rules) {
                if (rule.enabled === false)
                    continue;
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
                }
                catch (err) {
                    console.error(`Rule '${rule.name}' failed on entity '${entity.id}':`, err);
                }
            }
        }
        return {
            updatedModel: currentModel,
            results,
        };
    }
    static createThresholdRule(id, name, entityType, propertyKey, threshold, operator, onExceededUpdates) {
        return {
            id,
            name,
            entityTypes: [entityType],
            condition: (_model, entity) => {
                const val = entity.state.get(propertyKey);
                if (typeof val !== 'number')
                    return false;
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
//# sourceMappingURL=RuleEngine.js.map