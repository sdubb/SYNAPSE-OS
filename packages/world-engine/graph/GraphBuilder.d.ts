/**
 * @file GraphBuilder.ts
 * @description In-memory and persisted graph builder maintaining indexed adjacency lists and dual lookup maps for ultra-fast traversal.
 */
import { Entity } from '../model/Entity.js';
import { Relationship } from '../model/Relationship.js';
import { WorldModel } from '../model/WorldModel.js';
export interface GraphIndexStats {
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly nodeTypes: Record<string, number>;
    readonly edgeTypes: Record<string, number>;
    readonly avgDegree: number;
    readonly density: number;
}
export declare class GraphBuilder {
    private readonly _nodes;
    private readonly _edges;
    private readonly _outEdges;
    private readonly _inEdges;
    private readonly _nodesByType;
    private readonly _edgesByType;
    constructor(initialModel?: WorldModel);
    addNode(entity: Entity): this;
    addNodes(entities: Iterable<Entity>): this;
    addEdge(relationship: Relationship): this;
    addEdges(relationships: Iterable<Relationship>): this;
    removeNode(nodeId: string): this;
    removeEdge(edgeId: string): this;
    getNode(nodeId: string): Entity | undefined;
    getEdge(edgeId: string): Relationship | undefined;
    getAllNodes(): Entity[];
    getAllEdges(): Relationship[];
    getOutEdges(nodeId: string): Relationship[];
    getInEdges(nodeId: string): Relationship[];
    getAdjacentNodeIds(nodeId: string, direction?: 'out' | 'in' | 'both'): string[];
    getNodesByType(type: string): Entity[];
    getStats(): GraphIndexStats;
    loadFromWorldModel(worldModel: WorldModel): this;
    toWorldModel(config: {
        id: string;
        name: string;
        tenantId: string;
    }): WorldModel;
    clear(): void;
}
//# sourceMappingURL=GraphBuilder.d.ts.map