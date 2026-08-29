import {
  type ApprovalDecision,
  type ApprovalResolution,
} from "@synapse/contracts";
import { type ApprovalStore, type ApprovalDecisionRecord } from "./ApprovalRequest.js";
import { type ApprovalPolicy } from "./ApprovalPolicy.js";
import { type ApprovalAudit } from "./ApprovalAudit.js";

export interface PendingDeferred {
  resolve: (resolution: ApprovalResolution) => void;
  reject: (reason: Error) => void;
}

export interface ApproverContext {
  userId: string;
  userEmail?: string;
  role: string;
}

export class ApprovalResolver {
  private store: ApprovalStore;
  private policy: ApprovalPolicy;
  private audit: ApprovalAudit;
  private pendingDeferreds: Map<string, PendingDeferred> = new Map();

  constructor(store: ApprovalStore, policy: ApprovalPolicy, audit: ApprovalAudit) {
    this.store = store;
    this.policy = policy;
    this.audit = audit;
  }

  public registerDeferred(requestId: string, deferred: PendingDeferred): void {
    this.pendingDeferreds.set(requestId, deferred);
  }

  public removeDeferred(requestId: string): void {
    this.pendingDeferreds.delete(requestId);
  }

  /**
   * Processes a human decision (APPROVE or REJECT) from an authenticated reviewer.
   */
  public async processDecision(
    decisionInput: ApprovalDecision,
    approver: ApproverContext
  ): Promise<ApprovalResolution> {
    const request = await this.store.getById(decisionInput.requestId);
    if (!request) {
      throw new Error(`Approval request with ID '${decisionInput.requestId}' not found`);
    }

    if (request.status !== "pending") {
      throw new Error(`Approval request '${decisionInput.requestId}' is already resolved with status '${request.status}'`);
    }

    // 1. Verify tenant isolation
    if (request.tenantId !== decisionInput.tenantId) {
      throw new Error("Tenant ID mismatch between decision and approval request");
    }

    // 2. Verify approver role against policy requirement
    const requirement = this.policy.getRequirement(request.riskLevel);
    if (!requirement.allowedRoles.includes(approver.role.toLowerCase())) {
      throw new Error(`User role '${approver.role}' is not authorized to approve '${request.riskLevel}' risk requests. Allowed: [${requirement.allowedRoles.join(", ")}]`);
    }

    // 3. Verify self-approval restriction
    if (!requirement.allowSelfApproval && request.requesterUserId === approver.userId) {
      throw new Error("Self-approval is forbidden for high/critical risk requests under tenant safety policy");
    }

    // 4. Verify distinct approver for multi-party approvals
    const alreadyApproved = request.decisions.some((d) => d.decidedByUserId === approver.userId);
    if (alreadyApproved) {
      throw new Error(`User '${approver.userId}' has already submitted a decision for this request`);
    }

    const normalizedDecision: "APPROVED" | "REJECTED" =
      decisionInput.decision.toUpperCase() === "APPROVED" ? "APPROVED" : "REJECTED";

    const decisionRecord: ApprovalDecisionRecord = {
      decidedByUserId: approver.userId,
      decidedByUserEmail: approver.userEmail,
      decidedByRole: approver.role,
      decision: normalizedDecision,
      reason: decisionInput.reason,
      modifiedParameters: decisionInput.modifiedParameters,
      decidedAt: new Date().toISOString(),
    };

    request.decisions.push(decisionRecord);

    // If REJECTED, immediately terminate request with rejection
    if (normalizedDecision === "REJECTED") {
      request.status = "rejected";
      request.resolvedAt = new Date().toISOString();
      await this.store.update(request);

      await this.audit.emit("approval.rejected", request, {
        actorUserId: approver.userId,
        actorRole: approver.role,
        decision: "REJECTED",
        reason: decisionInput.reason ?? "Rejected by human reviewer",
      });

      const resolution: ApprovalResolution = {
        requestId: request.id,
        status: "rejected",
        decision: decisionInput,
        resolvedAt: request.resolvedAt,
      };

      this.resolvePendingDeferred(request.id, resolution);
      return resolution;
    }

    // If APPROVED, check if quorum count is reached
    request.remainingApprovals = Math.max(0, request.requiredApprovals - request.decisions.filter((d) => d.decision === "APPROVED").length);

    if (request.remainingApprovals === 0) {
      request.status = "approved";
      request.resolvedAt = new Date().toISOString();
      await this.store.update(request);

      const approvedParams = decisionInput.modifiedParameters ?? request.toolParameters;

      await this.audit.emit("approval.granted", request, {
        actorUserId: approver.userId,
        actorRole: approver.role,
        decision: "APPROVED",
        reason: decisionInput.reason ?? "Approved by authorized reviewer",
        approvedParameters: approvedParams,
      });

      const resolution: ApprovalResolution = {
        requestId: request.id,
        status: "approved",
        decision: decisionInput,
        approvedParameters: approvedParams,
        resolvedAt: request.resolvedAt,
      };

      this.resolvePendingDeferred(request.id, resolution);
      return resolution;
    }

    // Multi-party quorum still pending additional approvals
    await this.store.update(request);
    await this.audit.emit("approval.modified", request, {
      actorUserId: approver.userId,
      actorRole: approver.role,
      reason: `Quorum progress: ${request.decisions.length}/${request.requiredApprovals} approvals obtained`,
    });

    return {
      requestId: request.id,
      status: "pending",
      decision: decisionInput,
      resolvedAt: new Date().toISOString(),
    };
  }

  private resolvePendingDeferred(requestId: string, resolution: ApprovalResolution): void {
    const deferred = this.pendingDeferreds.get(requestId);
    if (deferred) {
      this.pendingDeferreds.delete(requestId);
      deferred.resolve(resolution);
    }
  }

  public rejectExpired(requestId: string, _reason: string): void {
    const deferred = this.pendingDeferreds.get(requestId);
    if (deferred) {
      this.pendingDeferreds.delete(requestId);
      deferred.resolve({
        requestId,
        status: "timed_out",
        resolvedAt: new Date().toISOString(),
      });
    }
  }
}
