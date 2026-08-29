import { randomBytes } from 'node:crypto';

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: number;
}

export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: SpanAttributes;
}

export interface Span {
  context: SpanContext;
  name: string;
  startTime: number;
  endTime?: number;
  attributes: SpanAttributes;
  events: SpanEvent[];
  status: {
    code: 'OK' | 'ERROR' | 'UNSET';
    message?: string;
  };
}

export class Tracer {
  private activeSpans = new Map<string, Span>();

  public static generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  public static generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  /**
   * Parses standard W3C traceparent header: 00-{traceId}-{spanId}-{flags}
   */
  public static parseTraceParent(header: string): SpanContext | null {
    const match = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i.exec(header.trim());
    if (!match) return null;

    return {
      traceId: match[2].toLowerCase(),
      spanId: match[3].toLowerCase(),
      traceFlags: parseInt(match[4], 16),
    };
  }

  /**
   * Formats standard W3C traceparent header
   */
  public static formatTraceParent(context: SpanContext): string {
    const flags = context.traceFlags.toString(16).padStart(2, '0');
    return `00-${context.traceId}-${context.spanId}-${flags}`;
  }

  /**
   * Starts a new span.
   */
  public startSpan(
    name: string,
    parentContext?: Partial<SpanContext>,
    attributes: SpanAttributes = {}
  ): Span {
    const traceId = parentContext?.traceId ?? Tracer.generateTraceId();
    const spanId = Tracer.generateSpanId();
    const parentSpanId = parentContext?.spanId;
    const traceFlags = parentContext?.traceFlags ?? 1;

    const span: Span = {
      context: {
        traceId,
        spanId,
        parentSpanId,
        traceFlags,
      },
      name,
      startTime: Date.now(),
      attributes: { ...attributes },
      events: [],
      status: { code: 'UNSET' },
    };

    this.activeSpans.set(spanId, span);
    return span;
  }

  public addEvent(span: Span, name: string, attributes?: SpanAttributes): void {
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  public setAttribute(span: Span, key: string, value: string | number | boolean): void {
    span.attributes[key] = value;
  }

  public recordException(span: Span, error: Error): void {
    span.status = {
      code: 'ERROR',
      message: error.message,
    };
    this.addEvent(span, 'exception', {
      'exception.type': error.name,
      'exception.message': error.message,
      'exception.stacktrace': error.stack ?? '',
    });
  }

  public endSpan(span: Span, status: 'OK' | 'ERROR' = 'OK'): void {
    span.endTime = Date.now();
    if (span.status.code === 'UNSET') {
      span.status.code = status;
    }
    this.activeSpans.delete(span.context.spanId);
  }

  /**
   * Executes an async operation wrapped in a traced span.
   */
  public async trace<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    parentContext?: Partial<SpanContext>,
    attributes?: SpanAttributes
  ): Promise<T> {
    const span = this.startSpan(name, parentContext, attributes);
    try {
      const result = await fn(span);
      this.endSpan(span, 'OK');
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.recordException(span, err);
      this.endSpan(span, 'ERROR');
      throw err;
    }
  }

  public getActiveSpanCount(): number {
    return this.activeSpans.size;
  }
}

export const tracer = new Tracer();
