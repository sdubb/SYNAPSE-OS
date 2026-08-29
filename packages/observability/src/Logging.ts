export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
};

export interface LogContext {
  tenantId?: string;
  agentId?: string;
  taskId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  [key: string]: unknown;
}

export class SecretRedactor {
  private static readonly REDACTED = '[REDACTED]';
  private static readonly PATTERNS: RegExp[] = [
    // OpenAI / Anthropic / general AI keys
    /sk-[a-zA-Z0-9_\-]{20,}/gi,
    // AWS Access Key ID
    /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    // Bearer tokens
    /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
    // Generic API keys in key=value or "key": "value"
    /(?:api[_-]?key|secret|password|auth[_-]?token|private[_-]?key)\s*[:=]\s*["']?([^"'\s,;]+)["']?/gi,
    // PEM private keys
    /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/gi,
  ];

  public static redact(text: string): string {
    let result = text;
    for (const pattern of this.PATTERNS) {
      result = result.replace(pattern, (match) => {
        if (match.toLowerCase().startsWith('bearer ')) {
          return `Bearer ${this.REDACTED}`;
        }
        return this.REDACTED;
      });
    }
    return result;
  }

  public static redactObject<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      return this.redact(obj) as unknown as T;
    }
    if (typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as unknown as T;
    }

    const record = obj as Record<string, unknown>;
    const sensitiveKeys = new Set([
      'password',
      'secret',
      'token',
      'apiKey',
      'api_key',
      'authToken',
      'auth_token',
      'privateKey',
      'private_key',
      'clientSecret',
      'client_secret',
    ]);

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = this.REDACTED;
      } else {
        sanitized[key] = this.redactObject(value);
      }
    }
    return sanitized as T;
  }
}

export class Logger {
  private level: LogLevel;
  private context: LogContext;
  private readonly writer: (line: string) => void;

  constructor(
    level: LogLevel = 'INFO',
    context: LogContext = {},
    writer: (line: string) => void = (line) => console.log(line)
  ) {
    this.level = level;
    this.context = { ...context };
    this.writer = writer;
  }

  public withContext(context: LogContext): Logger {
    return new Logger(
      this.level,
      { ...this.context, ...context },
      this.writer
    );
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public getLevel(): LogLevel {
    return this.level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_SEVERITY[level] >= LOG_LEVEL_SEVERITY[this.level];
  }

  private emit(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const safeMeta = meta ? SecretRedactor.redactObject(meta) : {};
    const safeMessage = SecretRedactor.redact(message);
    const safeContext = SecretRedactor.redactObject(this.context);

    const entry: LogEntry = {
      level,
      message: safeMessage,
      timestamp: new Date().toISOString(),
      context: Object.keys(safeContext).length > 0 ? safeContext : undefined,
      ...safeMeta,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: SecretRedactor.redact(error.message),
        stack: error.stack ? SecretRedactor.redact(error.stack) : undefined,
      };
    }

    this.writer(JSON.stringify(entry));
  }

  public trace(message: string, meta?: Record<string, unknown>): void {
    this.emit('TRACE', message, meta);
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.emit('DEBUG', message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.emit('INFO', message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>, error?: Error): void {
    this.emit('WARN', message, meta, error);
  }

  public error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.emit('ERROR', message, meta, error);
  }

  public fatal(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.emit('FATAL', message, meta, error);
  }
}

export const logger = new Logger();
