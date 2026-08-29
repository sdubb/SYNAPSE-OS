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

export class GraphProjection {
  private readonly _builder: GraphBuilder;

  constructor(builder: GraphBuilder) {
    this._builder = builder;
  }

  /**
   * Projects a subgraph based on inclusion filters.
   */
  public projectSubgraph(options: ProjectionFilterOptions = {}): {
    nodes: Entity[];
    edges: Relationship[];
  } {
    const candidateNodes = new Set<string>();

    for (const node of this._builder.getAllNodes()) {
      if (options.entityIds && options.entityIds.length > 0 && !options.entityIds.includes(node.id)) {
        continue;
      }
      if (options.entityTypes && options.entityTypes.length > 0 && !options.entityTypes.includes(node.type)) {
        continue;
      }
      if (options.tags && options.tags.length > 0 && !options.tags.some((t) => node.metadata.tags.includes(t))) {
        continue;
      }
      candidateNodes.add(node.id);
    }

    const filteredEdges: Relationship[] = [];
    const connectedNodes = new Set<string>();

    for (const edge of this._builder.getAllEdges()) {
      if (options.relationTypes && options.relationTypes.length > 0 && !options.relationTypes.includes(edge.relationType)) {
        continue;
      }

      if (candidateNodes.has(edge.sourceId) && candidateNodes.has(edge.targetId)) {
        filteredEdges.push(edge);
        connectedNodes.add(edge.sourceId);
        connectedNodes.add(edge.targetId);
      }
    }

    const finalNodeIds = options.includeIsolatedNodes ?? true
      ? candidateNodes
      : connectedNodes;

    const finalNodes = Array.from(finalNodeIds)
      .map((id) => this._builder.getNode(id))
      .filter((n): n is Entity => n !== undefined);

    return {
      nodes: finalNodes,
      edges: filteredEdges,
    };
  }

  /**
   * Projects the graph slice into standard JSON visual format (Cytoscape/D3 compatible).
   */
  public toVisualProjection(options: ProjectionFilterOptions = {}): VisualGraphProjection {
    const subgraph = this.projectSubgraph(options);

    const nodes: VisualNodeProjection[] = subgraph.nodes.map((n) => ({
      id: n.id,
      label: n.name,
      type: n.type,
      status: n.status,
      group: n.metadata.namespace,
      data: {
        ...n.properties,
        tags: n.metadata.tags,
        confidenceScore: n.metadata.confidenceScore,
      },
    }));

    const edges: VisualEdgeProjection[] = subgraph.edges.map((e) => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      label: e.relationType,
      type: e.relationType,
      weight: e.weight,
      data: { ...e.attributes },
    }));

    return {
      nodes,
      edges,
      metadata: {
        projectedAt: Date.now(),
        totalNodes: nodes.length,
        totalEdges: edges.length,
      },
    };
  }

  /**
   * Generates a Mermaid diagram definition string representing the graph projection.
   */
  public toMermaidDiagram(options: ProjectionFilterOptions = {}): string {
    const subgraph = this.projectSubgraph(options);
    const lines: string[] = ['graph TD'];

    for (const node of subgraph.nodes) {
      const sanitizedId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const sanitizedLabel = node.name.replace(/["\n\r]/g, '');
      lines.push(`  ${sanitizedId}["${sanitizedLabel} (${node.type})"]`);
    }

    for (const edge of subgraph.edges) {
      const src = edge.sourceId.replace(/[^a-zA-Z0-9_]/g, '_');
      const tgt = edge.targetId.replace(/[^a-zA-Z0-9_]/g, '_');
      const label = edge.relationType.replace(/["\n\r]/g, '');
      lines.push(`  ${src} -->|"${label}"| ${tgt}`);
    }

    return lines.join('\n');
  }

  /**
   * Projects an Adjacency Matrix representation.
   */
  public toAdjacencyMatrix(options: ProjectionFilterOptions = {}): {
    nodeIds: string[];
    matrix: number[][];
  } {
    const subgraph = this.projectSubgraph(options);
    const nodeIds = subgraph.nodes.map((n) => n.id);
    const indexMap = new Map<string, number>();
    nodeIds.forEach((id, idx) => indexMap.set(id, idx));

    const n = nodeIds.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (const edge of subgraph.edges) {
      const u = indexMap.get(edge.sourceId);
      const v = indexMap.get(edge.targetId);
      if (u !== undefined && v !== undefined) {
        matrix[u]![v] = edge.weight;
        if (edge.bidirectional) {
          matrix[v]![u] = edge.weight;
        }
      }
    }

    return {
      nodeIds,
      matrix,
    };
  }
}
