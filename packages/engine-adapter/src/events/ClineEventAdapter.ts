import type { ClineCore, CoreSessionEvent } from "@cline/core";
import type { SynapseEventEnvelope } from "@synapse/contracts";
import { EventNormalizer, type EventNormalizationContext } from "./event-normalizer.js";

export type SynapseEventListener = (envelope: SynapseEventEnvelope) => void | Promise<void>;

export class ClineEventAdapter {
  private readonly normalizer: EventNormalizer;
  private readonly listeners = new Set<SynapseEventListener>();
  private unsubscribeCore?: () => void;
  private isSubscribed = false;

  constructor(
    private readonly cline: ClineCore,
    private readonly context: EventNormalizationContext
  ) {
    this.normalizer = new EventNormalizer(context);
  }

  /**
   * Subscribe a listener to normalized Synapse events.
   */
  subscribe(listener: SynapseEventListener): () => void {
    this.listeners.add(listener);

    // If not subscribed to ClineCore, start listening
    if (!this.isSubscribed && this.context.sessionId) {
      this.startCoreSubscription(this.context.sessionId);
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.unsubscribeCore) {
        this.unsubscribeCore();
        this.isSubscribed = false;
      }
    };
  }

  /**
   * Directly dispatch a native Cline CoreSessionEvent through this adapter.
   */
  dispatchNativeEvent(event: CoreSessionEvent): SynapseEventEnvelope {
    const envelope = this.normalizer.normalize(event);
    for (const listener of this.listeners) {
      try {
        const res = listener(envelope);
        if (res instanceof Promise) {
          res.catch((err) => {
            console.error("[ClineEventAdapter] Listener async error:", err);
          });
        }
      } catch (err) {
        console.error("[ClineEventAdapter] Listener sync error:", err);
      }
    }
    return envelope;
  }

  private startCoreSubscription(sessionId: string): void {
    try {
      this.unsubscribeCore = this.cline.subscribe(
        (event: CoreSessionEvent) => {
          this.dispatchNativeEvent(event);
        },
        { sessionId }
      );
      this.isSubscribed = true;
    } catch (err) {
      console.warn(`[ClineEventAdapter] Could not attach core subscription for session ${sessionId}:`, err);
    }
  }

  /**
   * Destroy and clean up all subscriptions.
   */
  dispose(): void {
    if (this.unsubscribeCore) {
      this.unsubscribeCore();
      this.unsubscribeCore = undefined;
    }
    this.listeners.clear();
    this.isSubscribed = false;
  }
}
