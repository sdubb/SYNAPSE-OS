import { SynapseEventEnvelope, EventHandler } from './EventTypes.js';
import { IEventStore, EventStoreQuery } from './EventStore.js';

export interface ReplayOptions {
  query: EventStoreQuery;
  speedMultiplier?: number; // 0 = unthrottled, 1 = realtime, 2 = 2x speed
  onProgress?: (replayedCount: number, totalCount: number, currentEvent: SynapseEventEnvelope) => void;
  batchSize?: number;
}

export interface ReplayResult {
  totalReplayed: number;
  durationMs: number;
  completed: boolean;
  error?: Error;
}

export class EventReplay {
  private readonly store: IEventStore;

  constructor(store: IEventStore) {
    this.store = store;
  }

  /**
   * Replays historical events to a target handler according to replay options.
   */
  public async replay(
    targetHandler: EventHandler,
    options: ReplayOptions
  ): Promise<ReplayResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize ?? 200;
    let offset = options.query.offset ?? 0;
    let totalReplayed = 0;
    let previousTimestamp: number | null = null;

    try {
      while (true) {
        const events = await this.store.query({
          ...options.query,
          limit: batchSize,
          offset,
        });

        if (events.length === 0) {
          break;
        }

        for (const event of events) {
          // Playback speed throttling
          if (options.speedMultiplier && options.speedMultiplier > 0 && previousTimestamp !== null) {
            const timeDelta = Math.max(0, event.timestamp - previousTimestamp);
            const delayMs = Math.min(timeDelta / options.speedMultiplier, 5000); // cap max delay to 5s
            if (delayMs > 5) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
          }
          previousTimestamp = event.timestamp;

          await targetHandler(event);
          totalReplayed++;

          if (options.onProgress) {
            options.onProgress(totalReplayed, totalReplayed + (events.length - 1), event);
          }
        }

        if (events.length < batchSize) {
          break;
        }

        offset += events.length;
      }

      return {
        totalReplayed,
        durationMs: Date.now() - startTime,
        completed: true,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        totalReplayed,
        durationMs: Date.now() - startTime,
        completed: false,
        error: err,
      };
    }
  }
}
