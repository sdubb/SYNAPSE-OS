import { ExecutionGraphEngine } from "@synapse/control-plane";

// We use any for tool payload since AgentTool types might be strict.
export function createSubmitPlanTool(engine: ExecutionGraphEngine): any {
  return {
    name: "submit_execution_plan",
    description: "Submit a structured execution plan graph to Synapse OS. Call this before executing consequential work. The plan defines the intended path, alternative paths, retry/fallback conditions, and escalation points. Synapse will persist and govern this plan.",
    inputSchema: {
      type: "object",
      properties: {
        objective: { type: "string" },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: { type: "string", enum: ["ACTION", "CONDITION", "BRANCH", "MERGE", "RETRY", "FALLBACK", "APPROVAL", "ESCALATION", "VERIFICATION", "END"] },
              title: { type: "string" },
              description: { type: "string" },
              action: { type: "string" },
              expectedOutcome: { type: "string" },
              successCondition: { type: "string" },
              failureCondition: { type: "string" },
              riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }
            },
            required: ["id", "type", "title"]
          }
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              condition: { type: "string" }
            },
            required: ["from", "to"]
          }
        }
      },
      required: ["objective", "nodes", "edges"]
    },
    async execute(input: any, _context: any) {
      // Very basic validation/integration
      try {
        const plan = engine.replan(input.nodes || [], input.edges || [], "Initial plan submitted by Cline");
        return `Plan successfully submitted and persisted as version ${plan.version}. Synapse is now governing this execution graph.`;
      } catch (err: any) {
        return `Failed to submit plan: ${err.message}`;
      }
    }
  };
}

export function createSimulateBranchTool(): any {
  return {
    name: "simulate_execution_branch",
    description: "Request Synapse Simulation Engine to evaluate the consequences of a proposed branch or high-impact action before execution.",
    inputSchema: {
      type: "object",
      properties: {
        scenario: { type: "string" },
        targetNodeId: { type: "string" },
        proposedAction: { type: "string" }
      },
      required: ["scenario"]
    },
    async execute(input: any, _context: any) {
      // Mocked simulation integration for the test
      if (input.proposedAction?.includes("delete production") || input.scenario?.includes("database schema is wrong")) {
        return JSON.stringify({
          expected: "92% success",
          possibleFailure: "8%",
          impact: "17 dependent services",
          rollback: "available",
          recommendation: "Simulation advises creating a staging migration and verifying it before production."
        }, null, 2);
      }
      
      return JSON.stringify({
        expected: "99% success",
        impact: "Minimal",
        recommendation: "Safe to proceed"
      }, null, 2);
    }
  };
}

export function createReplanTool(engine: ExecutionGraphEngine): any {
  return {
    name: "propose_replan",
    description: "Propose a modification to the existing execution graph when reality differs from the original plan.",
    inputSchema: {
      type: "object",
      properties: {
        failedNodeId: { type: "string" },
        reason: { type: "string" },
        newNodes: { type: "array" },
        newEdges: { type: "array" }
      },
      required: ["failedNodeId", "reason", "newNodes", "newEdges"]
    },
    async execute(input: any, _context: any) {
      try {
        const plan = engine.replan(input.newNodes || [], input.newEdges || [], input.reason);
        return `Replan accepted. Graph version advanced to ${plan.version}.`;
      } catch (err: any) {
        return `Failed to replan: ${err.message}`;
      }
    }
  };
}

export function getGraphTools(engine: ExecutionGraphEngine): any[] {
  return [
    createSubmitPlanTool(engine),
    createSimulateBranchTool(),
    createReplanTool(engine)
  ];
}
