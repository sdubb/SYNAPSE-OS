/**
 * @file GraphQuery.ts
 * @description Advanced graph query engine supporting path finding, Dijkstra, neighborhood expansion, cycle detection, topological sort, and blast-radius analysis.
 */
import { Entity } from '../model/Entity.js';
import { Relationship } from '../model/Relationship.js';
import { GraphBuilder } from './GraphBuilder.js';
import type { PropertyValue } from '../model/State.js';
export interface PathResult {
    readonly path: string[];
    readonly entities: Entity[];
    readonly relationships: Relationship[];
    readonly totalWeight: number;
}
export interface NeighborhoodOptions {
    readonly maxDepth?: number;
    readonly direction?: 'outbound' | 'inbound' | 'both';
    readonly relationTypes?: readonly string[];
    readonly entityTypes?: readonly string[];
    readonly predicate?: (entity: Entity, currentDepth: number) => boolean;
}
export interface BlastRadiusResult {
    readonly rootEntityId: string;
    readonly directlyImpacted: Entity[];
    readonly transitivelyImpacted: Entity[];
    readonly impactedRelationships: Relationship[];
    readonly impactDepthMap: Readonly<Record<string, number>>;
    readonly totalImpactScore: number;
}
export declare class GraphQuery {
    private readonly _builder;
    constructor(builder: GraphBuilder);
    /**
     * Expands neighborhood around start node up to maxDepth hops.
     */
    expandNeighborhood(startNodeId: string, options?: NeighborhoodOptions): {
        entities: Entity[];
        relationships: Relationship[];
        depths: Record<string, number>;
    };
    /**
     * Finds the shortest path between startNodeId and targetNodeId using BFS (unweighted hops).
     */
    findShortestPath(startNodeId: string, targetNodeId: string): PathResult | null;
    /**
     * Finds shortest path using Dijkstra's algorithm based on edge weights.
     */
    findDijkstraShortestPath(startNodeId: string, targetNodeId: string, weightFn?: (rel: Relationship) => number): PathResult | null;
    /**
     * Detects cycles in the directed graph using depth-first search.
     */
    detectCycles(): string[][];
    /**
     * Computes topological sorting for Directed Acyclic Graphs (DAG). Returns null if a cycle exists.
     */
    topologicalSort(): Entity[] | null;
    /**
     * Calculates downstream blast radius when an entity fails or mutates.
     */
    calculateBlastRadius(rootEntityId: string, options?: {
        maxDepth?: number;
        relationTypes?: string[];
        attenuationFactor?: number;
    }): BlastRadiusResult;
    /**
     * Filters entities matching predicate and property constraints.
     */
    findEntities(filter: {
        type?: string;
        tag?: string;
        properties?: Record<string, PropertyValue>;
        customPredicate?: (e: Entity) => boolean;
    }): Entity[];
}
//# sourceMappingURL=GraphQuery.d.ts.map