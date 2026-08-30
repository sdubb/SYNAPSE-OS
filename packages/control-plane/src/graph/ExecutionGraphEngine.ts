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
  skipPersistence?: boolean;
}

export interface ObservationProvenance {
  source: "TOOL_EXECUTION" | "VERIFICATION" | "SYSTEM_MONITOR";
  toolName?: string;
  callId?: string;
  runId?: string;
  attemptId?: string;
  evidenceId?: string;
  auditEventId?: string;
  timestamp: string;
}

export interface GraphFact {
  key: string;
  value: any;
  kind: "OBSERVED_FACT" | "AGENT_CLAIM";
  provenance?: ObservationProvenance;
  recordedAt: string;
}

export interface GraphObservationRecord {
  id: string;
  provenance: ObservationProvenance;
  data: Record<string, any>;
  recordedAt: string;
}

export class ExecutionGraphEngine {
  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    "CREATED": ["QUEUED", "RUNNING", "BLOCKED", "COMPLETED", "FAILED", "TERMINATED"],
    "QUEUED": ["RUNNING", "BLOCKED", "COMPLETED", "FAILED", "TERMINATED"],
    "RUNNING": ["COMPLETED", "FAILED", "PAUSED", "BLOCKED", "TERMINATED"],
    "PAUSED": ["RUNNING", "QUEUED", "FAILED", "TERMINATED"],
    "BLOCKED": ["QUEUED", "FAILED", "TERMINATED", "RUNNING"],
    "FAILED": ["QUEUED", "RUNNING", "TERMINATED"],
    "COMPLETED": ["FAILED", "QUEUED", "TERMINATED"],
    "TERMINATED": []
  };

  private graphs = new Map<number, ExecutionGraph>();
  private activeVersion = 1;
  private escalations = new Map<string, EscalationRequest>();
  private planVersions: PlanVersion[] = [];
  private eventEmitter: (event: any) => void = () => {};
  private store: IGraphStore;
  private facts = new Map<string, GraphFact>();
  private agentClaims = new Map<string, GraphFact>();
  private observations: GraphObservationRecord[] = [];
  public readonly tenantId: string;
  public readonly missionId: string;
  public readonly taskId?: string;

  constructor(options: GraphEngineOptions) {
    this.tenantId = options.tenantId;
    this.missionId = options.missionId;
    this.taskId = options.taskId;
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
    
    const initialVersion: PlanVersion = {
      version: initial.version,
      graphId: initial.id,
      createdAt: initial.createdAt,
      reason: "Initial plan",
    };
    
    this.planVersions.push(initialVersion);
    
    if (!options.skipPersistence) {
      this.store.saveGraph(initial);
      this.store.saveVersion(initialVersion);
    }
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
    return [...this.planVersions];
  }
  
  public validateGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
    const nodeIds = new Set(nodes.map(n => n.id));
    if (nodeIds.size !== nodes.length) throw new Error("Duplicate node IDs found in execution graph");
    
    for (const edge of edges) {
      if (!nodeIds.has(edge.from)) throw new Error(`Edge references unknown origin node: ${edge.from}`);
      if (!nodeIds.has(edge.to)) throw new Error(`Edge references unknown target node: ${edge.to}`);
      if (edge.condition && typeof edge.condition !== 'string') {
        throw new Error(`Invalid edge condition type`);
      }
    }
  }

  public replan(newNodes: GraphNode[], newEdges: GraphEdge[], reason: string, baseVersion?: number): ExecutionGraph {
    this.emit("graph.replan.started", { reason });
    
    if (baseVersion !== undefined && baseVersion !== this.activeVersion) {
      throw new Error(`Concurrency Conflict: Attempted to replan based on version ${baseVersion}, but active version is ${this.activeVersion}`);
    }

    const currentGraph = this.getGraph();
    
    // 1. Create an immutable snapshot of the new graph
    const nextVersion = this.activeVersion + 1;
    const nextGraph: ExecutionGraph = JSON.parse(JSON.stringify(currentGraph));
    nextGraph.version = nextVersion;
    nextGraph.updatedAt = new Date().toISOString();
    
    // 2. Validate structure
    const preparedNewNodes: GraphNode[] = newNodes.map(n => ({
      ...n,
      state: n.state || "CREATED",
      attempts: n.attempts || 0,
    }));
    this.validateGraph([...nextGraph.nodes, ...preparedNewNodes], [...nextGraph.edges, ...newEdges]);
    
    // 3. Mark old replaced nodes as TERMINATED (if they are redefined)
    const newNodeIds = new Set(preparedNewNodes.map(n => n.id));
    for (const node of nextGraph.nodes) {
      if (newNodeIds.has(node.id) && !["COMPLETED", "FAILED"].includes(node.state || "")) {
        node.state = "TERMINATED";
      }
    }

    // Append new nodes and edges, filtering out superseded ones from being duplicated
    nextGraph.nodes = nextGraph.nodes.filter(n => n.state !== "TERMINATED").concat(preparedNewNodes);
    nextGraph.edges.push(...newEdges);
    
    // 4. Save new immutable version
    this.graphs.set(nextVersion, nextGraph);
    this.activeVersion = nextVersion;

    const newVersion: PlanVersion = {
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

  public updateNodeState(nodeId: string, state: GraphNodeState, output?: any, error?: string, skipValidation: boolean = false) {
    const graph = this.getGraph();
    const node = this.getNode(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    if (!skipValidation) {
      const currentState = node.state || "CREATED";
      const validNext = ExecutionGraphEngine.VALID_TRANSITIONS[currentState] || [];
      if (!validNext.includes(state)) {
        throw new Error(`Invalid state transition from ${currentState} to ${state}`);
      }
    }

    if (state === "RUNNING") {
      if (node.state === "RUNNING") {
        throw new Error(`Concurrency Conflict: Node ${nodeId} is already RUNNING`);
      }
      const activeFrontier = this.getFrontier();
      const isActive = activeFrontier.some(n => n.id === nodeId);
      if (!isActive && node.state !== "QUEUED" && node.state !== "PAUSED") {
        throw new Error(`Node ${nodeId} cannot be executed. It is not in the active frontier (current state: ${node.state})`);
      }

      if (node.state === "CREATED" || node.state === undefined) {
        const incomingEdges = graph.edges.filter(e => e.to === nodeId);
        const allPredecessorsResolved = incomingEdges.every(e => {
          const pred = this.getNode(e.from);
          return pred && (pred.state === "COMPLETED" || pred.state === "FAILED" || pred.state === "TERMINATED");
        });
        if (!allPredecessorsResolved) {
          throw new Error(`Node ${nodeId} cannot transition to RUNNING because not all predecessors are resolved (COMPLETED, FAILED, or TERMINATED)`);
        }
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

  /**
   * Authoritative recording of verified observations from tool executions, verification, or system monitors.
   * Observations create trusted OBSERVED_FACT entries that cannot be spoofed by AI claims.
   */
  public recordObservation(provenance: ObservationProvenance, data: Record<string, any>): void {
    const obsRecord: GraphObservationRecord = {
      id: crypto.randomUUID(),
      provenance,
      data,
      recordedAt: new Date().toISOString(),
    };
    this.observations.push(obsRecord);

    // Recursively flatten observation data into authoritative facts
    const flattenAndStore = (prefix: string, obj: any) => {
      if (obj === null || obj === undefined) return;
      if (typeof obj === "object" && !Array.isArray(obj)) {
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k;
          this.facts.set(path, {
            key: path,
            value: v,
            kind: "OBSERVED_FACT",
            provenance,
            recordedAt: new Date().toISOString(),
          });
          flattenAndStore(path, v);
        }
      } else {
        this.facts.set(prefix, {
          key: prefix,
          value: obj,
          kind: "OBSERVED_FACT",
          provenance,
          recordedAt: new Date().toISOString(),
        });
      }
    };

    flattenAndStore("", data);

    const graph = this.getGraph();
    this.store.saveObservation(graph.id, obsRecord);
    this.emit("graph.observation.recorded", { observation: obsRecord });
  }

  public restoreObservation(obsRecord: GraphObservationRecord): void {
    this.observations.push(obsRecord);

    const flattenAndStore = (prefix: string, obj: any) => {
      if (obj === null || obj === undefined) return;
      if (typeof obj === "object" && !Array.isArray(obj)) {
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k;
          this.facts.set(path, {
            key: path,
            value: v,
            kind: "OBSERVED_FACT",
            provenance: obsRecord.provenance,
            recordedAt: obsRecord.recordedAt,
          });
          flattenAndStore(path, v);
        }
      } else {
        this.facts.set(prefix, {
          key: prefix,
          value: obj,
          kind: "OBSERVED_FACT",
          provenance: obsRecord.provenance,
          recordedAt: obsRecord.recordedAt,
        });
      }
    };

    flattenAndStore("", obsRecord.data);
  }

  /**
   * Agent context updates or claims. If not from a verified system source,
   * these are treated as AGENT_CLAIM rather than OBSERVED_FACT.
   */
  public updateGraphContext(key: string, value: any, provenance?: string) {
    const kind = provenance?.startsWith("TOOL_") ? "OBSERVED_FACT" : "AGENT_CLAIM";
    const fact: GraphFact = {
      key,
      value,
      kind,
      provenance: provenance ? { source: "SYSTEM_MONITOR", timestamp: new Date().toISOString() } : undefined,
      recordedAt: new Date().toISOString(),
    };

    if (kind === "AGENT_CLAIM") {
      this.agentClaims.set(key, fact);
    } else {
      this.facts.set(key, fact);
    }
    this.emit("graph.context.updated", { key, value, provenance });
  }

  public getGraphContext(): Record<string, any> {
    const context: Record<string, any> = {};
    for (const [k, fact] of this.agentClaims.entries()) {
      context[k] = fact.value;
    }
    for (const [k, fact] of this.facts.entries()) {
      context[k] = fact.value;
    }
    return context;
  }

  public getFacts(): GraphFact[] {
    return [...Array.from(this.facts.values()), ...Array.from(this.agentClaims.values())];
  }

  public getObservations(): GraphObservationRecord[] {
    return [...this.observations];
  }

  public evaluateCondition(condition: string, contextOverrides: Record<string, any> = {}): boolean {
    const context = { ...this.getGraphContext(), ...contextOverrides };
    return ConditionEvaluator.evaluate(condition, context);
  }

  public getNextNodes(nodeId: string, contextOverrides: Record<string, any> = {}): GraphNode[] {
    const graph = this.getGraph();
    const node = this.getNode(nodeId);
    if (!node) return [];

    const outgoingEdges = graph.edges.filter(e => e.from === nodeId);
    const nextNodes: GraphNode[] = [];

    const context = { ...this.getGraphContext(), ...contextOverrides };

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
    // 1. Any node that is actively in progress or queued
    const activeNodes = graph.nodes.filter(n => 
      n.state === "RUNNING" || n.state === "WAITING" || n.state === "QUEUED" || n.state === "PAUSED"
    );
    if (activeNodes.length > 0) {
      return activeNodes;
    }

    // 2. Any ready node (state CREATED or undefined whose incoming predecessors are all resolved)
    return graph.nodes.filter(n => {
      if (n.state !== "CREATED" && n.state !== undefined) return false;
      const incomingEdges = graph.edges.filter(e => e.to === n.id);
      return incomingEdges.every(e => {
        const pred = graph.nodes.find(pn => pn.id === e.from);
        return pred && (pred.state === "COMPLETED" || pred.state === "FAILED" || pred.state === "TERMINATED");
      });
    });
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
      this.updateNodeState(nodeId, "BLOCKED", undefined, `Escalated: ${reason}`, true);
    }

    this.emit("graph.escalation.required", { escalation: req, version: graph.version });
    return req;
  }

  public getEscalation(escalationId: string): EscalationRequest | undefined {
    return this.escalations.get(escalationId) || (this.store.getEscalation(escalationId) ?? undefined);
  }

  public resolveEscalation(escalationId: string, resolution: "RESOLVED" | "REJECTED", userId: string) {
    const req = this.getEscalation(escalationId);
    if (!req) throw new Error("Escalation not found");
    
    req.status = resolution;
    req.resolvedAt = new Date().toISOString();
    req.resolvedByUserId = userId;
    
    this.escalations.set(req.id, req);
    this.store.saveEscalation(req);

    if (resolution === "RESOLVED") {
      try {
        this.updateNodeState(req.nodeId, "QUEUED", undefined, undefined, true);
      } catch (e) {
        // Ignore if node is already completed or terminated
      }
    }

    this.emit("graph.escalation.resolved", { escalation: req });
  }

  /**
   * Crash recovery: restores an execution graph engine from durable store.
   */
  public static loadFromStore(store: IGraphStore, graphId: string): ExecutionGraphEngine {
    const latest = store.getLatestGraph(graphId);
    if (!latest) throw new Error(`No execution graph found in store for ID: ${graphId}`);

    const engine = new ExecutionGraphEngine({
      tenantId: latest.tenantId,
      missionId: latest.missionId,
      taskId: latest.taskId,
      initialGraph: latest,
      store,
      skipPersistence: true,
    });

    // Replay versions
    const versions = store.getVersions(graphId);
    if (versions.length > 0) {
      engine.planVersions = [...versions];
      for (const v of versions) {
        const g = store.getGraph(graphId, v.version);
        if (g) engine.graphs.set(v.version, g);
      }
      engine.activeVersion = latest.version;
    }

    // Replay observations
    const observations = store.getObservations(graphId);
    for (const obs of observations) {
      engine.restoreObservation(obs);
    }

    // Replay escalations
    const escalations = store.listEscalations(graphId);
    for (const esc of escalations) {
      engine.escalations.set(esc.id, esc);
    }

    return engine;
  }
}
