/**
 * @file GraphProjection.ts
 * @description Projects graph slices for UI visualization, simulation sub-graphs, dependency matrices, and graph formats.
 */
import { Entity } from '../model/Entity.js';
import { Relationship } from '../model/Relationship.js';
import { GraphBuilder } from './GraphBuilder.js';
export interface VisualNodeProjection {
    readonly id: string;
    readonly label: string;
    readonly type: string;
    readonly status: string;
    readonly group?: string;
    readonly data: Record<string, unknown>;
}
export interface VisualEdgeProjection {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly label: string;
    readonly type: string;
    readonly weight: number;
    readonly data: Record<string, unknown>;
}
export interface VisualGraphProjection {
    readonly nodes: VisualNodeProjection[];
    readonly edges: VisualEdgeProjection[];
    readonly metadata: {
        readonly projectedAt: number;
        readonly totalNodes: number;
        readonly totalEdges: number;
        readonly filterApplied?: string;
    };
}
export interface ProjectionFilterOptions {
    readonly entityTypes?: readonly string[];
    readonly relationTypes?: readonly string[];
    readonly tags?: readonly string[];
    readonly entityIds?: readonly string[];
    readonly includeIsolatedNodes?: boolean;
}
export declare class GraphProjection {
    private readonly _builder;
    constructor(builder: GraphBuilder);
    /**
     * Projects a subgraph based on inclusion filters.
     */
    projectSubgraph(options?: ProjectionFilterOptions): {
        nodes: Entity[];
        edges: Relationship[];
    };
    /**
     * Projects the graph slice into standard JSON visual format (Cytoscape/D3 compatible).
     */
    toVisualProjection(options?: ProjectionFilterOptions): VisualGraphProjection;
    /**
     * Generates a Mermaid diagram definition string representing the graph projection.
     */
    toMermaidDiagram(options?: ProjectionFilterOptions): string;
    /**
     * Projects an Adjacency Matrix representation.
     */
    toAdjacencyMatrix(options?: ProjectionFilterOptions): {
        nodeIds: string[];
        matrix: number[][];
    };
}
//# sourceMappingURL=GraphProjection.d.ts.map