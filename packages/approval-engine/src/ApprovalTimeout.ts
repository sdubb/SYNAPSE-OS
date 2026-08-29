import { type ApprovalStore, type SanitizedApprovalRequest } from "./ApprovalRequest.js";
import { type ApprovalAudit } from "./ApprovalAudit.js";

export type TimeoutCallback = (request: SanitizedApprovalRequest) => Promise<void> | void;

export class ApprovalTimeoutMonitor {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private store: ApprovalStore;
  private audit: ApprovalAudit;
  private callbacks: TimeoutCallback[] = [];
  private isRunning = false;

  constructor(store: ApprovalStore, audit: ApprovalAudit, intervalMs = 5000) {
    this.store = store;
    this.audit = audit;
    this.intervalMs = intervalMs;
  }

  public onTimeout(callback: TimeoutCallback): void {
    this.callbacks.push(callback);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      void this.checkExpiredRequests();
    }, this.intervalMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async checkExpiredRequests(): Promise<SanitizedApprovalRequest[]> {
    const pending = await this.store.listPending();
    const now = Date.now();
    const expired: SanitizedApprovalRequest[] = [];

    for (const req of pending) {
      const expiration = new Date(req.expiresAt).getTime();
      if (now >= expiration) {
        req.status = "timed_out";
        req.resolvedAt = new Date().toISOString();
        await this.store.update(req);

        await this.audit.emit("approval.timed_out", req, {
          reason: `Request exceeded timeout limit of ${req.timeoutSeconds} seconds`,
        });

        expired.push(req);

        for (const cb of this.callbacks) {
          try {
            await cb(req);
          } catch (err) {
            console.error("Error executing timeout callback:", err);
          }
        }
      }
    }

    return expired;
  }
}
