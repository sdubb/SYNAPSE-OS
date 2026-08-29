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

export class GraphQuery {
  private readonly _builder: GraphBuilder;

  constructor(builder: GraphBuilder) {
    this._builder = builder;
  }

  /**
   * Expands neighborhood around start node up to maxDepth hops.
   */
  public expandNeighborhood(startNodeId: string, options: NeighborhoodOptions = {}): {
    entities: Entity[];
    relationships: Relationship[];
    depths: Record<string, number>;
  } {
    const maxDepth = options.maxDepth ?? 1;
    const direction = options.direction ?? 'both';
    const visited = new Set<string>();
    const depthMap: Record<string, number> = {};
    const resultEntities: Entity[] = [];
    const resultRelationships: Relationship[] = [];
    const collectedRelIds = new Set<string>();

    const queue: Array<{ id: string; depth: number }> = [{ id: startNodeId, depth: 0 }];
    visited.add(startNodeId);
    depthMap[startNodeId] = 0;

    const startEntity = this._builder.getNode(startNodeId);
    if (startEntity) {
      resultEntities.push(startEntity);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      const nextDepth = current.depth + 1;
      const candidateRels: Relationship[] = [];

      if (direction === 'outbound' || direction === 'both') {
        candidateRels.push(...this._builder.getOutEdges(current.id));
      }
      if (direction === 'inbound' || direction === 'both') {
        candidateRels.push(...this._builder.getInEdges(current.id));
      }

      for (const rel of candidateRels) {
        if (options.relationTypes && options.relationTypes.length > 0 && !options.relationTypes.includes(rel.relationType)) {
          continue;
        }

        const neighborId = rel.sourceId === current.id ? rel.targetId : rel.sourceId;
        const neighborEntity = this._builder.getNode(neighborId);
        if (!neighborEntity) continue;

        if (options.entityTypes && options.entityTypes.length > 0 && !options.entityTypes.includes(neighborEntity.type)) {
          continue;
        }

        if (options.predicate && !options.predicate(neighborEntity, nextDepth)) {
          continue;
        }

        if (!collectedRelIds.has(rel.id)) {
          collectedRelIds.add(rel.id);
          resultRelationships.push(rel);
        }

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          depthMap[neighborId] = nextDepth;
          resultEntities.push(neighborEntity);
          queue.push({ id: neighborId, depth: nextDepth });
        }
      }
    }

    return {
      entities: resultEntities,
      relationships: resultRelationships,
      depths: depthMap,
    };
  }

  /**
   * Finds the shortest path between startNodeId and targetNodeId using BFS (unweighted hops).
   */
  public findShortestPath(startNodeId: string, targetNodeId: string): PathResult | null {
    if (startNodeId === targetNodeId) {
      const node = this._builder.getNode(startNodeId);
      return node
        ? { path: [startNodeId], entities: [node], relationships: [], totalWeight: 0 }
        : null;
    }

    const queue: string[] = [startNodeId];
    const visited = new Set<string>([startNodeId]);
    const parentMap = new Map<string, { prevNodeId: string; edge: Relationship }>();

    let found = false;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === targetNodeId) {
        found = true;
        break;
      }

      const outEdges = this._builder.getOutEdges(current);
      for (const edge of outEdges) {
        const nextNodeId = edge.targetId === current && edge.bidirectional ? edge.sourceId : edge.targetId;
        if (!visited.has(nextNodeId)) {
          visited.add(nextNodeId);
          parentMap.set(nextNodeId, { prevNodeId: current, edge });
          queue.push(nextNodeId);
        }
      }
    }

    if (!found) return null;

    const pathNodes: string[] = [targetNodeId];
    const pathEdges: Relationship[] = [];
    let curr = targetNodeId;
    let totalWeight = 0;

    while (curr !== startNodeId) {
      const step = parentMap.get(curr);
      if (!step) break;
      pathEdges.unshift(step.edge);
      totalWeight += step.edge.weight;
      curr = step.prevNodeId;
      pathNodes.unshift(curr);
    }

    const entities = pathNodes
      .map((id) => this._builder.getNode(id))
      .filter((e): e is Entity => e !== undefined);

    return {
      path: pathNodes,
      entities,
      relationships: pathEdges,
      totalWeight,
    };
  }

  /**
   * Finds shortest path using Dijkstra's algorithm based on edge weights.
   */
  public findDijkstraShortestPath(
    startNodeId: string,
    targetNodeId: string,
    weightFn?: (rel: Relationship) => number
  ): PathResult | null {
    const getWeight = weightFn ?? ((r: Relationship) => r.weight);
    const distances = new Map<string, number>();
    const previous = new Map<string, { prevNodeId: string; edge: Relationship }>();
    const unvisited = new Set<string>();

    for (const node of this._builder.getAllNodes()) {
      distances.set(node.id, Infinity);
      unvisited.add(node.id);
    }

    if (!distances.has(startNodeId) || !distances.has(targetNodeId)) {
      return null;
    }

    distances.set(startNodeId, 0);

    while (unvisited.size > 0) {
      let currentSmallest: string | null = null;
      let smallestDist = Infinity;

      for (const nodeId of unvisited) {
        const dist = distances.get(nodeId)!;
        if (dist < smallestDist) {
          smallestDist = dist;
          currentSmallest = nodeId;
        }
      }

      if (currentSmallest === null || smallestDist === Infinity) {
        break; // Remaining nodes unreachable
      }

      if (currentSmallest === targetNodeId) {
        break; // Target reached
      }

      unvisited.delete(currentSmallest);

      const outEdges = this._builder.getOutEdges(currentSmallest);
      for (const edge of outEdges) {
        const neighborId = edge.targetId === currentSmallest && edge.bidirectional ? edge.sourceId : edge.targetId;
        if (!unvisited.has(neighborId)) continue;

        const edgeCost = Math.max(0, getWeight(edge));
        const altDist = smallestDist + edgeCost;

        if (altDist < distances.get(neighborId)!) {
          distances.set(neighborId, altDist);
          previous.set(neighborId, { prevNodeId: currentSmallest, edge });
        }
      }
    }

    if (distances.get(targetNodeId) === Infinity) {
      return null;
    }

    const pathNodes: string[] = [targetNodeId];
    const pathEdges: Relationship[] = [];
    let curr = targetNodeId;
    let totalWeight = 0;

    while (curr !== startNodeId) {
      const step = previous.get(curr);
      if (!step) break;
      pathEdges.unshift(step.edge);
      totalWeight += getWeight(step.edge);
      curr = step.prevNodeId;
      pathNodes.unshift(curr);
    }

    const entities = pathNodes
      .map((id) => this._builder.getNode(id))
      .filter((e): e is Entity => e !== undefined);

    return {
      path: pathNodes,
      entities,
      relationships: pathEdges,
      totalWeight,
    };
  }

  /**
   * Detects cycles in the directed graph using depth-first search.
   */
  public detectCycles(): string[][] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const parentMap = new Map<string, string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const edges = this._builder.getOutEdges(nodeId);
      for (const edge of edges) {
        const targetId = edge.targetId;
        if (!visited.has(targetId)) {
          parentMap.set(targetId, nodeId);
          dfs(targetId);
        } else if (recStack.has(targetId)) {
          // Cycle found! Reconstruct cycle path
          const cycle: string[] = [targetId];
          let p = nodeId;
          while (p !== targetId && p !== undefined) {
            cycle.unshift(p);
            p = parentMap.get(p)!;
          }
          cycle.unshift(targetId);
          cycles.push(cycle);
        }
      }

      recStack.delete(nodeId);
    };

    for (const node of this._builder.getAllNodes()) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }

  /**
   * Computes topological sorting for Directed Acyclic Graphs (DAG). Returns null if a cycle exists.
   */
  public topologicalSort(): Entity[] | null {
    const inDegree = new Map<string, number>();
    const allNodes = this._builder.getAllNodes();

    for (const node of allNodes) {
      inDegree.set(node.id, 0);
    }

    for (const edge of this._builder.getAllEdges()) {
      inDegree.set(edge.targetId, (inDegree.get(edge.targetId) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, deg] of inDegree) {
      if (deg === 0) {
        queue.push(nodeId);
      }
    }

    const sortedIds: string[] = [];

    while (queue.length > 0) {
      const u = queue.shift()!;
      sortedIds.push(u);

      const outEdges = this._builder.getOutEdges(u);
      for (const edge of outEdges) {
        const v = edge.targetId;
        const currentDeg = inDegree.get(v)! - 1;
        inDegree.set(v, currentDeg);
        if (currentDeg === 0) {
          queue.push(v);
        }
      }
    }

    if (sortedIds.length !== allNodes.length) {
      return null; // Cycle detected
    }

    return sortedIds
      .map((id) => this._builder.getNode(id))
      .filter((e): e is Entity => e !== undefined);
  }

  /**
   * Calculates downstream blast radius when an entity fails or mutates.
   */
  public calculateBlastRadius(
    rootEntityId: string,
    options: {
      maxDepth?: number;
      relationTypes?: string[];
      attenuationFactor?: number;
    } = {}
  ): BlastRadiusResult {
    const maxDepth = options.maxDepth ?? 5;
    const attenuation = options.attenuationFactor ?? 0.8;
    const rootEntity = this._builder.getNode(rootEntityId);

    if (!rootEntity) {
      return {
        rootEntityId,
        directlyImpacted: [],
        transitivelyImpacted: [],
        impactedRelationships: [],
        impactDepthMap: {},
        totalImpactScore: 0,
      };
    }

    const expansion = this.expandNeighborhood(rootEntityId, {
      maxDepth,
      direction: 'outbound',
      relationTypes: options.relationTypes,
    });

    const directlyImpacted: Entity[] = [];
    const transitivelyImpacted: Entity[] = [];
    let totalImpactScore = 1.0;

    for (const entity of expansion.entities) {
      if (entity.id === rootEntityId) continue;
      const depth = expansion.depths[entity.id] ?? 1;
      const impactWeight = Math.pow(attenuation, depth - 1);
      totalImpactScore += impactWeight;

      if (depth === 1) {
        directlyImpacted.push(entity);
      } else {
        transitivelyImpacted.push(entity);
      }
    }

    return {
      rootEntityId,
      directlyImpacted,
      transitivelyImpacted,
      impactedRelationships: expansion.relationships,
      impactDepthMap: Object.freeze(expansion.depths),
      totalImpactScore: Number(totalImpactScore.toFixed(4)),
    };
  }

  /**
   * Filters entities matching predicate and property constraints.
   */
  public findEntities(filter: {
    type?: string;
    tag?: string;
    properties?: Record<string, PropertyValue>;
    customPredicate?: (e: Entity) => boolean;
  }): Entity[] {
    const results: Entity[] = [];

    for (const entity of this._builder.getAllNodes()) {
      if (filter.type && entity.type !== filter.type) continue;
      if (filter.tag && !entity.metadata.tags.includes(filter.tag)) continue;

      if (filter.properties) {
        let match = true;
        for (const [key, val] of Object.entries(filter.properties)) {
          if (entity.state.get(key) !== val) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }

      if (filter.customPredicate && !filter.customPredicate(entity)) {
        continue;
      }

      results.push(entity);
    }

    return results;
  }
}
