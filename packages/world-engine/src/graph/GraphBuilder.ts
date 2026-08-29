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

export class GraphBuilder {
  private readonly _nodes: Map<string, Entity> = new Map();
  private readonly _edges: Map<string, Relationship> = new Map();
  
  // Adjacency index: sourceId -> Map<relationshipId, targetId>
  private readonly _outEdges: Map<string, Map<string, string>> = new Map();
  // Reverse adjacency index: targetId -> Map<relationshipId, sourceId>
  private readonly _inEdges: Map<string, Map<string, string>> = new Map();
  
  // Type indexes
  private readonly _nodesByType: Map<string, Set<string>> = new Map();
  private readonly _edgesByType: Map<string, Set<string>> = new Map();

  constructor(initialModel?: WorldModel) {
    if (initialModel) {
      this.loadFromWorldModel(initialModel);
    }
  }

  public addNode(entity: Entity): this {
    this._nodes.set(entity.id, entity);

    if (!this._outEdges.has(entity.id)) {
      this._outEdges.set(entity.id, new Map());
    }
    if (!this._inEdges.has(entity.id)) {
      this._inEdges.set(entity.id, new Map());
    }

    let typeSet = this._nodesByType.get(entity.type);
    if (!typeSet) {
      typeSet = new Set();
      this._nodesByType.set(entity.type, typeSet);
    }
    typeSet.add(entity.id);

    return this;
  }

  public addNodes(entities: Iterable<Entity>): this {
    for (const entity of entities) {
      this.addNode(entity);
    }
    return this;
  }

  public addEdge(relationship: Relationship): this {
    this._edges.set(relationship.id, relationship);

    // Ensure source and target index buckets exist
    if (!this._outEdges.has(relationship.sourceId)) {
      this._outEdges.set(relationship.sourceId, new Map());
    }
    if (!this._inEdges.has(relationship.targetId)) {
      this._inEdges.set(relationship.targetId, new Map());
    }

    this._outEdges.get(relationship.sourceId)!.set(relationship.id, relationship.targetId);
    this._inEdges.get(relationship.targetId)!.set(relationship.id, relationship.sourceId);

    // Handle bidirectional edge indexing
    if (relationship.bidirectional) {
      if (!this._outEdges.has(relationship.targetId)) {
        this._outEdges.set(relationship.targetId, new Map());
      }
      if (!this._inEdges.has(relationship.sourceId)) {
        this._inEdges.set(relationship.sourceId, new Map());
      }
      this._outEdges.get(relationship.targetId)!.set(relationship.id, relationship.sourceId);
      this._inEdges.get(relationship.sourceId)!.set(relationship.id, relationship.targetId);
    }

    let typeSet = this._edgesByType.get(relationship.relationType);
    if (!typeSet) {
      typeSet = new Set();
      this._edgesByType.set(relationship.relationType, typeSet);
    }
    typeSet.add(relationship.id);

    return this;
  }

  public addEdges(relationships: Iterable<Relationship>): this {
    for (const rel of relationships) {
      this.addEdge(rel);
    }
    return this;
  }

  public removeNode(nodeId: string): this {
    const node = this._nodes.get(nodeId);
    if (!node) return this;

    // Remove from type index
    this._nodesByType.get(node.type)?.delete(nodeId);

    // Remove associated out-edges
    const outMap = this._outEdges.get(nodeId);
    if (outMap) {
      for (const [edgeId, targetId] of outMap) {
        this._edges.delete(edgeId);
        this._inEdges.get(targetId)?.delete(edgeId);
      }
      this._outEdges.delete(nodeId);
    }

    // Remove associated in-edges
    const inMap = this._inEdges.get(nodeId);
    if (inMap) {
      for (const [edgeId, sourceId] of inMap) {
        this._edges.delete(edgeId);
        this._outEdges.get(sourceId)?.delete(edgeId);
      }
      this._inEdges.delete(nodeId);
    }

    this._nodes.delete(nodeId);
    return this;
  }

  public removeEdge(edgeId: string): this {
    const rel = this._edges.get(edgeId);
    if (!rel) return this;

    this._outEdges.get(rel.sourceId)?.delete(edgeId);
    this._inEdges.get(rel.targetId)?.delete(edgeId);

    if (rel.bidirectional) {
      this._outEdges.get(rel.targetId)?.delete(edgeId);
      this._inEdges.get(rel.sourceId)?.delete(edgeId);
    }

    this._edgesByType.get(rel.relationType)?.delete(edgeId);
    this._edges.delete(edgeId);
    return this;
  }

  public getNode(nodeId: string): Entity | undefined {
    return this._nodes.get(nodeId);
  }

  public getEdge(edgeId: string): Relationship | undefined {
    return this._edges.get(edgeId);
  }

  public getAllNodes(): Entity[] {
    return Array.from(this._nodes.values());
  }

  public getAllEdges(): Relationship[] {
    return Array.from(this._edges.values());
  }

  public getOutEdges(nodeId: string): Relationship[] {
    const edgeMap = this._outEdges.get(nodeId);
    if (!edgeMap) return [];
    const results: Relationship[] = [];
    for (const edgeId of edgeMap.keys()) {
      const rel = this._edges.get(edgeId);
      if (rel) results.push(rel);
    }
    return results;
  }

  public getInEdges(nodeId: string): Relationship[] {
    const edgeMap = this._inEdges.get(nodeId);
    if (!edgeMap) return [];
    const results: Relationship[] = [];
    for (const edgeId of edgeMap.keys()) {
      const rel = this._edges.get(edgeId);
      if (rel) results.push(rel);
    }
    return results;
  }

  public getAdjacentNodeIds(nodeId: string, direction: 'out' | 'in' | 'both' = 'out'): string[] {
    const neighbors = new Set<string>();

    if (direction === 'out' || direction === 'both') {
      const outMap = this._outEdges.get(nodeId);
      if (outMap) {
        for (const targetId of outMap.values()) {
          neighbors.add(targetId);
        }
      }
    }

    if (direction === 'in' || direction === 'both') {
      const inMap = this._inEdges.get(nodeId);
      if (inMap) {
        for (const sourceId of inMap.values()) {
          neighbors.add(sourceId);
        }
      }
    }

    return Array.from(neighbors);
  }

  public getNodesByType(type: string): Entity[] {
    const ids = this._nodesByType.get(type);
    if (!ids) return [];
    const results: Entity[] = [];
    for (const id of ids) {
      const node = this._nodes.get(id);
      if (node) results.push(node);
    }
    return results;
  }

  public getStats(): GraphIndexStats {
    const nodeCount = this._nodes.size;
    const edgeCount = this._edges.size;
    
    const nodeTypes: Record<string, number> = {};
    for (const [type, set] of this._nodesByType) {
      nodeTypes[type] = set.size;
    }

    const edgeTypes: Record<string, number> = {};
    for (const [type, set] of this._edgesByType) {
      edgeTypes[type] = set.size;
    }

    const avgDegree = nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0;
    const maxPossibleEdges = nodeCount > 1 ? nodeCount * (nodeCount - 1) : 0;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    return {
      nodeCount,
      edgeCount,
      nodeTypes,
      edgeTypes,
      avgDegree,
      density,
    };
  }

  public loadFromWorldModel(worldModel: WorldModel): this {
    this.clear();
    for (const entity of worldModel.getAllEntities()) {
      this.addNode(entity);
    }
    for (const rel of worldModel.getAllRelationships()) {
      this.addEdge(rel);
    }
    return this;
  }

  public toWorldModel(config: { id: string; name: string; tenantId: string }): WorldModel {
    return new WorldModel(config, {
      entities: this._nodes.values(),
      relationships: this._edges.values(),
    });
  }

  public clear(): void {
    this._nodes.clear();
    this._edges.clear();
    this._outEdges.clear();
    this._inEdges.clear();
    this._nodesByType.clear();
    this._edgesByType.clear();
  }
}
