import crypto from "node:crypto";
import {
  ExecutionGraph,
  GraphNode,
  GraphEdge,
  GraphNodeState,
  EscalationRequest,
  EscalationLevel,
  PlanVersion,
} from "@synapse/contracts";

export interface GraphEngineOptions {
  tenantId: string;
  missionId: string;
  taskId?: string;
  initialGraph?: ExecutionGraph;
}

export class ExecutionGraphEngine {
  private graph: ExecutionGraph;
  private escalations = new Map<string, EscalationRequest>();
  private planVersions: PlanVersion[] = [];
  private eventEmitter: (event: any) => void = () => {};

  constructor(options: GraphEngineOptions) {
    if (options.initialGraph) {
      this.graph = options.initialGraph;
    } else {
      this.graph = {
        id: crypto.randomUUID(),
        tenantId: options.tenantId,
        missionId: options.missionId,
        taskId: options.taskId,
        version: 1,
        nodes: [],
        edges: [],
        objective: "",
        risk: {},
        approvalPoints: [],
        escalationPoints: [],
        verificationPlan: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    
    this.planVersions.push({
      version: this.graph.version,
      graphId: this.graph.id,
      createdAt: this.graph.createdAt,
      reason: "Initial plan",
    });
  }

  public setEventEmitter(emitter: (event: any) => void) {
    this.eventEmitter = emitter;
  }

  private emit(type: string, payload: any) {
    this.eventEmitter({
      type,
      tenantId: this.graph.tenantId,
      missionId: this.graph.missionId,
      taskId: this.graph.taskId,
      graphId: this.graph.id,
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  public getGraph(): ExecutionGraph {
    return this.graph;
  }

  public getNode(nodeId: string): GraphNode | undefined {
    return this.graph.nodes.find(n => n.id === nodeId);
  }

  public getVersions(): PlanVersion[] {
    return this.planVersions;
  }

  public replan(newNodes: GraphNode[], newEdges: GraphEdge[], reason: string): ExecutionGraph {
    this.emit("graph.replan.started", { reason });
    this.graph.version += 1;
    this.graph.updatedAt = new Date().toISOString();
    
    // We don't delete historical nodes, we just append or replace the active frontier.
    // In a real implementation, we'd mark old nodes as superseded or keep them for history.
    // For this engine, we append new nodes/edges.
    this.graph.nodes.push(...newNodes);
    this.graph.edges.push(...newEdges);

    this.planVersions.push({
      version: this.graph.version,
      graphId: this.graph.id,
      createdAt: new Date().toISOString(),
      reason,
    });

    this.emit("graph.replan.completed", { version: this.graph.version });
    this.emit("plan.versioned", { version: this.graph.version });
    return this.graph;
  }

  public updateNodeState(nodeId: string, state: GraphNodeState, output?: any, error?: string) {
    const node = this.getNode(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    node.state = state;
    if (state === "RUNNING") node.startedAt = new Date().toISOString();
    if (["COMPLETED", "FAILED", "TERMINATED"].includes(state)) {
      node.completedAt = new Date().toISOString();
    }
    if (output !== undefined) node.output = output;
    if (error !== undefined) node.error = error;

    this.graph.updatedAt = new Date().toISOString();

    const eventName = `graph.node.${state.toLowerCase()}`;
    this.emit(eventName, { nodeId, state, output, error });
  }

  public evaluateCondition(condition: string, context: Record<string, any>): boolean {
    // Very simple expression evaluator for tests
    // "api.status == 200"
    try {
      const keys = Object.keys(context);
      const values = Object.values(context);
      const func = new Function(...keys, `return ${condition};`);
      return func(...values);
    } catch (err) {
      console.warn(`Condition evaluation failed: ${condition}`, err);
      return false;
    }
  }

  public getNextNodes(nodeId: string, context: Record<string, any> = {}): GraphNode[] {
    const node = this.getNode(nodeId);
    if (!node) return [];

    const outgoingEdges = this.graph.edges.filter(e => e.from === nodeId);
    const nextNodes: GraphNode[] = [];

    for (const edge of outgoingEdges) {
      let conditionMet = true;
      if (edge.condition) {
        conditionMet = this.evaluateCondition(edge.condition, context);
      }
      
      if (conditionMet) {
        edge.traversalCount += 1;
        this.emit("graph.branch.selected", { edgeId: edge.id, to: edge.to });
        const target = this.getNode(edge.to);
        if (target) nextNodes.push(target);
      } else {
        this.emit("graph.branch.rejected", { edgeId: edge.id, to: edge.to });
      }
    }

    return nextNodes;
  }

  public escalate(nodeId: string, level: EscalationLevel, reason: string, context: Record<string, any> = {}): EscalationRequest {
    const req: EscalationRequest = {
      id: crypto.randomUUID(),
      graphId: this.graph.id,
      nodeId,
      level,
      reason,
      context,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    this.escalations.set(req.id, req);
    this.emit("graph.escalation.required", { escalation: req });
    return req;
  }

  public getEscalation(escalationId: string): EscalationRequest | undefined {
    return this.escalations.get(escalationId);
  }

  public resolveEscalation(escalationId: string, resolution: "RESOLVED" | "REJECTED", userId: string) {
    const req = this.escalations.get(escalationId);
    if (!req) throw new Error("Escalation not found");
    
    req.status = resolution;
    req.resolvedAt = new Date().toISOString();
    req.resolvedByUserId = userId;
    
    this.emit("graph.escalation.resolved", { escalation: req });
  }
}
