import { randomUUID } from 'node:crypto';

export interface LockResult {
  acquired: boolean;
  token?: string;
  leaseExpiresAt?: number;
  reason?: string;
}

export interface IScheduleLock {
  acquire(lockKey: string, ttlMs?: number, ownerId?: string): Promise<LockResult>;
  renew(lockKey: string, token: string, ttlMs?: number): Promise<boolean>;
  release(lockKey: string, token: string): Promise<boolean>;
}

export class InMemoryScheduleLock implements IScheduleLock {
  private locks = new Map<
    string,
    { token: string; ownerId: string; expiresAt: number }
  >();

  public async acquire(
    lockKey: string,
    ttlMs = 30000,
    ownerId = randomUUID()
  ): Promise<LockResult> {
    const now = Date.now();
    const existing = this.locks.get(lockKey);

    if (existing && existing.expiresAt > now) {
      return {
        acquired: false,
        reason: `Lock held by owner ${existing.ownerId} until ${new Date(existing.expiresAt).toISOString()}`,
      };
    }

    const token = randomUUID();
    const expiresAt = now + ttlMs;
    this.locks.set(lockKey, { token, ownerId, expiresAt });

    return {
      acquired: true,
      token,
      leaseExpiresAt: expiresAt,
    };
  }

  public async renew(lockKey: string, token: string, ttlMs = 30000): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(lockKey);

    if (!existing || existing.token !== token || existing.expiresAt <= now) {
      return false;
    }

    existing.expiresAt = now + ttlMs;
    return true;
  }

  public async release(lockKey: string, token: string): Promise<boolean> {
    const existing = this.locks.get(lockKey);
    if (existing && existing.token === token) {
      this.locks.delete(lockKey);
      return true;
    }
    return false;
  }

  public clear(): void {
    this.locks.clear();
  }
}
