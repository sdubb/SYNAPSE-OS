import {
  SynapseEventEnvelope,
  EventHandler,
  SubscriptionOptions,
} from './EventTypes.js';

export interface SubscriptionHandle {
  id: string;
  pattern: string;
  unsubscribe: () => void;
}

export class EventSubscriber {
  private patternRegex: RegExp;
  public readonly id: string;
  public readonly pattern: string;
  public readonly handler: EventHandler;
  public readonly options: SubscriptionOptions;

  constructor(
    id: string,
    pattern: string,
    handler: EventHandler,
    options: SubscriptionOptions = {}
  ) {
    this.id = id;
    this.pattern = pattern;
    this.handler = handler;
    this.options = options;
    this.patternRegex = this.compilePattern(pattern);
  }

  /**
   * Compiles an event pattern into a RegExp.
   * e.g., 'agent.*' -> /^agent\.[^.]+$/
   *       'policy.**' -> /^policy(\..+)?$/
   *       '*' -> /^.*$/
   */
  private compilePattern(pattern: string): RegExp {
    if (pattern === '*' || pattern === '**') {
      return /^.*$/;
    }

    const escaped = pattern
      .split('.')
      .map((segment) => {
        if (segment === '**') return '.*';
        if (segment === '*') return '[^.]+';
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('\\.');

    return new RegExp(`^${escaped}$`);
  }

  /**
   * Evaluates if this subscriber matches the given event type and subscription filters.
   */
  public matches(event: SynapseEventEnvelope): boolean {
    if (!this.patternRegex.test(event.eventType)) {
      return false;
    }

    const filter = this.options.filter;
    if (!filter) {
      return true;
    }

    if (filter.tenantId && event.tenantId !== filter.tenantId) {
      return false;
    }
    if (filter.agentId && event.agentId !== filter.agentId) {
      return false;
    }
    if (filter.taskId && event.taskId !== filter.taskId) {
      return false;
    }
    if (filter.sessionId && event.sessionId !== filter.sessionId) {
      return false;
    }
    if (filter.source && event.source !== filter.source) {
      return false;
    }
    if (filter.traceId && event.traceId !== filter.traceId) {
      return false;
    }

    return true;
  }

  /**
   * Dispatches the event to the handler with error handling.
   */
  public async dispatch(event: SynapseEventEnvelope): Promise<void> {
    try {
      await this.handler(event);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (this.options.deadLetterHandler) {
        try {
          await this.options.deadLetterHandler(event, err);
        } catch (dlErr) {
          console.error(`[EventSubscriber:${this.id}] Dead letter handler failed:`, dlErr);
        }
      } else {
        console.error(`[EventSubscriber:${this.id}] Uncaught subscriber error for event ${event.eventId}:`, err);
      }
    }
  }
}
