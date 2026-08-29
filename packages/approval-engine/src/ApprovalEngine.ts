import { EventEmitter } from "node:events";
import {
  type ApprovalDecision,
  type ApprovalResolution,
  type PolicyRiskLevel,
} from "@synapse/contracts";
import {
  ApprovalRequestFactory,
  type CreateApprovalRequestOptions,
  type SanitizedApprovalRequest,
  type ApprovalStore,
  InMemoryApprovalStore,
} from "./ApprovalRequest.js";
import { ApprovalPolicy } from "./ApprovalPolicy.js";
import { ApprovalAudit, type AuditSink } from "./ApprovalAudit.js";
import { ApprovalTimeoutMonitor } from "./ApprovalTimeout.js";
import { ApprovalResolver, type ApproverContext } from "./ApprovalResolver.js";

export interface ApprovalEngineConfig {
  store?: ApprovalStore;
  policy?: ApprovalPolicy;
  auditSinks?: AuditSink[];
  timeoutCheckIntervalMs?: number;
}

export class ApprovalEngine extends EventEmitter {
  private store: ApprovalStore;
  private policy: ApprovalPolicy;
  private audit: ApprovalAudit;
  private timeoutMonitor: ApprovalTimeoutMonitor;
  private resolver: ApprovalResolver;

  constructor(config?: ApprovalEngineConfig) {
    super();
    this.store = config?.store ?? new InMemoryApprovalStore();
    this.policy = config?.policy ?? new ApprovalPolicy();
    this.audit = new ApprovalAudit(config?.auditSinks);
    this.resolver = new ApprovalResolver(this.store, this.policy, this.audit);
    this.timeoutMonitor = new ApprovalTimeoutMonitor(
      this.store,
      this.audit,
      config?.timeoutCheckIntervalMs ?? 5000
    );

    this.timeoutMonitor.onTimeout((req) => {
      this.resolver.rejectExpired(req.id, "Request timed out waiting for human approval");
      this.emit("approval:timed_out", req);
    });

    this.timeoutMonitor.start();
  }

  /**
   * Request human approval for a dangerous or governed tool action.
   * If the policy auto-approves, returns immediate resolution without pausing.
   */
  public async requestApproval(options: CreateApprovalRequestOptions): Promise<ApprovalResolution> {
    const riskLevel: PolicyRiskLevel = options.riskLevel;

    // 1. Check Auto-Approval Policy
    if (this.policy.isAutoApproved(riskLevel)) {
      const now = new Date().toISOString();
      const req = ApprovalRequestFactory.create(options, 0);
      req.status = "auto_approved";
      req.resolvedAt = now;
      await this.store.save(req);

      await this.audit.emit("approval.granted", req, {
        decision: "APPROVED",
        reason: "Auto-approved by policy rule",
        approvedParameters: options.toolParameters,
      });

      return {
        requestId: req.id,
        status: "auto_approved",
        approvedParameters: options.toolParameters,
        resolvedAt: now,
      };
    }

    // 2. Create pending request
    const requiredCount = this.policy.getRequiredCount(riskLevel);
    const timeoutSec = options.timeoutSeconds ?? this.policy.getTimeoutSeconds(riskLevel);
    const req = ApprovalRequestFactory.create({ ...options, timeoutSeconds: timeoutSec }, requiredCount);

    await this.store.save(req);
    await this.audit.emit("approval.requested", req);

    // Emit event for realtime server (WebSockets)
    this.emit("approval:requested", req);

    // 3. Return a pending promise that will resolve when human answers or times out
    return new Promise<ApprovalResolution>((resolve, reject) => {
      this.resolver.registerDeferred(req.id, {
        resolve: (resolution) => {
          this.emit("approval:resolved", resolution);
          resolve(resolution);
        },
        reject: (err) => {
          reject(err);
        },
      });
    });
  }

  /**
   * Submit an approver's decision (APPROVE or REJECT).
   */
  public async submitDecision(
    decision: ApprovalDecision,
    approver: ApproverContext
  ): Promise<ApprovalResolution> {
    return this.resolver.processDecision(decision, approver);
  }

  /**
   * Get all currently pending approvals for a tenant or globally.
   */
  public async listPending(tenantId?: string): Promise<SanitizedApprovalRequest[]> {
    return this.store.listPending(tenantId);
  }

  /**
   * Get a single approval request by ID.
   */
  public async getRequestById(requestId: string): Promise<SanitizedApprovalRequest | null> {
    return this.store.getById(requestId);
  }

  /**
   * Get audit log history for a specific request or all records.
   */
  public getAuditTrail(requestId?: string) {
    return this.audit.getRecords(requestId);
  }

  /**
   * Graceful shutdown of timer monitor.
   */
  public shutdown(): void {
    this.timeoutMonitor.stop();
  }
}
