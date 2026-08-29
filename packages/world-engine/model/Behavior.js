/**
 * @file Behavior.ts
 * @description Dynamic behavioral rule defining how entities react to discrete world events and compute state updates.
 */
export class Behavior {
    id;
    name;
    description;
    targetEntityTypes;
    triggerEventTypes;
    priority;
    enabled;
    _triggerPredicate;
    _handler;
    constructor(config, handler, triggerPredicate) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.targetEntityTypes = Object.freeze([...config.targetEntityTypes]);
        this.triggerEventTypes = Object.freeze([...config.triggerEventTypes]);
        this.priority = config.priority ?? 100;
        this.enabled = config.enabled ?? true;
        this._handler = handler;
        this._triggerPredicate = triggerPredicate;
    }
    matches(event, entity) {
        if (!this.enabled)
            return false;
        // Entity type check
        if (this.targetEntityTypes.length > 0 && !this.targetEntityTypes.includes(entity.type) && !this.targetEntityTypes.includes('*')) {
            return false;
        }
        // Event type check
        if (this.triggerEventTypes.length > 0 && !this.triggerEventTypes.includes(event.type) && !this.triggerEventTypes.includes('*')) {
            return false;
        }
        // Specific predicate check if provided
        if (this._triggerPredicate) {
            return this._triggerPredicate(event, entity);
        }
        return true;
    }
    async execute(event, entity, context) {
        if (!this.matches(event, entity)) {
            return { handled: false };
        }
        try {
            const result = await this._handler(event, entity, context);
            return result;
        }
        catch (err) {
            return {
                handled: true,
                error: err instanceof Error ? err : new Error(String(err)),
            };
        }
    }
}
//# sourceMappingURL=Behavior.js.map