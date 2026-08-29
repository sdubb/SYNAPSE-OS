import type { CoreSessionEvent } from "@cline/core";
import type { SynapseEventEnvelope } from "@synapse/contracts";
import { EventMapper } from "./event-mapper.js";

export interface EventNormalizationContext {
  tenantId: string;
  agentId?: string;
  sessionId?: string;
  taskId?: string;
  workspaceId?: string;
  runtimeId?: string;
  traceId?: string;
}

export class EventNormalizer {
  private sequenceCounter = 0;

  constructor(private readonly baseContext: EventNormalizationContext) {}

  /**
   * Normalize a native Cline CoreSessionEvent into a standardized SynapseEventEnvelope.
   */
  normalize(event: CoreSessionEvent, dynamicTraceId?: string): SynapseEventEnvelope {
    this.sequenceCounter++;
    const now = Date.now();
    const eventType = EventMapper.mapEventType(event);
    const payload = EventMapper.mapEventPayload(event);

    return {
      eventId: crypto.randomUUID(),
      eventType,
      tenantId: this.baseContext.tenantId,
      agentId: this.baseContext.agentId,
      sessionId: this.baseContext.sessionId,
      taskId: this.baseContext.taskId,
      workspaceId: this.baseContext.workspaceId,
      runtimeId: this.baseContext.runtimeId,
      timestamp: now,
      isoTimestamp: new Date(now).toISOString(),
      sequence: this.sequenceCounter,
      source: "engine.cline",
      payload,
      traceId: dynamicTraceId || this.baseContext.traceId || crypto.randomUUID(),
    };
  }

  getCurrentSequence(): number {
    return this.sequenceCounter;
  }
}
