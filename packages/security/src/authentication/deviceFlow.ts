import crypto from "node:crypto";
import { type UserRole, type PermissionAction } from "@synapse/contracts";

export interface DeviceAuthorizationResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

export interface DeviceSession {
  deviceCode: string;
  userCode: string;
  tenantId: string;
  status: "pending" | "approved" | "rejected" | "expired";
  userId?: string;
  userEmail?: string;
  role?: UserRole;
  permissions?: PermissionAction[];
  expiresAt: string;
  interval: number;
  lastPolledAt?: string;
}

export class DeviceFlowService {
  private sessions: Map<string, DeviceSession> = new Map(); // key = deviceCode
  private userCodeMap: Map<string, string> = new Map(); // key = userCode -> deviceCode
  private baseUrl: string;

  constructor(baseUrl = "https://app.synapse-os.io") {
    this.baseUrl = baseUrl;
  }

  /**
   * Initiates a new device authorization request.
   */
  public initiateFlow(tenantId: string, expiresInSeconds = 900, interval = 5): DeviceAuthorizationResponse {
    const deviceCode = `syn_dev_${crypto.randomBytes(32).toString("hex")}`;
    const userCode = this.generateUserCode();
    const verificationUri = `${this.baseUrl}/activate`;
    const verificationUriComplete = `${this.baseUrl}/activate?user_code=${userCode}`;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const session: DeviceSession = {
      deviceCode,
      userCode,
      tenantId,
      status: "pending",
      expiresAt,
      interval,
    };

    this.sessions.set(deviceCode, session);
    this.userCodeMap.set(userCode, deviceCode);

    return {
      deviceCode,
      userCode,
      verificationUri,
      verificationUriComplete,
      expiresIn: expiresInSeconds,
      interval,
    };
  }

  /**
   * Polling endpoint called by the device CLI/agent.
   */
  public poll(deviceCode: string): { status: DeviceSession["status"]; session?: DeviceSession; error?: string } {
    const session = this.sessions.get(deviceCode);
    if (!session) {
      return { status: "expired", error: "Device code not found or expired" };
    }

    if (new Date() > new Date(session.expiresAt)) {
      session.status = "expired";
      return { status: "expired", error: "Authorization request timed out" };
    }

    session.lastPolledAt = new Date().toISOString();
    return { status: session.status, session: { ...session } };
  }

  /**
   * Approves a device authorization request when human enters userCode in browser.
   */
  public approveByCode(
    userCode: string,
    user: { userId: string; userEmail: string; role: UserRole; permissions: PermissionAction[] }
  ): boolean {
    const normCode = userCode.trim().toUpperCase();
    const deviceCode = this.userCodeMap.get(normCode);
    if (!deviceCode) return false;

    const session = this.sessions.get(deviceCode);
    if (!session || session.status !== "pending") return false;

    if (new Date() > new Date(session.expiresAt)) {
      session.status = "expired";
      return false;
    }

    session.status = "approved";
    session.userId = user.userId;
    session.userEmail = user.userEmail;
    session.role = user.role;
    session.permissions = user.permissions;

    return true;
  }

  /**
   * Rejects a device authorization request.
   */
  public rejectByCode(userCode: string): boolean {
    const normCode = userCode.trim().toUpperCase();
    const deviceCode = this.userCodeMap.get(normCode);
    if (!deviceCode) return false;

    const session = this.sessions.get(deviceCode);
    if (!session) return false;

    session.status = "rejected";
    return true;
  }

  private generateUserCode(): string {
    const chars = "BCDFGHJKLMNPQRSTVWXYZ23456789"; // Base32 without confusing chars (0, O, 1, I)
    let part1 = "";
    let part2 = "";

    for (let i = 0; i < 4; i++) {
      part1 += chars.charAt(crypto.randomInt(chars.length));
      part2 += chars.charAt(crypto.randomInt(chars.length));
    }

    return `${part1}-${part2}`;
  }
}
