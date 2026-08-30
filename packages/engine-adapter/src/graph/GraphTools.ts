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
        const plan = engine.replan(input.nodes || [], input.edges || [], "Initial plan submitted by Cline", engine.getGraph().version);
        return `Plan successfully submitted and persisted as version ${plan.version}. Synapse is now governing this execution graph.`;
      } catch (err: any) {
        throw new Error(`Failed to submit plan: ${err.message}`);
      }
    }
  };
}

import { SimulationEngine } from "@synapse/simulation-engine";
import { DigitalTwin } from "@synapse/twin-engine";

export function createSimulateBranchTool(simEngine: SimulationEngine, getTwinFn: (env: string) => DigitalTwin | null): any {
  return {
    name: "simulate_execution_branch",
    description: "Request Synapse Simulation Engine to evaluate the consequences of a proposed branch or high-impact action before execution.",
    inputSchema: {
      type: "object",
      properties: {
        targetNodeId: { type: "string" },
        targetEntityId: { type: "string" },
        mutation: { 
          type: "object",
          properties: {
             property: { type: "string" },
             value: {} // accept any type
          }
        },
        actionType: { type: "string" },
        environment: { type: "string" },
        expectedChange: { type: "string" },
        riskContext: { type: "string" },
        iterations: { type: "number", minimum: 10, maximum: 1000 }
      },
      required: ["targetEntityId", "environment"]
    },
    async execute(input: any, _context: any) {
      const twin = getTwinFn(input.environment);
      if (!twin) {
        throw new Error(`SIMULATION_UNAVAILABLE: No twin/world model for environment: ${input.environment}`);
      }

      const builder = simEngine.createScenarioBuilder()
        .withId(`scen_${Date.now()}`)
        .withName(`Simulate ${input.actionType} on ${input.targetEntityId}`)
        .withDuration(1000, 100);
        
      if (input.mutation?.property && input.mutation?.value !== undefined) {
        builder.mutateEntity(
          input.targetEntityId,
          input.mutation.property,
          input.mutation.value,
          100,
          input.expectedChange || "Applied mutation for simulation"
        );
      }
      
      const scenario = builder.build();

      const iterations = input.iterations && input.iterations >= 10 ? input.iterations : 10;

      // Determine strategy based on risk
      let method = "DETERMINISTIC";
      let sweepResult: any;
      let durationMs = 0;
      let failureRate = 0;
      let avgViolations = 0;
      
      if (input.riskContext === "HIGH" || input.riskContext === "CRITICAL" || iterations > 1) {
          method = "MONTE_CARLO";
          sweepResult = await simEngine.runMonteCarloSweep(twin, scenario, iterations);
          failureRate = sweepResult.failureRatePercent;
          avgViolations = sweepResult.metricDistributions["violationsCount"]?.mean ?? 0;
          durationMs = sweepResult.durationMs;
      } else {
          sweepResult = await simEngine.runScenario(twin, scenario);
          failureRate = sweepResult.outcome.constraintViolationsCount > 0 ? 100 : 0;
          avgViolations = sweepResult.outcome.constraintViolationsCount;
          durationMs = sweepResult.durationRealMs;
      }

      // Calculate blast radius from relationships
      let blastRadius = 0;
      let affectedEntities = 0;
      if (sweepResult.comparison && sweepResult.comparison.executiveSummary) {
          blastRadius = sweepResult.comparison.executiveSummary.totalImpactedEntitiesCount;
          affectedEntities = blastRadius;
      } else if (sweepResult.iterations && sweepResult.iterations.length > 0) {
          blastRadius = sweepResult.metricDistributions["totalImpactedEntities"]?.mean ?? avgViolations;
          affectedEntities = Math.round(blastRadius);
      } else {
          affectedEntities = avgViolations > 0 ? 2 : 0; // fallback if metrics are missing
          blastRadius = affectedEntities;
      }

      return JSON.stringify({
        simulationRunId: sweepResult.sweepId || sweepResult.runId,
        targetNodeId: input.targetNodeId,
        outcomes: {
          successRate: `${100 - failureRate}%`,
          failureRate: `${failureRate}%`
        },
        riskScore: Math.min(1.0, (failureRate / 100) * 0.6 + (avgViolations / Math.max(1, iterations)) * 0.4),
        blastRadius,
        affectedEntities,
        constraintViolations: Math.round(avgViolations),
        simulationMethod: method,
        duration: durationMs
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
        newEdges: { type: "array" },
        baseVersion: { type: "number", description: "The graph version you are modifying. Protects against concurrent replans." }
      },
      required: ["failedNodeId", "reason", "newNodes", "newEdges", "baseVersion"]
    },
    async execute(input: any, _context: any) {
      try {
        const plan = engine.replan(input.newNodes || [], input.newEdges || [], input.reason, input.baseVersion);
        return `Replan accepted. Graph version advanced to ${plan.version}.`;
      } catch (err: any) {
        throw new Error(`Failed to replan: ${err.message}`);
      }
    }
  };
}

export function getGraphTools(
  engine: ExecutionGraphEngine, 
  simEngine: SimulationEngine, 
  getTwinFn: (env: string) => DigitalTwin | null
): any[] {
  return [
    createSubmitPlanTool(engine),
    createSimulateBranchTool(simEngine, getTwinFn),
    createReplanTool(engine)
  ];
}
