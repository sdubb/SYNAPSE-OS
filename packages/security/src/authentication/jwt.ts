import crypto from "node:crypto";
import { type AuthTokenPayload, type UserRole, type PermissionAction } from "@synapse/contracts";

export interface SignJwtOptions {
  secret?: string;
  expiresInSeconds?: number;
  issuer?: string;
  audience?: string;
}

export interface VerifyJwtOptions {
  secret?: string;
  issuer?: string;
  audience?: string;
  clockToleranceSeconds?: number;
}

export class JwtService {
  private defaultSecret: string;
  private defaultIssuer: string;
  private defaultAudience: string;

  constructor(options?: { secret?: string; issuer?: string; audience?: string }) {
    this.defaultSecret = options?.secret ?? process.env["SYNAPSE_JWT_SECRET"] ?? "synapse-insecure-default-jwt-secret-key-change-me!";
    this.defaultIssuer = options?.issuer ?? "synapse-os";
    this.defaultAudience = options?.audience ?? "synapse-control-plane";
  }

  /**
   * Signs a payload into an HMAC-SHA256 JWT string.
   */
  public sign(
    payload: {
      userId: string;
      tenantId: string;
      email: string;
      role: UserRole;
      permissions: PermissionAction[];
    },
    options?: SignJwtOptions
  ): string {
    const secret = options?.secret ?? this.defaultSecret;
    const issuer = options?.issuer ?? this.defaultIssuer;
    const audience = options?.audience ?? this.defaultAudience;
    const expiresIn = options?.expiresInSeconds ?? 86400; // 24 hours

    const now = Math.floor(Date.now() / 1000);
    const exp = now + expiresIn;

    const header = {
      alg: "HS256",
      typ: "JWT",
    };

    const claims: AuthTokenPayload = {
      sub: payload.userId as `${string}-${string}-${string}-${string}-${string}`,
      tid: payload.tenantId as `${string}-${string}-${string}-${string}-${string}`,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      iat: now,
      exp,
      iss: issuer,
      aud: audience,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(claims));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
      .createHmac("sha256", secret)
      .update(signingInput)
      .digest("base64url");

    return `${signingInput}.${signature}`;
  }

  /**
   * Verifies and decodes a JWT token.
   */
  public verify(token: string, options?: VerifyJwtOptions): AuthTokenPayload {
    if (!token || typeof token !== "string") {
      throw new Error("Missing or invalid token format");
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Malformed JWT string (must have 3 parts separated by dots)");
    }

    const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];
    const secret = options?.secret ?? this.defaultSecret;

    // 1. Verify signature with constant-time equality check
    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signingInput)
      .digest("base64url");

    const sigBuffer = Buffer.from(signatureB64, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new Error("Invalid JWT cryptographic signature");
    }

    // 2. Decode claims
    const decodedJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const claims = JSON.parse(decodedJson) as AuthTokenPayload;

    // 3. Verify expiration
    const now = Math.floor(Date.now() / 1000);
    const tolerance = options?.clockToleranceSeconds ?? 5;

    if (claims.exp && now > claims.exp + tolerance) {
      throw new Error(`Token expired at ${new Date(claims.exp * 1000).toISOString()}`);
    }

    // 4. Verify Issuer and Audience
    const expectedIssuer = options?.issuer ?? this.defaultIssuer;
    if (expectedIssuer && claims.iss && claims.iss !== expectedIssuer) {
      throw new Error(`JWT issuer mismatch: expected '${expectedIssuer}', got '${claims.iss}'`);
    }

    const expectedAudience = options?.audience ?? this.defaultAudience;
    if (expectedAudience && claims.aud && claims.aud !== expectedAudience) {
      throw new Error(`JWT audience mismatch: expected '${expectedAudience}', got '${claims.aud}'`);
    }

    return claims;
  }

  private base64UrlEncode(str: string): string {
    return Buffer.from(str, "utf8").toString("base64url");
  }
}
