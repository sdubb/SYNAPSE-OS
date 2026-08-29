/**
 * @file SessionController.ts
 * @description Correlates Synapse sessions with Cline sessions, tracks token metrics, tool telemetry, and event streaming.
 */

import { EventEmitter } from 'node:events';
import {
  SessionStateRecord,
  SessionStatus,
  SessionStateValidator,
} from './state/SessionState.js';
import { StateReducer, SynapseEventEnvelope } from './state/StateReducer.js';
import { SessionNotFoundError } from './errors/ControlPlaneError.js';

export interface CreateSessionOptions {
  readonly sessionId?: string;
  readonly tenantId: string;
  readonly agentId: string;
  readonly workspacePath: string;
  readonly taskId?: string;
  readonly teamId?: string;
}

export interface StreamChunkRecord {
  readonly cursor: number;
  readonly chunk: string;
  readonly timestamp: Date;
}

export class SessionController extends EventEmitter {
  private readonly sessions: Map<string, SessionStateRecord> = new Map();
  private readonly clineToSynapseMap: Map<string, string> = new Map();
  private readonly streamBuffers: Map<string, StreamChunkRecord[]> = new Map();

  constructor() {
    super();
  }

  public createSession(options: CreateSessionOptions): SessionStateRecord {
    const sessionId = options.sessionId ?? `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    if (this.sessions.has(sessionId)) {
      throw new Error(`Session '${sessionId}' already exists`);
    }

    const session = SessionStateValidator.createInitial(
      sessionId,
      options.tenantId,
      options.agentId,
      options.workspacePath,
      options.taskId,
      options.teamId
    );

    this.sessions.set(sessionId, session);
    this.streamBuffers.set(sessionId, []);

    this.emitEvent(session, 'SESSION_STATUS_CHANGED', {
      newStatus: 'ACTIVE',
      reason: 'Session created and initialized',
    });

    return this.getSessionOrThrow(sessionId);
  }

  public correlateClineSession(synapseSessionId: string, clineSessionId: string): void {
    const session = this.getSessionOrThrow(synapseSessionId);
    this.clineToSynapseMap.set(clineSessionId, synapseSessionId);

    this.emitEvent(session, 'SESSION_CLINE_CORRELATED', {
      clineSessionId,
    });
  }

  public setSessionStatus(sessionId: string, newStatus: SessionStatus, reason?: string): void {
    const session = this.getSessionOrThrow(sessionId);
    SessionStateValidator.validateTransition(session.status, newStatus);

    this.emitEvent(session, 'SESSION_STATUS_CHANGED', {
      oldStatus: session.status,
      newStatus,
      reason: reason ?? `Status changed to ${newStatus}`,
    });
  }

  public recordTokens(
    sessionId: string,
    promptTokens: number,
    completionTokens: number,
    costUsd?: number,
    cacheWriteTokens: number = 0,
    cacheReadTokens: number = 0
  ): void {
    const session = this.getSessionOrThrow(sessionId);

    this.emitEvent(session, 'SESSION_TOKENS_CONSUMED', {
      promptTokens,
      completionTokens,
      costUsd: costUsd ?? Number(((promptTokens * 3 + completionTokens * 15) / 1_000_000).toFixed(4)),
      cacheWriteTokens,
      cacheReadTokens,
    });
  }

  public recordToolInvocation(
    sessionId: string,
    invocationId: string,
    toolName: string,
    parameters: Record<string, unknown>
  ): void {
    const session = this.getSessionOrThrow(sessionId);

    this.emitEvent(session, 'SESSION_TOOL_INVOKED', {
      invocationId,
      toolName,
      parameters,
    });
  }

  public recordToolCompletion(
    sessionId: string,
    invocationId: string,
    status: 'SUCCESS' | 'ERROR' | 'REJECTED',
    durationMs?: number,
    error?: string
  ): void {
    const session = this.getSessionOrThrow(sessionId);

    this.emitEvent(session, 'SESSION_TOOL_COMPLETED', {
      invocationId,
      status,
      durationMs,
      error,
    });
  }

  public appendStreamChunk(sessionId: string, chunk: string): void {
    this.getSessionOrThrow(sessionId);
    const buffer = this.streamBuffers.get(sessionId) ?? [];
    const nextCursor = buffer.length + 1;

    const record: StreamChunkRecord = {
      cursor: nextCursor,
      chunk,
      timestamp: new Date(),
    };

    buffer.push(record);
    if (buffer.length > 5000) {
      buffer.shift();
    }
    this.streamBuffers.set(sessionId, buffer);

    this.emit('stream_chunk', { sessionId, chunkRecord: record });
  }

  public getStreamHistory(sessionId: string, fromCursor: number = 0): readonly StreamChunkRecord[] {
    const buffer = this.streamBuffers.get(sessionId);
    if (!buffer) return [];
    return Object.freeze(buffer.filter((b) => b.cursor > fromCursor));
  }

  public getSession(sessionId: string): SessionStateRecord | undefined {
    return this.sessions.get(sessionId);
  }

  public getSessionOrThrow(sessionId: string): SessionStateRecord {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    return session;
  }

  public getByClineSessionId(clineSessionId: string): SessionStateRecord | undefined {
    const synapseId = this.clineToSynapseMap.get(clineSessionId);
    if (!synapseId) return undefined;
    return this.sessions.get(synapseId);
  }

  public listSessions(filter?: {
    tenantId?: string;
    agentId?: string;
    status?: SessionStatus;
  }): readonly SessionStateRecord[] {
    const list: SessionStateRecord[] = [];
    for (const sess of this.sessions.values()) {
      if (filter?.tenantId && sess.tenantId !== filter.tenantId) continue;
      if (filter?.agentId && sess.agentId !== filter.agentId) continue;
      if (filter?.status && sess.status !== filter.status) continue;
      list.push(sess);
    }
    return Object.freeze(list);
  }

  private emitEvent(session: SessionStateRecord, eventType: string, payload: Record<string, unknown>): void {
    const envelope: SynapseEventEnvelope = {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventType,
      correlationId: session.sessionId,
      tenantId: session.tenantId,
      agentId: session.agentId,
      sessionId: session.sessionId,
      taskId: session.taskId,
      timestamp: new Date(),
      payload,
    };

    const updated = StateReducer.reduceSessionState(session, envelope);
    this.sessions.set(session.sessionId, updated);
    this.emit('session_updated', { session: updated, event: envelope });
  }
}
