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
import { ConditionEvaluator } from "./ConditionEvaluator.js";
import { IGraphStore, FileGraphStore } from "./GraphStore.js";

export interface GraphEngineOptions {
  tenantId: string;
  missionId: string;
  taskId?: string;
  initialGraph?: ExecutionGraph;
  store?: IGraphStore;
}

export class ExecutionGraphEngine {
  private graphs = new Map<number, ExecutionGraph>();
  private activeVersion = 1;
  private escalations = new Map<string, EscalationRequest>();
  private planVersions: PlanVersion[] = [];
  private eventEmitter: (event: any) => void = () => {};
  private store: IGraphStore;
  private graphContext: Record<string, any> = {};

  constructor(options: GraphEngineOptions) {
    this.store = options.store || new FileGraphStore();
    
    let initial: ExecutionGraph;
    if (options.initialGraph) {
      initial = JSON.parse(JSON.stringify(options.initialGraph)); // deep clone
      this.activeVersion = initial.version;
    } else {
      initial = {
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
    
    this.graphs.set(this.activeVersion, initial);
    
    const initialVersion = {
      version: initial.version,
      graphId: initial.id,
      createdAt: initial.createdAt,
      reason: "Initial plan",
    };
    
    this.planVersions.push(initialVersion);
    
    this.store.saveGraph(initial);
    this.store.saveVersion(initialVersion);
  }

  public setEventEmitter(emitter: (event: any) => void) {
    this.eventEmitter = emitter;
  }

  private emit(type: string, payload: any) {
    const current = this.getGraph();
    this.eventEmitter({
      type,
      tenantId: current.tenantId,
      missionId: current.missionId,
      taskId: current.taskId,
      graphId: current.id,
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  public getGraph(version?: number): ExecutionGraph {
    const v = version ?? this.activeVersion;
    const graph = this.graphs.get(v);
    if (!graph) throw new Error(`Graph version ${v} not found`);
    return graph;
  }

  public getNode(nodeId: string, version?: number): GraphNode | undefined {
    return this.getGraph(version).nodes.find(n => n.id === nodeId);
  }

  public getVersions(): PlanVersion[] {
    return this.planVersions;
  }
  
  public validateGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
    const nodeIds = new Set(nodes.map(n => n.id));
    if (nodeIds.size !== nodes.length) throw new Error("Duplicate node IDs found");
    
    for (const edge of edges) {
      if (!nodeIds.has(edge.from)) throw new Error(`Edge from unknown node: ${edge.from}`);
      if (!nodeIds.has(edge.to)) throw new Error(`Edge to unknown node: ${edge.to}`);
      if (edge.condition && typeof edge.condition !== 'string') {
          throw new Error(`Invalid edge condition type`);
      }
    }
  }

  public replan(newNodes: GraphNode[], newEdges: GraphEdge[], reason: string): ExecutionGraph {
    this.emit("graph.replan.started", { reason });
    
    const currentGraph = this.getGraph();
    
    // 1. Create an immutable snapshot of the new graph
    const nextVersion = this.activeVersion + 1;
    const nextGraph: ExecutionGraph = JSON.parse(JSON.stringify(currentGraph));
    nextGraph.version = nextVersion;
    nextGraph.updatedAt = new Date().toISOString();
    
    // 2. Validate structure
    this.validateGraph([...nextGraph.nodes, ...newNodes], [...nextGraph.edges, ...newEdges]);
    
    // 3. Mark old replaced nodes as TERMINATED (if they are redefined)
    const newNodeIds = new Set(newNodes.map(n => n.id));
    for (const node of nextGraph.nodes) {
      if (newNodeIds.has(node.id) && !["COMPLETED", "FAILED"].includes(node.state || "")) {
        node.state = "TERMINATED";
      }
    }

    // Append new nodes and edges, filtering out superseded ones from being duplicated
    nextGraph.nodes = nextGraph.nodes.filter(n => n.state !== "TERMINATED").concat(newNodes);
    nextGraph.edges.push(...newEdges);
    
    // 4. Save new immutable version
    this.graphs.set(nextVersion, nextGraph);
    this.activeVersion = nextVersion;

    const newVersion = {
      version: nextVersion,
      graphId: nextGraph.id,
      createdAt: new Date().toISOString(),
      reason,
    };
    
    this.planVersions.push(newVersion);
    
    this.store.saveGraph(nextGraph);
    this.store.saveVersion(newVersion);

    this.emit("graph.replan.completed", { version: nextVersion });
    this.emit("plan.versioned", { version: nextVersion });
    
    return nextGraph;
  }

  public updateNodeState(nodeId: string, state: GraphNodeState, output?: any, error?: string) {
    const graph = this.getGraph();
    const node = this.getNode(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    if (state === "RUNNING") {
      const activeFrontier = this.getFrontier();
      const isActive = activeFrontier.some(n => n.id === nodeId);
      if (!isActive && node.state !== "QUEUED" && node.state !== "CREATED" && node.state !== "PAUSED") {
        throw new Error(`Node ${nodeId} cannot be executed. It is not in the active frontier (current state: ${node.state})`);
      }
    }

    node.state = state;
    if (state === "RUNNING") node.startedAt = new Date().toISOString();
    if (["COMPLETED", "FAILED", "TERMINATED"].includes(state)) {
      node.completedAt = new Date().toISOString();
    }
    if (output !== undefined) node.output = output;
    if (error !== undefined) node.error = error;

    graph.updatedAt = new Date().toISOString();
    this.store.saveGraph(graph);

    const eventName = `graph.node.${state.toLowerCase()}`;
    this.emit(eventName, { nodeId, state, output, error, version: graph.version });
  }

  public evaluateCondition(condition: string, context: Record<string, any>): boolean {
    return ConditionEvaluator.evaluate(condition, context);
  }

  public updateGraphContext(key: string, value: any, provenance: string) {
    this.graphContext[key] = value;
    this.emit("graph.context.updated", { key, value, provenance });
  }

  public getGraphContext(): Record<string, any> {
    return { ...this.graphContext };
  }

  public getNextNodes(nodeId: string, contextOverrides: Record<string, any> = {}): GraphNode[] {
    const graph = this.getGraph();
    const node = this.getNode(nodeId);
    if (!node) return [];

    const outgoingEdges = graph.edges.filter(e => e.from === nodeId);
    const nextNodes: GraphNode[] = [];

    const context = { ...this.graphContext, ...contextOverrides };

    for (const edge of outgoingEdges) {
      let conditionMet = true;
      let conditionResult = true;
      if (edge.condition) {
        conditionMet = this.evaluateCondition(edge.condition, context);
        conditionResult = conditionMet;
      }
      
      if (conditionMet) {
        edge.traversalCount = (edge.traversalCount || 0) + 1;
        this.store.saveGraph(graph);
        this.emit("graph.branch.selected", { 
          graphId: graph.id,
          version: graph.version,
          nodeId: nodeId,
          edgeId: edge.id, 
          to: edge.to, 
          condition: edge.condition,
          result: conditionResult,
          contextSnapshot: { ...context }
        });
        const target = this.getNode(edge.to);
        if (target) nextNodes.push(target);
      } else {
        this.emit("graph.branch.skipped", { 
          graphId: graph.id,
          version: graph.version,
          nodeId: nodeId,
          edgeId: edge.id, 
          condition: edge.condition,
          result: conditionResult,
          contextSnapshot: { ...context }
        });
      }
    }

    return nextNodes;
  }

  public getFrontier(): GraphNode[] {
    const graph = this.getGraph();
    // Frontier logic:
    // 1. Any node that is RUNNING, WAITING, QUEUED or PAUSED
    // 2. If no nodes are in those states, find entry nodes (in-degree 0) that are CREATED
    let activeNodes = graph.nodes.filter(n => 
      n.state === "RUNNING" || n.state === "WAITING" || n.state === "QUEUED" || n.state === "PAUSED"
    );

    if (activeNodes.length === 0) {
      const targets = new Set(graph.edges.map(e => e.to));
      activeNodes = graph.nodes.filter(n => !targets.has(n.id) && n.state === "CREATED");
    }
    
    return activeNodes;
  }

  public escalate(nodeId: string, level: EscalationLevel, reason: string, context: Record<string, any> = {}): EscalationRequest {
    const graph = this.getGraph();
    const req: EscalationRequest = {
      id: crypto.randomUUID(),
      graphId: graph.id,
      nodeId,
      level,
      reason,
      context,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    this.escalations.set(req.id, req);
    this.store.saveEscalation(req);

    if (level === "LEVEL_3" || level === "LEVEL_4") {
      this.updateNodeState(nodeId, "BLOCKED", undefined, `Escalated: ${reason}`);
    }

    this.emit("graph.escalation.required", { escalation: req, version: graph.version });
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
    
    this.store.saveEscalation(req);

    if (resolution === "RESOLVED") {
      try {
        this.updateNodeState(req.nodeId, "QUEUED");
      } catch (e) {
        // Ignore if node is already completed or terminated
      }
    }

    this.emit("graph.escalation.resolved", { escalation: req });
  }
}
