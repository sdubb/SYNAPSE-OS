import { EventEmitter } from "node:events";
import {
  type VerificationPlan,
  type VerificationRun,
} from "@synapse/contracts";
import { VerificationPlanCompiler, type PlanCompilationInput } from "./VerificationPlan.js";
import { VerificationRunner, type VerificationRunnerOptions } from "./VerificationRunner.js";

export class VerificationEngine extends EventEmitter {
  private runs: Map<string, VerificationRun> = new Map();
  private plans: Map<string, VerificationPlan> = new Map();

  /**
   * Compiles and registers a new verification plan.
   */
  public createPlan(input: PlanCompilationInput): VerificationPlan {
    const plan = VerificationPlanCompiler.compile(input);
    this.plans.set(plan.id, plan);
    this.emit("plan:created", plan);
    return plan;
  }

  /**
   * Executes a verification plan and returns the tamper-evident run result.
   */
  public async executePlan(
    planOrId: VerificationPlan | string,
    options?: VerificationRunnerOptions
  ): Promise<VerificationRun> {
    const plan = typeof planOrId === "string" ? this.plans.get(planOrId) : planOrId;
    if (!plan) {
      throw new Error(`Verification plan '${planOrId}' not found`);
    }

    this.emit("run:started", { planId: plan.id, tenantId: plan.tenantId });
    const run = await VerificationRunner.execute(plan, options);
    this.runs.set(run.id, run);

    if (run.overallVerdict === "PASS") {
      this.emit("run:passed", run);
    } else {
      this.emit("run:failed", run);
    }

    return run;
  }

  /**
   * High-level convenience method: automatically compiles and executes verification
   * for a completed agent task.
   */
  public async verifyTaskCompletion(
    input: PlanCompilationInput,
    options?: VerificationRunnerOptions
  ): Promise<VerificationRun> {
    const plan = this.createPlan(input);
    return this.executePlan(plan, options);
  }

  public getRun(runId: string): VerificationRun | null {
    return this.runs.get(runId) ?? null;
  }

  public getPlan(planId: string): VerificationPlan | null {
    return this.plans.get(planId) ?? null;
  }
}
