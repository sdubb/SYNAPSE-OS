/**
 * SYNAPSE OS — ANTI-TAMPER & ANTI-DEBUGGER DEFENSE SYSTEM
 * Copyright (c) 2026 SYNAPSE OS. All Rights Reserved.
 *
 * Active runtime anti-debugging detector:
 * 1. Inspects V8 Inspector / Node.js Inspector state
 * 2. Checks command line execution arguments for debugger flags
 * 3. Detects timing anomalies induced by interactive breakpoints / step debugging
 * 4. Detects global runtime monkey-patching / prototype pollution
 */

import { EventEmitter } from "node:events";
import { performance } from "node:perf_hooks";

export interface DebuggerDetectionResult {
  detected: boolean;
  reasons: string[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AntiDebuggerOptions {
  enableInspectorCheck?: boolean;
  enableArgvCheck?: boolean;
  enableTimingTrap?: boolean;
  enablePrototypeCheck?: boolean;
  timingThresholdMs?: number;
  heartbeatIntervalMs?: number;
  onTamperDetected?: (result: DebuggerDetectionResult) => void | Promise<void>;
}

export class AntiDebugger extends EventEmitter {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private options: Required<AntiDebuggerOptions>;

  constructor(options: AntiDebuggerOptions = {}) {
    super();
    this.options = {
      enableInspectorCheck: options.enableInspectorCheck ?? true,
      enableArgvCheck: options.enableArgvCheck ?? true,
      enableTimingTrap: options.enableTimingTrap ?? true,
      enablePrototypeCheck: options.enablePrototypeCheck ?? true,
      timingThresholdMs: options.timingThresholdMs ?? 45,
      heartbeatIntervalMs: options.heartbeatIntervalMs ?? 2500,
      onTamperDetected: options.onTamperDetected ?? (() => {}),
    };
  }

  /**
   * Run all anti-debugger and anti-tamper checks synchronously or asynchronously.
   */
  public evaluate(): DebuggerDetectionResult {
    const reasons: string[] = [];
    const metadata: Record<string, unknown> = {};

    // 1. Check for Active V8 / Node Inspector
    if (this.options.enableInspectorCheck) {
      try {
        if (typeof (process as any)._debugProcess === "function" && (process as any)._debugProcess === true) {
          reasons.push("DEBUG_PROCESS_ATTACHED");
        }
        
        // Node inspector check via global / process
        if (typeof (process as any).features?.inspector !== "undefined") {
          // If inspector is loaded or active
          const inspectorModule = (globalThis as any).__v8_inspector_active;
          if (inspectorModule) {
            reasons.push("ACTIVE_V8_INSPECTOR_DETECTED");
          }
        }

        // Check if v8 debug session is active
        if ((process as any).env && (process as any).env.NODE_OPTIONS) {
          const opts = (process as any).env.NODE_OPTIONS;
          if (/--inspect|--inspect-brk|--inspect-port|--debug|--debug-brk/.test(opts)) {
            reasons.push("DEBUG_FLAGS_IN_NODE_OPTIONS");
            metadata.nodeOptions = opts;
          }
        }
      } catch (err) {
        // Ignore introspection error
      }
    }

    // 2. Check process execution arguments
    if (this.options.enableArgvCheck && Array.isArray(process.execArgv)) {
      const debugFlags = process.execArgv.filter((arg) =>
        /--inspect|--inspect-brk|--inspect-port|--debug|--debug-brk|--expose-internals/.test(arg)
      );
      if (debugFlags.length > 0) {
        reasons.push(`DEBUGGER_PROCESS_EXEC_ARGV: ${debugFlags.join(", ")}`);
        metadata.execArgv = debugFlags;
      }
    }

    // 3. Timing Differential Trap (detects breakpoint pauses)
    if (this.options.enableTimingTrap) {
      const t0 = performance.now();
      // Tight math loop that normally executes in < 0.1ms
      let acc = 0;
      for (let i = 0; i < 5000; i++) {
        acc += (i * 3) ^ 0x5a;
      }
      const elapsed = performance.now() - t0;
      if (elapsed > this.options.timingThresholdMs) {
        reasons.push(`TIMING_TRAP_TRIGGERED: Loop took ${elapsed.toFixed(2)}ms (threshold: ${this.options.timingThresholdMs}ms)`);
        metadata.elapsedMs = elapsed;
      }
    }

    // 4. Check for Global Object / Prototype tampering
    if (this.options.enablePrototypeCheck) {
      try {
        const fnToString = Function.prototype.toString.toString();
        if (!fnToString.includes("[native code]") && !fnToString.includes("function toString()")) {
          reasons.push("PROTOTYPE_TAMPERING_FUNCTION_TOSTRING_HOOKED");
        }
      } catch {
        // Prototype check failure
      }
    }

    const detected = reasons.length > 0;
    const result: DebuggerDetectionResult = {
      detected,
      reasons,
      timestamp: new Date().toISOString(),
      metadata,
    };

    if (detected) {
      this.emit("tamper:detected", result);
      try {
        this.options.onTamperDetected(result);
      } catch (e) {
        console.error("[AntiDebugger] Callback error:", e);
      }
    }

    return result;
  }

  /**
   * Start a continuous background guardian heartbeat to monitor for debugger attachment.
   */
  public startGuardian(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = setInterval(() => {
      const res = this.evaluate();
      if (res.detected) {
        this.emit("tamper:heartbeat_alert", res);
      }
    }, this.options.heartbeatIntervalMs);

    // Ensure timer doesn't keep node event loop alive unnecessarily
    if (this.timer && typeof this.timer.unref === "function") {
      this.timer.unref();
    }
  }

  public stopGuardian(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
