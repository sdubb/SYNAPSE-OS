export interface WorkforceNode {
  agentId: string;
  parentAgentId?: string;
  teamId?: string;
  missionId: string;
  taskId?: string;
  runId?: string;
  attemptId?: string;
  runtimeId?: string;
  clineSessionId?: string;
  status: "ACTIVE" | "TERMINATED" | "PAUSED";
  createdAt: string;
  updatedAt: string;
}

export class WorkforceGraphEngine {
  private nodes = new Map<string, WorkforceNode>();
  private eventEmitter: (event: any) => void = () => {};

  public setEventEmitter(emitter: (event: any) => void) {
    this.eventEmitter = emitter;
  }

  public registerSpawn(node: Omit<WorkforceNode, "status" | "createdAt" | "updatedAt">): WorkforceNode {
    const existing = this.nodes.get(node.agentId);
    if (existing && existing.status === "ACTIVE") {
      // Idempotent return without duplicate event or mutation
      return existing;
    }

    const fullNode: WorkforceNode = {
      ...node,
      status: "ACTIVE",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.nodes.set(node.agentId, fullNode);
    this.eventEmitter({
      type: "workforce.agent.spawned",
      ...fullNode
    });
    return fullNode;
  }

  public registerTermination(agentId: string): void {
    const node = this.nodes.get(agentId);
    if (!node) return;
    node.status = "TERMINATED";
    node.updatedAt = new Date().toISOString();
    this.eventEmitter({
      type: "workforce.agent.terminated",
      ...node
    });
  }
  
  public getWorkforce(): WorkforceNode[] {
    return Array.from(this.nodes.values());
  }

  public getAgent(agentId: string): WorkforceNode | undefined {
    return this.nodes.get(agentId);
  }

  /**
   * Reconciles workforce with actual active runtime sessions.
   * Marks any missing agents as TERMINATED to prevent ghost/orphan agents after crashes.
   */
  public reconcile(activeAgentIds: string[]): { active: number; terminated: number } {
    const activeSet = new Set(activeAgentIds);
    let terminatedCount = 0;
    let activeCount = 0;

    for (const [id, node] of this.nodes.entries()) {
      if (node.status === "ACTIVE" && !activeSet.has(id)) {
        node.status = "TERMINATED";
        node.updatedAt = new Date().toISOString();
        terminatedCount++;
        this.eventEmitter({
          type: "workforce.agent.reconciled_terminated",
          agentId: id,
          reason: "Agent was missing from active runtimes during reconciliation",
        });
      } else if (node.status === "ACTIVE") {
        activeCount++;
      }
    }

    return { active: activeCount, terminated: terminatedCount };
  }
}
