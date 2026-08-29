/**
 * SYNAPSE OS — CANARY & HONEYTOKEN DEFENSE ENGINE
 * Copyright (c) 2026 SYNAPSE OS. All Rights Reserved.
 *
 * Provides decoy honeytokens, canary secrets, and breadcrumb traps.
 * If an attacker or scraper accesses, extracts, or presents a canary token,
 * it immediately triggers high-priority tamper telemetry and lockdown.
 */

import crypto from "node:crypto";
import { EventEmitter } from "node:events";

export type CanaryType = "api_key" | "database_uri" | "jwt_secret" | "env_var" | "file_token";

export interface CanaryToken {
  id: string;
  type: CanaryType;
  tokenValue: string;
  label: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface CanaryViolationEvent {
  canaryId: string;
  type: CanaryType;
  label: string;
  accessedToken: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export class CanaryEngine extends EventEmitter {
  private static instance: CanaryEngine;
  private canaryRegistry: Map<string, CanaryToken> = new Map();
  private tokenLookup: Map<string, string> = new Map(); // tokenValue -> canaryId

  constructor() {
    super();
    this.seedDefaultCanaries();
  }

  public static getInstance(): CanaryEngine {
    if (!CanaryEngine.instance) {
      CanaryEngine.instance = new CanaryEngine();
    }
    return CanaryEngine.instance;
  }

  /**
   * Seed standard honeypot canaries for the Synapse environment.
   */
  private seedDefaultCanaries(): void {
    this.registerCanary({
      type: "api_key",
      label: "Synapse Root Canary API Key",
      tokenValue: "syn_canary_live_99f8c0287a11893c5d80421e6",
      metadata: { scope: "admin", trapType: "env_honeypot" },
    });

    this.registerCanary({
      type: "database_uri",
      label: "Synapse Decoy Vault Database URI",
      tokenValue: "postgres://syn_canary_vault:trap99812@honey.synapse.internal:5432/synapse_secret_vault",
      metadata: { trapType: "db_honeypot" },
    });

    this.registerCanary({
      type: "jwt_secret",
      label: "Synapse Decoy JWT Signing Secret",
      tokenValue: "syn_jwt_canary_secret_841029cba87123ef0",
      metadata: { trapType: "token_honeypot" },
    });
  }

  /**
   * Generate and register a dynamic canary token.
   */
  public generateCanary(type: CanaryType, label: string, metadata?: Record<string, unknown>): CanaryToken {
    const rawEntropy = crypto.randomBytes(16).toString("hex");
    let tokenValue = `syn_canary_${type}_${rawEntropy}`;
    if (type === "database_uri") {
      tokenValue = `postgres://canary_user_${rawEntropy.slice(0, 6)}:p_${rawEntropy}@canary.synapse.internal:5432/canary_db`;
    }

    return this.registerCanary({
      type,
      label,
      tokenValue,
      metadata,
    });
  }

  public registerCanary(input: {
    type: CanaryType;
    label: string;
    tokenValue: string;
    metadata?: Record<string, unknown>;
  }): CanaryToken {
    const id = `canary_${crypto.randomBytes(8).toString("hex")}`;
    const canary: CanaryToken = {
      id,
      type: input.type,
      label: input.label,
      tokenValue: input.tokenValue,
      createdAt: new Date().toISOString(),
      metadata: input.metadata,
    };

    this.canaryRegistry.set(id, canary);
    this.tokenLookup.set(input.tokenValue, id);
    return canary;
  }

  /**
   * Check whether a given value is a registered canary token.
   */
  public isCanary(value: string): boolean {
    if (!value || typeof value !== "string") return false;
    return this.tokenLookup.has(value) || value.includes("syn_canary_");
  }

  /**
   * Evaluate a token or request string. If it matches a canary, immediately emit a violation event.
   */
  public inspectAndTrip(value: string, context?: Record<string, unknown>): CanaryViolationEvent | null {
    if (!value || typeof value !== "string") return null;

    let canaryId = this.tokenLookup.get(value);
    let matchedCanary = canaryId ? this.canaryRegistry.get(canaryId) : null;

    if (!matchedCanary && value.includes("syn_canary_")) {
      // Synthetic / fallback match
      matchedCanary = {
        id: "synthetic_canary_match",
        type: "api_key",
        label: "Decoy Canary Token",
        tokenValue: value,
        createdAt: new Date().toISOString(),
      };
    }

    if (matchedCanary) {
      const event: CanaryViolationEvent = {
        canaryId: matchedCanary.id,
        type: matchedCanary.type,
        label: matchedCanary.label,
        accessedToken: value,
        timestamp: new Date().toISOString(),
        context,
      };

      this.emit("canary:tripped", event);
      return event;
    }

    return null;
  }

  public getAllCanaries(): CanaryToken[] {
    return Array.from(this.canaryRegistry.values());
  }
}
