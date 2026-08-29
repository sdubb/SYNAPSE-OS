/**
 * @file RuntimeAllocator.ts
 * @description Priority-based multi-tenant runtime slot allocation, fair-share scheduling, and concurrency throttling for Synapse OS.
 */

import { EventEmitter } from 'node:events';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export interface RuntimeAllocatorConfig {
  readonly maxGlobalConcurrency: number;
  readonly maxPerTenantConcurrency: number;
  readonly maxPerAgentConcurrency: number;
  readonly queueTimeoutMs: number;
}

export interface SlotAllocationRequest {
  readonly requestId: string;
  readonly tenantId: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly taskId?: string;
  readonly priority: TaskPriority;
  readonly requestedAt: number;
}

export interface AllocatedSlot {
  readonly slotId: string;
  readonly tenantId: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly taskId?: string;
  readonly allocatedAt: number;
}

interface QueuedItem {
  readonly request: SlotAllocationRequest;
  readonly resolve: (slot: AllocatedSlot) => void;
  readonly reject: (err: Error) => void;
  readonly timeoutHandle: NodeJS.Timeout;
}

export class RuntimeAllocator extends EventEmitter {
  private readonly config: RuntimeAllocatorConfig;
  private readonly activeSlots: Map<string, AllocatedSlot> = new Map();
  private readonly tenantSlotCounts: Map<string, number> = new Map();
  private readonly agentSlotCounts: Map<string, number> = new Map();
  private readonly queue: QueuedItem[] = [];
  private isDraining: boolean = false;
  private slotCounter: number = 0;

  constructor(config?: Partial<RuntimeAllocatorConfig>) {
    super();
    this.config = Object.freeze({
      maxGlobalConcurrency: 50,
      maxPerTenantConcurrency: 10,
      maxPerAgentConcurrency: 4,
      queueTimeoutMs: 60_000,
      ...config,
    });
  }

  public async requestSlot(request: SlotAllocationRequest): Promise<AllocatedSlot> {
    if (this.isDraining) {
      throw new Error('RuntimeAllocator is draining; new slot requests are rejected');
    }

    if (this.canAllocateImmediately(request.tenantId, request.agentId)) {
      return this.grantSlot(request);
    }

    return new Promise<AllocatedSlot>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.removeFromQueue(request.requestId);
        reject(
          new Error(
            `Slot allocation timeout (${this.config.queueTimeoutMs}ms) for request '${request.requestId}' [tenant: ${request.tenantId}]`
          )
        );
      }, this.config.queueTimeoutMs);

      if (timeoutHandle.unref) {
        timeoutHandle.unref();
      }

      this.queue.push({
        request,
        resolve,
        reject,
        timeoutHandle,
      });

      this.sortQueue();
      this.emit('request_queued', { requestId: request.requestId, queueDepth: this.queue.length });
    });
  }

  public releaseSlot(slotId: string): boolean {
    const slot = this.activeSlots.get(slotId);
    if (!slot) {
      return false;
    }

    this.activeSlots.delete(slotId);
    this.decrementCount(this.tenantSlotCounts, slot.tenantId);
    this.decrementCount(this.agentSlotCounts, slot.agentId);

    this.emit('slot_released', { slotId, tenantId: slot.tenantId, agentId: slot.agentId });

    this.processQueue();
    return true;
  }

  public getUsage(): {
    globalActive: number;
    globalMax: number;
    queuedCount: number;
    tenantBreakdown: Record<string, number>;
  } {
    const tenantBreakdown: Record<string, number> = {};
    for (const [tenant, count] of this.tenantSlotCounts.entries()) {
      tenantBreakdown[tenant] = count;
    }

    return {
      globalActive: this.activeSlots.size,
      globalMax: this.config.maxGlobalConcurrency,
      queuedCount: this.queue.length,
      tenantBreakdown,
    };
  }

  public setDraining(draining: boolean): void {
    this.isDraining = draining;
    if (draining) {
      this.emit('allocator_draining');
    }
  }

  private canAllocateImmediately(tenantId: string, agentId: string): boolean {
    if (this.activeSlots.size >= this.config.maxGlobalConcurrency) {
      return false;
    }

    const tenantActive = this.tenantSlotCounts.get(tenantId) ?? 0;
    if (tenantActive >= this.config.maxPerTenantConcurrency) {
      return false;
    }

    const agentActive = this.agentSlotCounts.get(agentId) ?? 0;
    if (agentActive >= this.config.maxPerAgentConcurrency) {
      return false;
    }

    return true;
  }

  private grantSlot(request: SlotAllocationRequest): AllocatedSlot {
    this.slotCounter += 1;
    const slotId = `slot-${Date.now()}-${this.slotCounter}`;

    const slot: AllocatedSlot = {
      slotId,
      tenantId: request.tenantId,
      agentId: request.agentId,
      sessionId: request.sessionId,
      taskId: request.taskId,
      allocatedAt: Date.now(),
    };

    this.activeSlots.set(slotId, slot);
    this.incrementCount(this.tenantSlotCounts, request.tenantId);
    this.incrementCount(this.agentSlotCounts, request.agentId);

    this.emit('slot_allocated', slot);
    return slot;
  }

  private processQueue(): void {
    if (this.queue.length === 0 || this.isDraining) {
      return;
    }

    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      if (item && this.canAllocateImmediately(item.request.tenantId, item.request.agentId)) {
        clearTimeout(item.timeoutHandle);
        this.queue.splice(i, 1);
        const slot = this.grantSlot(item.request);
        item.resolve(slot);
        i--; // Adjust index after splice
      }
    }
  }

  private sortQueue(): void {
    const priorityWeight = (p: TaskPriority): number => {
      switch (p) {
        case 'CRITICAL': return 4;
        case 'HIGH': return 3;
        case 'NORMAL': return 2;
        case 'LOW': return 1;
      }
    };

    this.queue.sort((a, b) => {
      const pDiff = priorityWeight(b.request.priority) - priorityWeight(a.request.priority);
      if (pDiff !== 0) return pDiff;
      // FIFO for same priority
      return a.request.requestedAt - b.request.requestedAt;
    });
  }

  private removeFromQueue(requestId: string): void {
    const idx = this.queue.findIndex((q) => q.request.requestId === requestId);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
    }
  }

  private incrementCount(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  private decrementCount(map: Map<string, number>, key: string): void {
    const current = map.get(key) ?? 0;
    if (current <= 1) {
      map.delete(key);
    } else {
      map.set(key, current - 1);
    }
  }
}
