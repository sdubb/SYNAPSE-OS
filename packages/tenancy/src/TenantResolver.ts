import type { TenantContextData } from "./TenantContext.js";

export interface TenantResolutionRequest {
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  apiKey?: string;
  token?: string;
}

export interface TenantTokenDecoder {
  decode(token: string): Promise<{ tenantId: string; userId?: string; role?: string; permissions?: string[] } | null>;
}

export interface SessionTenantLookup {
  lookupTenantBySessionId(sessionId: string): Promise<string | null>;
  lookupTenantByApiKey(apiKey: string): Promise<{ tenantId: string; userId?: string } | null>;
}

export class TenantResolver {
  constructor(
    private readonly tokenDecoder?: TenantTokenDecoder,
    private readonly sessionLookup?: SessionTenantLookup
  ) {}

  /**
   * Resolve tenant information from a generic HTTP request envelope.
   */
  async resolve(req: TenantResolutionRequest): Promise<TenantContextData | null> {
    // 1. Direct explicit Header resolution: X-Tenant-Id
    const headerTenantId = this.getHeader(req.headers, "x-tenant-id");
    const userIdHeader = this.getHeader(req.headers, "x-user-id");
    const traceId = this.getHeader(req.headers, "x-trace-id") || crypto.randomUUID();

    if (headerTenantId) {
      return {
        tenantId: headerTenantId,
        userId: userIdHeader,
        traceId,
      };
    }

    // 2. Bearer Authorization Token
    const authHeader = this.getHeader(req.headers, "authorization") || req.token;
    if (authHeader && this.tokenDecoder) {
      const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : authHeader.trim();
      const decoded = await this.tokenDecoder.decode(token);
      if (decoded && decoded.tenantId) {
        return {
          tenantId: decoded.tenantId,
          userId: decoded.userId,
          role: decoded.role,
          permissions: decoded.permissions,
          traceId,
        };
      }
    }

    // 3. API Key resolution (Header X-API-Key or req.apiKey)
    const apiKey = this.getHeader(req.headers, "x-api-key") || req.apiKey;
    if (apiKey && this.sessionLookup) {
      const result = await this.sessionLookup.lookupTenantByApiKey(apiKey);
      if (result && result.tenantId) {
        return {
          tenantId: result.tenantId,
          userId: result.userId,
          traceId,
        };
      }
    }

    // 4. Session ID Header / Parameter resolution (X-Session-Id)
    const sessionId = this.getHeader(req.headers, "x-session-id") || (typeof req.query?.sessionId === "string" ? req.query.sessionId : undefined);
    if (sessionId && this.sessionLookup) {
      const tenantId = await this.sessionLookup.lookupTenantBySessionId(sessionId);
      if (tenantId) {
        return {
          tenantId,
          sessionId,
          traceId,
        };
      }
    }

    return null;
  }

  private getHeader(headers: Record<string, string | string[] | undefined> | undefined, name: string): string | undefined {
    if (!headers) return undefined;
    const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
    if (!key) return undefined;
    const value = headers[key];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}
