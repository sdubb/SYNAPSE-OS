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
    const fullNode: WorkforceNode = {
      ...node,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
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
}
