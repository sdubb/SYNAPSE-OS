/**
 * @file State.ts
 * @description Entity state snapshot and property bag with versioning, immutability, and change diffing.
 */
export class State {
    _properties;
    _metadata;
    constructor(properties = {}, metadata) {
        this._properties = Object.freeze(State.deepClone(properties));
        this._metadata = Object.freeze({
            version: metadata?.version ?? 1,
            timestamp: metadata?.timestamp ?? Date.now(),
            source: metadata?.source ?? 'system',
            checksum: metadata?.checksum ?? this.calculateChecksum(this._properties),
            authorId: metadata?.authorId,
            reason: metadata?.reason,
        });
    }
    get properties() {
        return this._properties;
    }
    get metadata() {
        return this._metadata;
    }
    get version() {
        return this._metadata.version;
    }
    get timestamp() {
        return this._metadata.timestamp;
    }
    get source() {
        return this._metadata.source;
    }
    get(key, defaultValue) {
        const value = this._properties[key];
        return (value !== undefined ? value : defaultValue);
    }
    has(key) {
        return Object.prototype.hasOwnProperty.call(this._properties, key);
    }
    getNested(path, defaultValue) {
        const segments = path.split('.');
        let current = this._properties;
        for (const segment of segments) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return defaultValue;
            }
            current = current[segment];
        }
        return (current !== undefined ? current : defaultValue);
    }
    withUpdates(updates, metadataUpdate) {
        const newProps = {
            ...this._properties,
            ...State.deepClone(updates),
        };
        return new State(newProps, {
            ...this._metadata,
            ...metadataUpdate,
            version: this._metadata.version + 1,
            timestamp: metadataUpdate?.timestamp ?? Date.now(),
        });
    }
    without(keys, metadataUpdate) {
        const newProps = { ...this._properties };
        for (const key of keys) {
            delete newProps[key];
        }
        return new State(newProps, {
            ...this._metadata,
            ...metadataUpdate,
            version: this._metadata.version + 1,
            timestamp: metadataUpdate?.timestamp ?? Date.now(),
        });
    }
    diff(other) {
        const added = {};
        const updated = {};
        const deleted = [];
        const thisKeys = new Set(Object.keys(this._properties));
        const otherKeys = new Set(Object.keys(other._properties));
        for (const key of otherKeys) {
            if (!thisKeys.has(key)) {
                added[key] = other._properties[key];
            }
            else {
                const valA = this._properties[key];
                const valB = other._properties[key];
                if (!State.deepEqual(valA, valB)) {
                    updated[key] = { from: valA, to: valB };
                }
            }
        }
        for (const key of thisKeys) {
            if (!otherKeys.has(key)) {
                deleted.push(key);
            }
        }
        const hasChanges = Object.keys(added).length > 0 || Object.keys(updated).length > 0 || deleted.length > 0;
        return { added, updated, deleted, hasChanges };
    }
    toJSON() {
        return {
            properties: this._properties,
            metadata: this._metadata,
        };
    }
    static fromJSON(json) {
        return new State(json.properties, json.metadata);
    }
    calculateChecksum(props) {
        const serialized = JSON.stringify(props, Object.keys(props).sort());
        let hash = 0;
        for (let i = 0; i < serialized.length; i++) {
            const char = serialized.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
        }
        return `chk_${Math.abs(hash).toString(16)}`;
    }
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => State.deepClone(item));
        }
        const copy = {};
        for (const key of Object.keys(obj)) {
            copy[key] = State.deepClone(obj[key]);
        }
        return copy;
    }
    static deepEqual(a, b) {
        if (a === b)
            return true;
        if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object')
            return false;
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length)
                return false;
            for (let i = 0; i < a.length; i++) {
                if (!State.deepEqual(a[i], b[i]))
                    return false;
            }
            return true;
        }
        if (Array.isArray(a) !== Array.isArray(b))
            return false;
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length)
            return false;
        for (const key of keysA) {
            if (!Object.prototype.hasOwnProperty.call(b, key))
                return false;
            if (!State.deepEqual(a[key], b[key])) {
                return false;
            }
        }
        return true;
    }
}
//# sourceMappingURL=State.js.map